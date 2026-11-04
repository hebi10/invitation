import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const policyUrl = new URL('./mobile-release-policy.mjs', import.meta.url);
assert.ok(existsSync(policyUrl), 'Android 배포 정책이 있어야 버전과 배포 권한을 검증할 수 있습니다.');
const {
  parseAndroidVersionCode,
  createCiVersionCode,
  isTrustedReleaseEvent,
  shouldDeployRelease,
  readAndroidGradleMetadata,
  validatePlayDeployment,
} = await import(policyUrl.href);

assert.equal(parseAndroidVersionCode(undefined), 11);
assert.equal(parseAndroidVersionCode('11'), 11);
assert.equal(parseAndroidVersionCode('2100000000'), 2100000000);
for (const value of ['', '10', '0', '-11', '11.5', '1e3', ' 11', '2100000001', 'NaN']) {
  assert.throws(() => parseAndroidVersionCode(value), /versionCode/);
}
assert.equal(createCiVersionCode('1', '1'), 111);
assert.equal(createCiVersionCode('1', '2'), 112);
assert.equal(createCiVersionCode('2', '1'), 211);
assert.equal(createCiVersionCode('20999999', '90'), 2100000000);
for (const [run, attempt] of [['0', '1'], ['1', '0'], ['1', '100'], ['1.5', '1'], ['21000000', '1']]) {
  assert.throws(() => createCiVersionCode(run, attempt));
}

for (const eventName of ['pull_request', 'pull_request_target', 'workflow_run', 'push', 'workflow_dispatch']) {
  for (const ref of ['refs/heads/main', 'refs/heads/build/mobile-aab', 'refs/pull/1/merge']) {
    const trusted = ref === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(eventName);
    assert.equal(isTrustedReleaseEvent({ eventName, ref }), trusted);
    assert.equal(shouldDeployRelease({ eventName, ref, autoDeployEnabled: 'true', manualDeploy: true }), trusted);
    assert.equal(shouldDeployRelease({ eventName, ref, autoDeployEnabled: 'false', manualDeploy: false }), false);
  }
}
assert.equal(shouldDeployRelease({ eventName: 'workflow_dispatch', ref: 'refs/heads/main', autoDeployEnabled: 'true', manualDeploy: false }), false);
assert.equal(shouldDeployRelease({ eventName: 'push', ref: 'refs/heads/main', autoDeployEnabled: 'TRUE', manualDeploy: false }), false);

const gradle = `android { defaultConfig { applicationId 'kr.msgnote.mobileinvitation'\nversionCode 211\nversionName "1.0.5"\n} }`;
assert.deepEqual(readAndroidGradleMetadata(gradle, 211), { packageName: 'kr.msgnote.mobileinvitation', versionCode: 211, versionName: '1.0.5' });
assert.throws(() => readAndroidGradleMetadata(gradle, 111), /versionCode/);
assert.throws(() => readAndroidGradleMetadata(gradle.replace('kr.msgnote.mobileinvitation', 'other.app'), 211), /package/);
assert.throws(() => readAndroidGradleMetadata(`${gradle}\nversionCode 211`, 211), /versionCode/);
assert.throws(() => readAndroidGradleMetadata(gradle.replace('1.0.5', '1.0.5/../../other'), 211), /versionName/);

const deployPolicy = { eventName: 'push', ref: 'refs/heads/main', autoDeployEnabled: 'true', manualDeploy: false, signed: 'true', track: 'alpha', status: 'completed' };
assert.deepEqual(validatePlayDeployment(deployPolicy), { track: 'alpha', status: 'completed' });
assert.deepEqual(validatePlayDeployment({ ...deployPolicy, track: 'invitation-test', status: 'draft' }), { track: 'invitation-test', status: 'draft' });
for (const track of ['', 'production', 'beta', 'internal', 'internalsharing', 'qa', 'wear:production', 'Production', '../alpha']) {
  assert.throws(() => validatePlayDeployment({ ...deployPolicy, track }));
}
assert.throws(() => validatePlayDeployment({ ...deployPolicy, signed: 'false' }));
assert.throws(() => validatePlayDeployment({ ...deployPolicy, eventName: 'pull_request' }));
assert.throws(() => validatePlayDeployment({ ...deployPolicy, status: 'inProgress' }));

const source = readFileSync(new URL('../apps/mobile/app.config.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function appConfig(versionCode?: string) {
  const exports = {};
  const compiledModule = { exports };
  vm.runInNewContext(compiled, { exports, module: compiledModule, require: (path: string) => {
    assert.equal(path, '../../scripts/mobile-release-policy.mjs');
    return { parseAndroidVersionCode };
  }, process: { env: versionCode === undefined ? {} : { EXPO_ANDROID_VERSION_CODE: versionCode } } });
  return (compiledModule.exports as { default: { version: string; android: { versionCode: number } } }).default;
}
assert.equal(appConfig().android.versionCode, 11);
assert.equal(appConfig('211').android.versionCode, 211);
assert.equal(appConfig('211').version, '1.0.5');
assert.throws(() => appConfig('10'));

const signingUrl = new URL('./sign-mobile-release.sh', import.meta.url);
assert.ok(existsSync(signingUrl), '서명 전에 main·서명 키 구성·운영 결제 키를 검사해야 합니다.');
const signingTemporary = mkdtempSync(path.join(tmpdir(), 'invitation-signing-policy-'));
try {
  const signingEnvironment = { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', RUNNER_TEMP: signingTemporary, GITHUB_OUTPUT: path.join(signingTemporary, 'output'), GITHUB_STEP_SUMMARY: path.join(signingTemporary, 'summary'), DEPLOY_REQUESTED: 'false', INVITATION_KEYSTORE_BASE64: '', INVITATION_KEYSTORE_PASSWORD: '', INVITATION_KEY_ALIAS: '', INVITATION_KEY_PASSWORD: '', EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: '' };
  const check = (overrides = {}) => spawnSync('bash', [fileURLToPath(signingUrl), '--check'], { env: { ...signingEnvironment, ...overrides }, encoding: 'utf8' });
  assert.equal(check().status, 0, '배포하지 않을 때 모든 서명 키가 없으면 미서명 빌드를 허용합니다.');
  assert.notEqual(check({ DEPLOY_REQUESTED: 'true' }).status, 0, '배포 요청은 서명 정보 누락을 빌드 전에 보고합니다.');
  assert.notEqual(check({ INVITATION_KEY_ALIAS: 'fixture-alias' }).status, 0, '일부 서명 키만 있으면 실패해야 합니다.');
  const complete = { INVITATION_KEYSTORE_BASE64: 'fixture', INVITATION_KEYSTORE_PASSWORD: 'fixture', INVITATION_KEY_ALIAS: 'fixture', INVITATION_KEY_PASSWORD: 'fixture' };
  assert.notEqual(check(complete).status, 0, '운영 RevenueCat 키 없이 서명하지 않습니다.');
  assert.equal(check({ ...complete, EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_fixture' }).status, 0);
  for (const overrides of [{ GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/build/mobile-aab' }]) {
    assert.notEqual(check({ ...complete, EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_fixture', ...overrides }).status, 0);
  }
} finally {
  rmSync(signingTemporary, { recursive: true, force: true });
}

const workflow = require('js-yaml').load(readFileSync(new URL('../.github/workflows/mobile-release.yml', import.meta.url), 'utf8'));
assert.ok(workflow.jobs.deploy, 'Play 게시가 빌드와 별도 job이어야 서명 산출물을 보존합니다.');
assert.equal(workflow.jobs.deploy.needs, 'bundle');
assert.equal(workflow.permissions.contents, 'read');
assert.equal(workflow.permissions['id-token'], undefined);
for (const event of ['pull_request', 'push']) {
  for (const requiredPath of ['apps/mobile/**', 'src/lib/**', 'src/contracts/**', 'src/types/**', 'package*.json', 'scripts/*mobile*release*', '.github/workflows/mobile-release.yml']) {
    assert.ok(workflow.on[event].paths.includes(requiredPath), `${event}: ${requiredPath} 변경도 빌드 대상입니다.`);
  }
}
assert.equal(workflow.on.workflow_dispatch.inputs.deploy.default, false);
assert.equal(workflow.concurrency['cancel-in-progress'], false);

function evaluateCondition(condition: string, github: object, inputs: object = {}, needs: object = {}, steps: object = {}) {
  return Function('github', 'inputs', 'needs', 'steps', `return (${condition.replace(/^\$\{\{\s*|\s*\}\}$/g, '')});`)(github, inputs, needs, steps);
}
for (const job of Object.values(workflow.jobs) as { env?: object; if?: string; steps: { env?: object; if?: string; uses?: string; with?: Record<string, string>; run?: string }[] }[]) {
  assert.ok(!JSON.stringify(job.env ?? {}).includes('secrets.'), 'job 공통 환경에 Secrets를 전달하지 않습니다.');
  for (const step of job.steps) {
    if (!JSON.stringify([step.env, step.with]).includes('secrets.')) continue;
    for (const eventName of ['pull_request', 'pull_request_target', 'push', 'workflow_dispatch']) {
      for (const ref of ['refs/heads/main', 'refs/pull/1/merge', 'refs/heads/build/mobile-aab']) {
        const github = { event_name: eventName, ref };
        const trusted = ref === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(eventName);
        assert.equal(Boolean(evaluateCondition(job.if ?? step.if ?? 'true', github, {}, { bundle: { outputs: { deploy: 'true' } } })), trusted, `${eventName}/${ref} Secrets 전달 경계가 잘못되었습니다.`);
      }
    }
  }
}
const deploySteps = workflow.jobs.deploy.steps;
const guardIndex = deploySteps.findIndex((step: { run?: string }) => step.run?.includes('mobile-release-policy.mjs validate-deploy'));
const authIndex = deploySteps.findIndex((step: { uses?: string }) => step.uses === 'google-github-actions/auth@v3');
assert.ok(guardIndex >= 0 && authIndex > guardIndex, '인증 전에 배포 정책을 검사합니다.');
assert.equal(deploySteps[authIndex].with.access_token_scopes, 'https://www.googleapis.com/auth/androidpublisher');
assert.equal(deploySteps[authIndex].with.create_credentials_file, false);
assert.equal(deploySteps[authIndex].with.export_environment_variables, false);
const publishSteps = deploySteps.filter((step: { env?: Record<string, string> }) => step.env?.PLAY_ACCESS_TOKEN);
assert.equal(publishSteps.length, 1);
assert.ok(publishSteps[0].run.includes('publish-mobile-play.py'));
const downloadStep = deploySteps.find((step: { uses?: string }) => step.uses?.startsWith('actions/download-artifact@'));
assert.equal(downloadStep.with.name, '${{ needs.bundle.outputs.artifact_name }}');
assert.equal(downloadStep.with['run-id'], undefined, '다른 실행의 산출물을 사용하지 않습니다.');
for (const job of [workflow.jobs.bundle, workflow.jobs.deploy]) {
  const checkout = job.steps.find((step: { uses?: string }) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with.ref, '${{ github.sha }}', '검사·빌드·게시가 같은 소스 SHA를 사용합니다.');
}
assert.equal(Boolean(evaluateCondition(workflow.jobs.deploy.if, { event_name: 'push', ref: 'refs/heads/main' }, {}, { bundle: { outputs: { deploy: 'false' } } })), false);

const cli = spawnSync(process.execPath, [fileURLToPath(policyUrl), 'ci'], { env: { ...process.env, GITHUB_RUN_NUMBER: '1', GITHUB_RUN_ATTEMPT: '2', GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF: 'refs/pull/1/merge', GITHUB_OUTPUT: '', GITHUB_ENV: '' }, encoding: 'utf8' });
assert.equal(cli.status, 0, cli.stderr);
assert.deepEqual(JSON.parse(cli.stdout), { version_code: 112, trusted: false, deploy: false });
console.log('mobile release version, metadata, trust policy and workflow integration checks passed');
