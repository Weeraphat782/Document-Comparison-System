import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createAnalysisSession, updateAnalysisSession, getRuleById, getDocumentGroupById, getUploadedDocuments } from '@/lib/db';
import { exportTrackerClient } from '@/lib/export-tracker-client';
import { AnalysisMode } from '@/lib/types';

// Helper function to download file from Supabase Storage and convert to base64
async function downloadFileFromStorage(filePath: string): Promise<string> {
  try {
    console.log(`[v0] Downloading from storage: ${filePath}`);
    
    // Create Supabase client
    const supabase = await createServerSupabaseClient();
    
    // Download file directly from storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath);
    
    if (error) {
      console.error(`[v0] Storage download error:`, error);
      throw new Error(`Failed to download from storage: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data received from storage');
    }
    
    // Convert Blob to base64
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    console.log(`[v0] Successfully downloaded and converted to base64 (size: ${base64.length} chars)`);
    return base64;
  } catch (error) {
    console.error('[v0] Error downloading file from storage:', error);
    throw error;
  }
}

// Helper function to get MIME type from file extension
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return mimeTypes[ext || ''] || 'application/pdf';
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mode = 'quotation' as AnalysisMode, quotation_id, group_id, document_ids, rule_id } = body;

    // Validate mode
    if (!['quotation', 'uploaded'].includes(mode)) {
      return NextResponse.json({
        error: "Invalid mode. Must be 'quotation' or 'uploaded'"
      }, { status: 400 });
    }

    if (mode === 'quotation') {
      if (!quotation_id || !document_ids || !rule_id) {
        return NextResponse.json({
          error: "quotation_id, document_ids, and rule_id are required for quotation mode"
        }, { status: 400 });
      }
    } else if (mode === 'uploaded') {
      if (!group_id || !document_ids || !rule_id) {
        return NextResponse.json({
          error: "group_id, document_ids, and rule_id are required for uploaded mode"
        }, { status: 400 });
      }
    }

    console.log(`[v0] Starting ${mode} analysis`);
    if (mode === 'quotation') {
      console.log("[v0] Quotation:", quotation_id);
    } else {
      console.log("[v0] Group:", group_id);
    }
    console.log("[v0] Documents:", document_ids.length);
    console.log("[v0] Rule:", rule_id);
    console.log("[v0] User:", user.id);

    // Create summary for display
    let quotationSummary = mode === 'quotation' ? quotation_id : `Group: ${group_id}`; // Default

    if (mode === 'quotation') {
      // Get quotation details for quotation mode
      try {
        const quotationDetails = await exportTrackerClient.getQuotationDetails(quotation_id);
        if (quotationDetails) {
          // Format: "QT-2024-001 - ABC Company - Thailand - 2024-01-15"
          const parts = [
            quotationDetails.company,
            quotationDetails.destination,
            new Date(quotationDetails.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          ].filter(Boolean);

          if (parts.length > 0) {
            quotationSummary = `${quotation_id} - ${parts.join(' - ')}`;
          }
        }
      } catch (error) {
        console.warn("[v0] Could not fetch quotation details for summary:", error);
        // Fallback: Try to get from documents (old method)
        try {
          const documents = await exportTrackerClient.getDocuments(quotation_id);
          if (documents && documents.length > 0) {
            const firstDoc = documents[0];
            const companyMatch = firstDoc.description?.match(/company[:\s]+([^\n,]+)/i) ||
                                firstDoc.file_name?.match(/([^-]+)-/);
            if (companyMatch) {
              quotationSummary = `${quotation_id} - ${companyMatch[1].trim()}`;
            }
          }
        } catch (docError) {
          console.warn("[v0] Could not fetch documents for summary either:", docError);
          // Keep default quotation_id as summary
        }
      }
    } else if (mode === 'uploaded') {
      // Get group details for uploaded mode
      try {
        const group = await getDocumentGroupById(group_id);
        if (group) {
          quotationSummary = `Group: ${group.name}`;
          if (group.description) {
            quotationSummary += ` - ${group.description}`;
          }
        }
      } catch (error) {
        console.warn("[v0] Could not fetch group details for summary:", error);
        // Keep default group summary
      }
    }

    // Validate inputs based on mode
    if (mode === 'quotation' && (!quotation_id || typeof quotation_id !== 'string')) {
      return NextResponse.json({
        error: "Invalid quotation_id"
      }, { status: 400 });
    }

    if (mode === 'uploaded' && (!group_id || typeof group_id !== 'string')) {
      return NextResponse.json({
        error: "Invalid group_id"
      }, { status: 400 });
    }

    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({
        error: "document_ids must be a non-empty array"
      }, { status: 400 });
    }

    if (!rule_id || typeof rule_id !== 'string') {
      return NextResponse.json({
        error: "Invalid rule_id"
      }, { status: 400 });
    }

    // Additional validation for uploaded mode - verify group ownership
    if (mode === 'uploaded') {
      try {
        const group = await getDocumentGroupById(group_id);
        if (!group) {
          return NextResponse.json({
            error: "Document group not found"
          }, { status: 404 });
        }
        if (group.user_id !== user.id) {
          return NextResponse.json({
            error: "Forbidden: You don't own this document group"
          }, { status: 403 });
        }
      } catch (error) {
        console.error("[v0] Error validating group ownership:", error);
        return NextResponse.json({
          error: "Failed to validate group ownership"
        }, { status: 500 });
      }
    }

    // Get the rule from our database
    const rule = await getRuleById(rule_id);
    if (!rule) {
      return NextResponse.json({
        error: "Rule not found"
      }, { status: 404 });
    }

    // Verify user owns the rule
    if (rule.user_id !== user.id) {
      return NextResponse.json({
        error: "Unauthorized access to rule"
      }, { status: 403 });
    }

    // Create analysis session
    const sessionData = {
      user_id: user.id,
      rule_id: rule_id,
      quotation_id: mode === 'quotation' ? quotation_id : null,
      quotation_summary: quotationSummary,
      document_ids: document_ids,
      status: 'processing' as const,
      analysis_mode: mode,
      group_id: mode === 'uploaded' ? group_id : null,
    };

    const session = await createAnalysisSession(sessionData);
    if (!session) {
      return NextResponse.json({
        error: "Failed to create analysis session"
      }, { status: 500 });
    }

    console.log("[v0] Created session:", session.id);

    try {
      // Update session with start time
      await updateAnalysisSession(session.id, {
        started_at: new Date().toISOString(),
      });

      // Call Export Tracker API for analysis
      console.log(`[v0] Calling Export Tracker API for ${mode} analysis...`);
      let analysisResult;

      if (mode === 'quotation') {
        // Original quotation mode
        analysisResult = await exportTrackerClient.analyzeDocuments(
          quotation_id,
          document_ids,
          rule_id,
          user.id
        );
      } else if (mode === 'uploaded') {
        // New uploaded mode - download files and send as base64 data
        try {
          const uploadedDocuments = await getUploadedDocuments(group_id);

          // Filter to only the requested documents
          const selectedDocuments = uploadedDocuments.filter(doc =>
            document_ids.includes(doc.id)
          );

          if (selectedDocuments.length !== document_ids.length) {
            throw new Error('Some requested documents not found in group');
          }

          // Download files from Supabase Storage and convert to base64 data
          console.log('[v0] Downloading files from Supabase Storage...');
          const documentsWithData = [];
          for (const doc of selectedDocuments) {
            try {
              console.log(`[v0] Processing: ${doc.file_name}`);
              
              // Extract storage path from file_url
              // file_url format: https://xxx.supabase.co/storage/v1/object/public/documents/path/to/file.pdf
              const url = new URL(doc.file_url);
              const pathParts = url.pathname.split('/documents/');
              const storagePath = pathParts[1]; // Get path after /documents/
              
              console.log(`[v0] Storage path: ${storagePath}`);
              
              const base64Data = await downloadFileFromStorage(storagePath);
              const mimeType = getMimeType(doc.file_name);

              documentsWithData.push({
                id: doc.id,
                name: doc.file_name,
                type: doc.document_type || 'other',
                base64Data,
                mimeType,
              });
              
              console.log(`[v0] ✓ Successfully processed ${doc.file_name}`);
            } catch (downloadError) {
              console.error(`[v0] Failed to download ${doc.file_name}:`, downloadError);
              throw new Error(`Failed to download file: ${doc.file_name}`);
            }
          }

          console.log(`[v0] Successfully prepared ${documentsWithData.length} documents for analysis`);

          // Call Export Tracker with document data instead of URLs
          analysisResult = await exportTrackerClient.analyzeUploadedDocuments(
            documentsWithData,
            rule_id,
            user.id,
            group_id
          );
        } catch (error) {
          console.error('[v0] Error preparing uploaded documents for analysis:', error);
          throw error;
        }
      }

      console.log("[v0] Analysis completed successfully");

      // Update session with results
      await updateAnalysisSession(session.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        results: analysisResult,
      });

      // Return the analysis result
      return NextResponse.json({
        ...analysisResult,
        session_id: session.id,
      });

    } catch (analysisError) {
      console.error("[v0] Analysis error:", analysisError);

      // Update session with error
      await updateAnalysisSession(session.id, {
        status: 'failed',
        error_message: analysisError instanceof Error ? analysisError.message : 'Unknown analysis error',
        completed_at: new Date().toISOString(),
      });

      return NextResponse.json({
        error: analysisError instanceof Error ? analysisError.message : "Analysis failed"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("[v0] Error in analyze route:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}