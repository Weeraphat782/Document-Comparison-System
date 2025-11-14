import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser, createAnalysisSession, updateAnalysisSession } from '@/lib/db';
import { exportTrackerAPI } from '@/lib/export-tracker-client';
import { ComparisonRule } from '@/lib/types';

// Service Role Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      document_ids, 
      rule_id, 
      access_code,
      rule_instructions // rule จากระบบเราเอง
    } = body;

    console.log('Analysis request:', { 
      user_id: user.id,
      document_ids_count: document_ids?.length,
      rule_id,
      access_code,
      has_rule_instructions: !!rule_instructions
    });

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'document_ids array is required' },
        { status: 400 }
      );
    }

    if (!rule_id) {
      return NextResponse.json(
        { error: 'rule_id is required' },
        { status: 400 }
      );
    }

    if (!access_code) {
      return NextResponse.json(
        { error: 'access_code is required' },
        { status: 400 }
      );
    }

    // 1. ดึงข้อมูล rule จากระบบเราเอง
    let ruleData;
    if (rule_instructions) {
      // ใช้ rule ที่ส่งมาจาก frontend (custom rule)
      ruleData = {
        id: rule_id,
        name: 'Custom Rule',
        comparison_instructions: rule_instructions.comparison_instructions,
        extraction_fields: rule_instructions.extraction_fields || [],
        critical_checks: rule_instructions.critical_checks || []
      };
    } else {
      // ดึง rule จาก database
      const { data: rule, error: ruleError } = await supabase
        .from('comparison_rules')
        .select('*')
        .eq('id', rule_id)
        .eq('user_id', user.id)
        .single();

      if (ruleError || !rule) {
        return NextResponse.json(
          { error: 'Rule not found' },
          { status: 404 }
        );
      }
      ruleData = rule;
    }

    // 2. สร้าง analysis session
    const sessionData = {
      user_id: user.id,
      rule_id: rule_id,
      access_code: access_code,
      document_ids: document_ids,
      status: 'processing' as const,
    };

    const session = await createAnalysisSession(sessionData);
    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create analysis session' },
        { status: 500 }
      );
    }

    try {
      // 3. เรียก Export Tracker API เพื่อวิเคราะห์
      console.log('Calling Export Tracker API for analysis...');
      const analysisResult = await exportTrackerAPI.analyzeDocuments({
        document_ids,
        rule_id: 'export-tracker-rule', // ใช้ rule ID เฉพาะสำหรับ Export Tracker
        access_code,
        user_id: user.id,
      });

      // 4. อัปเดต session ด้วยผลการวิเคราะห์
      await updateAnalysisSession(session.id, {
        status: 'completed',
        results: analysisResult,
        completed_at: new Date().toISOString()
      });

      console.log('Analysis completed successfully');
      return NextResponse.json({
        session_id: session.id,
        ...analysisResult
      });

    } catch (analysisError) {
      console.error('Analysis failed:', analysisError);
      
      // อัปเดต session เป็น failed
      await updateAnalysisSession(session.id, {
        status: 'failed',
        results: { error: analysisError instanceof Error ? analysisError.message : 'Unknown error' }
      });

      return NextResponse.json(
        { error: 'Analysis failed', details: analysisError instanceof Error ? analysisError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}