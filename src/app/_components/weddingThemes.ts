import type { CSSProperties } from 'react';

import type { WeddingPageConfig } from '@/config/weddingPages';

export type WeddingThemeKey =
  | 'emotional'
  | 'simple'
  | 'minimal'
  | 'space'
  | 'blue'
  | 'classic';

export interface WeddingInvitationRouteOptions {
  slug: string;
  theme: WeddingThemeKey;
  loadingDelay?: number;
  showGuestbook?: boolean;
}

type ShareButtonVariant = 'default' | 'space';

interface WeddingThemeDefinition {
  documentTitleSuffix: string;
  ariaLabelSuffix: string;
  defaultLoadingDelay?: number;
  shareButtonVariant: ShareButtonVariant;
  shareContainer?: {
    className?: string;
    style: CSSProperties;
  };
  getShareTitle: (pageConfig: WeddingPageConfig) => string;
  getShareDescription: (pageConfig: WeddingPageConfig) => string;
}

const defaultShareContainer = {
  className: 'kakao_share',
  style: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #f0f0f0',
    padding: '10px 0',
    display: 'none',
  },
} satisfies WeddingThemeDefinition['shareContainer'];

const spaceShareContainer = {
  className: 'kakao_share',
  style: {
    backgroundColor: '#0a0e27',
    borderBottom: '1px solid rgba(142, 197, 252, 0.2)',
    padding: '10px 0',
    display: 'none',
  },
} satisfies WeddingThemeDefinition['shareContainer'];

const invitationDescription = (pageConfig: WeddingPageConfig) =>
  `${pageConfig.date}\n${pageConfig.venue}에서 열리는 저희의 결혼식에 초대합니다.`;

const compactDescription = (pageConfig: WeddingPageConfig) =>
  `${pageConfig.date} ${pageConfig.pageData?.ceremonyTime ?? ''} | ${pageConfig.venue}`;

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
    documentTitleSuffix: ' (심플 버전)',
    ariaLabelSuffix: ' (심플 버전)',
    shareButtonVariant: 'default',
    shareContainer: defaultShareContainer,
    getShareTitle: (pageConfig) =>
      `${pageConfig.groomName} ♡ ${pageConfig.brideName} 결혼식 (심플 버전)`,
    getShareDescription: invitationDescription,
  },
  minimal: {
    documentTitleSuffix: ' (미니멀 버전)',
    ariaLabelSuffix: ' (미니멀 버전)',
    defaultLoadingDelay: 1500,
    shareButtonVariant: 'default',
    shareContainer: defaultShareContainer,
    getShareTitle: (pageConfig) =>
      `${pageConfig.groomName} ♡ ${pageConfig.brideName} 결혼식 (미니멀 버전)`,
    getShareDescription: invitationDescription,
  },
  space: {
    documentTitleSuffix: ' (우주 버전)',
    ariaLabelSuffix: ' (우주 버전)',
    defaultLoadingDelay: 1500,
    shareButtonVariant: 'space',
    shareContainer: spaceShareContainer,
    getShareTitle: (pageConfig) => pageConfig.metadata.title,
    getShareDescription: invitationDescription,
  },
  blue: {
    documentTitleSuffix: ' (지중해 블루 버전)',
    ariaLabelSuffix: ' (지중해 블루 버전)',
    defaultLoadingDelay: 1500,
    shareButtonVariant: 'default',
    getShareTitle: (pageConfig) =>
      `${pageConfig.groomName} ♥ ${pageConfig.brideName} 결혼식 (지중해 블루 버전)`,
    getShareDescription: compactDescription,
  },
  classic: {
    documentTitleSuffix: ' (한지 클래식 버전)',
    ariaLabelSuffix: ' (한지 클래식 버전)',
    defaultLoadingDelay: 1500,
    shareButtonVariant: 'default',
    getShareTitle: (pageConfig) =>
      `${pageConfig.groomName} ♥ ${pageConfig.brideName} 결혼식 (한지 클래식 버전)`,
    getShareDescription: compactDescription,
  },
};

export function getWeddingThemeDefinition(theme: WeddingThemeKey) {
  return themeDefinitions[theme];
}
