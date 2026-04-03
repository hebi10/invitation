import { getAllWeddingPageSeeds } from '@/config/weddingPages';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

import {
  cloneConfig,
  normalizeFormConfig,
  normalizePerson,
  prepareConfigForSave,
} from '../page-editor/pageEditorUtils';

export const MAX_GALLERY_IMAGES = 3;
export const MAX_REPEATABLE_ITEMS = 3;
export const PLACEHOLDER_GROOM = 'Groom';
export const PLACEHOLDER_BRIDE = 'Bride';

export type WizardStepKey =
  | 'theme'
  | 'slug'
  | 'basic'
  | 'schedule'
  | 'venue'
  | 'greeting'
  | 'images'
  | 'extra'
  | 'final';

export type StepValidation = {
  valid: boolean;
  messages: string[];
};

export type WizardStepDefinition = {
  key: WizardStepKey;
  number: string;
  title: string;
  description: string;
  previewSection?: 'cover' | 'wedding' | 'greeting' | 'gallery' | 'gift' | 'metadata';
  highlights: string[];
};

export const WIZARD_STEPS: WizardStepDefinition[] = [
  {
    key: 'theme',
    number: '01',
    title: 'Choose Theme',
    description: 'Pick the default mood for the public invitation page.',
    previewSection: 'cover',
    highlights: ['Default design', 'Cover mood', 'Base public URL theme'],
  },
  {
    key: 'slug',
    number: '02',
    title: 'Set Page URL',
    description: 'Choose the final URL slug for this invitation.',
    previewSection: 'cover',
    highlights: ['Public URL', 'Auto-fix duplicate slug', 'Create draft after confirm'],
  },
  {
    key: 'basic',
    number: '03',
    title: 'Basic Info',
    description: 'Fill in names and the short copy shown on the cover.',
    previewSection: 'cover',
    highlights: ['Groom name', 'Bride name', 'Cover subtitle'],
  },
  {
    key: 'schedule',
    number: '04',
    title: 'Wedding Schedule',
    description: 'Fill in the wedding date and time.',
    previewSection: 'wedding',
    highlights: ['Date', 'Time', 'Calendar and schedule card'],
  },
  {
    key: 'venue',
    number: '05',
    title: 'Venue and Directions',
    description: 'Fill in venue name, address, and map guidance.',
    previewSection: 'wedding',
    highlights: ['Venue name', 'Address', 'Map link and guide text'],
  },
  {
    key: 'greeting',
    number: '06',
    title: 'Greeting and Family',
    description: 'Fill in the greeting message and family information.',
    previewSection: 'greeting',
    highlights: ['Greeting message', 'Bride and groom info', 'Parent contact info'],
  },
  {
    key: 'images',
    number: '07',
    title: 'Photos',
    description: 'Upload the cover image and gallery images.',
    previewSection: 'gallery',
    highlights: ['Cover image', 'Gallery order', 'Visible images'],
  },
  {
    key: 'extra',
    number: '08',
    title: 'Gift and Extra Guide',
    description: 'Fill in accounts and optional guide sections only if needed.',
    previewSection: 'gift',
    highlights: ['Gift accounts', 'Venue guide', 'Wreath guide'],
  },
  {
    key: 'final',
    number: '09',
    title: 'Share Copy and Final Check',
    description: 'Review share text and decide whether to publish the page.',
    previewSection: 'metadata',
    highlights: ['Browser title', 'Share description', 'Publish status'],
  },
];

export const GREETING_TEMPLATES = [
  {
    label: 'Formal',
    value:
      'We would be grateful if you could join us and celebrate the beginning of our new chapter together.',
  },
  {
    label: 'Warm',
    value:
      'We are happy to invite you to the day when our two hearts become one. We would love to celebrate with you.',
  },
  {
    label: 'Simple',
    value:
      'Thank you for being part of our journey. Please join us as we begin our new life together.',
  },
];

export const GUIDE_TEMPLATES = [
  {
    label: 'Parking',
    value: 'Parking is available in the building parking lot.',
  },
  {
    label: 'Transit',
    value: 'The venue is close to public transportation and easy to reach.',
  },
  {
    label: 'Wreath',
    value: 'Please follow the venue guidance for congratulatory wreath delivery.',
  },
];

export function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

export function composeDisplayName(groomName: string, brideName: string) {
  const groom = groomName.trim() || PLACEHOLDER_GROOM;
  const bride = brideName.trim() || PLACEHOLDER_BRIDE;
  return `${groom} & ${bride}`;
}

export function composeDescription(groomName: string, brideName: string) {
  if (hasText(groomName) && hasText(brideName)) {
    return `${groomName.trim()} and ${brideName.trim()} invite you to our wedding day.`;
  }

  return 'You are invited to our wedding day.';
}

export function composeGreetingAuthor(groomName: string, brideName: string) {
  const groom = groomName.trim() || PLACEHOLDER_GROOM;
  const bride = brideName.trim() || PLACEHOLDER_BRIDE;
  return `${groom} & ${bride}`;
}

export function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

export function formatTimeLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function buildWeddingDateObject(formState: InvitationPageSeed) {
  const { year, month, day, hour, minute } = formState.weddingDateTime;

  if (
    year < 1900 ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const nextDate = new Date(year, month, day, hour, minute);

  if (
    nextDate.getFullYear() !== year ||
    nextDate.getMonth() !== month ||
    nextDate.getDate() !== day ||
    nextDate.getHours() !== hour ||
    nextDate.getMinutes() !== minute
  ) {
    return null;
  }

  return nextDate;
}

export function isValidUrl(value?: string | null) {
  if (!hasText(value)) {
    return true;
  }

  try {
    const parsed = new URL(value!);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidPhone(value?: string | null) {
  if (!hasText(value)) {
    return true;
  }

  const digits = value!.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}

export function applyDerivedWizardDefaults(config: InvitationPageSeed) {
  const nextConfig = normalizeFormConfig(cloneConfig(config));
  const groomName = nextConfig.couple.groom.name.trim();
  const brideName = nextConfig.couple.bride.name.trim();
  const weddingDate = buildWeddingDateObject(nextConfig);

  nextConfig.groomName = groomName;
  nextConfig.brideName = brideName;
  nextConfig.displayName =
    nextConfig.displayName.trim() || composeDisplayName(groomName, brideName);
  nextConfig.description =
    nextConfig.description.trim() || composeDescription(groomName, brideName);
  nextConfig.metadata.title =
    nextConfig.metadata.title.trim() || nextConfig.displayName;
  nextConfig.metadata.description =
    nextConfig.metadata.description.trim() || nextConfig.description;
  nextConfig.metadata.openGraph.title =
    nextConfig.metadata.openGraph.title.trim() || nextConfig.metadata.title;
  nextConfig.metadata.openGraph.description =
    nextConfig.metadata.openGraph.description.trim() ||
    nextConfig.metadata.description;
  nextConfig.metadata.twitter.title =
    nextConfig.metadata.twitter.title.trim() || nextConfig.metadata.title;
  nextConfig.metadata.twitter.description =
    nextConfig.metadata.twitter.description.trim() ||
    nextConfig.metadata.description;
  nextConfig.metadata.images.favicon =
    nextConfig.metadata.images.favicon.trim() || '/favicon.ico';

  if (weddingDate) {
    nextConfig.date = formatDateLabel(weddingDate);
    if (nextConfig.pageData) {
      nextConfig.pageData.ceremonyTime = formatTimeLabel(weddingDate);
    }
  }

  if (nextConfig.pageData) {
    nextConfig.pageData.venueName =
      nextConfig.pageData.venueName?.trim() || nextConfig.venue;
    nextConfig.pageData.greetingAuthor =
      nextConfig.pageData.greetingAuthor?.trim() ||
      composeGreetingAuthor(groomName, brideName);
    nextConfig.pageData.groom = cloneConfig(nextConfig.couple.groom);
    nextConfig.pageData.bride = cloneConfig(nextConfig.couple.bride);
  }

  return nextConfig;
}

export function createInitialWizardConfig() {
  const seed = getAllWeddingPageSeeds()[0];
  if (!seed) {
    throw new Error('Invitation page seed was not found.');
  }

  const now = new Date();
  const nextConfig = normalizeFormConfig(cloneConfig(seed));

  nextConfig.slug = 'new-page';
  nextConfig.displayName = '';
  nextConfig.description = '';
  nextConfig.groomName = '';
  nextConfig.brideName = '';
  nextConfig.date = '';
  nextConfig.venue = '';
  nextConfig.couple = {
    groom: normalizePerson(undefined),
    bride: normalizePerson(undefined),
  };
  nextConfig.weddingDateTime = {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
    hour: 12,
    minute: 0,
  };
  nextConfig.metadata.title = '';
  nextConfig.metadata.description = '';
  nextConfig.metadata.openGraph.title = '';
  nextConfig.metadata.openGraph.description = '';
  nextConfig.metadata.twitter.title = '';
  nextConfig.metadata.twitter.description = '';
  nextConfig.metadata.keywords = [];
  nextConfig.metadata.images.wedding = '';
  nextConfig.metadata.images.favicon = '/favicon.ico';
  nextConfig.pageData = {
    ...nextConfig.pageData,
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
    groom: normalizePerson(undefined),
    bride: normalizePerson(undefined),
    kakaoMap: undefined,
    venueGuide: [],
    wreathGuide: [],
    giftInfo: {
      groomAccounts: [],
      brideAccounts: [],
      message: '',
    },
  };

  return nextConfig;
}

export function prepareWizardConfigForSave(config: InvitationPageSeed, slug: string) {
  const withDefaults = applyDerivedWizardDefaults(config);
  const prepared = prepareConfigForSave(
    {
      ...withDefaults,
      slug,
    },
    slug
  );

  const weddingDate = buildWeddingDateObject(prepared);
  if (weddingDate) {
    prepared.date = formatDateLabel(weddingDate);
    if (prepared.pageData) {
      prepared.pageData.ceremonyTime = formatTimeLabel(weddingDate);
    }
  }

  prepared.metadata.images.favicon =
    prepared.metadata.images.favicon.trim() || '/favicon.ico';

  return prepared;
}

export function buildStepValidation(
  stepKey: WizardStepKey,
  theme: InvitationThemeKey | null,
  formState: InvitationPageSeed | null,
  slugInput: string,
  persistedSlug: string | null
): StepValidation {
  if (!formState && stepKey !== 'theme' && stepKey !== 'slug') {
    return { valid: false, messages: ['Load page data first.'] };
  }

  switch (stepKey) {
    case 'theme':
      return {
        valid: theme === 'emotional' || theme === 'simple',
        messages:
          theme === 'emotional' || theme === 'simple'
            ? []
            : ['Choose a theme first.'],
      };
    case 'slug': {
      if (persistedSlug) {
        return { valid: true, messages: [] };
      }

      const rawSlug = slugInput.trim();
      if (!rawSlug) {
        return { valid: false, messages: ['Enter a page slug.'] };
      }

      const normalizedSlug = rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!normalizedSlug || normalizedSlug !== rawSlug.toLowerCase()) {
        return {
          valid: false,
          messages: ['Use lowercase letters, numbers, and hyphens only.'],
        };
      }

      return { valid: true, messages: [] };
    }
    case 'basic': {
      const messages: string[] = [];
      if (!hasText(formState?.couple.groom.name)) {
        messages.push('Enter the groom name.');
      }
      if (!hasText(formState?.couple.bride.name)) {
        messages.push('Enter the bride name.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'schedule': {
      const messages: string[] = [];
      if (!formState || !buildWeddingDateObject(formState)) {
        messages.push('Enter a valid wedding date and time.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'venue': {
      const messages: string[] = [];
      if (!hasText(formState?.venue)) {
        messages.push('Enter the venue name.');
      }
      if (!hasText(formState?.pageData?.ceremonyAddress)) {
        messages.push('Enter the venue address.');
      }
      if (!isValidUrl(formState?.pageData?.mapUrl)) {
        messages.push('Map URL must start with http or https.');
      }
      if (!isValidPhone(formState?.pageData?.ceremonyContact)) {
        messages.push('Check the venue contact number format.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'greeting': {
      const messages: string[] = [];
      if (!hasText(formState?.pageData?.greetingMessage)) {
        messages.push('Enter the greeting message.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'images': {
      const messages: string[] = [];
      if (!hasText(formState?.metadata.images.wedding)) {
        messages.push('Upload the cover image.');
      }
      if (!isValidUrl(formState?.metadata.images.wedding)) {
        messages.push('Check the cover image URL.');
      }
      if ((formState?.pageData?.galleryImages ?? []).some((value) => !isValidUrl(value))) {
        messages.push('Check the gallery image URLs.');
      }
      return { valid: messages.length === 0, messages };
    }
    case 'extra': {
      const accounts = [
        ...(formState?.pageData?.giftInfo?.groomAccounts ?? []),
        ...(formState?.pageData?.giftInfo?.brideAccounts ?? []),
      ];

      const hasPartialAccount = accounts.some((account) => {
        const filledCount = [
          hasText(account.bank),
          hasText(account.accountNumber),
          hasText(account.accountHolder),
        ].filter(Boolean).length;

        return filledCount > 0 && filledCount < 3;
      });

      return {
        valid: !hasPartialAccount,
        messages: hasPartialAccount
          ? ['Complete bank, account number, and holder for each account row.']
          : [],
      };
    }
    case 'final':
    default:
      return { valid: true, messages: [] };
  }
}

export function buildReviewSummary(
  theme: InvitationThemeKey | null,
  formState: InvitationPageSeed | null,
  slugInput: string,
  persistedSlug: string | null
) {
  return WIZARD_STEPS.map((step) => ({
    step,
    validation: buildStepValidation(step.key, theme, formState, slugInput, persistedSlug),
  }));
}
