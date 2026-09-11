import assert from 'node:assert/strict';
import { isEventDeletionComplete, getEventDeletionFailureMessage, getEventDeletionButtonLabel } from '../src/lib/adminEventDeletionState.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const route = readSource('src/app/api/admin/events/[slug]/route.ts');
const eventService = readSource('src/services/adminEventService.ts');
const gateway = readSource('src/app/admin/_hooks/adminDataGateway.ts');

assert.match(
  route,
  /requestAdminEventDeletion[\s\S]*retryAdminEventDeletion/,
  'the event DELETE route must use the recoverable deletion service APIs'
);
assert.match(
  route,
  /const\s+adminToken\s*=\s*await\s+verifyAdminRequest\(request\)/,
  'the verified administrator token must be retained for deletion attribution'
);
assert.match(
  route,
  /await\s+request\.json\(\)\.catch\(\(\)\s*=>\s*null\)/,
  'the event DELETE route must safely parse a retry request body'
);
assert.match(
  route,
  /body\?\.retry\s*===\s*true/,
  'only an explicit retry: true request may resume a failed deletion job'
);
assert.match(
  route,
  /retryAdminEventDeletion\(normalizedPageSlug,\s*adminToken\.uid\)/,
  'retry must pass the verified administrator UID to the service'
);
assert.match(
  route,
  /requestAdminEventDeletion\(normalizedPageSlug,\s*adminToken\.uid\)/,
  'initial deletion must pass the verified administrator UID to the service'
);
assert.match(
  route,
  /return\s+NextResponse\.json\(\{\s*\.\.\.deletionResult,?\s*\}\)/,
  'the successful deletion response must retain the safe Task 3 result fields'
);
assert.match(
  route,
  /청첩장 전체 삭제에 실패했습니다\.\s*잠시 뒤 다시 시도해 주세요\./,
  'unexpected deletion failures must return a safe Korean error'
);
assert.doesNotMatch(
  route,
  /deleteAdminEventBySlug/,
  'the route must not retain the legacy immediate deletion API'
);

assert.match(
  eventService,
  /options\.retry\s*\?\s*JSON\.stringify\(\{\s*retry:\s*true\s*\}\)\s*:\s*undefined/,
  'the client service must send { retry: true } only for retry requests'
);
assert.match(
  eventService,
  /Promise<AdminEventDeletionResult>/,
  'the client service must return the recoverable deletion result'
);

assert.match(
  gateway,
  /deleteEvent\(slug: string, options\?: \{ retry\?: boolean \}\): Promise<AdminEventDeletionResult>/,
  'the gateway must expose a typed deletion result and retry option'
);
assert.match(
  gateway,
  /return\s+deleteAdminEventByPageSlug\(slug,\s*options\)/,
  'the production gateway must return the recoverable deletion result'
);
assert.match(
  gateway,
  /deletionStatus:\s*'completed'/,
  'the experience gateway must map its immediate deletion to completed'
);

console.log('admin event deletion UI contract checks passed');

assert.equal(isEventDeletionComplete({ success: false, deletionStatus: 'failed', retryable: true }), false);
assert.equal(isEventDeletionComplete({ success: true }), false);
assert.equal(isEventDeletionComplete({ success: true, deletionStatus: 'completed' }), true);
assert.match(getEventDeletionFailureMessage({ success: false, failedStep: 'delete-ownership-references', retryable: true }), /고객 연결 및 이용 기록 정리.*삭제 재시도/);
assert.equal(getEventDeletionButtonLabel({ jobId: 'test', status: 'failed', currentStep: 'delete-ownership-references', requestedAt: '', retryable: true }), '삭제 재시도');
const hook = readSource('src/app/admin/_hooks/useAdminData.ts');
assert.match(hook, /gateway.deleteEvent\(page.slug, \{ retry \}\)/);
assert.ok(hook.indexOf('if (!isEventDeletionComplete(result))') < hook.indexOf("showToast({ title: '청첩장을 완전 삭제했습니다.'"));
const indexes = JSON.parse(readSource('firestore.indexes.json'));
for (const field of ['eventId', 'pageSlug']) {
  assert.ok(indexes.fieldOverrides.some((item: { collectionGroup: string; fieldPath: string; indexes: {queryScope: string; order?: string}[] }) => item.collectionGroup === 'ledger' && item.fieldPath === field && item.indexes.some(index => index.queryScope === 'COLLECTION_GROUP' && index.order === 'ASCENDING')));
}

assert.match(readSource('src/services/invitationPageService.ts'), /deletion: readEventDeletionMetadata\(input.deletion\)/, 'client summary must preserve server deletion state for retries');
