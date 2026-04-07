import type { InvitationPageSeed } from '@/types/invitationPage';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';

type WeddingPageMetadata = InvitationPageSeed['metadata'];
type WeddingPageData = NonNullable<InvitationPageSeed['pageData']>;
type WeddingCoupleInfo = InvitationPageSeed['couple'];
type WeddingVariants = NonNullable<InvitationPageSeed['variants']>;

export type WeddingVariantKey = keyof WeddingVariants;

const defaultWeddingVariantKeys: readonly WeddingVariantKey[] = [
  'emotional',
  'simple',
];

export interface WeddingPageMetadataInput {
  title?: string;
  description?: string;
  keywords?: string[];
  images: WeddingPageMetadata['images'];
  openGraph?: Partial<WeddingPageMetadata['openGraph']>;
  twitter?: Partial<WeddingPageMetadata['twitter']>;
}

export interface WeddingPageConfigInput
  extends Omit<
    InvitationPageSeed,
    'couple' | 'displayName' | 'groomName' | 'brideName' | 'metadata' | 'pageData'
  > {
  couple: WeddingCoupleInfo;
  displayName?: string;
  metadata: WeddingPageMetadataInput;
  pageData?: Omit<WeddingPageData, 'groom' | 'bride' | 'greetingAuthor' | 'venueName'> & {
    greetingAuthor?: string;
    venueName?: string;
  };
}

export function createWeddingDisplayName(
  couple: WeddingCoupleInfo,
  options: {
    brideFirst?: boolean;
    separator?: string;
  } = {}
): string {
  const { brideFirst = false, separator = ' ♥ ' } = options;
  const firstPerson = brideFirst ? couple.bride.name : couple.groom.name;
  const secondPerson = brideFirst ? couple.groom.name : couple.bride.name;

  return `${firstPerson}${separator}${secondPerson}`;
}

export interface CreateWeddingVariantsOptions {
  slug: string;
  couple: WeddingCoupleInfo;
  displayName?: string;
  enabledVariants?: readonly WeddingVariantKey[];
  displayNameOverrides?: Partial<Record<WeddingVariantKey, string>>;
}

export function createWeddingVariants({
  slug,
  couple,
  displayName = createWeddingDisplayName(couple),
  enabledVariants = defaultWeddingVariantKeys,
  displayNameOverrides = {},
}: CreateWeddingVariantsOptions): WeddingVariants {
  const variants = buildInvitationVariants(slug, displayName, {
    availability: createInvitationVariantAvailability(
      enabledVariants as readonly InvitationVariantKey[]
    ),
  });

  return enabledVariants.reduce<WeddingVariants>((accumulator, variantKey) => {
    const variant = variants[variantKey as InvitationVariantKey];
    if (!variant) {
      return accumulator;
    }

    accumulator[variantKey] = {
      ...variant,
      displayName: displayNameOverrides[variantKey] ?? variant.displayName,
    };

    return accumulator;
  }, {});
}

export function createWeddingPageConfig(input: WeddingPageConfigInput): InvitationPageSeed {
  const groomName = input.couple.groom.name;
  const brideName = input.couple.bride.name;
  const displayName = input.displayName ?? createWeddingDisplayName(input.couple);
  const metadataTitle = input.metadata.title ?? `${displayName} 결혼식에 초대합니다`;

  return {
    ...input,
    displayName,
    groomName,
    brideName,
    couple: input.couple,
    metadata: {
      title: metadataTitle,
      description: input.metadata.description ?? input.description,
      keywords: input.metadata.keywords ?? ['결혼식', '웨딩', '청첩장', groomName, brideName],
      images: input.metadata.images,
      openGraph: {
        title: input.metadata.openGraph?.title ?? `${displayName} 결혼식 초대`,
        description: input.metadata.openGraph?.description ?? input.description,
      },
      twitter: {
        title: input.metadata.twitter?.title ?? `${displayName} 결혼식 초대`,
        description: input.metadata.twitter?.description ?? input.description,
      },
    },
    pageData: {
      ...input.pageData,
      greetingAuthor: input.pageData?.greetingAuthor ?? `${groomName} · ${brideName}`,
      venueName: input.pageData?.venueName ?? input.venue,
      groom: input.couple.groom,
      bride: input.couple.bride,
      kakaoMap: input.pageData?.kakaoMap
        ? {
            ...input.pageData.kakaoMap,
            markerTitle:
              input.pageData.kakaoMap.markerTitle ?? input.pageData?.venueName ?? input.venue,
          }
        : undefined,
    },
  };
}
