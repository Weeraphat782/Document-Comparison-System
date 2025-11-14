import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        authError: authError?.message
      }, { status: 401 });
    }

    // User data from auth (no profiles table needed)
    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
      created_at: user.created_at
    };

    // Check if analysis_sessions table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'analysis_sessions');

    const hasAnalysisSessionsTable = tables && tables.length > 0;

    // Check if we can insert into analysis_sessions
    let insertTest = null;
    let insertError = null;

    if (hasAnalysisSessionsTable) {
      try {
        const testSession = await supabase
          .from('analysis_sessions')
          .insert({
            user_id: user.id,
            rule_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
            quotation_id: 'test',
            document_ids: ['test'],
            status: 'pending'
          })
          .select();

        insertTest = 'success';
      } catch (error: any) {
        insertTest = 'failed';
        insertError = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        };
      }
    }

    // Check existing tables
    const { data: allTables, error: allTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    return NextResponse.json({
      authenticated: true,
      user_id: user.id,
      user_data: userData,
      has_analysis_sessions_table: hasAnalysisSessionsTable,
      insert_test: insertTest,
      insert_error: insertError,
      all_tables: allTables?.map(t => t.table_name) || [],
      all_tables_error: allTablesError?.message
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
