import { NextResponse } from 'next/server';

import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { listAdminClientPasswordSummaries } from '@/server/adminPasswordSummaryService';

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const passwords = await listAdminClientPasswordSummaries();

    return NextResponse.json({
      success: true,
      passwords,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[api/admin/passwords] failed to list client passwords', error);
    return NextResponse.json(
      { error: '고객 비밀번호 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
