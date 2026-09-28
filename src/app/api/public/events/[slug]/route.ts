import { NextResponse } from 'next/server';

import { getPublicEventSummary } from '@/server/publicEventSummaryService';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const summary = await getPublicEventSummary(slug);
    return NextResponse.json(
      { summary },
      { status: summary ? 200 : 404, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[api/public/events] failed to load public event', error);
    return NextResponse.json(
      { error: '청첩장 정보를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
