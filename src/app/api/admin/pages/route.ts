import { NextResponse } from 'next/server';

import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { listAdminInvitationPageSummaries } from '@/server/adminInvitationPagesService';

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const pages = await listAdminInvitationPageSummaries();

    return NextResponse.json({
      success: true,
      pages,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[api/admin/pages] failed to list invitation pages', error);
    return NextResponse.json(
      { error: '청첩장 페이지 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
