import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { exportTrackerClient } from '@/lib/export-tracker-client';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotation_id');

    if (!quotationId) {
      return NextResponse.json({ error: 'quotation_id is required' }, { status: 400 });
    }

    console.log('[v0] Fetching documents for quotation:', quotationId);
    console.log('[v0] User:', user.id);

    // Fetch documents from Export Tracker API
    const documents = await exportTrackerClient.getDocuments(quotationId);

    console.log('[v0] Documents fetched successfully:', documents.length);

    return NextResponse.json({
      documents,
      quotation_id: quotationId,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Error in list-documents route:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
