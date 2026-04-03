import type {
  BankAccount,
  FamilyMember,
  InvitationPageSeed,
  PersonInfo,
} from '@/types/invitationPage';

export type NoticeTone = 'success' | 'error' | 'neutral';
export type GuideKind = 'venueGuide' | 'wreathGuide';
export type AccountKind = 'groomAccounts' | 'brideAccounts';
export type PersonRole = 'groom' | 'bride';
export type ParentRole = 'father' | 'mother';

export function cloneConfig<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function createEmptyGuideItem() {
  return {
    title: '',
    content: '',
  };
}

export function createEmptyAccount(): BankAccount {
  return {
    bank: '',
    accountNumber: '',
    accountHolder: '',
  };
}

export function normalizeFamilyMember(member?: FamilyMember): FamilyMember {
  return {
    relation: member?.relation ?? '',
    name: member?.name ?? '',
    phone: member?.phone ?? '',
  };
}

export function normalizePerson(person?: PersonInfo): PersonInfo {
  return {
    name: person?.name ?? '',
    order: person?.order ?? '',
    phone: person?.phone ?? '',
    father: normalizeFamilyMember(person?.father),
    mother: normalizeFamilyMember(person?.mother),
  };
}

export function normalizeGuideItems(
  items?: Array<{
    title: string;
    content: string;
  }>
) {
  return (items ?? []).map((item) => ({
    title: item.title ?? '',
    content: item.content ?? '',
  }));
}

export function normalizeAccounts(items?: BankAccount[]) {
  return (items ?? []).map((item) => ({
    bank: item.bank ?? '',
    accountNumber: item.accountNumber ?? '',
    accountHolder: item.accountHolder ?? '',
  }));
}

export function normalizeFormConfig(config: InvitationPageSeed): InvitationPageSeed {
  const nextConfig = cloneConfig(config);
  const venueName = nextConfig.pageData?.venueName ?? nextConfig.venue;
  const greetingAuthor =
    nextConfig.pageData?.greetingAuthor ??
    `${nextConfig.couple.groom.name} · ${nextConfig.couple.bride.name}`;

  return {
    ...nextConfig,
    groomName: nextConfig.couple.groom.name,
    brideName: nextConfig.couple.bride.name,
    metadata: {
      ...nextConfig.metadata,
      keywords: [...(nextConfig.metadata.keywords ?? [])],
      images: {
        wedding: nextConfig.metadata.images.wedding ?? '',
        favicon: nextConfig.metadata.images.favicon ?? '',
      },
      openGraph: {
        title: nextConfig.metadata.openGraph.title ?? '',
        description: nextConfig.metadata.openGraph.description ?? '',
      },
      twitter: {
        title: nextConfig.metadata.twitter.title ?? '',
        description: nextConfig.metadata.twitter.description ?? '',
      },
    },
    couple: {
      groom: normalizePerson(nextConfig.couple.groom),
      bride: normalizePerson(nextConfig.couple.bride),
    },
    pageData: {
      ...nextConfig.pageData,
      subtitle: nextConfig.pageData?.subtitle ?? '',
      ceremonyTime: nextConfig.pageData?.ceremonyTime ?? '',
      ceremonyAddress: nextConfig.pageData?.ceremonyAddress ?? '',
      ceremonyContact: nextConfig.pageData?.ceremonyContact ?? '',
      galleryImages: [...(nextConfig.pageData?.galleryImages ?? [])],
      greetingMessage: nextConfig.pageData?.greetingMessage ?? '',
      greetingAuthor,
      mapUrl: nextConfig.pageData?.mapUrl ?? '',
      mapDescription: nextConfig.pageData?.mapDescription ?? '',
      venueName,
      groom: normalizePerson(nextConfig.couple.groom),
      bride: normalizePerson(nextConfig.couple.bride),
      kakaoMap: {
        latitude: nextConfig.pageData?.kakaoMap?.latitude ?? 0,
        longitude: nextConfig.pageData?.kakaoMap?.longitude ?? 0,
        level: nextConfig.pageData?.kakaoMap?.level,
        markerTitle: nextConfig.pageData?.kakaoMap?.markerTitle ?? venueName,
      },
      venueGuide: normalizeGuideItems(nextConfig.pageData?.venueGuide),
      wreathGuide: normalizeGuideItems(nextConfig.pageData?.wreathGuide),
      giftInfo: {
        groomAccounts: normalizeAccounts(
          nextConfig.pageData?.giftInfo?.groomAccounts
        ),
        brideAccounts: normalizeAccounts(
          nextConfig.pageData?.giftInfo?.brideAccounts
        ),
        message: nextConfig.pageData?.giftInfo?.message ?? '',
      },
    },
  };
}

export function prepareConfigForSave(
  config: InvitationPageSeed,
  slug: string
): InvitationPageSeed {
  const nextConfig = normalizeFormConfig(config);
  const venueGuide =
    nextConfig.pageData?.venueGuide?.filter(
      (item) => item.title.trim() || item.content.trim()
    ) ?? [];
  const wreathGuide =
    nextConfig.pageData?.wreathGuide?.filter(
      (item) => item.title.trim() || item.content.trim()
    ) ?? [];
  const groomAccounts =
    nextConfig.pageData?.giftInfo?.groomAccounts?.filter(
      (item) =>
        item.bank.trim() || item.accountNumber.trim() || item.accountHolder.trim()
    ) ?? [];
  const brideAccounts =
    nextConfig.pageData?.giftInfo?.brideAccounts?.filter(
      (item) =>
        item.bank.trim() || item.accountNumber.trim() || item.accountHolder.trim()
    ) ?? [];
  const galleryImages =
    nextConfig.pageData?.galleryImages
      ?.map((imageUrl) => imageUrl.trim())
      .filter(Boolean) ?? [];

  return {
    ...nextConfig,
    slug,
    groomName: nextConfig.couple.groom.name.trim(),
    brideName: nextConfig.couple.bride.name.trim(),
    metadata: {
      ...nextConfig.metadata,
      keywords: nextConfig.metadata.keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    },
    pageData: {
      ...nextConfig.pageData,
      venueName: nextConfig.pageData?.venueName?.trim() || nextConfig.venue,
      galleryImages,
      greetingAuthor:
        nextConfig.pageData?.greetingAuthor?.trim() ||
        `${nextConfig.couple.groom.name.trim()} · ${nextConfig.couple.bride.name.trim()}`,
      groom: cloneConfig(nextConfig.couple.groom),
      bride: cloneConfig(nextConfig.couple.bride),
      venueGuide,
      wreathGuide,
      giftInfo: {
        ...nextConfig.pageData?.giftInfo,
        groomAccounts,
        brideAccounts,
        message: nextConfig.pageData?.giftInfo?.message ?? '',
      },
    },
  };
}

export function keywordsToText(keywords: string[]) {
  return keywords.join(', ');
}

export function textToKeywords(value: string) {
  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}
