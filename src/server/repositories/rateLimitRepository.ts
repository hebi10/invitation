import 'server-only';

import { createHash } from 'node:crypto';

import { getServerFirestore } from '../firebaseAdmin';

const RATE_LIMIT_COLLECTION = 'rateLimits';
const RATE_LIMIT_TTL_GRACE_MS = 24 * 60 * 60 * 1000;

export type RateLimitRepositoryInput = {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
};

export type RateLimitRepositoryResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export interface RateLimitRepository {
  isAvailable(): boolean;
  apply(input: RateLimitRepositoryInput): Promise<RateLimitRepositoryResult>;
}

function buildRateLimitDocumentId(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStoredResetAt(data: Record<string, unknown> | undefined) {
  if (!data) {
    return null;
  }

  const resetAtMs = readFiniteNumber(data.resetAtMs);
  if (resetAtMs !== null) {
    return resetAtMs;
  }

  const resetAt = data.resetAt;
  if (
    resetAt &&
    typeof resetAt === 'object' &&
    'toMillis' in resetAt &&
    typeof resetAt.toMillis === 'function'
  ) {
    return resetAt.toMillis();
  }

  return null;
}

export const firestoreRateLimitRepository: RateLimitRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async apply(input) {
    const normalizedKey = input.key.trim();
    const limit = Math.max(1, Math.trunc(input.limit));
    const windowMs = Math.max(1000, Math.trunc(input.windowMs));
    if (!normalizedKey) {
      throw new Error('Rate limit key is required.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const now = input.nowMs ?? Date.now();
    const keyHash = buildRateLimitDocumentId(normalizedKey);
    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(keyHash);

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const data = snapshot.exists ? snapshot.data() ?? {} : {};
      const resetAt = readStoredResetAt(data);
      const storedCount = Math.max(0, Math.trunc(readFiniteNumber(data.count) ?? 0));
      const shouldReset = !snapshot.exists || !resetAt || resetAt <= now;
      const nextResetAt = shouldReset ? now + windowMs : resetAt;
      const currentCount = shouldReset ? 0 : storedCount;
      const allowed = currentCount < limit;
      const nextCount = allowed ? currentCount + 1 : currentCount;

      transaction.set(
        docRef,
        {
          keyHash,
          count: nextCount,
          limit,
          windowMs,
          resetAtMs: nextResetAt,
          resetAt: new Date(nextResetAt),
          expiresAt: new Date(nextResetAt + RATE_LIMIT_TTL_GRACE_MS),
          updatedAt: new Date(now),
          createdAt: snapshot.exists ? data.createdAt ?? new Date(now) : new Date(now),
        },
        { merge: true }
      );

      return {
        allowed,
        limit,
        remaining: Math.max(0, limit - nextCount),
        resetAt: nextResetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((nextResetAt - now) / 1000)),
      } satisfies RateLimitRepositoryResult;
    });
  },
};
