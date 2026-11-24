import { authorizeMobileClientEditorRequest } from '@/server/clientEditorMobileApi';
import { getInvitationMediaGatewayImage, invitationMediaGatewayResponse, invitationMediaGatewayError } from '@/server/invitationMediaGatewayService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ slug: string; file: string }> };

async function authorize(request: Request, slug: string) {
  const access = await authorizeMobileClientEditorRequest(request, slug);
  const session = access?.mobileSession;
  if (!access?.permissions.canViewDashboard || !access.permissions.canEditInvitation ||
      !session?.sessionId || !session.ownerUid || !session.eventId || session.pageSlug !== slug ||
      !session.scopes.includes('canViewDashboard') || !session.scopes.includes('canEditInvitation')) return null;
  return { sessionId: session.sessionId, uid: session.ownerUid, eventId: session.eventId };
}

const denied = () => Response.json({ error: '이미지 편집 권한을 확인해 주세요.' }, {
  status: 403, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
});

export async function GET(request: Request, context: Context) {
  try {
    const { slug, file } = await context.params;
    const access = await authorize(request, slug);
    if (!access) return denied();
    // A fully bound editor can view both saved and not-yet-saved images of their own event.
    const image = await getInvitationMediaGatewayImage(slug, file, { kind: 'editor-owner', uid: access.uid, eventId: access.eventId });
    const latest = await authorize(request, slug);
    if (!latest || latest.sessionId !== access.sessionId || latest.uid !== access.uid || latest.eventId !== access.eventId) return denied();
    return invitationMediaGatewayResponse(image);
  } catch (error) {
    return invitationMediaGatewayError(error);
  }
}
