import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/db';
import { exportTrackerAPI } from '@/lib/export-tracker-client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('access_code');

    if (!accessCode) {
      return NextResponse.json(
        { error: 'access_code is required' },
        { status: 400 }
      );
    }

    console.log('Fetching documents for access code:', accessCode);

    // เรียก Export Tracker API เพื่อดึงข้อมูลเอกสาร
    const documentData = await exportTrackerAPI.getDocuments(accessCode);

    return NextResponse.json(documentData);

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}