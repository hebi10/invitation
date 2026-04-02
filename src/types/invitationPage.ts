export interface FamilyMember {
  relation: string;
  name: string;
  phone?: string;
}

export interface PersonInfo {
  name: string;
  order?: string;
  father?: FamilyMember;
  mother?: FamilyMember;
  phone?: string;
}

export interface WeddingCoupleInfo {
  groom: PersonInfo;
  bride: PersonInfo;
}

export interface BankAccount {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

export interface InvitationPageMetadata {
  title: string;
  description: string;
  keywords: string[];
  images: {
    wedding: string;
    favicon: string;
  };
  openGraph: {
    title: string;
    description: string;
  };
  twitter: {
    title: string;
    description: string;
  };
}

export interface InvitationPageData {
  subtitle?: string;
  ceremonyTime?: string;
  ceremonyAddress?: string;
  ceremonyContact?: string;
  greetingMessage?: string;
  greetingAuthor?: string;
  mapUrl?: string;
  mapDescription?: string;
  venueName?: string;
  groom?: PersonInfo;
  bride?: PersonInfo;
  kakaoMap?: {
    latitude: number;
    longitude: number;
    level?: number;
    markerTitle?: string;
  };
  venueGuide?: Array<{
    title: string;
    content: string;
  }>;
  wreathGuide?: Array<{
    title: string;
    content: string;
  }>;
  giftInfo?: {
    groomAccounts?: BankAccount[];
    brideAccounts?: BankAccount[];
    message?: string;
  };
}

export interface InvitationPageVariantLink {
  available: boolean;
  path: string;
  displayName: string;
}

export interface InvitationPageVariants {
  emotional?: InvitationPageVariantLink;
  simple?: InvitationPageVariantLink;
}

export interface InvitationPage {
  slug: string;
  displayName: string;
  description: string;
  date: string;
  venue: string;
  groomName: string;
  brideName: string;
  couple: WeddingCoupleInfo;
  weddingDateTime: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  published: boolean;
  displayPeriodEnabled: boolean;
  displayPeriodStart: Date | null;
  displayPeriodEnd: Date | null;
  metadata: InvitationPageMetadata;
  pageData?: InvitationPageData;
  variants: InvitationPageVariants;
}

export interface InvitationPageSeed
  extends Omit<
    InvitationPage,
    'published' | 'displayPeriodEnabled' | 'displayPeriodStart' | 'displayPeriodEnd'
  > {}
