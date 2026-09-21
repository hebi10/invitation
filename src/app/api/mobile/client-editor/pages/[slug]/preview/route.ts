import { NextResponse } from 'next/server';

import { authorizeMobileClientEditorRequest } from '@/server/clientEditorMobileApi';
import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';
import { issueInvitationPreviewToken, verifyInvitationPreviewToken } from '@/server/mobileInvitationPreviewToken';
import { firestoreMobileClientEditorSessionRepository } from '@/server/repositories/mobileClientEditorSessionRepository';
import { resolveStoredEventBySlug } from '@/server/repositories/eventRepository';
import { isEventDeletionBlockingAccess } from '@/server/eventDeletionPolicy';

const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  const { slug } = await context.params;
  const access = await authorizeMobileClientEditorRequest(request, slug);
  if (!access?.mobileSession || !access.permissions.canViewDashboard) {
    return NextResponse.json({ error: '다시 로그인한 뒤 미리보기를 열어 주세요.' }, { status: 401, headers });
  }
  return NextResponse.json(issueInvitationPreviewToken(slug, access.mobileSession.sessionId, access.session.expiresAt), { headers });
}

export async function GET(request: Request, context: Context) {
  const { slug } = await context.params;
  const value = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const grant = verifyInvitationPreviewToken(value, slug);
  if (!grant) return NextResponse.json({ error: '미리보기가 만료되었습니다. 앱에서 다시 열어 주세요.' }, { status: 401, headers });
  const [session, event] = await Promise.all([
    firestoreMobileClientEditorSessionRepository.findBySessionId(grant.sessionId),
    resolveStoredEventBySlug(slug),
  ]);
  if (!session || session.pageSlug !== slug || session.revokedAt || !session.expiresAt ||
      session.expiresAt.getTime() <= Date.now() || !event ||
      (session.eventId && session.eventId !== event.summary.eventId) ||
      isEventDeletionBlockingAccess(event.summary.deletion) ||
      (session.ownerUid && session.ownerUid !== event.summary.ownerUid)) {
    return NextResponse.json({ error: '미리보기 권한을 확인하지 못했습니다.' }, { status: 401, headers });
  }
  const page = await getServerInvitationPageBySlug(slug, { includePrivate: true, sampleFallbackMode: 'never' });
  if (!page) return NextResponse.json({ error: '청첩장을 찾지 못했습니다.' }, { status: 404, headers });
  // Only this authenticated read response bypasses publication; persisted data is unchanged.
  return NextResponse.json({ page: { ...page, published: true, displayPeriodEnabled: false,
    displayPeriodStart: null, displayPeriodEnd: null,
    features: { ...page.features, showGuestbook: false, shareMode: 'none' } } }, { headers });
}
