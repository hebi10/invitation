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

assert.equal(trustedConfig.productTier, 'standard');
assert.deepEqual(trustedConfig.features, currentConfig.features);
assert.deepEqual(trustedConfig.variants, currentConfig.variants);
assert.equal(trustedConfig.displayName, clientPayload.displayName);

console.log('mobile save entitlement policy checks passed');
