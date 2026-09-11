import type { CSSProperties } from 'react';

import {
  getInvitationThemeDefinition,
  INVITATION_THEME_KEYS,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import type { InvitationPage } from '@/types/invitationPage';

export type WeddingThemeKey = InvitationThemeKey;

export interface WeddingInvitationRouteOptions {
  slug: string;
  theme: WeddingThemeKey;
  initialPageConfig?: InvitationPage | null;
  initialBlockMessage?: string | null;
  loadingDelay?: number;
  showGuestbook?: boolean;
  pageLoader?: (slug: string) => Promise<InvitationPage | null>;
  queryScope?: 'admin' | 'public' | 'experience';
  allowStorageImages?: boolean;
  externalShareEnabled?: boolean;
}

type ShareButtonVariant = 'default' | 'minimal';

interface WeddingThemeDefinition {
  documentTitleSuffix: string;
  ariaLabelSuffix: string;
  defaultLoadingDelay?: number;
  shareButtonVariant: ShareButtonVariant;
  shareContainer?: {
    className?: string;
    style: CSSProperties;
  };
  getShareTitle: (pageConfig: InvitationPage) => string;
  getShareDescription: (pageConfig: InvitationPage) => string;
}

const defaultShareContainer = {
  className: 'kakao_share',
  style: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #f0f0f0',
    padding: '10px 0',
    display: 'block',
  },
} satisfies WeddingThemeDefinition['shareContainer'];

const buildDefaultInvitationDescription = (pageConfig: InvitationPage) =>
  `${pageConfig.date}\n${pageConfig.venue}\n소중한 분들을 모시고 저희의 새로운 시작을 함께하고자 합니다.`;

const buildDefaultInvitationTitle = (pageConfig: InvitationPage) =>
  pageConfig.displayName.trim() ||
  `${pageConfig.groomName.trim() || '신랑'} · ${pageConfig.brideName.trim() || '신부'} 결혼식 초대`;

const resolveShareTitle = (pageConfig: InvitationPage) =>
  pageConfig.metadata.title.trim() || buildDefaultInvitationTitle(pageConfig);

const resolveShareDescription = (pageConfig: InvitationPage) =>
  pageConfig.metadata.description.trim() ||
  pageConfig.description.trim() ||
  buildDefaultInvitationDescription(pageConfig);

export const WEDDING_SHARE_PALETTES: Record<string, { paper: string; ink: string; line: string }> = {
  emotional: { paper: '#f8f9f5', ink: '#344638', line: '#abb8a3' },
  romantic: { paper: '#fbf8f3', ink: '#4d4135', line: '#c7b9a5' },
  simple: { paper: '#faf9f6', ink: '#282725', line: '#b5ada2' },
  'classic-r': { paper: '#ffffff', ink: '#20201e', line: '#999b96' },
  gyeol: { paper: '#f8f3e9', ink: '#493b2f', line: '#b8a17c' },
};

export function getWeddingShareContainer(theme: string) {
  const palette = WEDDING_SHARE_PALETTES[theme];
  if (!palette) return undefined;
  return { style: {
    backgroundColor: palette.paper, width: 'min(100%, 480px)', margin: '0 auto',
    padding: '0 30px 32px', boxSizing: 'border-box',
    '--share-paper': palette.paper, '--share-ink': palette.ink, '--share-line': palette.line,
  } as CSSProperties };
}

const themeDefinitions = INVITATION_THEME_KEYS.reduce<
  Record<WeddingThemeKey, WeddingThemeDefinition>
>((accumulator, theme) => {
  const definition = getInvitationThemeDefinition(theme);

  accumulator[theme] = {
    documentTitleSuffix: definition.documentTitleSuffix,
    ariaLabelSuffix: definition.ariaLabelSuffix,
    shareButtonVariant: WEDDING_SHARE_PALETTES[theme] ? 'minimal' : 'default',
    shareContainer: getWeddingShareContainer(theme) ?? defaultShareContainer,
    getShareTitle: resolveShareTitle,
    getShareDescription: resolveShareDescription,
  };

  return accumulator;
}, {} as Record<WeddingThemeKey, WeddingThemeDefinition>);

export function getWeddingThemeDefinition(theme: WeddingThemeKey) {
  return themeDefinitions[theme];
}
