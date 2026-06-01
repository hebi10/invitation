import assert from 'node:assert/strict';

import {
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
assert.match(readRequestClientKey(untrustedForwardedRequest), /^unknown-ip:ua-/);

const trustedRealIpRequest = new Request('https://msgnote.kr/api/test', {
  headers: {
    'x-real-ip': '203.0.113.7',
    'x-forwarded-for': '198.51.100.10',
    'user-agent': 'policy-test-agent',
  },
});
assert.match(readRequestClientKey(trustedRealIpRequest), /^203\.0\.113\.7:ua-/);

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

console.log('rate limit fail-closed policy checks passed');
