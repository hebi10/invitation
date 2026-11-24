import { NextResponse } from 'next/server';

import { authorizeMobileClientEditorRequest } from '@/server/clientEditorMobileApi';
import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';
import { issueInvitationPreviewToken, verifyInvitationPreviewToken } from '@/server/mobileInvitationPreviewToken';
import { firestoreMobileClientEditorSessionRepository } from '@/server/repositories/mobileClientEditorSessionRepository';
import { resolveStoredEventBySlug } from '@/server/repositories/eventRepository';
import { isEventDeletionBlockingAccess } from '@/server/eventDeletionPolicy';
import { projectPilotPrivateInvitationMedia } from '@/server/invitationMediaProjection';
import {
  getInvitationMediaGatewayImage, invitationMediaGatewayResponse, invitationMediaGatewayError,
} from '@/server/invitationMediaGatewayService';

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

async function readPreviewAccess(value: string, slug: string) {
  const grant = verifyInvitationPreviewToken(value, slug);
  if (!grant) return null;
  const [session, event] = await Promise.all([
    firestoreMobileClientEditorSessionRepository.findBySessionId(grant.sessionId),
    resolveStoredEventBySlug(slug),
  ]);
  if (!session || session.pageSlug !== slug || session.revokedAt || !session.expiresAt ||
      session.expiresAt.getTime() <= Date.now() || !event ||
      (session.eventId && session.eventId !== event.summary.eventId) ||
      isEventDeletionBlockingAccess(event.summary.deletion) ||
      (session.ownerUid && session.ownerUid !== event.summary.ownerUid)) {
    return null;
  }
  return { session, event };
}

export async function GET(request: Request, context: Context) {
  const { slug } = await context.params;
  const authorization = request.headers.get('authorization') ?? '';
  const value = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  try {
    const access = await readPreviewAccess(value, slug);
    if (!access) return NextResponse.json({ error: '미리보기 권한을 확인하지 못했습니다. 앱에서 다시 열어 주세요.' }, { status: 401, headers });

    const files = new URL(request.url).searchParams.getAll('media');
    if (files.length) {
      const { session, event } = access;
      // Only an explicitly owner/event-bound preview session may request pilot media.
      // A legacy link-token session is not expanded to a new access permission.
      if (files.length !== 1 || !session.ownerUid || !session.eventId ||
          session.eventId !== event.summary.eventId || session.ownerUid !== event.summary.ownerUid ||
          !session.scopes?.includes('canViewDashboard')) {
        return NextResponse.json({ error: '이미지 미리보기 권한을 확인하지 못했습니다.' }, { status: 403, headers });
      }
      const image = await getInvitationMediaGatewayImage(slug, files[0], {
        kind: 'preview-owner', uid: session.ownerUid, eventId: session.eventId,
      });
      const latest = await readPreviewAccess(value, slug);
      if (!latest || latest.session.ownerUid !== session.ownerUid ||
          latest.session.eventId !== session.eventId || !latest.session.scopes?.includes('canViewDashboard')) {
        return NextResponse.json({ error: '이미지 미리보기 권한이 만료되었습니다.' }, { status: 401, headers });
      }
      const response = invitationMediaGatewayResponse(image);
      response.headers.set('Referrer-Policy', 'no-referrer');
      return response;
    }
    const page = await getServerInvitationPageBySlug(slug, { includePrivate: true, sampleFallbackMode: 'never' });
    if (!page) return NextResponse.json({ error: '청첩장을 찾지 못했습니다.' }, { status: 404, headers });
    // Only this authenticated read response bypasses publication; persisted data is unchanged.
    const projected = projectPilotPrivateInvitationMedia(page, slug, 'mobile');
    if (projected !== page && (!access.session.ownerUid || !access.session.eventId ||
        access.session.ownerUid !== access.event.summary.ownerUid ||
        access.session.eventId !== access.event.summary.eventId ||
        !access.session.scopes?.includes('canViewDashboard'))) {
      return NextResponse.json({ error: '앱에서 다시 로그인한 뒤 미리보기를 열어 주세요.' }, { status: 403, headers });
    }
    return NextResponse.json({ page: { ...projected,
      published: true, displayPeriodEnabled: false, displayPeriodStart: null, displayPeriodEnd: null,
      features: { ...page.features, showGuestbook: false, shareMode: 'none' } } }, { headers });
  } catch (error) {
    const response = invitationMediaGatewayError(error);
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  }
}
