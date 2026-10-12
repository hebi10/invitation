import { NextResponse } from 'next/server';

import { CustomerApiAuthError, verifyCustomerUid } from '@/server/customerApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { CustomerEventClaimError } from '@/server/customerEventClaimPolicy';
import { CustomerInvitationPreviewError, getCustomerInvitationPreview } from '@/server/customerInvitationPreviewService';

const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const uid = await verifyCustomerUid(request, { requireVerified: true });
    const { slug } = await context.params;
    const page = await getCustomerInvitationPreview(uid, slug);
    return NextResponse.json({ page }, { headers });
  } catch (error) {
    if (error instanceof CustomerApiAuthError || error instanceof CustomerInvitationPreviewError || error instanceof CustomerEventClaimError) {
      const response = toSafeHttpErrorResponse(error);
      Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      return response;
    }
    console.error('[customer/preview] failed to load preview', error);
    return NextResponse.json({ error: '초대장 미리보기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500, headers });
  }
}
