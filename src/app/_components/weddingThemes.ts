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
}

type ShareButtonVariant = 'default';

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

const themeDefinitions = INVITATION_THEME_KEYS.reduce<
  Record<WeddingThemeKey, WeddingThemeDefinition>
>((accumulator, theme) => {
  const definition = getInvitationThemeDefinition(theme);

  accumulator[theme] = {
    documentTitleSuffix: definition.documentTitleSuffix,
    ariaLabelSuffix: definition.ariaLabelSuffix,
    shareButtonVariant: 'default',
    shareContainer: defaultShareContainer,
    getShareTitle: resolveShareTitle,
    getShareDescription: resolveShareDescription,
  };

  return accumulator;
}, {} as Record<WeddingThemeKey, WeddingThemeDefinition>);

export function getWeddingThemeDefinition(theme: WeddingThemeKey) {
  return themeDefinitions[theme];
}
