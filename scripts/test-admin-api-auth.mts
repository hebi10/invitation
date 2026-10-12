import assert from 'node:assert/strict';

import {
  AdminApiAuthError,
  verifyAdminRequest,
} from '@/server/adminApiAuth';

function requestWithAuthorization(value: string | null) {
  return new Request('https://example.test/api/admin/session', {
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
      assert.ok(error instanceof AdminApiAuthError);
      assert.equal(error.status, expectedStatus);
      return true;
    }
  );
}

await assertRejectsWithStatus(
  () => verifyAdminRequest(requestWithAuthorization(null)),
  401
);

await assertRejectsWithStatus(
  () =>
    verifyAdminRequest(
      requestWithAuthorization('Bearer invalid-token'),
      {
        auth: {
          verifyIdToken: async () => {
            throw new Error('invalid token');
          },
        },
        isAdminEnabled: async () => true,
      }
    ),
  401
);

await assertRejectsWithStatus(
  () =>
    verifyAdminRequest(
      requestWithAuthorization('Bearer valid-token'),
      {
        auth: null,
        isAdminEnabled: async () => true,
      }
    ),
  500
);

await assertRejectsWithStatus(
  () =>
    verifyAdminRequest(
      requestWithAuthorization('Bearer valid-token'),
      {
        auth: {
          verifyIdToken: async () => ({ uid: 'customer-1' }),
        },
        isAdminEnabled: async () => false,
      }
    ),
  403
);

let requestedRevocationCheck: boolean | undefined;
const decodedToken = await verifyAdminRequest(
  requestWithAuthorization('Bearer valid-token'),
  {
    auth: {
      verifyIdToken: async (token, checkRevoked?: boolean) => {
        requestedRevocationCheck = checkRevoked;
        return {
          uid: token === 'valid-token' ? 'admin-1' : 'unexpected',
          email: 'admin@example.test',
        };
      },
    },
    isAdminEnabled: async (uid) => uid === 'admin-1',
  }
);

assert.equal(decodedToken.uid, 'admin-1');
assert.equal(decodedToken.email, 'admin@example.test');
assert.equal(requestedRevocationCheck, true, 'Admin API must check revoked sessions.');
for (const errorCode of ['auth/id-token-revoked', 'auth/user-disabled']) {
  await assertRejectsWithStatus(
    () => verifyAdminRequest(requestWithAuthorization('Bearer revoked-token'), {
      auth: {
        verifyIdToken: async (_token, checkRevoked?: boolean) => {
          if (checkRevoked) throw Object.assign(new Error(errorCode), { code: errorCode });
          return { uid: 'admin-1' };
        },
      },
      isAdminEnabled: async () => true,
    }),
    401
  );
}
console.log('admin API auth checks passed');
