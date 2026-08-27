import 'server-only';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { isEventDeletionBlockingAccess } from './eventDeletionPolicy';

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
import { resolveStoredEventBySlug } from './repositories/eventRepository';

export { EventOwnershipInviteError };

type EventOwnershipInviteDependencies = {
  resolveEventBySlug: typeof resolveStoredEventBySlug;
  issueStoredInvite: typeof issueStoredEventOwnershipInvite;
  inspectStoredInvite: typeof inspectStoredEventOwnershipInvite;
  consumeStoredInvite: typeof consumeStoredEventOwnershipInvite;
};

const defaultEventOwnershipInviteDependencies: EventOwnershipInviteDependencies = {
  resolveEventBySlug: resolveStoredEventBySlug,
  issueStoredInvite: issueStoredEventOwnershipInvite,
  inspectStoredInvite: inspectStoredEventOwnershipInvite,
  consumeStoredInvite: consumeStoredEventOwnershipInvite,
};

async function assertOwnershipInviteAccessAvailable(
  pageSlug: string,
  dependencies: Pick<EventOwnershipInviteDependencies, 'resolveEventBySlug'>
) {
  const resolvedEvent = await dependencies.resolveEventBySlug(pageSlug);
  if (isEventDeletionBlockingAccess(resolvedEvent?.summary.deletion)) {
    throw new EventOwnershipInviteError(
      409,
      'unavailable',
      '현재 이용할 수 없는 청첩장입니다. 잠시 후 다시 시도해 주세요.'
    );
  }
}

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
}, dependencies: Pick<
  EventOwnershipInviteDependencies,
  'resolveEventBySlug' | 'issueStoredInvite'
> = defaultEventOwnershipInviteDependencies) {
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

  await assertOwnershipInviteAccessAvailable(
    pageSlug,
    dependencies
  );

  const createdAt = input.now ?? new Date();
  const expiresAt = new Date(createdAt.getTime() + OWNERSHIP_INVITE_TTL_MS);
  const token = createOwnershipInviteToken();
  const target = await dependencies.issueStoredInvite({
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
}, dependencies: Pick<
  EventOwnershipInviteDependencies,
  'resolveEventBySlug' | 'inspectStoredInvite'
> = defaultEventOwnershipInviteDependencies) {
  const pageSlug = normalizeInvitationPageSlugInput(input.pageSlug);
  if (!pageSlug) {
    return {
      eventId: '',
      slug: '',
      displayName: '',
      status: 'invalid' as const,
    };
  }

  await assertOwnershipInviteAccessAvailable(
    pageSlug,
    dependencies
  );

  return dependencies.inspectStoredInvite({
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
}, dependencies: Pick<
  EventOwnershipInviteDependencies,
  'resolveEventBySlug' | 'consumeStoredInvite'
> = defaultEventOwnershipInviteDependencies) {
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

  await assertOwnershipInviteAccessAvailable(
    pageSlug,
    dependencies
  );

  return dependencies.consumeStoredInvite({
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
