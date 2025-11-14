import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getRuleById, updateRule, deleteRule } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const rule = await getRuleById(id);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Check if user owns the rule
    if (rule.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error fetching rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const rule = await getRuleById(id);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Check if user owns the rule
    if (rule.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (rule.is_default) {
      return NextResponse.json(
        { error: 'Cannot edit default rule' },
        { status: 400 }
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

    const updates = {
      name: name.trim(),
      description: description?.trim() || '',
      extraction_fields: Array.isArray(extraction_fields) ? extraction_fields : [],
      comparison_instructions: comparison_instructions.trim(),
      critical_checks: Array.isArray(critical_checks) ? critical_checks : []
    };

    const updatedRule = await updateRule(id, updates);
    if (!updatedRule) {
      return NextResponse.json(
        { error: 'Failed to update rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const rule = await getRuleById(id);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Check if user owns the rule
    if (rule.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (rule.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default rule' },
        { status: 400 }
      );
    }

    const success = await deleteRule(id);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
