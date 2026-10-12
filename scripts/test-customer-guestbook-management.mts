import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

class CustomerApiAuthError extends Error { constructor(public status: number, message: string) { super(message); } }
class CustomerEventClaimError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
let authenticated = true;
let updateError: Error | null = null;
const updates: string[][] = [];
const routes: { PATCH?: (request: Request, context: unknown) => Promise<Response> } = {};
const source = ts.transpileModule(readFileSync('src/app/api/customer/events/[slug]/comments/[commentId]/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(source, { exports: routes, console, Response, Error, require(name: string) {
  if (name === 'next/server') return { NextResponse: Response };
  if (name === '@/server/customerApiAuth') return { CustomerApiAuthError, verifyCustomerUid: async (_request: Request, options: { requireVerified: boolean }) => {
    assert.equal(options.requireVerified, true);
    if (!authenticated) throw new CustomerApiAuthError(401, '다시 로그인해 주세요.');
    return 'owner';
  } };
  if (name === '@/server/customerEventsService') return {
    updateCustomerEventGuestbookCommentStatus: async (...args: string[]) => {
      if (updateError) throw updateError;
      updates.push(args);
    },
  };
  if (name === '@/server/customerEventClaimPolicy') return { CustomerEventClaimError };
  if (name === '@/server/apiErrorResponse') return {
    toSafeHttpErrorResponse: (error: CustomerApiAuthError) => Response.json({ error: error.message }, { status: error.status }),
    getInternalErrorReason: (error: Error) => error.message,
    GENERIC_SERVER_ERROR_MESSAGE: '다시 시도해 주세요.',
  };
  return {};
} });
assert.equal(typeof routes.PATCH, 'function', 'Verified owners must be able to hide and restore their guestbook comments');
const context = { params: Promise.resolve({ slug: 'owned-event', commentId: 'comment-1' }) };
const request = (action: string) => new Request('https://example.test', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
for (const action of ['hide', 'restore']) assert.equal((await routes.PATCH!(request(action), context)).status, 200);
assert.deepEqual(updates, [['owner', 'owned-event', 'comment-1', 'hide'], ['owner', 'owned-event', 'comment-1', 'restore']]);
assert.equal((await routes.PATCH!(request('scheduleDelete'), context)).status, 400, 'Deletion must remain a separate explicit action');
authenticated = false;
assert.equal((await routes.PATCH!(request('restore'), context)).status, 401);
assert.equal(updates.length, 2, 'Authentication failures must not mutate comments');
authenticated = true;
updateError = new CustomerEventClaimError(409, 'unavailable', '현재 이용할 수 없는 청첩장입니다.');
assert.equal((await routes.PATCH!(request('restore'), context)).status, 409, 'Deletion-blocked events must preserve the service conflict status');
updateError = new Error('로그인한 계정에 연결된 청첩장만 관리할 수 있습니다.');
assert.equal((await routes.PATCH!(request('hide'), context)).status, 403);
updateError = new Error('변경할 방명록을 찾을 수 없습니다.');
assert.equal((await routes.PATCH!(request('restore'), context)).status, 404);
assert.equal(updates.length, 2, 'Unavailable, unowned, and missing comment requests must not mutate comments');
console.log('Customer guestbook hide/restore action and verified authentication checks passed');
