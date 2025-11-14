import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserQuotationHistory, QuotationHistoryItem } from '@/lib/db';

export async function GET() {
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

    const quotationHistory = await getUserQuotationHistory(user.id);

    return NextResponse.json({
      quotation_history: quotationHistory
    });
  } catch (error) {
    console.error('Error fetching quotation history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
