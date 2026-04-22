import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

import { getServerClientPasswordRecord } from './clientPasswordServerService';
import {
  firestoreEventLinkTokenRepository,
  type ConsumeMobileClientEditorLinkTokenResult,
  type MobileClientEditorLinkTokenPurpose,
  type StoredMobileClientEditorLinkTokenRecord,
} from './repositories/eventLinkTokenRepository';

export const MOBILE_CLIENT_EDITOR_LINK_TOKEN_TTL_SECONDS = 15 * 60;
export type { MobileClientEditorLinkTokenPurpose };

const APP_LINK_SCHEME = 'mobileinvitation';
const APP_LINK_WEB_PREFIX = 'app';
const DEFAULT_LINK_TOKEN_NEXT_PATH = '/manage';

type IssueMobileClientEditorLinkTokenInput = {
  pageSlug: string;
  passwordVersion: number;
  purpose?: MobileClientEditorLinkTokenPurpose;
  issuedBy?: string | null;
  issuedByType?: string | null;
  ttlSeconds?: number;
  origin: string;
  nextPath?: string;
};

type ExchangeMobileClientEditorLinkTokenResult = ConsumeMobileClientEditorLinkTokenResult;
export type MobileClientEditorLinkTokenRecord = StoredMobileClientEditorLinkTokenRecord;

function getLinkTokenSecret() {
  const configuredSecret = process.env.MOBILE_CLIENT_EDITOR_LINK_TOKEN_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  const sessionSecret = process.env.CLIENT_EDITOR_SESSION_SECRET?.trim();
  if (sessionSecret) {
    return sessionSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'local-mobile-client-editor-link-token-secret';
  }

  return null;
}

function hashMobileClientEditorLinkToken(token: string) {
  const secret = getLinkTokenSecret();
  if (!secret) {
    throw new Error('MOBILE_CLIENT_EDITOR_LINK_TOKEN_SECRET is required in production.');
  }

  return createHmac('sha256', secret).update(token).digest('base64url');
}

function createMobileClientEditorLinkTokenValue() {
  return randomBytes(32).toString('base64url');
}

function normalizePurpose(
  purpose: string | null | undefined
): MobileClientEditorLinkTokenPurpose {
  return purpose === 'mobile-login' ? purpose : 'mobile-login';
}

function normalizeNextPath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed.startsWith('/')) {
    return DEFAULT_LINK_TOKEN_NEXT_PATH;
  }

  return trimmed;
}

function resolveOrigin(origin: string) {
  try {
    return new URL(origin).origin.replace(/\/+$/g, '');
  } catch {
    return 'https://msgnote.kr';
  }
}

export function buildMobileClientEditorLinkTokenUrls(
  origin: string,
  token: string,
  nextPath = DEFAULT_LINK_TOKEN_NEXT_PATH
) {
  const normalizedOrigin = resolveOrigin(origin);
  const normalizedNextPath = normalizeNextPath(nextPath);
  const params = new URLSearchParams({
    linkToken: token,
    next: normalizedNextPath,
  });

  return {
    deepLinkUrl: `${APP_LINK_SCHEME}://login?${params.toString()}`,
    webFallbackUrl: `${normalizedOrigin}/${APP_LINK_WEB_PREFIX}/login?${params.toString()}`,
  };
}

export async function revokeActiveMobileClientEditorLinkTokens(
  pageSlug: string,
  purpose: MobileClientEditorLinkTokenPurpose = 'mobile-login'
) {
  return firestoreEventLinkTokenRepository.revokeActiveByPageSlug(pageSlug, purpose);
}

export async function issueMobileClientEditorLinkToken(
  input: IssueMobileClientEditorLinkTokenInput
) {
  const normalizedPageSlug = input.pageSlug.trim();
  if (!normalizedPageSlug) {
    throw new Error('Page slug is required.');
  }

  if (!firestoreEventLinkTokenRepository.isAvailable()) {
    throw new Error('Server Firestore is not available.');
  }

  const purpose = normalizePurpose(input.purpose);
  const revokedExistingCount = await revokeActiveMobileClientEditorLinkTokens(
    normalizedPageSlug,
    purpose
  );
  const plainToken = createMobileClientEditorLinkTokenValue();
  const tokenHash = hashMobileClientEditorLinkToken(plainToken);
  const createdAt = new Date();
  const ttlSeconds =
    typeof input.ttlSeconds === 'number' &&
    Number.isFinite(input.ttlSeconds) &&
    input.ttlSeconds > 0
      ? Math.floor(input.ttlSeconds)
      : MOBILE_CLIENT_EDITOR_LINK_TOKEN_TTL_SECONDS;
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
  const record = await firestoreEventLinkTokenRepository.create({
    pageSlug: normalizedPageSlug,
    tokenHash,
    purpose,
    passwordVersion: input.passwordVersion,
    createdAt,
    expiresAt,
    issuedBy: input.issuedBy,
    issuedByType: input.issuedByType,
  });

  return {
    token: plainToken,
    record,
    revokedExistingCount,
    ...buildMobileClientEditorLinkTokenUrls(
      input.origin,
      plainToken,
      input.nextPath
    ),
  };
}

export async function exchangeMobileClientEditorLinkToken(
  plainToken: string
): Promise<ExchangeMobileClientEditorLinkTokenResult> {
  const normalizedToken = plainToken.trim();
  if (!normalizedToken) {
    return {
      status: 'invalid',
      record: null,
    };
  }

  if (!firestoreEventLinkTokenRepository.isAvailable()) {
    throw new Error('Server Firestore is not available.');
  }

  const tokenHash = hashMobileClientEditorLinkToken(normalizedToken);
  const currentRecord = await firestoreEventLinkTokenRepository.findByTokenHash(tokenHash);
  if (!currentRecord) {
    return {
      status: 'invalid',
      record: null,
    };
  }

  const passwordRecord = await getServerClientPasswordRecord(currentRecord.pageSlug);
  if (!passwordRecord || passwordRecord.passwordVersion !== currentRecord.passwordVersion) {
    const now = new Date();
    const revokedRecord = await firestoreEventLinkTokenRepository.revokeById(
      currentRecord.id,
      now
    );

    return {
      status: 'revoked',
      record: revokedRecord ?? {
        ...currentRecord,
        revokedAt: now,
        lastValidatedAt: now,
      },
    };
  }

  return firestoreEventLinkTokenRepository.consumeById(
    currentRecord.id,
    passwordRecord.passwordVersion,
    new Date()
  );
}
