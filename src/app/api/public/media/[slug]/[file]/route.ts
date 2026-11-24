import {
  getInvitationMediaGatewayImage, invitationMediaGatewayResponse, invitationMediaGatewayError,
} from '@/server/invitationMediaGatewayService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ slug: string; file: string }> }) {
  try {
    const { slug, file } = await context.params;
    return invitationMediaGatewayResponse(await getInvitationMediaGatewayImage(slug, file, { kind: 'public' }));
  } catch (error) {
    return invitationMediaGatewayError(error);
  }
}
