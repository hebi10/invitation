import assert from 'node:assert/strict';
import { isMobileAccountSource, MOBILE_ACCOUNT_RETURN_URL, shouldRedirectCustomerToDashboard } from '../../../src/lib/mobileAccountReturn';

assert.equal(isMobileAccountSource('mobile'), true);
for (const from of [undefined, null, 'web', 'https://evil.example', ['mobile']]) {
  assert.equal(isMobileAccountSource(from), false, '모바일 출처는 정확한 고정 값만 허용해야 합니다.');
}
assert.equal(MOBILE_ACCOUNT_RETURN_URL, 'mobileinvitation://create');
const authenticated = { mobileReturn: false, loading: false, loggedIn: true, register: true, emailVerified: true };
assert.equal(shouldRedirectCustomerToDashboard(authenticated), true, '기존 웹 가입 완료 후 대시보드 이동을 보존해야 합니다.');
assert.equal(shouldRedirectCustomerToDashboard({ ...authenticated, mobileReturn: true }), false, '앱 유입은 복귀 안내를 유지해야 합니다.');
assert.equal(shouldRedirectCustomerToDashboard({ ...authenticated, emailVerified: false }), false);
assert.equal(shouldRedirectCustomerToDashboard({ ...authenticated, loading: true }), false);
assert.equal(shouldRedirectCustomerToDashboard({ ...authenticated, loggedIn: false }), false);
assert.equal(shouldRedirectCustomerToDashboard({ ...authenticated, register: false, emailVerified: false }), true);
console.log('mobile account return tests passed');
