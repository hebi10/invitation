import 'server-only';

import type { InvitationPage } from '@/types/invitationPage';
import { getCustomerEditableInvitationPageSnapshot } from './customerEventsService';
import { getServerInvitationPageBySlug } from './invitationPageServerService';

export class CustomerInvitationPreviewError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'CustomerInvitationPreviewError';
  }
}

export async function getCustomerInvitationPreview(ownerUid: string, slug: string): Promise<InvitationPage> {
  const access = await getCustomerEditableInvitationPageSnapshot(ownerUid, slug);
  if (access.status !== 'ready') {
    throw new CustomerInvitationPreviewError(
      access.status === 'missing' ? 404 : access.status === 'unavailable' ? 409 : 403,
      '현재 계정에 연결된 이용 가능한 초대장만 미리볼 수 있습니다.',
    );
  }
  const page = await getServerInvitationPageBySlug(slug, {
    includePrivate: true,
    sampleFallbackMode: 'never',
  });
  if (!page) throw new CustomerInvitationPreviewError(404, '초대장을 찾지 못했습니다.');

  // Bypass visibility only in this authenticated response, never in persisted content.
  return {
    ...page,
    published: true,
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
    features: { ...page.features, showGuestbook: false, shareMode: 'none' },
  };
}
