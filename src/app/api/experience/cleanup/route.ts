import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getKstDateKey } from '@/lib/demoExperienceTime';
import { canDeleteDemoExperienceDate } from '@/server/demoExperienceCleanupPolicy';
import { firestoreDemoExperienceRepository } from '@/server/repositories/demoExperienceRepository';

export const runtime = 'nodejs';

function hasValidCleanupAuthorization(request: Request) {
  const secret = process.env.DEMO_EXPERIENCE_CLEANUP_SECRET?.trim() ?? '';
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const provided = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!secret || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(secret, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function POST(request: Request) {
  if (!process.env.DEMO_EXPERIENCE_CLEANUP_SECRET?.trim()) {
    return NextResponse.json(
      { error: '체험 데이터 정리 설정을 확인해 주세요.' },
      { status: 503 }
    );
  }

  if (!hasValidCleanupAuthorization(request)) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { dateKey?: unknown } | null;
  const targetDateKey = typeof body?.dateKey === 'string' ? body.dateKey.trim() : '';
  const currentDateKey = getKstDateKey();
  if (!canDeleteDemoExperienceDate(targetDateKey, currentDateKey)) {
    return NextResponse.json(
      { error: '현재 날짜보다 과거인 유효한 체험 날짜만 정리할 수 있습니다.' },
      { status: 400 }
    );
  }

  await firestoreDemoExperienceRepository.recursiveDeleteDate(targetDateKey);
  return NextResponse.json({ deleted: true, dateKey: targetDateKey });
}
