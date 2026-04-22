import assert from 'node:assert/strict';

import {
  executeWriteThrough,
  type EventWriteThroughFailureRecord,
} from '../src/server/repositories/writeThroughCore.ts';

async function main() {
  const callOrder: string[] = [];

  const directResult = await executeWriteThrough({
    operation: 'testDirectWriteThrough',
    pageSlug: 'alpha-event',
    legacyCollection: 'legacy-test',
    eventCollection: 'events-test',
    legacyWrite: async () => {
      callOrder.push('primary');
      return 'legacy-success';
    },
    eventWrite: async () => {
      callOrder.push('mirror');
      return 'event-success';
    },
    recordFailure: async () => {
      callOrder.push('failure-log');
    },
  });

  assert.equal(directResult, 'legacy-success');
  assert.deepEqual(callOrder, ['primary', 'mirror']);

  let retryCount = 0;
  const retryResult = await executeWriteThrough({
    operation: 'testRetryWriteThrough',
    pageSlug: 'beta-event',
    legacyCollection: 'legacy-test',
    eventCollection: 'events-test',
    legacyWrite: async () => 'legacy-success',
    eventWrite: async () => {
      retryCount += 1;
      if (retryCount === 1) {
        throw new Error('mirror failed once');
      }

      return 'event-success';
    },
    recordFailure: async () => {
      throw new Error('recordFailure should not run when retry succeeds');
    },
  });

  assert.equal(retryResult, 'legacy-success');
  assert.equal(retryCount, 2);

  const failureLogs: EventWriteThroughFailureRecord[] = [];
  const partialFailureResult = await executeWriteThrough({
    operation: 'testPartialFailureWriteThrough',
    pageSlug: 'gamma-event',
    legacyCollection: 'legacy-test',
    eventCollection: 'events-test',
    payload: {
      slug: 'gamma-event',
      nested: {
        ok: true,
      },
    },
    legacyWrite: async () => 'legacy-success',
    eventWrite: async () => {
      throw new Error('mirror failed twice');
    },
    recordFailure: async (entry) => {
      failureLogs.push(entry);
    },
  });

  assert.equal(partialFailureResult, 'legacy-success');
  assert.equal(failureLogs.length, 1);
  assert.equal(failureLogs[0]?.attemptCount, 2);
  assert.equal(failureLogs[0]?.sourceOfTruth, 'legacy');
  assert.equal(failureLogs[0]?.pageSlug, 'gamma-event');

  await assert.rejects(async () => {
    await executeWriteThrough({
      operation: 'testPrimaryFailureWriteThrough',
      pageSlug: 'delta-event',
      legacyCollection: 'legacy-test',
      eventCollection: 'events-test',
      legacyWrite: async () => {
        throw new Error('legacy failed');
      },
      eventWrite: async () => 'event-success',
      recordFailure: async () => {
        throw new Error('recordFailure should not run when primary fails');
      },
    });
  }, /legacy failed/);

  const eventOnlyCallOrder: string[] = [];
  const eventOnlyResult = await executeWriteThrough({
    operation: 'testEventOnlyWriteThrough',
    pageSlug: 'epsilon-event',
    writeMode: 'event-only',
    legacyCollection: 'legacy-test',
    eventCollection: 'events-test',
    legacyWrite: async () => {
      eventOnlyCallOrder.push('legacy');
      return 'legacy-success';
    },
    eventWrite: async () => {
      eventOnlyCallOrder.push('event');
      return 'event-success';
    },
  });

  assert.equal(eventOnlyResult, 'event-success');
  assert.deepEqual(eventOnlyCallOrder, ['event']);

  console.log('event write-through checks passed');
}

void main();
