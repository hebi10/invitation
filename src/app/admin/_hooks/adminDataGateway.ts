import {
  assignAdminCustomerEventOwnership,
  clearAdminCustomerEventOwnership,
  deleteAdminCustomerAccount,
  getAdminCustomerAccountsSnapshot,
  grantAdminCustomerWalletCredit,
  type AdminCustomerAccountsSnapshot,
} from '@/services/adminCustomerService';
import {
  getAdminDashboardSummary,
  type AdminDashboardSummarySnapshot,
} from '@/services/adminDashboardService';
import { deleteAdminEventByPageSlug } from '@/services/adminEventService';
import {
  deleteComment,
  getAllComments,
  type Comment,
} from '@/services/commentService';
import {
  issueAdminOwnershipInvite,
  type AdminOwnershipInviteResult,
} from '@/services/eventOwnershipInviteService';
import {
  getAllManagedInvitationPages,
  setInvitationPageProductTier,
  setInvitationPagePublished,
  setInvitationPageVariantAvailability,
  type EditableInvitationPageConfig,
  type InvitationPageSummary,
} from '@/services/invitationPageService';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
} from '@/lib/invitationVariants';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type {
  InvitationPageSeed,
  InvitationProductTier,
  InvitationThemeKey,
} from '@/types/invitationPage';

export interface AdminWalletGrantInput {
  kind: 'pageCreation' | 'operationTicket';
  quantity: number;
  tier?: InvitationProductTier | null;
  note?: string | null;
}

export interface AdminDataGateway {
  getDashboardSummary(): Promise<AdminDashboardSummarySnapshot>;
  getPages(): Promise<InvitationPageSummary[]>;
  getComments(): Promise<Comment[]>;
  getCustomerAccounts(): Promise<AdminCustomerAccountsSnapshot>;
  deleteComment(comment: Comment): Promise<void>;
  deleteEvent(slug: string): Promise<void>;
  setPublished(page: InvitationPageSummary, published: boolean): Promise<void>;
  setTier(page: InvitationPageSummary, tier: InvitationProductTier): Promise<void>;
  setVariant(
    page: InvitationPageSummary,
    theme: InvitationThemeKey,
    enabled: boolean
  ): Promise<void>;
  issueOwnershipInvite(slug: string): Promise<AdminOwnershipInviteResult>;
  assignOwnership(uid: string, slug: string): Promise<void>;
  clearOwnership(slug: string): Promise<void>;
  grantWalletCredit(uid: string, grant: AdminWalletGrantInput): Promise<void>;
  deleteCustomer(uid: string): Promise<{
    detachedEventCount: number;
    unpublishedEventCount: number;
  }>;
}

export const productionAdminDataGateway: AdminDataGateway = {
  getDashboardSummary: getAdminDashboardSummary,
  getPages: getAllManagedInvitationPages,
  getComments: getAllComments,
  getCustomerAccounts: getAdminCustomerAccountsSnapshot,
  async deleteComment(comment) {
    await deleteComment(comment.id, comment.collectionName);
  },
  async deleteEvent(slug) {
    await deleteAdminEventByPageSlug(slug);
  },
  async setPublished(page, published) {
    await setInvitationPagePublished(page.slug, published, {
      defaultTheme: page.defaultTheme,
    });
  },
  async setTier(page, tier) {
    await setInvitationPageProductTier(page.slug, tier);
  },
  async setVariant(page, theme, enabled) {
    await setInvitationPageVariantAvailability(page.slug, theme, enabled, {
      published: page.published,
      defaultTheme: page.defaultTheme,
    });
  },
  issueOwnershipInvite: issueAdminOwnershipInvite,
  assignOwnership: assignAdminCustomerEventOwnership,
  clearOwnership: clearAdminCustomerEventOwnership,
  async grantWalletCredit(uid, grant) {
    await grantAdminCustomerWalletCredit({ uid, ...grant });
  },
  async deleteCustomer(uid) {
    return deleteAdminCustomerAccount(uid);
  },
};

type DemoSnapshotResponse = {
  pages: InvitationPageSummary[];
  comments: Comment[];
  customerAccounts: AdminCustomerAccountsSnapshot;
  dashboard: AdminDashboardSummarySnapshot;
  error?: string;
};

type DemoEditableResponse = {
  version: number;
  editableConfig: EditableInvitationPageConfig;
  error?: string;
  code?: string;
};

function readDate(value: unknown) {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

async function readError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof payload?.error === 'string' && payload.error.trim()
    ? payload.error.trim()
    : fallback;
}

async function getDemoSnapshot(): Promise<DemoSnapshotResponse> {
  const response = await fetch('/api/experience/admin/snapshot', {
    method: 'GET',
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(await readError(response, '체험 관리자 정보를 불러오지 못했습니다.'));
  }
  const payload = (await response.json()) as DemoSnapshotResponse;
  return {
    ...payload,
    pages: (payload.pages ?? []).map((page) => ({
      ...page,
      createdAt: readDate(page.createdAt),
      updatedAt: readDate(page.updatedAt),
      displayPeriodStart: readDate(page.displayPeriodStart),
      displayPeriodEnd: readDate(page.displayPeriodEnd),
    })),
    comments: (payload.comments ?? []).map((comment) => ({
      ...comment,
      createdAt: readDate(comment.createdAt) ?? new Date(0),
    })),
  };
}

async function getDemoEditable(slug: string) {
  const response = await fetch(`/api/experience/events/${encodeURIComponent(slug)}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(await readError(response, '체험 청첩장 정보를 불러오지 못했습니다.'));
  }
  return (await response.json()) as DemoEditableResponse;
}

async function saveDemoEditable(
  slug: string,
  current: DemoEditableResponse,
  config: InvitationPageSeed,
  options: { published?: boolean; defaultTheme?: InvitationThemeKey } = {}
) {
  const response = await fetch(`/api/experience/events/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedVersion: current.version,
      config,
      published: options.published ?? current.editableConfig.published,
      defaultTheme: options.defaultTheme ?? current.editableConfig.defaultTheme,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, '체험 청첩장을 저장하지 못했습니다.'));
  }
}

function blockedExperienceAccountAction(): never {
  throw new Error('체험 모드에서는 실제 계정 작업을 실행하지 않습니다.');
}

export const demoExperienceAdminDataGateway: AdminDataGateway = {
  async getDashboardSummary() {
    return (await getDemoSnapshot()).dashboard;
  },
  async getPages() {
    return (await getDemoSnapshot()).pages;
  },
  async getComments() {
    return (await getDemoSnapshot()).comments;
  },
  async getCustomerAccounts() {
    return (await getDemoSnapshot()).customerAccounts;
  },
  async deleteComment(comment) {
    const response = await fetch(
      `/api/experience/events/${encodeURIComponent(comment.pageSlug)}/comments/${encodeURIComponent(comment.id)}`,
      { method: 'DELETE' }
    );
    if (!response.ok) {
      throw new Error(await readError(response, '체험 방명록을 삭제하지 못했습니다.'));
    }
  },
  async deleteEvent(slug) {
    const response = await fetch(`/api/experience/events/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await readError(response, '체험 청첩장을 삭제하지 못했습니다.'));
    }
  },
  async setPublished(page, published) {
    const current = await getDemoEditable(page.slug);
    await saveDemoEditable(page.slug, current, current.editableConfig.config, {
      published,
    });
  },
  async setTier(page, tier) {
    const current = await getDemoEditable(page.slug);
    await saveDemoEditable(
      page.slug,
      current,
      {
        ...current.editableConfig.config,
        productTier: tier,
        features: resolveInvitationFeatures(tier),
      }
    );
  },
  async setVariant(page, theme, enabled) {
    const current = await getDemoEditable(page.slug);
    const config = structuredClone(current.editableConfig.config) as InvitationPageSeed;
    const availableThemes = new Set(getAvailableInvitationVariantKeys(config.variants));
    if (enabled) {
      availableThemes.add(theme);
    } else {
      availableThemes.delete(theme);
    }
    config.variants = buildInvitationVariants(config.slug, config.displayName, {
      availability: createInvitationVariantAvailability([...availableThemes]),
    });
    await saveDemoEditable(page.slug, current, config);
  },
  async issueOwnershipInvite() {
    return blockedExperienceAccountAction();
  },
  async assignOwnership() {
    blockedExperienceAccountAction();
  },
  async clearOwnership() {
    blockedExperienceAccountAction();
  },
  async grantWalletCredit() {
    blockedExperienceAccountAction();
  },
  async deleteCustomer() {
    return blockedExperienceAccountAction();
  },
};
