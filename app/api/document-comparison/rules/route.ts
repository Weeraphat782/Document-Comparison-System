import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getRules } from '@/lib/db';

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

    console.log('[v0] Fetching comparison rules for user:', user.id);

    // Get rules from our database
    const rules = await getRules(user.id);

    console.log('[v0] Rules fetched successfully:', rules.length);

    return NextResponse.json(rules);
  } catch (error) {
    console.error('[v0] Error in rules route:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
