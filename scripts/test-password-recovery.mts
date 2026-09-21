import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/services/adminAuth.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadRecovery(enabled = true, failureCode?: string) {
  const sent: string[] = [];
  const auth = { languageCode: null as string | null };
  const exports: Record<string, unknown> = {};
  runInNewContext(source, { exports, process, require(id: string) {
    if (id === '@/lib/firebase') return { USE_FIREBASE: enabled, ensureFirebaseInit: async () => ({ auth }) };
    if (id === '@/services/repositories/adminUserRepository') return { adminUserRepository: {} };
    if (id === 'firebase/auth') return { sendPasswordResetEmail: async (_auth: unknown, email: string) => {
      if (failureCode) throw { code: failureCode };
      sent.push(email);
    } };
    throw new Error(`Unexpected import: ${id}`);
  } });
  return { sent, auth, reset: exports.sendFirebasePasswordReset as (email: string) => Promise<{ success: boolean; errorMessage?: string }> };
}

const normal = loadRecovery();
assert.equal(typeof normal.reset, 'function', 'Password recovery must be available');
assert.equal((await normal.reset('  guest@example.com  ')).success, true);
assert.deepEqual(normal.sent, ['guest@example.com']);
assert.equal(normal.auth.languageCode, 'ko');
assert.equal((await normal.reset('   ')).success, false);
assert.equal(normal.sent.length, 1);
assert.equal((await loadRecovery(false).reset('guest@example.com')).success, false);
assert.equal((await loadRecovery(true, 'auth/user-not-found').reset('guest@example.com')).success, true, 'Unknown accounts must not be disclosed');
const limited = await loadRecovery(true, 'auth/too-many-requests').reset('guest@example.com');
assert.equal(limited.success, false);
assert.match(limited.errorMessage ?? '', /잠시 후/);
assert.equal((await loadRecovery(true, 'auth/network-request-failed').reset('guest@example.com')).success, false);
console.log('password recovery checks passed (no email sent)');
