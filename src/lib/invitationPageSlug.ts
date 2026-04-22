export const INVITATION_PAGE_SLUG_MIN_LENGTH = 3;
export const INVITATION_PAGE_SLUG_MAX_LENGTH = 40;
export const INVITATION_PAGE_RESERVED_SLUGS = [
  'admin',
  'api',
  'billing',
  'create',
  'login',
  'memory',
  'page-editor',
  'page-wizard',
  'settings',
] as const;

export type InvitationPageSlugValidationReason =
  | 'required'
  | 'invalid'
  | 'too_short'
  | 'too_long'
  | 'reserved';

export type InvitationPageSlugAvailabilityReason =
  | InvitationPageSlugValidationReason
  | 'ok'
  | 'taken';

export type InvitationPageSlugValidationResult = {
  input: string;
  normalizedSlugBase: string;
  isValid: boolean;
  reason: InvitationPageSlugValidationReason | null;
};

const RESERVED_INVITATION_PAGE_SLUG_SET = new Set<string>(INVITATION_PAGE_RESERVED_SLUGS);

export function normalizeInvitationPageSlugBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function isReservedInvitationPageSlug(value: string) {
  return RESERVED_INVITATION_PAGE_SLUG_SET.has(value.trim().toLowerCase());
}

export function validateInvitationPageSlugBase(value: string): InvitationPageSlugValidationResult {
  const input = value.trim();
  const normalizedSlugBase = normalizeInvitationPageSlugBase(input);

  if (!input) {
    return {
      input,
      normalizedSlugBase,
      isValid: false,
      reason: 'required',
    };
  }

  if (!normalizedSlugBase) {
    return {
      input,
      normalizedSlugBase,
      isValid: false,
      reason: 'invalid',
    };
  }

  if (normalizedSlugBase.length < INVITATION_PAGE_SLUG_MIN_LENGTH) {
    return {
      input,
      normalizedSlugBase,
      isValid: false,
      reason: 'too_short',
    };
  }

  if (normalizedSlugBase.length > INVITATION_PAGE_SLUG_MAX_LENGTH) {
    return {
      input,
      normalizedSlugBase,
      isValid: false,
      reason: 'too_long',
    };
  }

  if (isReservedInvitationPageSlug(normalizedSlugBase)) {
    return {
      input,
      normalizedSlugBase,
      isValid: false,
      reason: 'reserved',
    };
  }

  return {
    input,
    normalizedSlugBase,
    isValid: true,
    reason: null,
  };
}

export function getInvitationPageSlugValidationErrorMessage(
  reason: InvitationPageSlugValidationReason | null
) {
  switch (reason) {
    case 'required':
      return 'Page slug base is required.';
    case 'invalid':
      return 'A valid URL slug base is required.';
    case 'too_short':
      return `Page slug base must be at least ${INVITATION_PAGE_SLUG_MIN_LENGTH} characters.`;
    case 'too_long':
      return `Page slug base must be ${INVITATION_PAGE_SLUG_MAX_LENGTH} characters or fewer.`;
    case 'reserved':
      return 'Page slug base is reserved.';
    default:
      return 'A valid URL slug base is required.';
  }
}
