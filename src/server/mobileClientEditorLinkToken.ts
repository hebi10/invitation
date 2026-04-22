import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

import { getServerClientPasswordRecord } from './clientPasswordServerService';
import { getServerFirestore } from './firebaseAdmin';

export const MOBILE_CLIENT_EDITOR_LINK_TOKEN_TTL_SECONDS = 15 * 60;
export const MOBILE_CLIENT_EDITOR_LINK_TOKEN_COLLECTION =
  'mobile-client-editor-link-tokens';

const APP_LINK_SCHEME = 'mobileinvitation';
const APP_LINK_WEB_PREFIX = 'app';
const DEFAULT_LINK_TOKEN_NEXT_PATH = '/manage';

export type MobileClientEditorLinkTokenPurpose = 'mobile-login';

type MobileClientEditorLinkTokenRecord = {
  id: string;
  pageSlug: string;
  tokenHash: string;
  purpose: MobileClientEditorLinkTokenPurpose;
  passwordVersion: number;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  lastValidatedAt: Date | null;
  issuedBy: string | null;
  issuedByType: string | null;
};

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

type ExchangeMobileClientEditorLinkTokenResult =
  | {
      status: 'ok';
      record: MobileClientEditorLinkTokenRecord;
    }
  | {
      status: 'invalid' | 'used' | 'expired' | 'revoked';
      record: MobileClientEditorLinkTokenRecord | null;
    };

function toDate(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = value ? new Date(String(value)) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

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

function buildRecord(
  id: string,
  data: Record<string, unknown>
): MobileClientEditorLinkTokenRecord | null {
  const pageSlug = typeof data.pageSlug === 'string' ? data.pageSlug.trim() : '';
  const tokenHash = typeof data.tokenHash === 'string' ? data.tokenHash.trim() : '';
  const purpose = normalizePurpose(
    typeof data.purpose === 'string' ? data.purpose.trim() : undefined
  );
  const passwordVersion =
    typeof data.passwordVersion === 'number' && Number.isFinite(data.passwordVersion)
      ? data.passwordVersion
      : null;
  const createdAt = toDate(data.createdAt);
  const expiresAt = toDate(data.expiresAt);

  if (!pageSlug || !tokenHash || passwordVersion === null || !createdAt || !expiresAt) {
    return null;
  }

  return {
    id,
    pageSlug,
    tokenHash,
    purpose,
    passwordVersion,
    createdAt,
    expiresAt,
    usedAt: toDate(data.usedAt),
    revokedAt: toDate(data.revokedAt),
    lastValidatedAt: toDate(data.lastValidatedAt),
    issuedBy: typeof data.issuedBy === 'string' ? data.issuedBy.trim() || null : null,
    issuedByType:
      typeof data.issuedByType === 'string' ? data.issuedByType.trim() || null : null,
  };
}

function isActiveRecord(record: MobileClientEditorLinkTokenRecord, now = new Date()) {
  return !record.usedAt && !record.revokedAt && record.expiresAt.getTime() > now.getTime();
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
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return 0;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const snapshot = await db
    .collection(MOBILE_CLIENT_EDITOR_LINK_TOKEN_COLLECTION)
    .where('pageSlug', '==', normalizedPageSlug)
    .where('purpose', '==', purpose)
    .get();

  const now = new Date();
  const activeDocs = snapshot.docs.filter((docSnapshot) => {
    const record = buildRecord(docSnapshot.id, docSnapshot.data() ?? {});
    return record ? isActiveRecord(record, now) : false;
  });

  if (!activeDocs.length) {
    return 0;
  }

  const batch = db.batch();
  activeDocs.forEach((docSnapshot) => {
    batch.update(docSnapshot.ref, {
      revokedAt: now,
      lastValidatedAt: now,
    });
  });
  await batch.commit();

  return activeDocs.length;
}

export async function issueMobileClientEditorLinkToken(
  input: IssueMobileClientEditorLinkTokenInput
) {
  const normalizedPageSlug = input.pageSlug.trim();
  if (!normalizedPageSlug) {
    throw new Error('Page slug is required.');
  }

  const db = getServerFirestore();
  if (!db) {
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
  const docRef = db.collection(MOBILE_CLIENT_EDITOR_LINK_TOKEN_COLLECTION).doc();

  await docRef.set({
    pageSlug: normalizedPageSlug,
    tokenHash,
    purpose,
    passwordVersion: input.passwordVersion,
    createdAt,
    expiresAt,
    usedAt: null,
    revokedAt: null,
    lastValidatedAt: null,
    issuedBy: input.issuedBy?.trim() || null,
    issuedByType: input.issuedByType?.trim() || 'mobile-owner-session',
  });

  return {
    token: plainToken,
    record: {
      id: docRef.id,
      pageSlug: normalizedPageSlug,
      tokenHash,
      purpose,
      passwordVersion: input.passwordVersion,
      createdAt,
      expiresAt,
      usedAt: null,
      revokedAt: null,
      lastValidatedAt: null,
      issuedBy: input.issuedBy?.trim() || null,
      issuedByType: input.issuedByType?.trim() || 'mobile-owner-session',
    } satisfies MobileClientEditorLinkTokenRecord,
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

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const tokenHash = hashMobileClientEditorLinkToken(normalizedToken);
  const snapshot = await db
    .collection(MOBILE_CLIENT_EDITOR_LINK_TOKEN_COLLECTION)
    .where('tokenHash', '==', tokenHash)
    .limit(1)
    .get();

  const tokenDoc = snapshot.docs[0] ?? null;
  if (!tokenDoc) {
    return {
      status: 'invalid',
      record: null,
    };
  }

  const currentRecord = buildRecord(tokenDoc.id, tokenDoc.data() ?? {});
  if (!currentRecord) {
    return {
      status: 'invalid',
      record: null,
    };
  }

  const passwordRecord = await getServerClientPasswordRecord(currentRecord.pageSlug);
  if (!passwordRecord || passwordRecord.passwordVersion !== currentRecord.passwordVersion) {
    const now = new Date();
    await tokenDoc.ref.set(
      {
        revokedAt: now,
        lastValidatedAt: now,
      },
      { merge: true }
    );

    return {
      status: 'revoked',
      record: {
        ...currentRecord,
        revokedAt: now,
        lastValidatedAt: now,
      },
    };
  }

  const now = new Date();
  const result = await db.runTransaction(async (transaction) => {
    const freshSnapshot = await transaction.get(tokenDoc.ref);
    const freshRecord = buildRecord(tokenDoc.id, freshSnapshot.data() ?? {});

    if (!freshRecord) {
      return {
        status: 'invalid',
        record: null,
      } satisfies ExchangeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.revokedAt) {
      return {
        status: 'revoked',
        record: freshRecord,
      } satisfies ExchangeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.usedAt) {
      return {
        status: 'used',
        record: freshRecord,
      } satisfies ExchangeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.expiresAt.getTime() <= now.getTime()) {
      return {
        status: 'expired',
        record: freshRecord,
      } satisfies ExchangeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.passwordVersion !== passwordRecord.passwordVersion) {
      transaction.set(
        tokenDoc.ref,
        {
          revokedAt: now,
          lastValidatedAt: now,
        },
        { merge: true }
      );

      return {
        status: 'revoked',
        record: {
          ...freshRecord,
          revokedAt: now,
          lastValidatedAt: now,
        },
      } satisfies ExchangeMobileClientEditorLinkTokenResult;
    }

    transaction.set(
      tokenDoc.ref,
      {
        usedAt: now,
        lastValidatedAt: now,
      },
      { merge: true }
    );

    return {
      status: 'ok',
      record: {
        ...freshRecord,
        usedAt: now,
        lastValidatedAt: now,
      },
    } satisfies ExchangeMobileClientEditorLinkTokenResult;
  });

  return result;
}
