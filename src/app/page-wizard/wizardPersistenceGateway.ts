import {
  createInvitationPageDraftFromSeed,
  getEditableInvitationPageConfig,
  saveInvitationPageConfig,
  type CreateInvitationPageDraftInput,
  type EditableInvitationPageConfig,
} from '@/services/invitationPageService';
import {
  getCustomerEditableInvitationPageState,
  saveCustomerEditableInvitationPageConfig,
} from '@/services/customerEventService';
import { normalizeInvitationProductTier, resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

export interface WizardDraftSnapshot {
  slug: string;
  config: InvitationPageSeed;
  version: number | null;
}

export interface WizardEditableSnapshot extends EditableInvitationPageConfig {
  version: number | null;
}

export interface WizardPersistenceGateway {
  draftCreationPersists: boolean;
  createDraft(input: CreateInvitationPageDraftInput): Promise<WizardDraftSnapshot>;
  loadEditable(slug: string, isAdmin: boolean): Promise<WizardEditableSnapshot>;
  save(input: {
    slug: string;
    config: InvitationPageSeed;
    published: boolean;
    defaultTheme: InvitationThemeKey;
    expectedVersion: number | null;
    isAdmin: boolean;
  }): Promise<WizardEditableSnapshot>;
}

export class WizardVersionConflictError extends Error {
  readonly code = 'VERSION_CONFLICT';

  constructor(public readonly currentVersion: number) {
    super('다른 체험자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 저장해 주세요.');
    this.name = 'WizardVersionConflictError';
  }
}

function toSnapshot(
  editable: EditableInvitationPageConfig,
  version: number | null
): WizardEditableSnapshot {
  return { ...editable, version };
}

async function readErrorPayload(response: Response) {
  return (await response.json().catch(() => null)) as
    | { error?: string; code?: string; currentVersion?: number }
    | null;
}

export const productionWizardPersistenceGateway: WizardPersistenceGateway = {
  draftCreationPersists: true,
  async createDraft(input) {
    const created = await createInvitationPageDraftFromSeed(input);
    return { ...created, version: null };
  },
  async loadEditable(slug, isAdmin) {
    if (isAdmin) {
      const editable = await getEditableInvitationPageConfig(slug);
      if (!editable) throw new Error('저장된 청첩장 데이터를 찾을 수 없습니다.');
      return toSnapshot(editable, null);
    }
    const state = await getCustomerEditableInvitationPageState(slug);
    if (state.status !== 'ready') {
      throw new Error(
        state.status === 'blocked' ? state.message : '현재 계정에 연결된 청첩장이 아닙니다.'
      );
    }
    return toSnapshot(state.editableConfig, null);
  },
  async save(input) {
    if (input.isAdmin) {
      await saveInvitationPageConfig(input.config, {
        published: input.published,
        defaultTheme: input.defaultTheme,
      });
      const productTier = normalizeInvitationProductTier(input.config.productTier);
      return {
        slug: input.slug,
        config: input.config,
        published: input.published,
        defaultTheme: input.defaultTheme,
        productTier,
        features: resolveInvitationFeatures(productTier, input.config.features),
        hasCustomConfig: true,
        dataSource: 'firestore',
        lastSavedAt: new Date(),
        version: null,
      };
    }

    const editable = await saveCustomerEditableInvitationPageConfig(input.slug, {
      config: input.config,
      published: input.published,
      defaultTheme: input.defaultTheme,
    });
    return toSnapshot(editable, null);
  },
};

export const demoExperienceWizardPersistenceGateway: WizardPersistenceGateway = {
  draftCreationPersists: false,
  async createDraft(_input) {
    const response = await fetch('/api/experience/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seedSlug: 'demo-seed-01' }),
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          editableConfig?: EditableInvitationPageConfig;
          version?: number;
          error?: string;
        }
      | null;
    if (!response.ok || !payload?.editableConfig || typeof payload.version !== 'number') {
      throw new Error(payload?.error || '체험 청첩장 초안을 만들지 못했습니다.');
    }
    return {
      slug: payload.editableConfig.slug,
      config: payload.editableConfig.config,
      version: payload.version,
    };
  },
  async loadEditable(slug) {
    const response = await fetch(`/api/experience/events/${encodeURIComponent(slug)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          editableConfig?: EditableInvitationPageConfig;
          version?: number;
          error?: string;
        }
      | null;
    if (!response.ok || !payload?.editableConfig || typeof payload.version !== 'number') {
      throw new Error(payload?.error || '체험 청첩장을 불러오지 못했습니다.');
    }
    return toSnapshot(payload.editableConfig, payload.version);
  },
  async save(input) {
    const response = await fetch(`/api/experience/events/${encodeURIComponent(input.slug)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedVersion: input.expectedVersion ?? 0,
        config: input.config,
        published: input.published,
        defaultTheme: input.defaultTheme,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          editableConfig?: EditableInvitationPageConfig;
          version?: number;
          error?: string;
          code?: string;
          currentVersion?: number;
        }
      | null;
    if (response.status === 409 && payload?.code === 'VERSION_CONFLICT') {
      throw new WizardVersionConflictError(payload.currentVersion ?? 0);
    }
    if (!response.ok || !payload?.editableConfig || typeof payload.version !== 'number') {
      const errorPayload = payload ?? (await readErrorPayload(response));
      throw new Error(errorPayload?.error || '체험 청첩장을 저장하지 못했습니다.');
    }
    return toSnapshot(payload.editableConfig, payload.version);
  },
};
