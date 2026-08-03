import { getAvailableInvitationVariantKeys } from '@/lib/invitationVariants';
import {
  deleteCustomerEventGuestbookComment,
  listCustomerEventGuestbookComments,
  listOwnedCustomerEvents,
  type CustomerEventGuestbookComment,
  type CustomerOwnedEventSummary,
} from '@/services/customerEventService';
import { getCustomerWalletSnapshot } from '@/services/customerWalletService';
import type { CustomerWalletSummary } from '@/types/customerWallet';
import type { DemoExperienceStoredEvent } from '@/types/demoExperience';

export interface CustomerDataGateway {
  listEvents(ownerUid: string): Promise<CustomerOwnedEventSummary[]>;
  getWallet(ownerUid: string): Promise<CustomerWalletSummary>;
  listComments(slug: string): Promise<CustomerEventGuestbookComment[]>;
  deleteComment(slug: string, commentId: string): Promise<void>;
}

export const productionCustomerDataGateway: CustomerDataGateway = {
  listEvents: listOwnedCustomerEvents,
  getWallet: getCustomerWalletSnapshot,
  listComments: listCustomerEventGuestbookComments,
  deleteComment: deleteCustomerEventGuestbookComment,
};

async function readError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof payload?.error === 'string' && payload.error.trim()
    ? payload.error.trim()
    : fallback;
}

function readDate(value: unknown) {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export const demoExperienceCustomerDataGateway: CustomerDataGateway = {
  async listEvents() {
    const response = await fetch('/api/experience/events', {
      method: 'GET',
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => null)) as
      | { events?: DemoExperienceStoredEvent[]; error?: string }
      | null;
    if (!response.ok) {
      throw new Error(await readError(response, '금일 체험 청첩장을 불러오지 못했습니다.'));
    }
    return (payload?.events ?? []).map((event) => ({
      eventId: event.eventId,
      slug: event.slug,
      eventType: 'wedding',
      title: '금일 체험 청첩장',
      displayName: '금일 체험 청첩장',
      published: event.published,
      defaultTheme: event.defaultTheme,
      availableThemes: getAvailableInvitationVariantKeys(event.config.variants),
      updatedAt: readDate(event.updatedAt),
    }));
  },
  async getWallet(ownerUid) {
    return {
      ownerUid,
      pageCreationCredits: { standard: 0, deluxe: 0, premium: 0 },
      operationTicketBalance: 0,
      updatedAt: null,
      recentLedger: [],
    };
  },
  async listComments(slug) {
    const response = await fetch(
      `/api/experience/events/${encodeURIComponent(slug)}/comments`,
      { method: 'GET', cache: 'no-store' }
    );
    const payload = (await response.json().catch(() => null)) as
      | {
          comments?: Array<{
            id: string;
            author: string;
            message: string;
            pageSlug: string;
            createdAt: string | null;
          }>;
          error?: string;
        }
      | null;
    if (!response.ok) {
      throw new Error(await readError(response, '체험 방명록을 불러오지 못했습니다.'));
    }
    return (payload?.comments ?? []).map((comment) => ({
      ...comment,
      status: 'public' as const,
      createdAt: readDate(comment.createdAt),
      hiddenAt: null,
      deletedAt: null,
      scheduledDeleteAt: null,
      restoredAt: null,
    }));
  },
  async deleteComment(slug, commentId) {
    const response = await fetch(
      `/api/experience/events/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' }
    );
    if (!response.ok) {
      throw new Error(await readError(response, '체험 방명록을 삭제하지 못했습니다.'));
    }
  },
};
