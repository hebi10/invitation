import assert from 'node:assert/strict';

import {
  CustomerApiAuthError,
  verifyCustomerRequest,
} from '@/server/customerApiAuth';

function requestWithAuthorization(value: string | null) {
  return new Request('https://example.test/api/customer/events/demo/comments/comment-1', {
    headers: value ? { authorization: value } : undefined,
  });
}

async function assertRejectsWithStatus(
  action: () => Promise<unknown>,
  expectedStatus: number
) {
  await assert.rejects(
    action,
    (error) => {
      assert.ok(error instanceof CustomerApiAuthError);
      assert.equal(error.status, expectedStatus);
      return true;
    }
  );
}

await assertRejectsWithStatus(
  () => verifyCustomerRequest(requestWithAuthorization(null)),
  401
);

await assertRejectsWithStatus(
  () =>
    verifyCustomerRequest(
      requestWithAuthorization('Bearer expired-token'),
      {
        auth: {
          verifyIdToken: async () => {
            throw new Error('token expired');
          },
        },
      }
    ),
  401
);

await assertRejectsWithStatus(
  () =>
    verifyCustomerRequest(
      requestWithAuthorization('Bearer valid-token'),
      {
        auth: null,
      }
    ),
  500
);

let requestedRevocationCheck: boolean | undefined;
const decodedToken = await verifyCustomerRequest(
  requestWithAuthorization('Bearer valid-token'),
  {
    auth: {
      verifyIdToken: async (token, checkRevoked?: boolean) => {
        requestedRevocationCheck = checkRevoked;
        return { uid: token === 'valid-token' ? 'customer-1' : 'unexpected' };
      },
    },
  }
);

assert.equal(decodedToken.uid, 'customer-1');
assert.equal(requestedRevocationCheck, true, 'Customer API must check revoked sessions.');
for (const errorCode of ['auth/id-token-revoked', 'auth/user-disabled']) {
  await assertRejectsWithStatus(
    () => verifyCustomerRequest(requestWithAuthorization('Bearer revoked-token'), {
      auth: {
        verifyIdToken: async (_token, checkRevoked?: boolean) => {
          if (checkRevoked) throw Object.assign(new Error(errorCode), { code: errorCode });
          return { uid: 'customer-1' };
        },
      },
    }),
    401
  );
}
console.log('customer API auth checks passed');
