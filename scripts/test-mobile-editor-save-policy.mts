import '../apps/mobile/tests/editor-save-policy.mts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as pageActions from '../src/contracts/mobileClientEditorPageActions.ts';
import type { MobileInvitationSeed } from '../apps/mobile/src/types/mobileInvitation.ts';

function loadMobileApiModule(file: string, globals: Record<string, unknown> = {}) {
  const source = ts.transpileModule(readFileSync(`apps/mobile/src/lib/${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(source, { exports, ...globals });
  return exports;
}

const apiErrors = loadMobileApiModule('apiErrors');
const { MobileApiError } = apiErrors as typeof import('../apps/mobile/src/lib/apiErrors.ts');
const actions: string[] = [];
let response: Response;
const apiCore = loadMobileApiModule('apiCore', {
  URL,
  process: { env: {} },
  fetch: async (url: string, init: RequestInit) => {
    assert.equal(url, 'http://localhost:3000/api/mobile/client-editor/pages/wedding');
    actions.push(JSON.parse(String(init.body)).action);
    return response;
  },
  require(id: string) {
    if (id === './apiErrors') return apiErrors;
    if (id === './storage') return { getOrCreateMobileDeviceId: async () => 'fixture-device' };
    if (id === 'expo-constants') return { default: {} };
    throw new Error(`Unexpected import ${id}`);
  },
});
const { saveMobileInvitationPageConfig, setMobileInvitationPublishedState } = loadMobileApiModule('apiEditor', {
  require(id: string) {
    if (id === './apiCore') return apiCore;
    if (id === './apiErrors') return apiErrors;
    if (id === '../../../../src/contracts/mobileClientEditorPageActions') return pageActions;
    throw new Error(`Unexpected import ${id}`);
  },
}) as typeof import('../apps/mobile/src/lib/apiEditor.ts');

const baseUrl = 'http://localhost:3000';
const editorSession = 'fixture-editor-session';
const recentAuth = 'fixture-recent-auth';
const save = (published: boolean) => saveMobileInvitationPageConfig(baseUrl, 'wedding', editorSession, {
  config: { slug: 'wedding' } as MobileInvitationSeed,
  expectedVersion: 3,
  published,
}, recentAuth);
const publish = () => setMobileInvitationPublishedState(baseUrl, 'wedding', editorSession, true, 'simple', recentAuth);

const publicationCode = 'INVITATION_PUBLICATION_INCOMPLETE';
const backendMessage = 'fixture internal message';
for (const action of [() => save(true), publish]) {
  response = Response.json({
    code: publicationCode,
    error: backendMessage,
    missingFields: ['name', 'dateTime', 'venue', 'address', 'content', 'unknown-field'],
  }, { status: 422 });
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof MobileApiError);
    assert.equal(error.status, 422);
    for (const label of ['이름', '일시', '장소', '주소', '안내']) assert.ok(error.message.includes(label));
    assert.doesNotMatch(error.message, /fixture internal message|unknown-field/);
    return true;
  });
}

response = Response.json({ code: publicationCode, error: backendMessage }, { status: 422 });
await assert.rejects(publish, { status: 422, message: /공개.*필수 정보/ });

response = Response.json({ error: 'Recent authentication is required for this action.' }, { status: 403 });
await assert.rejects(publish, { status: 403, message: /로그인 세션을 다시 확인/ });

response = Response.json({ success: true, version: 4 });
assert.deepEqual(await save(false), { success: true, version: 4 });
assert.deepEqual(actions, ['save', 'setPublished', 'setPublished', 'setPublished', 'save']);
