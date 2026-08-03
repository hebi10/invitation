import 'server-only';

import {
  createDemoExperienceSeedEvents,
  DEMO_EXPERIENCE_DAILY_SLUG,
  DEMO_EXPERIENCE_IMAGE_OPTIONS,
} from '@/config/demoExperienceSeeds';
import { getKstDateKey } from '@/lib/demoExperienceTime';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
} from '@/lib/invitationVariants';
import { mergeInvitationPageSeed } from '@/lib/invitationPagePersistence';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import type {
  AdminCustomerAccountSummary,
  AdminCustomerAccountsSnapshot,
  AdminCustomerLinkedEventSummary,
} from '@/services/adminCustomerService';
import type { AdminDashboardSummarySnapshot } from '@/services/adminDashboardService';
import type { Comment } from '@/services/commentService';
import type {
  EditableInvitationPageConfig,
  InvitationPageSummary,
} from '@/services/invitationPageService';
import type {
  DemoExperienceRole,
  DemoExperienceSaveInput,
  DemoExperienceStoredEvent,
} from '@/types/demoExperience';
import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  DemoExperienceVersionConflictError,
  firestoreDemoExperienceRepository,
  type DemoExperienceRepository,
} from './repositories/demoExperienceRepository';

const RECENT_COMMENT_DAYS = 7;

export interface DemoExperienceEditableEvent {
  kind: DemoExperienceStoredEvent['kind'];
  version: number;
  editableConfig: EditableInvitationPageConfig;
}

export interface DemoExperienceAdminSnapshot {
  dateKey: string;
  pages: InvitationPageSummary[];
  comments: Comment[];
  customerAccounts: AdminCustomerAccountsSnapshot;
  dashboard: AdminDashboardSummarySnapshot;
}

export class DemoExperienceDomainError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code:
      | 'DEMO_SEED_READ_ONLY'
      | 'DEMO_ROLE_FORBIDDEN'
      | 'NOT_FOUND'
      | 'INVALID_INPUT'
  ) {
    super(message);
    this.name = 'DemoExperienceDomainError';
  }
}

function assertApprovedDemoImages(config: InvitationPageSeed) {
  const approved = new Set<string>(DEMO_EXPERIENCE_IMAGE_OPTIONS);
  const images = [
    config.metadata.images.wedding,
    config.metadata.images.social,
    config.metadata.images.kakaoCard,
    ...(config.pageData?.galleryImages ?? []),
  ];
  if (
    images.some((image) => {
      const normalized = typeof image === 'string' ? image.trim() : '';
      return normalized.length > 0 && !approved.has(normalized);
    })
  ) {
    throw new DemoExperienceDomainError(
      '체험 모드에서는 제공된 샘플 이미지만 선택할 수 있습니다.',
      400,
      'INVALID_INPUT'
    );
  }
}

function toPageSummary(event: DemoExperienceStoredEvent): InvitationPageSummary {
  const productTier = normalizeInvitationProductTier(
    event.config.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );

  return {
    slug: event.slug,
    eventType: 'wedding',
    displayName:
      event.kind === 'daily-workspace'
        ? '금일 체험 청첩장'
        : event.config.displayName,
    description: event.config.description,
    date: event.config.date,
    venue: event.config.venue,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    published: event.published,
    defaultTheme: event.defaultTheme,
    productTier,
    features: resolveInvitationFeatures(productTier, event.config.features),
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
    variants: event.config.variants,
    dataSource: event.kind === 'seed' ? 'seed' : 'firestore',
    hasCustomConfig: event.kind === 'daily-workspace',
    ownershipKind: event.ownerUid ? 'customer' : 'unassigned',
  };
}

function toEditableEvent(event: DemoExperienceStoredEvent): DemoExperienceEditableEvent {
  const productTier = normalizeInvitationProductTier(
    event.config.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );
  return {
    kind: event.kind,
    version: event.version,
    editableConfig: {
      slug: event.slug,
      config: event.config,
      published: event.published,
      defaultTheme: event.defaultTheme,
      productTier,
      features: resolveInvitationFeatures(productTier, event.config.features),
      hasCustomConfig: event.kind === 'daily-workspace',
      dataSource: event.kind === 'seed' ? 'seed' : 'firestore',
      lastSavedAt: event.updatedAt,
    },
  };
}

function toLinkedEvent(event: DemoExperienceStoredEvent): AdminCustomerLinkedEventSummary {
  return {
    eventId: event.eventId,
    slug: event.slug,
    eventType: 'wedding',
    displayName:
      event.kind === 'daily-workspace'
        ? '금일 체험 청첩장'
        : event.config.displayName,
    published: event.published,
    defaultTheme: event.defaultTheme,
    updatedAt: event.updatedAt?.toISOString() ?? null,
  };
}

function createWallet(ownerUid: string): AdminCustomerAccountSummary['wallet'] {
  return {
    ownerUid,
    pageCreationCredits: {
      standard: 0,
      deluxe: 0,
      premium: 0,
    },
    operationTicketBalance: 0,
    updatedAt: null,
    recentLedger: [],
  };
}

function buildCustomerAccounts(
  events: DemoExperienceStoredEvent[]
): AdminCustomerAccountsSnapshot {
  const linkedByOwner = new Map<string, DemoExperienceStoredEvent[]>();
  const unassignedEvents: AdminCustomerLinkedEventSummary[] = [];

  for (const event of events) {
    if (!event.ownerUid) {
      unassignedEvents.push(toLinkedEvent(event));
      continue;
    }
    const linked = linkedByOwner.get(event.ownerUid) ?? [];
    linked.push(event);
    linkedByOwner.set(event.ownerUid, linked);
  }

  const accounts = [...linkedByOwner.entries()].map(
    ([uid, linkedEvents], index): AdminCustomerAccountSummary => ({
      uid,
      email: `demo${String(index + 1).padStart(2, '0')}@example.invalid`,
      displayName:
        uid === 'demo-daily-customer'
          ? '금일 체험 고객'
          : `체험 고객 ${String(index + 1).padStart(2, '0')}`,
      isAdmin: false,
      disabled: false,
      emailVerified: true,
      providerIds: ['experience'],
      createdAt: linkedEvents[0]?.createdAt?.toISOString() ?? null,
      lastSignInAt: null,
      missingAuthUser: false,
      linkedEvents: linkedEvents.map(toLinkedEvent),
      wallet: createWallet(uid),
    })
  );

  return { accounts, unassignedEvents };
}

function buildDailyDraft(seed: DemoExperienceStoredEvent): DemoExperienceStoredEvent {
  const config = structuredClone(seed.config) as InvitationPageSeed;
  const availableThemes = getAvailableInvitationVariantKeys(config.variants);
  config.slug = DEMO_EXPERIENCE_DAILY_SLUG;
  config.displayName = '금일 체험 청첩장';
  config.description = '오늘 모든 체험자가 함께 수정하는 체험용 모바일 청첩장입니다.';
  config.metadata.title = config.displayName;
  config.metadata.description = config.description;
  config.variants = buildInvitationVariants(config.slug, config.displayName, {
    availability: createInvitationVariantAvailability(availableThemes),
  });

  return {
    ...seed,
    eventId: 'daily-workspace',
    slug: DEMO_EXPERIENCE_DAILY_SLUG,
    kind: 'daily-workspace',
    ownerUid: 'demo-daily-customer',
    published: false,
    version: 0,
    config,
    createdAt: null,
    updatedAt: null,
  };
}

function assertRoleCanAccessEvent(
  role: DemoExperienceRole,
  event: DemoExperienceStoredEvent
) {
  if (role === 'customer' && event.kind !== 'daily-workspace') {
    throw new DemoExperienceDomainError(
      '고객 체험에서는 금일 체험 청첩장만 확인할 수 있습니다.',
      403,
      'DEMO_ROLE_FORBIDDEN'
    );
  }
}

export async function bootstrapDailyDemoExperience(
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const dateKey = getKstDateKey(now);
  await repository.bootstrapDate(dateKey, createDemoExperienceSeedEvents(dateKey));
  return dateKey;
}

export async function listDemoExperienceEvents(
  role: DemoExperienceRole,
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const dateKey = await bootstrapDailyDemoExperience(now, repository);
  const events = await repository.listEvents(dateKey);
  return {
    dateKey,
    events:
      role === 'admin'
        ? events
        : events.filter((event) => event.kind === 'daily-workspace'),
  };
}

export async function getDemoAdminSnapshot(
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
): Promise<DemoExperienceAdminSnapshot> {
  const { dateKey, events } = await listDemoExperienceEvents('admin', now, repository);
  const commentsByEvent = await Promise.all(
    events.map((event) => repository.listComments(dateKey, event.slug))
  );
  const comments = commentsByEvent
    .flat()
    .map(
      (comment): Comment => ({
        id: comment.id,
        author: comment.author,
        message: comment.message,
        pageSlug: comment.pageSlug,
        createdAt: comment.createdAt ?? new Date(0),
        collectionName: 'demo-experience-comments',
      })
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const recentThreshold = Date.now() - RECENT_COMMENT_DAYS * 24 * 60 * 60 * 1000;

  return {
    dateKey,
    pages: events.map(toPageSummary),
    comments,
    customerAccounts: buildCustomerAccounts(events),
    dashboard: {
      invitationCount: events.length,
      restrictedCount: events.filter((event) => !event.published).length,
      dueSoonCount: 0,
      memoryPublicCount: 0,
      commentSummary: {
        totalCount: comments.length,
        recentCount: comments.filter(
          (comment) => comment.createdAt.getTime() >= recentThreshold
        ).length,
        recentDays: RECENT_COMMENT_DAYS,
      },
    },
  };
}

export async function beginDemoDailyWorkspace(
  seedSlug: string,
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const dateKey = await bootstrapDailyDemoExperience(now, repository);
  const current = await repository.findEventBySlug(dateKey, DEMO_EXPERIENCE_DAILY_SLUG);
  if (current) {
    return { dateKey, ...toEditableEvent(current) };
  }

  const seed = await repository.findEventBySlug(dateKey, seedSlug);
  if (!seed || seed.kind !== 'seed') {
    throw new DemoExperienceDomainError(
      '선택한 체험 청첩장 템플릿을 찾을 수 없습니다.',
      404,
      'NOT_FOUND'
    );
  }
  return { dateKey, ...toEditableEvent(buildDailyDraft(seed)) };
}

export async function getDemoEditableEvent(
  role: DemoExperienceRole,
  slug: string,
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const dateKey = await bootstrapDailyDemoExperience(now, repository);
  const event = await repository.findEventBySlug(dateKey, slug);
  if (!event) {
    throw new DemoExperienceDomainError(
      '체험 청첩장을 찾을 수 없습니다.',
      404,
      'NOT_FOUND'
    );
  }
  assertRoleCanAccessEvent(role, event);
  return { dateKey, ...toEditableEvent(event) };
}

export async function saveDemoDailyWorkspace(
  input: Omit<DemoExperienceSaveInput, 'dateKey'>,
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const dateKey = await bootstrapDailyDemoExperience(now, repository);
  if (input.slug !== DEMO_EXPERIENCE_DAILY_SLUG) {
    throw new DemoExperienceDomainError(
      '기본 체험 청첩장은 수정할 수 없습니다.',
      403,
      'DEMO_SEED_READ_ONLY'
    );
  }

  assertApprovedDemoImages(input.config);

  const normalizedConfig = mergeInvitationPageSeed(
    undefined,
    { ...input.config, slug: DEMO_EXPERIENCE_DAILY_SLUG },
    DEMO_EXPERIENCE_DAILY_SLUG,
    { fallbackTheme: input.defaultTheme }
  );
  if (!normalizedConfig) {
    throw new Error('체험 청첩장 구성이 올바르지 않습니다.');
  }
  normalizedConfig.displayName = '금일 체험 청첩장';

  const saved = await repository.saveDailyWorkspace({
    ...input,
    dateKey,
    slug: DEMO_EXPERIENCE_DAILY_SLUG,
    config: normalizedConfig,
  });
  return { dateKey, ...toEditableEvent(saved) };
}

export async function deleteDemoDailyWorkspace(
  slug: string,
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const dateKey = await bootstrapDailyDemoExperience(now, repository);
  const event = await repository.findEventBySlug(dateKey, slug);
  if (!event) {
    return { dateKey, deleted: false };
  }
  if (event.kind === 'seed') {
    throw new DemoExperienceDomainError(
      '기본 체험 청첩장은 삭제할 수 없습니다.',
      403,
      'DEMO_SEED_READ_ONLY'
    );
  }
  await repository.deleteDailyWorkspace(dateKey, slug);
  return { dateKey, deleted: true };
}

export async function listDemoEventComments(
  role: DemoExperienceRole,
  slug: string,
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const event = await getDemoEditableEvent(role, slug, now, repository);
  const comments = await repository.listComments(event.dateKey, slug);
  return { dateKey: event.dateKey, comments };
}

export async function deleteDemoEventComment(
  role: DemoExperienceRole,
  slug: string,
  commentId: string,
  now = new Date(),
  repository: DemoExperienceRepository = firestoreDemoExperienceRepository
) {
  const event = await getDemoEditableEvent(role, slug, now, repository);
  if (event.kind === 'seed') {
    throw new DemoExperienceDomainError(
      '기본 체험 청첩장의 방명록은 삭제할 수 없습니다.',
      403,
      'DEMO_SEED_READ_ONLY'
    );
  }
  await repository.deleteComment(event.dateKey, slug, commentId);
  return { dateKey: event.dateKey, deleted: true };
}

export { DemoExperienceVersionConflictError };
