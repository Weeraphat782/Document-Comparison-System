import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createRule, getRules } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rules = await getRules(user.id);
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      extraction_fields,
      comparison_instructions,
      critical_checks
    } = body;

    if (!name?.trim() || !comparison_instructions?.trim()) {
      return NextResponse.json(
        { error: 'Name and comparison instructions are required' },
        { status: 400 }
      );
    }

    const ruleData = {
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || '',
      extraction_fields: Array.isArray(extraction_fields) ? extraction_fields : [],
      comparison_instructions: comparison_instructions.trim(),
      critical_checks: Array.isArray(critical_checks) ? critical_checks : [],
      is_default: false
    };

    const newRule = await createRule(ruleData);
    if (!newRule) {
      return NextResponse.json(
        { error: 'Failed to create rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(newRule);
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
