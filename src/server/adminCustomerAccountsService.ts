import 'server-only';

import type { UserRecord } from 'firebase-admin/auth';

import type { EventTypeKey } from '@/lib/eventTypes';
import type { CustomerWalletSummary } from '@/types/customerWallet';
import {
  EMPTY_CUSTOMER_PAGE_CREATION_CREDITS,
} from '@/types/customerWallet';
import { listCustomerWalletSummariesByOwnerUids } from './customerWalletServerService';
import { listServerAdminUserIds } from './adminUserServerService';
import { getServerAuth } from './firebaseAdmin';
import {
  firestoreEventRepository,
  listStoredEventSummaries,
  resolveStoredEventBySlug,
} from './repositories/eventRepository';

export interface AdminCustomerLinkedEventSummary {
  eventId: string;
  slug: string;
  eventType: EventTypeKey;
  displayName: string;
  published: boolean;
  defaultTheme: string;
  updatedAt: Date | null;
}

export interface AdminCustomerAccountSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  disabled: boolean;
  emailVerified: boolean;
  providerIds: string[];
  createdAt: Date | null;
  lastSignInAt: Date | null;
  missingAuthUser: boolean;
  linkedEvents: AdminCustomerLinkedEventSummary[];
  wallet: CustomerWalletSummary;
}

export interface AdminCustomerAccountsSnapshot {
  accounts: AdminCustomerAccountSummary[];
  unassignedEvents: AdminCustomerLinkedEventSummary[];
}

function toDateOrNull(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

function toLinkedEventSummary(input: {
  eventId: string;
  slug: string;
  eventType: EventTypeKey;
  displayName?: string | null;
  title?: string | null;
  published: boolean;
  defaultTheme: string;
  updatedAt: Date | null;
}) {
  return {
    eventId: input.eventId,
    slug: input.slug,
    eventType: input.eventType,
    displayName: input.displayName?.trim() || input.title?.trim() || input.slug,
    published: input.published,
    defaultTheme: input.defaultTheme,
    updatedAt: input.updatedAt,
  } satisfies AdminCustomerLinkedEventSummary;
}

function buildEmptyWallet(uid: string): CustomerWalletSummary {
  return {
    ownerUid: uid,
    pageCreationCredits: { ...EMPTY_CUSTOMER_PAGE_CREATION_CREDITS },
    operationTicketBalance: 0,
    updatedAt: null,
    recentLedger: [],
  };
}

async function listAllAuthUsers() {
  const serverAuth = getServerAuth();
  if (!serverAuth) {
    throw new Error('Firebase Admin Auth를 초기화하지 못했습니다.');
  }

  const users: UserRecord[] = [];
  let nextPageToken: string | undefined;

  do {
    const page = await serverAuth.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return users;
}

export async function listAdminCustomerAccountsSnapshot(): Promise<AdminCustomerAccountsSnapshot> {
  const [users, adminUserIds, eventSummaries] = await Promise.all([
    listAllAuthUsers(),
    listServerAdminUserIds(),
    listStoredEventSummaries(),
  ]);
  const linkedEventsByOwnerUid = new Map<string, AdminCustomerLinkedEventSummary[]>();
  const unassignedEvents: AdminCustomerLinkedEventSummary[] = [];

  eventSummaries.forEach((summary) => {
    const linkedEvent = toLinkedEventSummary({
      eventId: summary.eventId,
      slug: summary.slug,
      eventType: summary.eventType,
      displayName: summary.displayName,
      title: summary.title,
      published: summary.published,
      defaultTheme: summary.defaultTheme,
      updatedAt: summary.updatedAt,
    });
    const ownerUid = summary.ownerUid?.trim() ?? '';

    if (!ownerUid) {
      unassignedEvents.push(linkedEvent);
      return;
    }

    const nextItems = linkedEventsByOwnerUid.get(ownerUid) ?? [];
    nextItems.push(linkedEvent);
    linkedEventsByOwnerUid.set(ownerUid, nextItems);
  });

  const knownUserIds = new Set(users.map((user) => user.uid));
  const walletOwnerUids = [
    ...new Set([
      ...users.map((user) => user.uid),
      ...linkedEventsByOwnerUid.keys(),
    ]),
  ];
  const walletsByOwnerUid = await listCustomerWalletSummariesByOwnerUids(walletOwnerUids);
  const orphanedAccounts = [...linkedEventsByOwnerUid.entries()]
    .filter(([uid]) => !knownUserIds.has(uid))
    .map(([uid, linkedEvents]) => ({
      uid,
      email: null,
      displayName: null,
      isAdmin: false,
      disabled: false,
      emailVerified: false,
      providerIds: [],
      createdAt: null,
      lastSignInAt: null,
      missingAuthUser: true,
      linkedEvents: [...linkedEvents].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, 'ko')
      ),
      wallet: walletsByOwnerUid.get(uid) ?? buildEmptyWallet(uid),
    }) satisfies AdminCustomerAccountSummary);

  const accounts = users
    .map((user) => ({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      isAdmin: adminUserIds.has(user.uid),
      disabled: user.disabled,
      emailVerified: user.emailVerified,
      providerIds: user.providerData
        .map((provider) => provider.providerId?.trim() ?? '')
        .filter(Boolean),
      createdAt: toDateOrNull(user.metadata.creationTime),
      lastSignInAt: toDateOrNull(user.metadata.lastSignInTime),
      missingAuthUser: false,
      linkedEvents: [...(linkedEventsByOwnerUid.get(user.uid) ?? [])].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, 'ko')
      ),
      wallet: walletsByOwnerUid.get(user.uid) ?? buildEmptyWallet(user.uid),
    }) satisfies AdminCustomerAccountSummary)
    .sort((left, right) => {
      const rightLinkedCount = right.linkedEvents.length;
      const leftLinkedCount = left.linkedEvents.length;
      if (rightLinkedCount !== leftLinkedCount) {
        return rightLinkedCount - leftLinkedCount;
      }

      const leftName = left.displayName?.trim() || left.email?.trim() || left.uid;
      const rightName = right.displayName?.trim() || right.email?.trim() || right.uid;
      return leftName.localeCompare(rightName, 'ko');
    });

  return {
    accounts: [...accounts, ...orphanedAccounts],
    unassignedEvents: unassignedEvents.sort((left, right) =>
      left.displayName.localeCompare(right.displayName, 'ko')
    ),
  };
}

export async function assignAdminCustomerEventOwnership(input: {
  uid: string;
  pageSlug: string;
}) {
  const serverAuth = getServerAuth();
  if (!serverAuth) {
    throw new Error('Firebase Admin Auth를 초기화하지 못했습니다.');
  }

  const normalizedUid = input.uid.trim();
  const normalizedPageSlug = input.pageSlug.trim();
  if (!normalizedUid || !normalizedPageSlug) {
    throw new Error('고객 계정과 청첩장 주소를 모두 선택해 주세요.');
  }

  const [userRecord, resolvedEvent] = await Promise.all([
    serverAuth.getUser(normalizedUid),
    resolveStoredEventBySlug(normalizedPageSlug),
  ]);

  if (!resolvedEvent) {
    throw new Error('연결할 청첩장을 찾지 못했습니다.');
  }

  const currentOwnerUid = resolvedEvent.summary.ownerUid?.trim() ?? '';
  if (currentOwnerUid && currentOwnerUid !== normalizedUid) {
    throw new Error('이미 다른 고객 계정에 연결된 청첩장입니다. 먼저 연결을 해제해 주세요.');
  }

  if (currentOwnerUid === normalizedUid) {
    return resolvedEvent;
  }

  return firestoreEventRepository.assignOwnerBySlug({
    pageSlug: normalizedPageSlug,
    ownerUid: normalizedUid,
    ownerEmail: userRecord.email ?? null,
    ownerDisplayName: userRecord.displayName ?? null,
  });
}

export async function clearAdminCustomerEventOwnership(input: { pageSlug: string }) {
  const normalizedPageSlug = input.pageSlug.trim();
  if (!normalizedPageSlug) {
    throw new Error('연결 해제할 청첩장 주소가 올바르지 않습니다.');
  }

  return firestoreEventRepository.clearOwnerBySlug(normalizedPageSlug);
}
