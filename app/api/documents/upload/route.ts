import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createUploadedDocument } from '@/lib/db';
import { createHash } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',

  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

function sanitizeFileName(fileName: string): string {
  // Remove or replace unsafe characters
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function generateFileName(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(originalName);
  return `${userId}-${timestamp}-${sanitized}`;
}

function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('group_id') as string;
    const documentType = formData.get('document_type') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({
        error: 'No file provided'
      }, { status: 400 });
    }

    if (!groupId) {
      return NextResponse.json({
        error: 'Group ID is required'
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'File type not allowed. Supported types: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, WebP'
      }, { status: 400 });
    }

    console.log('[v0] Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type, 'For user:', user.id);

    // Convert file to buffer for checksum and upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = calculateChecksum(buffer);

    // Generate safe filename
    const fileName = generateFileName(file.name, user.id);
    const filePath = `uploads/${user.id}/groups/${groupId}/${fileName}`;

    // Upload to Supabase Storage
    console.log('[v0] Uploading to storage path:', filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[v0] Storage upload error:', uploadError);
      return NextResponse.json({
        error: 'Failed to upload file to storage'
      }, { status: 500 });
    }

    // Get signed URL for the uploaded file
    const { data: signedUrlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (!signedUrlData?.signedUrl) {
      console.error('[v0] Failed to generate signed URL');
      return NextResponse.json({
        error: 'Failed to generate file access URL'
      }, { status: 500 });
    }

    // Create database record
    const documentData = {
      user_id: user.id,
      group_id: groupId,
      file_name: fileName,
      original_name: file.name,
      file_url: signedUrlData.signedUrl,
      file_size: file.size,
      mime_type: file.type,
      document_type: documentType || undefined,
      description: description || undefined,
      checksum: checksum,
    };

    const document = await createUploadedDocument(documentData);

    if (!document) {
      // Try to clean up the uploaded file if DB insert failed
      try {
        await supabase.storage
          .from('documents')
          .remove([filePath]);
      } catch (cleanupError) {
        console.error('[v0] Failed to cleanup uploaded file:', cleanupError);
      }

      return NextResponse.json({
        error: 'Failed to save document record'
      }, { status: 500 });
    }

    console.log('[v0] File uploaded successfully:', document.id);

    return NextResponse.json({
      document: {
        ...document,
        // Don't expose internal file path in response
        file_path: undefined,
      }
    });

  } catch (error) {
    console.error('[v0] Error in documents/upload POST:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}


