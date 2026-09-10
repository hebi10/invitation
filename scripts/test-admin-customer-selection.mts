import assert from 'node:assert/strict';
import { getCustomerAssignmentConfirmation } from '../src/lib/adminCustomerSelection.ts';

const accounts = [
  { uid: 'one', displayName: '동일 이름', email: 'first@example.test' },
  { uid: 'two', displayName: '동일 이름', email: 'second@example.test' },
  { uid: 'disabled', email: 'disabled@example.test', disabled: true },
  { uid: 'admin', email: 'admin@example.test', isAdmin: true },
  { uid: 'orphan', missingAuthUser: true },
];
for (const uid of ['', 'missing', 'disabled', 'admin', 'orphan']) {
  assert.equal(getCustomerAssignmentConfirmation(accounts, uid, '샘플 행사', 'sample'), null);
}
const confirmation = getCustomerAssignmentConfirmation(accounts, 'two', '샘플 행사', 'sample');
assert.ok(confirmation?.includes('second@example.test'));
assert.ok(!confirmation?.includes('first@example.test'));
assert.ok(confirmation?.includes('샘플 행사 (sample)'));
console.log('고객 연결 대상 확인 검증 통과');
