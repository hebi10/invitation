import assert from 'node:assert/strict';

import { getFirebaseAuthErrorMessage } from '../src/services/adminAuth';

const expectedMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';

assert.equal(
  getFirebaseAuthErrorMessage({ code: 'auth/invalid-credential' }),
  expectedMessage
);

assert.equal(
  getFirebaseAuthErrorMessage({ code: 'auth/wrong-password' }),
  expectedMessage
);

assert.equal(
  getFirebaseAuthErrorMessage(new Error('Firebase: Error (auth/invalid-credential).')),
  expectedMessage
);

console.log('firebase auth error message tests passed');
