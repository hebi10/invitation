import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import { createInvitationPageDisplayName } from '@/lib/invitationPagePersistence';
import {
  buildInvitationTemplateDefinitions,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import type { EventTypeKey } from '@/lib/eventTypes';
import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
} from '@/lib/musicLibrary';
import type {
  InvitationFeatureFlags,
  InvitationPageSeed,
  InvitationProductTier,
  InvitationThemeKey,
} from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';

export interface InvitationPageSeedTemplate {
  id: string;
  seedSlug: string;
  theme: InvitationThemeKey;
  productTier: InvitationProductTier;
  displayName: string;
  description: string;
  features: InvitationFeatureFlags;
}

export function cloneInvitationPageSeed(seed: InvitationPageSeed): InvitationPageSeed {
  return sanitizeHeartIconPlaceholdersDeep(
    JSON.parse(JSON.stringify(seed)) as InvitationPageSeed
  );
}

export function getSeedTemplates(): InvitationPageSeedTemplate[] {
  const defaultSeedSlug = getAllWeddingPageSeeds()[0]?.slug;

  if (!defaultSeedSlug) {
    return [];
  }

  return buildInvitationTemplateDefinitions(defaultSeedSlug);
}

export function buildDraftConfigFromSeed(
  seed: InvitationPageSeed,
  overrides: {
    slug: string;
    eventType: EventTypeKey;
    groomName: string;
    brideName: string;
    productTier: InvitationProductTier;
    theme: InvitationThemeKey;
  }
) {
  const nextSeed = cloneInvitationPageSeed(seed);
  const displayName = createInvitationPageDisplayName('', '');
  const features = resolveInvitationFeatures(overrides.productTier, seed.features);

  nextSeed.slug = overrides.slug;
  nextSeed.eventType = overrides.eventType;
  nextSeed.displayName = '';
  nextSeed.description = '';
  nextSeed.date = '';
  nextSeed.venue = '';
  nextSeed.productTier = overrides.productTier;
  nextSeed.features = features;
  nextSeed.groomName = overrides.groomName;
  nextSeed.brideName = overrides.brideName;
  nextSeed.couple.groom = {
    name: overrides.groomName,
    order: '',
    phone: '',
    father: {
      relation: '',
      name: '',
      phone: '',
    },
    mother: {
      relation: '',
      name: '',
      phone: '',
    },
  };
  nextSeed.couple.bride = {
    name: overrides.brideName,
    order: '',
    phone: '',
    father: {
      relation: '',
      name: '',
      phone: '',
    },
    mother: {
      relation: '',
      name: '',
      phone: '',
    },
  };
  nextSeed.weddingDateTime = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
  };
  nextSeed.metadata.title = `${displayName} 결혼식에 초대합니다`;
  nextSeed.metadata.openGraph.title = `${displayName} 결혼식 초대`;
  nextSeed.metadata.twitter.title = `${displayName} 결혼식 초대`;
  nextSeed.metadata.keywords = Array.from(
    new Set(
      [
        ...nextSeed.metadata.keywords,
        overrides.groomName,
        overrides.brideName,
        '청첩장',
      ].filter((value) => typeof value === 'string' && value.trim())
    )
  );
  nextSeed.variants = buildInvitationVariants(overrides.slug, displayName, {
    availability: createInvitationVariantAvailability([
      overrides.theme as InvitationVariantKey,
    ]),
  });

  if (nextSeed.pageData?.groom) {
    nextSeed.pageData.groom = {
      ...nextSeed.pageData.groom,
      ...nextSeed.couple.groom,
      name: overrides.groomName,
    };
  }

  if (nextSeed.pageData?.bride) {
    nextSeed.pageData.bride = {
      ...nextSeed.pageData.bride,
      ...nextSeed.couple.bride,
      name: overrides.brideName,
    };
  }

  if (nextSeed.pageData) {
    nextSeed.pageData.greetingAuthor = `${overrides.groomName} · ${overrides.brideName}`;
  }

  nextSeed.metadata.title = '';
  nextSeed.metadata.description = '';
  nextSeed.metadata.images.wedding = '';
  nextSeed.metadata.images.social = '';
  nextSeed.metadata.images.kakaoCard = '';
  nextSeed.metadata.openGraph.title = '';
  nextSeed.metadata.openGraph.description = '';
  nextSeed.metadata.twitter.title = '';
  nextSeed.metadata.twitter.description = '';
  nextSeed.metadata.keywords = [overrides.groomName, overrides.brideName, '청첩장'];
  nextSeed.musicEnabled = false;
  nextSeed.musicVolume = clampInvitationMusicVolume(
    nextSeed.musicVolume,
    DEFAULT_INVITATION_MUSIC_VOLUME
  );
  nextSeed.musicCategoryId = '';
  nextSeed.musicTrackId = '';
  nextSeed.musicStoragePath = '';
  nextSeed.musicUrl = '';
  nextSeed.variants = buildInvitationVariants(overrides.slug, '', {
    availability: createInvitationVariantAvailability([
      overrides.theme as InvitationVariantKey,
    ]),
  });
  nextSeed.pageData = {
    ...nextSeed.pageData,
    subtitle: '',
    ceremonyTime: '',
    ceremonyAddress: '',
    ceremonyContact: '',
    galleryImages: [],
    greetingMessage: '',
    greetingAuthor: '',
    mapUrl: '',
    mapDescription: '',
    venueName: '',
    groom: {
      ...nextSeed.couple.groom,
    },
    bride: {
      ...nextSeed.couple.bride,
    },
    kakaoMap: {
      latitude: 0,
      longitude: 0,
      level: nextSeed.pageData?.kakaoMap?.level ?? 3,
      markerTitle: '',
    },
    venueGuide: [],
    wreathGuide: [],
    giftInfo: {
      groomAccounts: [],
      brideAccounts: [],
      message: '',
    },
  };

  return nextSeed;
}
