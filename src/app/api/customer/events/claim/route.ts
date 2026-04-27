import { NextResponse } from 'next/server';

import { getCustomerEditableInvitationPageSnapshot } from '@/server/customerEventsService';
import { verifyServerClientPassword } from '@/server/clientPasswordServerService';
import { getServerAuth } from '@/server/firebaseAdmin';
import { firestoreEventRepository, resolveStoredEventBySlug } from '@/server/repositories/eventRepository';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const CUSTOMER_EVENT_CLAIM_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;

async function buildClaimSuccessPayload(ownerUid: string, pageSlug: string, eventId: string) {
  const editableSnapshot = await getCustomerEditableInvitationPageSnapshot(ownerUid, pageSlug);

  return {
    success: true,
    slug: pageSlug,
    eventId,
    config: editableSnapshot.status === 'ready' ? editableSnapshot.config : null,
  };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return NextResponse.json(
        { error: '로그인 토큰이 없습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      );
    }

    const serverAuth = getServerAuth();
    if (!serverAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin Auth를 초기화하지 못했습니다.' },
        { status: 500 }
      );
    }

    const decodedToken = await serverAuth.verifyIdToken(idToken);
    const body = (await request.json().catch(() => null)) as
      | { pageSlug?: unknown; password?: unknown }
      | null;
    const pageSlug =
      typeof body?.pageSlug === 'string' ? body.pageSlug.trim() : '';
    const password =
      typeof body?.password === 'string' ? body.password.trim() : '';

    if (!pageSlug || !password) {
      return NextResponse.json(
        { error: '청첩장 주소와 기존 페이지 비밀번호를 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'customer-event-claim',
      keyParts: [decodedToken.uid, pageSlug],
      ...CUSTOMER_EVENT_CLAIM_RATE_LIMIT,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '연결 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
    if (!resolvedEvent) {
      return NextResponse.json(
        { error: '해당 청첩장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (
      resolvedEvent.summary.ownerUid &&
      resolvedEvent.summary.ownerUid !== decodedToken.uid
    ) {
      return NextResponse.json(
        { error: '이미 다른 계정에 연결된 청첩장입니다.' },
        { status: 409 }
      );
    }

    if (resolvedEvent.summary.ownerUid === decodedToken.uid) {
      return NextResponse.json(
        await buildClaimSuccessPayload(
          decodedToken.uid,
          resolvedEvent.summary.slug,
          resolvedEvent.summary.eventId
        )
      );
    }

    const verification = await verifyServerClientPassword(pageSlug, password);
    if (!verification.verified) {
      return NextResponse.json(
        { error: '기존 페이지 비밀번호가 올바르지 않습니다.' },
        {
          status: 401,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const assignedEvent = await firestoreEventRepository.assignOwnerBySlug({
      pageSlug,
      ownerUid: decodedToken.uid,
      ownerEmail: decodedToken.email ?? null,
      ownerDisplayName: decodedToken.name ?? null,
    });

    return NextResponse.json(
      await buildClaimSuccessPayload(
        decodedToken.uid,
        assignedEvent.summary.slug,
        assignedEvent.summary.eventId
      ),
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[customer/events/claim] failed to claim event ownership', error);
    return NextResponse.json(
      { error: '청첩장 계정 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
