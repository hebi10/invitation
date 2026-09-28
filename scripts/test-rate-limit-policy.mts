import assert from 'node:assert/strict';

import {
  applyRateLimit,
  buildScopedRateLimitKey,
  hashRateLimitKeyPart,
  isFailClosedRateLimitScope,
  readRequestClientKey,
  shouldFailClosedRateLimit,
} from '@/server/requestRateLimit';

assert.equal(isFailClosedRateLimitScope('mobile-customer-auth-login'), true);
assert.equal(isFailClosedRateLimitScope('public-guestbook-comment-create'), true);
assert.equal(isFailClosedRateLimitScope('mobile-client-editor-image-upload'), true);
assert.equal(isFailClosedRateLimitScope('kakao-local-address-search'), false);

assert.equal(
  shouldFailClosedRateLimit({
    key: 'mobile-customer-auth-login:user@example.test:127.0.0.1:agent',
    nodeEnv: 'production',
  }),
  true
);
assert.equal(
  shouldFailClosedRateLimit({
    key: 'public-guestbook-comment-create:demo:127.0.0.1:agent',
    nodeEnv: 'production',
  }),
  true
);
assert.equal(
  shouldFailClosedRateLimit({
    key: 'public-guestbook-comment-create:demo:127.0.0.1:agent',
    nodeEnv: 'development',
  }),
  false
);
assert.equal(
  shouldFailClosedRateLimit({
    key: 'kakao-local-address-search:127.0.0.1:agent',
    nodeEnv: 'production',
  }),
  false
);

const untrustedForwardedRequest = new Request('https://msgnote.kr/api/test', {
  headers: {
    'x-forwarded-for': '198.51.100.10',
    'user-agent': 'policy-test-agent',
  },
});
const previousTrustProxy = process.env.TRUST_PROXY_CLIENT_IP_HEADERS;
const previousVercel = process.env.VERCEL;
process.env.TRUST_PROXY_CLIENT_IP_HEADERS = 'false';
process.env.VERCEL = '0';
assert.equal(readRequestClientKey(untrustedForwardedRequest), 'unknown-ip');
assert.equal(readRequestClientKey(new Request('https://example.test', {
  headers: { 'x-real-ip': '203.0.113.99', 'user-agent': 'spoofed' },
})), 'unknown-ip', 'Untrusted headers must not create a fresh rate limit bucket');

const trustedRealIpRequest = new Request('https://msgnote.kr/api/test', {
  headers: {
    'x-real-ip': '203.0.113.7',
    'x-forwarded-for': '198.51.100.10',
    'user-agent': 'policy-test-agent',
  },
});
process.env.TRUST_PROXY_CLIENT_IP_HEADERS = 'true';
assert.equal(readRequestClientKey(trustedRealIpRequest), '203.0.113.7');
for (let attempt = 0; attempt < 6; attempt += 1) {
  const rotatedAgentRequest = new Request('https://example.test', {
    headers: { 'x-real-ip': '203.0.113.7', 'user-agent': `rotated-${attempt}` },
  });
  const key = buildScopedRateLimitKey(rotatedAgentRequest, 'public-guestbook-comment-create', ['rate-limit-regression']);
  const result = await applyRateLimit({ key, limit: 5, windowMs: 60_000 }, {
    repository: { isAvailable: () => false, apply: async () => { throw new Error('unused'); } },
    nodeEnv: 'development',
  });
  assert.equal(result.allowed, attempt < 5, 'Changing User-Agent must not reset the limit');
}
if (previousTrustProxy === undefined) delete process.env.TRUST_PROXY_CLIENT_IP_HEADERS;
else process.env.TRUST_PROXY_CLIENT_IP_HEADERS = previousTrustProxy;
if (previousVercel === undefined) delete process.env.VERCEL;
else process.env.VERCEL = previousVercel;

const refreshTokenA = 'refresh-token-a';
const refreshTokenB = 'refresh-token-b';
const refreshTokenHashA = hashRateLimitKeyPart(refreshTokenA, 'refresh');
const refreshTokenHashB = hashRateLimitKeyPart(refreshTokenB, 'refresh');
assert.ok(refreshTokenHashA?.startsWith('refresh-'));
assert.ok(refreshTokenHashB?.startsWith('refresh-'));
assert.notEqual(refreshTokenHashA, refreshTokenHashB);
assert.equal(refreshTokenHashA?.includes(refreshTokenA), false);

const refreshKeyA = buildScopedRateLimitKey(
  trustedRealIpRequest,
  'mobile-customer-auth-refresh',
  [refreshTokenHashA]
);
const refreshKeyB = buildScopedRateLimitKey(
  trustedRealIpRequest,
  'mobile-customer-auth-refresh',
  [refreshTokenHashB]
);
assert.notEqual(refreshKeyA, refreshKeyB);
assert.equal(refreshKeyA.includes(refreshTokenA), false);
assert.equal(refreshKeyB.includes(refreshTokenB), false);

const failingRepository = {
  isAvailable: () => true,
  apply: async () => {
    throw new Error('rate limit store unavailable');
  },
};

const originalConsoleError = console.error;
console.error = () => undefined;
try {
  assert.equal(
    (
      await applyRateLimit(
        {
          key: 'mobile-billing-fulfill:user-1',
          limit: 3,
          windowMs: 60_000,
        },
        {
          repository: failingRepository,
          nodeEnv: 'production',
        }
      )
    ).allowed,
    false
  );

  assert.equal(
    (
      await applyRateLimit(
        {
          key: 'mobile-billing-fulfill:user-2',
          limit: 3,
          windowMs: 60_000,
        },
        {
          repository: failingRepository,
          nodeEnv: 'development',
        }
      )
    ).allowed,
    true
  );

  assert.equal(
    (
      await applyRateLimit(
        {
          key: 'kakao-local-address-search:user-3',
          limit: 3,
          windowMs: 60_000,
        },
        {
          repository: failingRepository,
          nodeEnv: 'production',
        }
      )
    ).allowed,
    true
  );
} finally {
  console.error = originalConsoleError;
}

console.log('rate limit fail-closed policy checks passed');
