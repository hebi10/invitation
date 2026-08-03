import { NextResponse } from 'next/server';

import {
  DemoExperienceRequestError,
  requireDemoExperienceSession,
  toDemoExperienceErrorResponse,
} from '@/server/demoExperienceRequest';
import {
  DemoExperienceDomainError,
  listDemoEventComments,
} from '@/server/demoExperienceService';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = requireDemoExperienceSession(request);
    const { slug } = await context.params;
    const result = await listDemoEventComments(session.role, slug);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof DemoExperienceRequestError) {
      return toDemoExperienceErrorResponse(error);
    }
    if (error instanceof DemoExperienceDomainError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[api/experience/events/[slug]/comments] failed', error);
    return NextResponse.json(
      { error: '체험 방명록을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
