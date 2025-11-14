import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getDocumentGroups, createDocumentGroup } from '@/lib/db';
import { DocumentGroupForm } from '@/lib/types';

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

    console.log('[v0] Fetching document groups for user:', user.id);

    const groups = await getDocumentGroups(user.id);

    return NextResponse.json({
      groups
    });

  } catch (error) {
    console.error('[v0] Error in document-groups GET:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
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

    const body: DocumentGroupForm = await request.json();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({
        error: 'Name is required and must be a non-empty string'
      }, { status: 400 });
    }

    console.log('[v0] Creating document group for user:', user.id, 'Name:', body.name);

    const group = await createDocumentGroup(user.id, {
      name: body.name.trim(),
      description: body.description?.trim(),
    });

    if (!group) {
      return NextResponse.json({
        error: 'Failed to create document group'
      }, { status: 500 });
    }

    return NextResponse.json({
      group
    });

  } catch (error) {
    console.error('[v0] Error in document-groups POST:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}


