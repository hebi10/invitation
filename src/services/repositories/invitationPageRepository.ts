import { getWeddingPageBySlug } from '@/config/weddingPages';
import { generateInvitationPageSlugSuffix } from '@/lib/invitationPagePersistence';
import {
  getInvitationPageSlugValidationErrorMessage,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import type {
  InvitationPageDisplayPeriodRecord,
  InvitationPageRegistryRecord,
} from '@/lib/invitationPagePersistence';
import type { InvitationThemeKey } from '@/types/invitationPage';
import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  fetchClientEventContentBySlug,
  listClientEventContentMap,
  listClientEventDisplayPeriodMap,
  listClientEventRegistryMap,
  resolveClientStoredEventBySlug,
  saveClientEventContentBySlug,
  upsertClientEventSummary,
} from './clientEventRepositoryCore';
import type { StoredInvitationPageConfigRecord } from './mappers/invitationPageRepositoryMapper';
import { requireTrimmedString } from './repositoryValidators';

export interface ClientInvitationPageRepository {
  isAvailable(): boolean;
  listDisplayPeriodMap(): Promise<Map<string, InvitationPageDisplayPeriodRecord>>;
  findDisplayPeriodBySlug(
    pageSlug: string
  ): Promise<InvitationPageDisplayPeriodRecord | null>;
  listRegistryMap(): Promise<Map<string, InvitationPageRegistryRecord>>;
  findRegistryBySlug(pageSlug: string): Promise<InvitationPageRegistryRecord | null>;
  listConfigMap(): Promise<Map<string, StoredInvitationPageConfigRecord>>;
  findConfigBySlug(pageSlug: string): Promise<StoredInvitationPageConfigRecord | null>;
  isSlugTaken(pageSlug: string): Promise<boolean>;
  createUniqueSlug(slugBase: string): Promise<string>;
  saveConfig(input: {
    slug: string;
    config: InvitationPageSeed;
    createdAt: Date;
    updatedAt: Date;
    seedSourceSlug?: string | null;
  }): Promise<void>;
  upsertRegistryBySlug(
    pageSlug: string,
    payload: {
      published?: boolean;
      defaultTheme?: InvitationThemeKey;
      hasCustomConfig?: boolean;
    }
  ): Promise<void>;
  syncDisplayPeriodBySlug(
    pageSlug: string,
    payload: {
      displayPeriodEnabled: boolean;
      displayPeriodStart: Date | null;
      displayPeriodEnd: Date | null;
    }
  ): Promise<void>;
}

export type { StoredInvitationPageConfigRecord } from './mappers/invitationPageRepositoryMapper';

const PAGE_SLUG_REQUIRED_MESSAGE = '페이지 주소가 필요합니다.';

function buildDisplayPeriodRecord(
  pageSlug: string,
  resolvedEvent: Awaited<ReturnType<typeof resolveClientStoredEventBySlug>>
) {
  if (!resolvedEvent?.summary.displayPeriod) {
    return null;
  }

  return {
    docId: resolvedEvent.summary.eventId,
    pageSlug,
    isActive: resolvedEvent.summary.displayPeriod.isActive,
    startDate: resolvedEvent.summary.displayPeriod.startDate,
    endDate: resolvedEvent.summary.displayPeriod.endDate,
    createdAt: resolvedEvent.summary.createdAt,
    updatedAt: resolvedEvent.summary.updatedAt,
  } satisfies InvitationPageDisplayPeriodRecord;
}

function requirePageSlug(pageSlug: string) {
  return requireTrimmedString(pageSlug, {
    fieldLabel: 'Page slug',
    message: PAGE_SLUG_REQUIRED_MESSAGE,
  });
}

function getSlugValidationMessage(serverMessage: string) {
  switch (serverMessage) {
    case 'Page slug base is required.':
      return '청첩장 주소를 입력해 주세요.';
    case 'Page slug base is reserved.':
      return '이미 예약된 청첩장 주소입니다. 다른 주소를 입력해 주세요.';
    case 'Page slug base must be at least 3 characters.':
      return '청첩장 주소는 3자 이상으로 입력해 주세요.';
    case 'Page slug base must be 40 characters or fewer.':
      return '청첩장 주소는 40자 이하로 입력해 주세요.';
    default:
      return '올바른 청첩장 주소를 입력해 주세요.';
  }
}

export const clientInvitationPageRepository: ClientInvitationPageRepository = {
  isAvailable() {
    return process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
  },

  async listDisplayPeriodMap() {
    const periodMap = await listClientEventDisplayPeriodMap();
    return new Map(
      [...periodMap.entries()].filter(
        (
          entry
        ): entry is [string, InvitationPageDisplayPeriodRecord] => entry[1] !== null
      )
    );
  },

  async findDisplayPeriodBySlug(pageSlug) {
    const normalizedPageSlug = requirePageSlug(pageSlug);
    const resolvedEvent = await resolveClientStoredEventBySlug(normalizedPageSlug);
    return buildDisplayPeriodRecord(normalizedPageSlug, resolvedEvent);
  },

  async listRegistryMap() {
    return listClientEventRegistryMap();
  },

  async findRegistryBySlug(pageSlug) {
    const normalizedPageSlug = requirePageSlug(pageSlug);
    const resolvedEvent = await resolveClientStoredEventBySlug(normalizedPageSlug);
    if (!resolvedEvent) {
      return null;
    }

    return {
      docId: resolvedEvent.summary.eventId,
      pageSlug: resolvedEvent.summary.slug,
      published: resolvedEvent.summary.published,
      defaultTheme: resolvedEvent.summary.defaultTheme,
      hasCustomConfig: resolvedEvent.summary.hasCustomContent,
      createdAt: resolvedEvent.summary.createdAt,
      updatedAt: resolvedEvent.summary.updatedAt,
    };
  },

  async listConfigMap() {
    return listClientEventContentMap();
  },

  async findConfigBySlug(pageSlug) {
    const normalizedPageSlug = requirePageSlug(pageSlug);
    return fetchClientEventContentBySlug(normalizedPageSlug);
  },

  async isSlugTaken(pageSlug) {
    const normalizedPageSlug = requirePageSlug(pageSlug);
    if (getWeddingPageBySlug(normalizedPageSlug)) {
      return true;
    }

    return Boolean(await resolveClientStoredEventBySlug(normalizedPageSlug));
  },

  async createUniqueSlug(slugBase) {
    const slugValidation = validateInvitationPageSlugBase(slugBase);
    if (!slugValidation.isValid) {
      const serverMessage = getInvitationPageSlugValidationErrorMessage(slugValidation.reason);
      throw new Error(getSlugValidationMessage(serverMessage));
    }

    const normalizedSlugBase = slugValidation.normalizedSlugBase;
    if (!(await this.isSlugTaken(normalizedSlugBase))) {
      return normalizedSlugBase;
    }

    let nextSlug = `${normalizedSlugBase}-${generateInvitationPageSlugSuffix()}`;
    while (await this.isSlugTaken(nextSlug)) {
      nextSlug = `${normalizedSlugBase}-${generateInvitationPageSlugSuffix()}`;
    }

    return nextSlug;
  },

  async saveConfig(input) {
    const normalizedSlug = requirePageSlug(input.slug);

    await saveClientEventContentBySlug({
      slug: normalizedSlug,
      config: input.config,
      seedSourceSlug: input.seedSourceSlug ?? null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    });
  },

  async upsertRegistryBySlug(pageSlug, payload) {
    const normalizedPageSlug = requirePageSlug(pageSlug);
    const existingRegistry = await this.findRegistryBySlug(normalizedPageSlug);
    const existingContent = await this.findConfigBySlug(normalizedPageSlug);

    await upsertClientEventSummary({
      slug: normalizedPageSlug,
      displayName: existingContent?.config.displayName ?? null,
      summary: existingContent?.config.description ?? null,
      published: payload.published ?? existingRegistry?.published ?? true,
      defaultTheme:
        payload.defaultTheme ??
        existingRegistry?.defaultTheme ??
        DEFAULT_INVITATION_THEME,
      supportedVariants: existingContent ? Object.keys(existingContent.config.variants ?? {}) : [],
      featureFlags:
        existingContent?.config.features && typeof existingContent.config.features === 'object'
          ? (existingContent.config.features as Record<string, unknown>)
          : {},
      hasCustomConfig:
        payload.hasCustomConfig ??
        existingRegistry?.hasCustomConfig ??
        Boolean(existingContent),
      createdAt: existingRegistry?.createdAt ?? existingContent?.createdAt ?? new Date(),
      updatedAt: new Date(),
      seedSourceSlug: existingContent?.seedSourceSlug ?? null,
    });
  },

  async syncDisplayPeriodBySlug(pageSlug, payload) {
    const normalizedPageSlug = requirePageSlug(pageSlug);
    const existingRegistry = await this.findRegistryBySlug(normalizedPageSlug);
    const existingContent = await this.findConfigBySlug(normalizedPageSlug);
    const existingPeriod = await this.findDisplayPeriodBySlug(normalizedPageSlug);

    await upsertClientEventSummary({
      slug: normalizedPageSlug,
      displayName: existingContent?.config.displayName ?? null,
      summary: existingContent?.config.description ?? null,
      published: existingRegistry?.published ?? true,
      defaultTheme: existingRegistry?.defaultTheme ?? DEFAULT_INVITATION_THEME,
      supportedVariants: existingContent ? Object.keys(existingContent.config.variants ?? {}) : [],
      featureFlags:
        existingContent?.config.features && typeof existingContent.config.features === 'object'
          ? (existingContent.config.features as Record<string, unknown>)
          : {},
      hasCustomConfig: existingRegistry?.hasCustomConfig ?? Boolean(existingContent),
      displayStartAt: payload.displayPeriodEnabled ? payload.displayPeriodStart : null,
      displayEndAt: payload.displayPeriodEnabled ? payload.displayPeriodEnd : null,
      createdAt:
        existingRegistry?.createdAt ??
        existingContent?.createdAt ??
        existingPeriod?.createdAt ??
        new Date(),
      updatedAt: new Date(),
      seedSourceSlug: existingContent?.seedSourceSlug ?? null,
    });
  },
};
