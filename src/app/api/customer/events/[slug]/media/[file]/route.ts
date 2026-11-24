import { verifyCustomerRequest, CustomerApiAuthError } from '@/server/customerApiAuth';
import { canUseVerifiedCustomerFeatures } from '@/server/customerAuthVerification';
import { isServerAdminUserEnabled } from '@/server/adminUserServerService';
import {
  getInvitationMediaGatewayImage, invitationMediaGatewayResponse, invitationMediaGatewayError,
} from '@/server/invitationMediaGatewayService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ slug: string; file: string }> }) {
  try {
    const identity = await verifyCustomerRequest(request);
    const admin = await isServerAdminUserEnabled(identity.uid);
    if (!admin && !canUseVerifiedCustomerFeatures(identity)) {
      throw new CustomerApiAuthError(403, '이메일 인증이 필요합니다.');
    }
    const { slug, file } = await context.params;
    return invitationMediaGatewayResponse(await getInvitationMediaGatewayImage(slug, file,
      admin ? { kind: 'admin' } : { kind: 'owner', uid: identity.uid }));
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return Response.json({ error: '인증 및 접근 권한을 확인해 주세요.' }, {
        status: error.status, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      });
    }
    return invitationMediaGatewayError(error);
  }
}
