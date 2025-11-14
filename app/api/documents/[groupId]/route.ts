import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getDocumentGroupById, getUploadedDocuments } from '@/lib/db';

interface RouteParams {
  params: {
    groupId: string;
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

    const { groupId } = params;

    console.log('[v0] Fetching documents for group:', groupId, 'user:', user.id);

    // Verify group ownership
    const group = await getDocumentGroupById(groupId);
    if (!group) {
      return NextResponse.json({
        error: 'Document group not found'
      }, { status: 404 });
    }

    if (group.user_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden'
      }, { status: 403 });
    }

    const documents = await getUploadedDocuments(groupId);

    return NextResponse.json({
      documents,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
      }
    });

  } catch (error) {
    console.error('[v0] Error in documents/[groupId] GET:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}


