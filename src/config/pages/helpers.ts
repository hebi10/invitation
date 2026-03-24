import type { WeddingPageConfig } from '../weddingPages';

type WeddingPageMetadata = WeddingPageConfig['metadata'];
type WeddingPageData = NonNullable<WeddingPageConfig['pageData']>;
type WeddingCoupleInfo = WeddingPageConfig['couple'];
type WeddingVariants = NonNullable<WeddingPageConfig['variants']>;

export type WeddingVariantKey = keyof WeddingVariants;

const defaultWeddingVariantKeys: readonly WeddingVariantKey[] = [
  'emotional',
  'simple',
  'minimal',
  'space',
  'blue',
  'classic',
];

const weddingVariantDefinitions: Record<
  WeddingVariantKey,
  { pathSuffix: string; label: string }
> = {
  emotional: {
    pathSuffix: '',
    label: '감성 버전',
  },
  simple: {
    pathSuffix: '-simple',
    label: '심플 버전',
  },
  minimal: {
    pathSuffix: '-minimal',
    label: '미니멀 버전',
  },
  space: {
    pathSuffix: '-space',
    label: '우주 버전',
  },
  blue: {
    pathSuffix: '-blue',
    label: '지중해 블루 버전',
  },
  classic: {
    pathSuffix: '-classic',
    label: '한지 클래식 버전',
  },
};

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
    WeddingPageConfig,
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
  return enabledVariants.reduce<WeddingVariants>((variants, variantKey) => {
    const variantDefinition = weddingVariantDefinitions[variantKey];

    variants[variantKey] = {
      available: true,
      path: `/${slug}${variantDefinition.pathSuffix}`,
      displayName:
        displayNameOverrides[variantKey] ?? `${displayName} (${variantDefinition.label})`,
    };

    return variants;
  }, {});
}

export function createWeddingPageConfig(input: WeddingPageConfigInput): WeddingPageConfig {
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
