import { createServerSupabaseClient } from './supabase';
import { ComparisonRule, AnalysisSession, Profile, AnalysisResponse, DocumentGroup, UploadedDocument, DocumentGroupForm } from './types';

// USER FUNCTIONS
export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('[DB] Error getting current user:', error);
      return null;
    }

    // Return user object directly (no need for profiles table)
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
      created_at: user.created_at,
      updated_at: user.updated_at
    } as Profile;
  } catch (error) {
    console.error('[DB] Error in getCurrentUser:', error);
    return null;
  }
}

// RULE FUNCTIONS
export async function getRules(userId: string): Promise<ComparisonRule[]> {
  try {
    console.log(`[DB] Getting rules for user: ${userId}`);
    const supabase = await createServerSupabaseClient();

    const { data: rules, error } = await supabase
      .from('document_comparison_rules')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error getting rules:', error);
      return [];
    }

    // Transform JSONB fields back to arrays
    return (rules || []).map((rule: any) => ({
      ...rule,
      extraction_fields: Array.isArray(rule.extraction_fields) ? rule.extraction_fields : [],
      critical_checks: Array.isArray(rule.critical_checks) ? rule.critical_checks : []
    }));
  } catch (error) {
    console.error('[DB] Error in getRules:', error);
    return [];
  }
}

export async function getRuleById(id: string): Promise<ComparisonRule | null> {
  try {
    console.log(`[DB] Getting rule by id: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { data: rule, error } = await supabase
      .from('document_comparison_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[DB] Error getting rule:', error);
      return null;
    }

    // Transform JSONB fields back to arrays
    return {
      ...rule,
      extraction_fields: Array.isArray(rule.extraction_fields) ? rule.extraction_fields : [],
      critical_checks: Array.isArray(rule.critical_checks) ? rule.critical_checks : []
    };
  } catch (error) {
    console.error('[DB] Error in getRuleById:', error);
    return null;
  }
}

export async function createRule(ruleData: Omit<ComparisonRule, 'id' | 'created_at' | 'updated_at'>): Promise<ComparisonRule | null> {
  try {
    console.log(`[DB] Creating new rule: ${ruleData.name}`);
    const supabase = await createServerSupabaseClient();

    const { data: rule, error } = await supabase
      .from('document_comparison_rules')
      .insert({
        user_id: ruleData.user_id,
        name: ruleData.name,
        description: ruleData.description,
        extraction_fields: ruleData.extraction_fields,
        comparison_instructions: ruleData.comparison_instructions,
        critical_checks: ruleData.critical_checks,
        is_default: ruleData.is_default
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Error creating rule:', error);
      return null;
    }

    console.log(`[DB] Rule created with id: ${rule.id}`);

    // Transform JSONB fields back to arrays
    return {
      ...rule,
      extraction_fields: Array.isArray(rule.extraction_fields) ? rule.extraction_fields : [],
      critical_checks: Array.isArray(rule.critical_checks) ? rule.critical_checks : []
    };
  } catch (error) {
    console.error('[DB] Error in createRule:', error);
    return null;
  }
}

export async function updateRule(id: string, updates: Partial<Omit<ComparisonRule, 'id' | 'created_at' | 'user_id'>>): Promise<ComparisonRule | null> {
  try {
    console.log(`[DB] Updating rule: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { data: rule, error } = await supabase
      .from('document_comparison_rules')
      .update({
        name: updates.name,
        description: updates.description,
        extraction_fields: updates.extraction_fields,
        comparison_instructions: updates.comparison_instructions,
        critical_checks: updates.critical_checks,
        is_default: updates.is_default
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DB] Error updating rule:', error);
      return null;
    }

    console.log(`[DB] Rule updated: ${id}`);

    // Transform JSONB fields back to arrays
    return {
      ...rule,
      extraction_fields: Array.isArray(rule.extraction_fields) ? rule.extraction_fields : [],
      critical_checks: Array.isArray(rule.critical_checks) ? rule.critical_checks : []
    };
  } catch (error) {
    console.error('[DB] Error in updateRule:', error);
    return null;
  }
}

export async function deleteRule(id: string): Promise<boolean> {
  try {
    console.log(`[DB] Deleting rule: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('document_comparison_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DB] Error deleting rule:', error);
      return false;
    }

    console.log(`[DB] Rule deleted: ${id}`);
    return true;
  } catch (error) {
    console.error('[DB] Error in deleteRule:', error);
    return false;
  }
}

// QUOTATION HISTORY FUNCTIONS
export interface QuotationHistoryItem {
  quotation_id: string;
  quotation_summary?: string;
  last_analyzed: string;
}

export async function getUserQuotationHistory(userId: string): Promise<QuotationHistoryItem[]> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: sessions, error } = await supabase
      .from('analysis_sessions')
      .select('quotation_id, quotation_summary, created_at')
      .eq('user_id', userId)
      .not('quotation_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error getting quotation history:', error);
      return [];
    }

    // Group by quotation_id and get the latest one
    const historyMap = new Map<string, QuotationHistoryItem>();
    sessions.forEach((s: any) => {
      if (s.quotation_id && !historyMap.has(s.quotation_id)) {
        historyMap.set(s.quotation_id, {
          quotation_id: s.quotation_id,
          quotation_summary: s.quotation_summary,
          last_analyzed: s.created_at
        });
      }
    });

    return Array.from(historyMap.values());
  } catch (error) {
    console.error('[DB] Error in getUserQuotationHistory:', error);
    return [];
  }
}

// SESSION FUNCTIONS
export async function createAnalysisSession(sessionData: Omit<AnalysisSession, 'id' | 'created_at'>): Promise<AnalysisSession | null> {
  try {
    console.log(`[DB] Creating analysis session`);
    const supabase = await createServerSupabaseClient();

    const { data: session, error } = await supabase
      .from('analysis_sessions')
      .insert({
        user_id: sessionData.user_id,
        rule_id: sessionData.rule_id,
        quotation_id: sessionData.quotation_id,
        document_ids: sessionData.document_ids,
        status: sessionData.status,
        results: sessionData.results,
        error_message: sessionData.error_message
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Error creating session:', error);
      console.error('[DB] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return null;
    }

    console.log(`[DB] Session created with id: ${session.id}`);
    return session;
  } catch (error) {
    console.error('[DB] Error in createAnalysisSession:', error);
    return null;
  }
}

export async function updateAnalysisSession(id: string, updates: Partial<Omit<AnalysisSession, 'id' | 'created_at' | 'user_id'>>): Promise<AnalysisSession | null> {
  try {
    console.log(`[DB] Updating analysis session: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { data: session, error } = await supabase
      .from('analysis_sessions')
      .update({
        rule_id: updates.rule_id,
        quotation_id: updates.quotation_id,
        document_ids: updates.document_ids,
        status: updates.status,
        results: updates.results,
        error_message: updates.error_message,
        started_at: updates.started_at,
        completed_at: updates.completed_at
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DB] Error updating session:', error);
      return null;
    }

    console.log(`[DB] Session updated: ${id}`);
    return session;
  } catch (error) {
    console.error('[DB] Error in updateAnalysisSession:', error);
    return null;
  }
}

export async function getAnalysisSessions(userId: string): Promise<AnalysisSession[]> {
  try {
    console.log(`[DB] Getting analysis sessions for user: ${userId}`);
    const supabase = await createServerSupabaseClient();

    const { data: sessions, error } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error getting sessions:', error);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error('[DB] Error in getAnalysisSessions:', error);
    return [];
  }
}

export async function getAnalysisSessionById(id: string): Promise<AnalysisSession | null> {
  try {
    console.log(`[DB] Getting analysis session by id: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { data: session, error } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[DB] Error getting session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[DB] Error in getAnalysisSessionById:', error);
    return null;
  }
}

// DOCUMENT GROUP FUNCTIONS
export async function getDocumentGroups(userId: string): Promise<DocumentGroup[]> {
  try {
    console.log(`[DB] Getting document groups for user: ${userId}`);
    const supabase = await createServerSupabaseClient();

    const { data: groups, error } = await supabase
      .from('document_groups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error getting document groups:', error);
      return [];
    }

    return groups || [];
  } catch (error) {
    console.error('[DB] Error in getDocumentGroups:', error);
    return [];
  }
}

export async function getDocumentGroupById(id: string): Promise<DocumentGroup | null> {
  try {
    console.log(`[DB] Getting document group by id: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { data: group, error } = await supabase
      .from('document_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[DB] Error getting document group:', error);
      return null;
    }

    return group;
  } catch (error) {
    console.error('[DB] Error in getDocumentGroupById:', error);
    return null;
  }
}

export async function createDocumentGroup(userId: string, groupData: DocumentGroupForm): Promise<DocumentGroup | null> {
  try {
    console.log(`[DB] Creating document group: ${groupData.name} for user: ${userId}`);
    const supabase = await createServerSupabaseClient();

    const { data: group, error } = await supabase
      .from('document_groups')
      .insert({
        user_id: userId,
        name: groupData.name,
        description: groupData.description,
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Error creating document group:', error);
      return null;
    }

    console.log(`[DB] Document group created with id: ${group.id}`);
    return group;
  } catch (error) {
    console.error('[DB] Error in createDocumentGroup:', error);
    return null;
  }
}

export async function updateDocumentGroup(id: string, updates: Partial<DocumentGroupForm>): Promise<DocumentGroup | null> {
  try {
    console.log(`[DB] Updating document group: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { data: group, error } = await supabase
      .from('document_groups')
      .update({
        name: updates.name,
        description: updates.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DB] Error updating document group:', error);
      return null;
    }

    console.log(`[DB] Document group updated: ${id}`);
    return group;
  } catch (error) {
    console.error('[DB] Error in updateDocumentGroup:', error);
    return null;
  }
}

export async function deleteDocumentGroup(id: string): Promise<boolean> {
  try {
    console.log(`[DB] Deleting document group: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('document_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DB] Error deleting document group:', error);
      return false;
    }

    console.log(`[DB] Document group deleted: ${id}`);
    return true;
  } catch (error) {
    console.error('[DB] Error in deleteDocumentGroup:', error);
    return false;
  }
}

// UPLOADED DOCUMENTS FUNCTIONS
export async function getUploadedDocuments(groupId: string): Promise<UploadedDocument[]> {
  try {
    console.log(`[DB] Getting uploaded documents for group: ${groupId}`);
    const supabase = await createServerSupabaseClient();

    const { data: documents, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('group_id', groupId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('[DB] Error getting uploaded documents:', error);
      return [];
    }

    return documents || [];
  } catch (error) {
    console.error('[DB] Error in getUploadedDocuments:', error);
    return [];
  }
}

export async function createUploadedDocument(documentData: Omit<UploadedDocument, 'id' | 'uploaded_at'>): Promise<UploadedDocument | null> {
  try {
    console.log(`[DB] Creating uploaded document: ${documentData.original_name}`);
    const supabase = await createServerSupabaseClient();

    const { data: document, error } = await supabase
      .from('uploaded_documents')
      .insert({
        user_id: documentData.user_id,
        group_id: documentData.group_id,
        file_name: documentData.file_name,
        original_name: documentData.original_name,
        file_url: documentData.file_url,
        file_size: documentData.file_size,
        mime_type: documentData.mime_type,
        document_type: documentData.document_type,
        description: documentData.description,
        checksum: documentData.checksum,
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Error creating uploaded document:', error);
      return null;
    }

    console.log(`[DB] Uploaded document created with id: ${document.id}`);
    return document;
  } catch (error) {
    console.error('[DB] Error in createUploadedDocument:', error);
    return null;
  }
}

export async function deleteUploadedDocument(id: string): Promise<boolean> {
  try {
    console.log(`[DB] Deleting uploaded document: ${id}`);
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DB] Error deleting uploaded document:', error);
      return false;
    }

    console.log(`[DB] Uploaded document deleted: ${id}`);
    return true;
  } catch (error) {
    console.error('[DB] Error in deleteUploadedDocument:', error);
    return false;
  }
}
