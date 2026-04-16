import 'server-only';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type InMemoryRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type InMemoryRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const RATE_LIMIT_STORE_KEY = '__invitation_rate_limit_store__';

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

export function applyInMemoryRateLimit(
  options: InMemoryRateLimitOptions
): InMemoryRateLimitResult {
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

export function buildRateLimitHeaders(result: InMemoryRateLimitResult) {
  return {
    'Retry-After': String(result.retryAfterSeconds),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}
