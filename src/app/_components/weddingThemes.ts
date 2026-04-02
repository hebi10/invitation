import type { CSSProperties } from 'react';

import type { InvitationPage } from '@/types/invitationPage';

export type WeddingThemeKey = 'emotional' | 'simple';

export interface WeddingInvitationRouteOptions {
  slug: string;
  theme: WeddingThemeKey;
  initialPageConfig?: InvitationPage | null;
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

const invitationDescription = (pageConfig: InvitationPage) =>
  `${pageConfig.date}\n${pageConfig.venue}\n소중한 분들을 모시고 저희의 새로운 시작을 함께하고자 합니다.`;

const themeDefinitions: Record<WeddingThemeKey, WeddingThemeDefinition> = {
  emotional: {
    documentTitleSuffix: '',
    ariaLabelSuffix: '',
    shareButtonVariant: 'default',
    shareContainer: defaultShareContainer,
    getShareTitle: (pageConfig) => pageConfig.metadata.title,
    getShareDescription: invitationDescription,
  },
  simple: {
    documentTitleSuffix: ' (Simple)',
    ariaLabelSuffix: ' (Simple)',
    shareButtonVariant: 'default',
    shareContainer: defaultShareContainer,
    getShareTitle: (pageConfig) =>
      `${pageConfig.groomName} · ${pageConfig.brideName} 결혼식 초대`,
    getShareDescription: invitationDescription,
  },
};

export function getWeddingThemeDefinition(theme: WeddingThemeKey) {
  return themeDefinitions[theme];
}
