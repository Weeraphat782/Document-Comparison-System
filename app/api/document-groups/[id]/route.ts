import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getDocumentGroupById, updateDocumentGroup, deleteDocumentGroup } from '@/lib/db';
import { DocumentGroupForm } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
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

    const { id } = params;

    console.log('[v0] Fetching document group:', id, 'for user:', user.id);

    const group = await getDocumentGroupById(id);

    if (!group) {
      return NextResponse.json({
        error: 'Document group not found'
      }, { status: 404 });
    }

    // Check ownership
    if (group.user_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden'
      }, { status: 403 });
    }

    return NextResponse.json({
      group
    });

  } catch (error) {
    console.error('[v0] Error in document-groups/[id] GET:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
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

    const { id } = params;
    const body: Partial<DocumentGroupForm> = await request.json();

    console.log('[v0] Updating document group:', id, 'for user:', user.id);

    // Check ownership first
    const existingGroup = await getDocumentGroupById(id);
    if (!existingGroup) {
      return NextResponse.json({
        error: 'Document group not found'
      }, { status: 404 });
    }

    if (existingGroup.user_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden'
      }, { status: 403 });
    }

    // Validate input
    if (body.name !== undefined && (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0)) {
      return NextResponse.json({
        error: 'Name must be a non-empty string if provided'
      }, { status: 400 });
    }

    const updates: Partial<DocumentGroupForm> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim();

    const updatedGroup = await updateDocumentGroup(id, updates);

    if (!updatedGroup) {
      return NextResponse.json({
        error: 'Failed to update document group'
      }, { status: 500 });
    }

    return NextResponse.json({
      group: updatedGroup
    });

  } catch (error) {
    console.error('[v0] Error in document-groups/[id] PUT:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { id } = params;

    console.log('[v0] Deleting document group:', id, 'for user:', user.id);

    // Check ownership first
    const existingGroup = await getDocumentGroupById(id);
    if (!existingGroup) {
      return NextResponse.json({
        error: 'Document group not found'
      }, { status: 404 });
    }

    if (existingGroup.user_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden'
      }, { status: 403 });
    }

    const success = await deleteDocumentGroup(id);

    if (!success) {
      return NextResponse.json({
        error: 'Failed to delete document group'
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Document group deleted successfully'
    });

  } catch (error) {
    console.error('[v0] Error in document-groups/[id] DELETE:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}


