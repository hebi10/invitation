import 'server-only';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';

import {
  createOwnershipInviteToken,
  hashOwnershipInviteToken,
  OWNERSHIP_INVITE_TTL_MS,
} from './eventOwnershipInvitePolicy';
import {
  consumeStoredEventOwnershipInvite,
  EventOwnershipInviteError,
  inspectStoredEventOwnershipInvite,
  issueStoredEventOwnershipInvite,
} from './repositories/eventOwnershipInviteRepository';

export { EventOwnershipInviteError };

function normalizeRequiredValue(value: string, message: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw new EventOwnershipInviteError(400, 'missing', message);
  }

  return normalizedValue;
}

export async function issueEventOwnershipInvite(input: {
  pageSlug: string;
  createdByUid: string;
  baseUrl: string;
  now?: Date;
}) {
  const pageSlug = normalizeInvitationPageSlugInput(input.pageSlug);
  const createdByUid = normalizeRequiredValue(
    input.createdByUid,
    '초대 링크를 발급한 관리자 정보를 확인해 주세요.'
  );
  const baseUrl = normalizeRequiredValue(
    input.baseUrl,
    '초대 링크의 서비스 주소를 확인해 주세요.'
  ).replace(/\/+$/, '');
  if (!pageSlug) {
    throw new EventOwnershipInviteError(
      400,
      'missing',
      '연결할 청첩장 주소를 확인해 주세요.'
    );
  }

  const createdAt = input.now ?? new Date();
  const expiresAt = new Date(createdAt.getTime() + OWNERSHIP_INVITE_TTL_MS);
  const token = createOwnershipInviteToken();
  const target = await issueStoredEventOwnershipInvite({
    pageSlug,
    tokenHash: hashOwnershipInviteToken(token),
    createdByUid,
    createdAt,
    expiresAt,
  });

  return {
    ...target,
    token,
    url: `${baseUrl}/connect/${encodeURIComponent(target.slug)}#token=${encodeURIComponent(token)}`,
    expiresAt,
  };
}

export async function inspectEventOwnershipInvite(input: {
  pageSlug: string;
  token: string;
  now?: Date;
}) {
  const pageSlug = normalizeInvitationPageSlugInput(input.pageSlug);
  if (!pageSlug) {
    return {
      eventId: '',
      slug: '',
      displayName: '',
      status: 'invalid' as const,
    };
  }

  return inspectStoredEventOwnershipInvite({
    pageSlug,
    token: input.token,
    now: input.now ?? new Date(),
  });
}

export async function consumeEventOwnershipInvite(input: {
  pageSlug: string;
  token: string;
  customer: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
  };
  now?: Date;
}) {
  const pageSlug = normalizeInvitationPageSlugInput(input.pageSlug);
  const customerUid = normalizeRequiredValue(
    input.customer.uid,
    '로그인한 고객 정보를 확인해 주세요.'
  );
  if (!pageSlug) {
    throw new EventOwnershipInviteError(
      400,
      'missing',
      '연결할 청첩장 주소를 확인해 주세요.'
    );
  }

  return consumeStoredEventOwnershipInvite({
    pageSlug,
    token: input.token,
    customer: {
      uid: customerUid,
      email: input.customer.email?.trim() || null,
      displayName: input.customer.displayName?.trim() || null,
    },
    now: input.now ?? new Date(),
  });
}
