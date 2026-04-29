import 'server-only';

import type { CustomerWalletSummary } from '@/types/customerWallet';
import type {
  InvitationProductTier,
  InvitationThemeKey,
} from '@/types/invitationPage';

import { firestoreCustomerWalletRepository } from './repositories/customerWalletRepository';
import { setServerClientPassword } from './clientPasswordServerService';
import { createServerInvitationPageDraftFromSeed } from './invitationPageServerService';
import { firestoreEventRepository } from './repositories/eventRepository';

export interface AdminCustomerWalletGrantInput {
  ownerUid: string;
  adminUid: string;
  kind: 'pageCreation' | 'operationTicket';
  quantity: number;
  tier?: InvitationProductTier | null;
  note?: string | null;
}

export interface MobileTicketPackWalletAssignmentInput {
  ownerUid: string;
  appUserId: string;
  transactionId: string;
  productId: string;
  ticketCount: number;
  targetPageSlug: string;
  eventId?: string | null;
}

export interface CustomerWalletPageCreationInput {
  ownerUid: string;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
  seedSlug: string;
  slugBase: string;
  groomName: string;
  brideName: string;
  password: string;
  productTier: InvitationProductTier;
  defaultTheme: InvitationThemeKey;
}

export async function getCustomerWalletSummary(ownerUid: string) {
  return firestoreCustomerWalletRepository.findSummaryByOwnerUid(ownerUid);
}

export async function listCustomerWalletSummariesByOwnerUids(ownerUids: string[]) {
  return firestoreCustomerWalletRepository.listSummariesByOwnerUids(ownerUids);
}

export async function grantAdminCustomerWalletCredit(
  input: AdminCustomerWalletGrantInput
): Promise<CustomerWalletSummary> {
  const normalizedQuantity = Number.isFinite(input.quantity)
    ? Math.trunc(input.quantity)
    : 0;

  if (normalizedQuantity <= 0) {
    throw new Error('지급할 수량을 1 이상으로 입력해 주세요.');
  }

  if (input.kind === 'pageCreation' && !input.tier) {
    throw new Error('제작권 지급에는 서비스 등급이 필요합니다.');
  }

  return firestoreCustomerWalletRepository.adjustBalance({
    ownerUid: input.ownerUid,
    kind: input.kind,
    direction: 'credit',
    quantity: normalizedQuantity,
    tier: input.kind === 'pageCreation' ? input.tier : null,
    source: 'adminGrant',
    platform: 'admin',
    status: 'active',
    note: input.note ?? null,
    createdByUid: input.adminUid,
  });
}

export async function recordMobileTicketPackAssignedToEvent(
  input: MobileTicketPackWalletAssignmentInput
) {
  const normalizedTicketCount = Number.isFinite(input.ticketCount)
    ? Math.trunc(input.ticketCount)
    : 0;

  if (normalizedTicketCount <= 0) {
    return null;
  }

  // Mobile ticket packs are currently applied directly to a linked event.
  // Keep the account wallet balance unchanged by recording a purchase credit
  // and an immediate event assignment debit with idempotent ledger ids.
  await firestoreCustomerWalletRepository.adjustBalance({
    ownerUid: input.ownerUid,
    kind: 'operationTicket',
    direction: 'credit',
    quantity: normalizedTicketCount,
    source: 'mobilePurchase',
    platform: 'mobile',
    status: 'assigned',
    eventId: input.eventId ?? null,
    pageSlug: input.targetPageSlug,
    transactionId: input.transactionId,
    provider: 'revenuecat',
    note: `Mobile purchase ${input.productId} credited before event assignment.`,
    idempotencyKey: `mobile_purchase:${input.transactionId}:credit`,
  });

  return firestoreCustomerWalletRepository.adjustBalance({
    ownerUid: input.ownerUid,
    kind: 'operationTicket',
    direction: 'debit',
    quantity: normalizedTicketCount,
    source: 'eventAssignment',
    platform: 'mobile',
    status: 'assigned',
    eventId: input.eventId ?? null,
    pageSlug: input.targetPageSlug,
    transactionId: input.transactionId,
    provider: 'revenuecat',
    note: `Mobile purchase ${input.productId} assigned to ${input.targetPageSlug}.`,
    idempotencyKey: `mobile_purchase:${input.transactionId}:assign:${input.targetPageSlug}`,
  });
}

export async function createCustomerInvitationPageFromWalletCredit(
  input: CustomerWalletPageCreationInput
) {
  const normalizedOwnerUid = input.ownerUid.trim();
  if (!normalizedOwnerUid) {
    throw new Error('로그인 계정을 확인하지 못했습니다.');
  }

  await firestoreCustomerWalletRepository.adjustBalance({
    ownerUid: normalizedOwnerUid,
    kind: 'pageCreation',
    direction: 'debit',
    quantity: 1,
    tier: input.productTier,
    source: 'eventAssignment',
    platform: 'web',
    status: 'consumed',
    note: `${input.productTier.toUpperCase()} 제작권을 새 청첩장 생성에 사용했습니다.`,
  });

  try {
    const createdDraft = await createServerInvitationPageDraftFromSeed({
      seedSlug: input.seedSlug,
      slugBase: input.slugBase,
      groomName: input.groomName,
      brideName: input.brideName,
      published: false,
      defaultTheme: input.defaultTheme,
      productTier: input.productTier,
      initialDisplayPeriodMonths: 6,
    });

    await setServerClientPassword(createdDraft.slug, input.password);
    const assignedEvent = await firestoreEventRepository.assignOwnerBySlug({
      pageSlug: createdDraft.slug,
      ownerUid: normalizedOwnerUid,
      ownerEmail: input.ownerEmail ?? null,
      ownerDisplayName: input.ownerDisplayName ?? null,
    });

    return {
      slug: createdDraft.slug,
      eventId: assignedEvent.summary.eventId,
      config: createdDraft.config,
    };
  } catch (error) {
    await firestoreCustomerWalletRepository.adjustBalance({
      ownerUid: normalizedOwnerUid,
      kind: 'pageCreation',
      direction: 'credit',
      quantity: 1,
      tier: input.productTier,
      source: 'system',
      platform: 'system',
      status: 'active',
      note: `${input.productTier.toUpperCase()} 제작권 사용 중 오류가 발생해 자동 환불했습니다.`,
    });
    throw error;
  }
}
