import 'server-only';

import { firestoreRateLimitRepository } from './repositories/rateLimitRepository';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type ScopedRateLimitOptions = {
  request: Request;
  scope: string;
  keyParts?: Array<string | number | boolean | null | undefined>;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const RATE_LIMIT_STORE_KEY = '__invitation_rate_limit_store__';
const RATE_LIMIT_SLOW_APPLY_MS = 500;
const FAIL_CLOSED_RATE_LIMIT_SCOPES = new Set([
  'client-editor-comment-delete',
  'client-editor-image-upload',
  'client-editor-mutation',
  'customer-event-create',
  'mobile-billing-fulfill',
  'mobile-client-editor-comment-mutation',
  'mobile-client-editor-drafts',
  'mobile-client-editor-high-risk-verify',
  'mobile-client-editor-image-cleanup',
  'mobile-client-editor-image-upload',
  'mobile-client-editor-link-token-exchange',
  'mobile-client-editor-link-token-issue',
  'mobile-client-editor-mutation',
  'mobile-customer-auth-login',
  'mobile-customer-auth-refresh',
  'public-guestbook-comment-create',
]);

export function isFailClosedRateLimitScope(scope: string) {
  return FAIL_CLOSED_RATE_LIMIT_SCOPES.has(scope.trim());
}

function readRateLimitScope(key: string) {
  return key.split(':', 1)[0]?.trim() ?? '';
}

export function shouldFailClosedRateLimit({
  key,
  nodeEnv = process.env.NODE_ENV,
}: {
  key: string;
  nodeEnv?: string;
}) {
  return nodeEnv === 'production' && isFailClosedRateLimitScope(readRateLimitScope(key));
}

function getRateLimitStore() {
  const globalScope = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitEntry>;
  };

  if (!globalScope[RATE_LIMIT_STORE_KEY]) {
    globalScope[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitEntry>();
  }

  return globalScope[RATE_LIMIT_STORE_KEY];
}

export function readRequestClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.trim() ?? '';
  const realIp = request.headers.get('x-real-ip')?.trim() ?? '';
  const userAgent = request.headers.get('user-agent')?.trim() ?? 'unknown-agent';

  const forwardedIp = forwardedFor
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);

  const clientIp = forwardedIp || realIp || 'unknown-ip';
  const normalizedUserAgent = userAgent.slice(0, 120);

  return `${clientIp}:${normalizedUserAgent}`;
}

function normalizeRateLimitKeyPart(value: string | number | boolean | null | undefined) {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

export function buildScopedRateLimitKey(
  request: Request,
  scope: string,
  keyParts: Array<string | number | boolean | null | undefined> = []
) {
  const normalizedParts = keyParts
    .map((value) => normalizeRateLimitKeyPart(value))
    .filter((value): value is string => value !== null);

  return [scope, ...normalizedParts, readRequestClientKey(request)].join(':');
}

function applyLocalRateLimitFallback(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const store = getRateLimitStore();
  const current = store.get(options.key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs;
    store.set(options.key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      resetAt,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      ),
    };
  }

  current.count += 1;
  store.set(options.key, current);

  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export async function applyRateLimit(options: RateLimitOptions) {
  if (firestoreRateLimitRepository.isAvailable()) {
    const startedAt = Date.now();

    try {
      const result = await firestoreRateLimitRepository.apply(options);
      const elapsedMs = Date.now() - startedAt;

      if (elapsedMs >= RATE_LIMIT_SLOW_APPLY_MS) {
        console.warn('[rate-limit] slow Firestore rate limit apply', {
          elapsedMs,
          limit: options.limit,
          windowMs: options.windowMs,
        });
      }

      return result;
    } catch (error) {
      console.error('[rate-limit] Firestore rate limit failed; using local fallback', error);
      if (shouldFailClosedRateLimit({ key: options.key })) {
        const resetAt = Date.now() + options.windowMs;
        return {
          allowed: false,
          limit: options.limit,
          remaining: 0,
          resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
        };
      }
    }
  }

  if (shouldFailClosedRateLimit({ key: options.key })) {
    const resetAt = Date.now() + options.windowMs;
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
    };
  }

  return applyLocalRateLimitFallback(options);
}

export function applyScopedRateLimit(options: ScopedRateLimitOptions) {
  return applyRateLimit({
    key: buildScopedRateLimitKey(
      options.request,
      options.scope,
      options.keyParts ?? []
    ),
    limit: options.limit,
    windowMs: options.windowMs,
  });
}

export function buildRateLimitHeaders(result: RateLimitResult) {
  return {
    'Retry-After': String(result.retryAfterSeconds),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}
