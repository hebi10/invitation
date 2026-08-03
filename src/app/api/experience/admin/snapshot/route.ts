import { NextResponse } from 'next/server';

import {
  DemoExperienceRequestError,
  requireDemoExperienceSession,
  toDemoExperienceErrorResponse,
} from '@/server/demoExperienceRequest';
import { getDemoAdminSnapshot } from '@/server/demoExperienceService';

export async function GET(request: Request) {
  try {
    requireDemoExperienceSession(request, ['admin']);
    const snapshot = await getDemoAdminSnapshot();
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error) {
    if (error instanceof DemoExperienceRequestError) {
      return toDemoExperienceErrorResponse(error);
    }
    console.error('[api/experience/admin/snapshot] failed', error);
    return NextResponse.json(
      { error: '체험 관리자 정보를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
