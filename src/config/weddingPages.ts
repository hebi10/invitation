import type {
  BankAccount,
  FamilyMember,
  InvitationPage,
  InvitationPageSeed,
  PersonInfo,
  WeddingCoupleInfo,
} from '@/types/invitationPage';

import { anDoyoungYoonJisooConfig } from './pages/an-doyoung-yoon-jisoo';
import { kimMinjunParkSoheeConfig } from './pages/kim-minjun-park-sohee';
import { kimTaehyunChoiYunaConfig } from './pages/kim-taehyun-choi-yuna';
import { leeJonghunChoiInConfig } from './pages/lee-jonghun-choi-in';
import { leeJunhoParkSominConfig } from './pages/lee-junho-park-somin';
import { shinMinjeKimHyunjiConfig } from './pages/shin-minje-kim-hyunji';

export type WeddingPageConfig = InvitationPageSeed;
export type { BankAccount, FamilyMember, PersonInfo, WeddingCoupleInfo };

export const WEDDING_PAGE_SAMPLES: WeddingPageConfig[] = [
  kimMinjunParkSoheeConfig,
  shinMinjeKimHyunjiConfig,
  leeJunhoParkSominConfig,
  kimTaehyunChoiYunaConfig,
  anDoyoungYoonJisooConfig,
  leeJonghunChoiInConfig,
];

// Backward-compatible alias. These configs now act as sample/default content,
// not as the runtime source of truth for route generation.
export const WEDDING_PAGE_SEEDS = WEDDING_PAGE_SAMPLES;

export function getWeddingPageBySlug(slug: string): WeddingPageConfig | undefined {
  return WEDDING_PAGE_SAMPLES.find((page) => page.slug === slug);
}

export function getRequiredWeddingPageBySlug(slug: string): WeddingPageConfig {
  const pageConfig = getWeddingPageBySlug(slug);
  if (!pageConfig) {
    throw new Error(`Wedding page seed not found for slug: ${slug}`);
  }

  return pageConfig;
}

export function getAllWeddingPageSlugs(): string[] {
  return WEDDING_PAGE_SAMPLES.map((page) => page.slug);
}

export function getWeddingPageCount(): number {
  return WEDDING_PAGE_SAMPLES.length;
}

export function createInvitationPageFromSeed(
  seed: WeddingPageConfig,
  overrides: Partial<
    Pick<InvitationPage, 'published' | 'displayPeriodEnabled' | 'displayPeriodStart' | 'displayPeriodEnd'>
  > = {}
): InvitationPage {
  return {
    ...seed,
    published: overrides.published ?? true,
    displayPeriodEnabled: overrides.displayPeriodEnabled ?? false,
    displayPeriodStart: overrides.displayPeriodStart ?? null,
    displayPeriodEnd: overrides.displayPeriodEnd ?? null,
  };
}

export function getAllWeddingPageSeeds(): WeddingPageConfig[] {
  return [...WEDDING_PAGE_SAMPLES];
}
