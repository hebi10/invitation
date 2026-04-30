import assert from 'node:assert/strict';

import {
  isFailClosedRateLimitScope,
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

console.log('rate limit fail-closed policy checks passed');
