import assert from 'node:assert/strict';

import {
  buildServerTrustedMobileInvitationPageConfigForSave,
} from '@/server/invitationPageServerService';
import type { InvitationPageSeed } from '@/types/invitationPage';

function buildSeed(overrides: Partial<InvitationPageSeed>): InvitationPageSeed {
  return {
    slug: 'kim-park',
    eventType: 'wedding',
    displayName: 'Kim and Park',
    description: '',
    date: '',
    venue: '',
    groomName: 'Kim',
    brideName: 'Park',
    productTier: 'standard',
    features: {
      maxGalleryImages: 6,
      shareMode: 'link',
      showMusic: false,
      showCountdown: false,
      showGuestbook: false,
    },
    variants: {
      simple: {
        key: 'simple',
        label: 'Simple',
        displayName: 'Simple',
        path: '/kim-park/simple',
        available: true,
      },
    },
    ...overrides,
  } as InvitationPageSeed;
}

const currentConfig = buildSeed({
  pageData: { birthdayTheme: 'original-birthday', generalEventTheme: 'original-general' },
  productTier: 'standard',
  features: {
    maxGalleryImages: 6,
    shareMode: 'link',
    showMusic: false,
    showCountdown: false,
    showGuestbook: false,
  },
  variants: {
    simple: {
      key: 'simple',
      label: 'Simple',
      displayName: 'Simple',
      path: '/kim-park/simple',
      available: true,
    },
    romantic: {
      key: 'romantic',
      label: 'Romantic',
      displayName: 'Romantic',
      path: '/kim-park/romantic',
      available: false,
    },
  },
});

const clientPayload = buildSeed({
  pageData: { birthdayTheme: 'changed-birthday', generalEventTheme: 'changed-general', greetingMessage: '새로운 초대 문구' },
  slug: 'changed-address',
  eventType: 'birthday',
  venue: '변경한 예식장',
  groomName: '수정한 이름',
  productTier: 'premium',
  features: {
    maxGalleryImages: 18,
    shareMode: 'card',
    showMusic: true,
    showCountdown: true,
    showGuestbook: true,
  },
  variants: {
    simple: {
      key: 'simple',
      label: 'Simple',
      displayName: 'Simple',
      path: '/evil/simple',
      available: true,
    },
    romantic: {
      key: 'romantic',
      label: 'Romantic',
      displayName: 'Romantic',
      path: '/evil/romantic',
      available: true,
    },
  },
});

const trustedConfig = buildServerTrustedMobileInvitationPageConfigForSave(
  clientPayload,
  currentConfig
);

assert.equal(trustedConfig.pageData?.birthdayTheme, currentConfig.pageData?.birthdayTheme);
assert.equal(trustedConfig.pageData?.generalEventTheme, currentConfig.pageData?.generalEventTheme);
assert.equal(trustedConfig.pageData?.greetingMessage, clientPayload.pageData?.greetingMessage);
assert.equal(trustedConfig.slug, currentConfig.slug);
assert.equal(trustedConfig.eventType, currentConfig.eventType);
assert.equal(trustedConfig.venue, clientPayload.venue);
assert.equal(trustedConfig.groomName, clientPayload.groomName);
assert.equal(trustedConfig.productTier, 'standard');
assert.deepEqual(trustedConfig.features, currentConfig.features);
assert.deepEqual(trustedConfig.variants, currentConfig.variants);
assert.equal(trustedConfig.displayName, clientPayload.displayName);

console.log('mobile save entitlement policy checks passed');

const noThemeConfig = buildSeed({ pageData: undefined });
const noThemeTrusted = buildServerTrustedMobileInvitationPageConfigForSave(clientPayload, noThemeConfig);
assert.equal(noThemeTrusted.pageData?.birthdayTheme, undefined);
assert.equal(noThemeTrusted.pageData?.generalEventTheme, undefined);
assert.equal(noThemeTrusted.pageData?.greetingMessage, clientPayload.pageData?.greetingMessage);
