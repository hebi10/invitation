import assert from 'node:assert/strict';

import { createCustomerInvitationPageFromWalletCredit } from '@/server/customerWalletServerService';

const input = {
  ownerUid: 'customer-1',
  ownerEmail: 'customer@example.test',
  ownerDisplayName: 'Customer',
  seedSlug: 'seed-page',
  slugBase: 'new-page',
  groomName: '신랑',
  brideName: '신부',
  productTier: 'premium' as const,
  defaultTheme: 'emotional' as const,
};

function createDependencies(options: {
  createError?: Error;
  assignError?: Error;
  cleanupError?: Error;
} = {}) {
  const calls: string[] = [];

  return {
    calls,
    dependencies: {
      adjustBalance: async (adjustment: { direction: 'credit' | 'debit' }) => {
        calls.push(adjustment.direction === 'debit' ? 'debit' : 'refund');
        return {} as never;
      },
      createDraft: async (draft: { initialDisplayPeriodMonths?: number; productTier?: string }) => {
        assert.equal(draft.initialDisplayPeriodMonths, 6);
        assert.equal(draft.productTier, 'premium');
        calls.push('create');
        if (options.createError) {
          throw options.createError;
        }
        return {
          slug: 'created-page',
          config: { slug: 'created-page' },
        } as never;
      },
      assignOwner: async () => {
        calls.push('assign');
        if (options.assignError) {
          throw options.assignError;
        }
        return {
          summary: {
            eventId: 'event-1',
          },
        } as never;
      },
      cleanupDraft: async () => {
        calls.push('cleanup');
        if (options.cleanupError) {
          throw options.cleanupError;
        }
        return {} as never;
      },
    },
  };
}

const success = createDependencies();
const created = await createCustomerInvitationPageFromWalletCredit(
  input,
  success.dependencies
);
assert.equal(created.slug, 'created-page');
assert.equal(created.eventId, 'event-1');
assert.deepEqual(success.calls, ['debit', 'create', 'assign']);

const createFailure = createDependencies({
  createError: new Error('create failed'),
});
await assert.rejects(
  () =>
    createCustomerInvitationPageFromWalletCredit(
      input,
      createFailure.dependencies
    ),
  /create failed/
);
assert.deepEqual(createFailure.calls, ['debit', 'create', 'refund']);

const assignFailure = createDependencies({
  assignError: new Error('assign failed'),
});
await assert.rejects(
  () =>
    createCustomerInvitationPageFromWalletCredit(
      input,
      assignFailure.dependencies
    ),
  /assign failed/
);
assert.deepEqual(assignFailure.calls, [
  'debit',
  'create',
  'assign',
  'cleanup',
  'refund',
]);

const cleanupFailure = createDependencies({
  assignError: new Error('assign failed'),
  cleanupError: new Error('cleanup failed'),
});
const originalConsoleError = console.error;
console.error = () => undefined;
try {
  await assert.rejects(
    () =>
      createCustomerInvitationPageFromWalletCredit(
        input,
        cleanupFailure.dependencies
      ),
    /assign failed/
  );
} finally {
  console.error = originalConsoleError;
}
assert.deepEqual(cleanupFailure.calls, [
  'debit',
  'create',
  'assign',
  'cleanup',
  'refund',
]);

console.log('customer wallet compensation checks passed');

for (const tier of ['standard', 'deluxe'] as const) {
  const legacy = createDependencies();
  const consumedTiers: string[] = [];
  await createCustomerInvitationPageFromWalletCredit({ ...input, productTier: tier }, {
    ...legacy.dependencies,
    adjustBalance: async (adjustment) => { consumedTiers.push(
      `${adjustment.direction}:${adjustment.tier}`
    ); return {} as never; },
  });
  assert.deepEqual(consumedTiers, [`debit:${tier}`], '과거 제작권은 원래 잔액에서 차감하고 신규 초안은 프리미엄으로 생성해야 합니다.');
  const failure = createDependencies({ createError: new Error('create failed') });
  const restoredTiers: string[] = [];
  await assert.rejects(createCustomerInvitationPageFromWalletCredit({ ...input, productTier: tier }, {
    ...failure.dependencies,
    adjustBalance: async (adjustment) => { restoredTiers.push(
      `${adjustment.direction}:${adjustment.tier}`
    ); return {} as never; },
  }), /create failed/);
  assert.deepEqual(restoredTiers, [`debit:${tier}`, `credit:${tier}`], '실패한 과거 제작권은 동일한 잔액으로 돌려주어야 합니다.');
}
