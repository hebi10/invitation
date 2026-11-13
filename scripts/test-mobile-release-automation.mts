import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
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
  resolvePlayTarget,
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

const deployPolicy = { eventName: 'push', ref: 'refs/heads/main', autoDeployEnabled: 'true', manualDeploy: false, signed: 'true', status: 'completed' };
assert.deepEqual(validatePlayDeployment(deployPolicy), { target: 'internal', track: 'internal', status: 'completed' });
for (const closedTrack of [undefined, '', 'alpha', 'production', 'wear:production']) {
  assert.deepEqual(validatePlayDeployment({ ...deployPolicy, target: 'closed', closedTrack }), { target: 'internal', track: 'internal', status: 'completed' }, 'main push는 비공개 테스트 설정과 관계없이 internal에만 게시합니다.');
}
const manualPolicy = { ...deployPolicy, eventName: 'workflow_dispatch', manualDeploy: true };
assert.deepEqual(validatePlayDeployment(manualPolicy), { target: 'internal', track: 'internal', status: 'completed' });
assert.deepEqual(validatePlayDeployment({ ...manualPolicy, target: 'internal', closedTrack: 'production', status: 'draft' }), { target: 'internal', track: 'internal', status: 'draft' });
assert.deepEqual(validatePlayDeployment({ ...manualPolicy, target: 'closed', closedTrack: 'alpha' }), { target: 'closed', track: 'alpha', status: 'completed' });
assert.deepEqual(validatePlayDeployment({ ...manualPolicy, target: 'closed', closedTrack: 'invitation-test', status: 'draft' }), { target: 'closed', track: 'invitation-test', status: 'draft' });
for (const closedTrack of [undefined, '', 'production', 'beta', 'internal', 'internalsharing', 'qa', 'wear:alpha', 'wear:production', 'Production', 'INTERNAL', '../alpha', ' alpha', 'alpha\n', '알파', 'a'.repeat(101)]) {
  assert.throws(() => validatePlayDeployment({ ...manualPolicy, target: 'closed', closedTrack }));
}
for (const target of ['', 'production', 'beta', 'INTERNAL', 'internalsharing', 'qa', 'wear:internal', 'closed\n']) {
  assert.throws(() => validatePlayDeployment({ ...manualPolicy, target, closedTrack: 'alpha' }));
}
assert.deepEqual(validatePlayDeployment({ ...manualPolicy, target: 'closed', closedTrack: 'a'.repeat(100) }), { target: 'closed', track: 'a'.repeat(100), status: 'completed' });
assert.throws(() => validatePlayDeployment({ ...deployPolicy, signed: 'false' }));
assert.throws(() => validatePlayDeployment({ ...deployPolicy, eventName: 'pull_request' }));
assert.throws(() => validatePlayDeployment({ ...deployPolicy, status: 'inProgress' }));
assert.throws(() => validatePlayDeployment({ ...manualPolicy, ref: 'refs/heads/build/mobile-aab', target: 'closed', closedTrack: 'alpha' }));

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
assert.ok(existsSync(signingUrl), 'Signing policy must check the existing Play upload key and trusted main event.');
const signingTemporary = mkdtempSync(path.join(tmpdir(), 'invitation-signing-policy-'));
try {
  const signingEnvironment = {
    ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main',
    RUNNER_TEMP: signingTemporary, GITHUB_OUTPUT: path.join(signingTemporary, 'output'),
    GITHUB_STEP_SUMMARY: path.join(signingTemporary, 'summary'), DEPLOY_REQUESTED: 'false',
    INVITATION_KEYSTORE_BASE64: '', INVITATION_KEYSTORE_PASSWORD: '',
    INVITATION_KEY_ALIAS: '', INVITATION_KEY_PASSWORD: '',
  };
  const check = (overrides = {}) => spawnSync('bash', [fileURLToPath(signingUrl), '--check'], {
    env: { ...signingEnvironment, ...overrides }, encoding: 'utf8',
  });
  assert.equal(check().status, 0, 'Unsigned PR preview remains possible without a signing key.');
  assert.notEqual(check({ DEPLOY_REQUESTED: 'true' }).status, 0, 'Play upload needs all four signing secrets.');
  assert.notEqual(check({ INVITATION_KEY_ALIAS: 'partial' }).status, 0, 'Partial signing configuration must be rejected.');
  const complete = {
    INVITATION_KEYSTORE_BASE64: 'fixture', INVITATION_KEYSTORE_PASSWORD: 'fixture',
    INVITATION_KEY_ALIAS: 'fixture', INVITATION_KEY_PASSWORD: 'fixture',
  };
  const internal = { ...complete, PLAY_SIGNING_TARGET: 'internal', PLAY_SIGNING_TRACK: 'internal' };
  const closed = { ...complete, PLAY_SIGNING_TARGET: 'closed', PLAY_SIGNING_TRACK: 'alpha' };
  assert.equal(check({ ...internal, DEPLOY_REQUESTED: 'true' }).status, 0);
  assert.equal(check({ ...closed, DEPLOY_REQUESTED: 'true' }).status, 0,
    'Closed test builds must not require any RevenueCat key after direct Play Billing migration.');
  assert.notEqual(check({ ...closed, INVITATION_KEY_PASSWORD: '' }).status, 0);
  for (const overrides of [{ GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/build/mobile-aab' }]) {
    assert.notEqual(check({ ...closed, ...overrides }).status, 0, 'Signing remains main-only.');
    assert.notEqual(check({ ...internal, ...overrides }).status, 0, 'Signing remains main-only.');
  }
} finally {
  rmSync(signingTemporary, { recursive: true, force: true });
}

assert.equal(typeof resolvePlayTarget, 'function', '빌드와 배포가 같은 함수로 테스트 대상을 검증해야 합니다.');
assert.deepEqual(resolvePlayTarget({ ...deployPolicy, target: 'closed', closedTrack: 'production' }), { target: 'internal', track: 'internal' });
assert.deepEqual(resolvePlayTarget({ ...manualPolicy, manualDeploy: false, target: 'internal' }), { target: 'internal', track: 'internal' });
assert.deepEqual(resolvePlayTarget({ ...manualPolicy, manualDeploy: false, target: 'closed', closedTrack: 'alpha' }), { target: 'closed', track: 'alpha' });
assert.throws(() => resolvePlayTarget({ ...manualPolicy, manualDeploy: false, target: 'closed' }));
assert.throws(() => resolvePlayTarget({ ...manualPolicy, target: 'closed', closedTrack: 'production' }));
assert.throws(() => resolvePlayTarget({ ...manualPolicy, target: 'production' }));
assert.throws(() => resolvePlayTarget({ ...manualPolicy, ref: 'refs/heads/build/mobile-aab', target: 'closed', closedTrack: 'alpha' }));
assert.ok(!readFileSync(signingUrl, 'utf8').includes('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'), 'Direct Play builds must never require RevenueCat configuration.');

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
assert.ok(workflow.on.workflow_dispatch.inputs.deploy_target, '수동 실행에서 내부·비공개 테스트 배포 대상을 선택해야 합니다.');
assert.equal(workflow.on.workflow_dispatch.inputs.deploy_target.type, 'choice');
assert.equal(workflow.on.workflow_dispatch.inputs.deploy_target.default, 'internal');
assert.deepEqual(workflow.on.workflow_dispatch.inputs.deploy_target.options, ['internal', 'closed']);
assert.equal(workflow.on.workflow_dispatch.inputs.closed_track.required, false);
assert.equal(workflow.jobs.bundle.permissions?.['id-token'], undefined, '빌드 job은 OIDC 토큰 권한을 갖지 않습니다.');
assert.equal(workflow.jobs.deploy.permissions['id-token'], 'write');
assert.equal(workflow.jobs.deploy.permissions.contents, 'read');
for (const key of ['target', 'track']) {
  assert.equal(workflow.jobs.bundle.outputs[key], '${{ steps.policy.outputs.' + key + ' }}', '빌드 전에 검증한 배포 대상을 게시 job으로 전달합니다.');
}
assert.equal(workflow.jobs.bundle.outputs.status, '${{ steps.deployment.outputs.status }}');
const ciPolicyStep = workflow.jobs.bundle.steps.find((step: { id?: string }) => step.id === 'policy');
assert.equal(ciPolicyStep.env.PLAY_DEPLOY_TARGET, "${{ inputs.deploy_target || 'internal' }}");
assert.equal(ciPolicyStep.env.PLAY_CLOSED_TRACK, "${{ inputs.closed_track || vars.PLAY_CLOSED_TRACK || 'alpha' }}");
const preflightStep = workflow.jobs.bundle.steps.find((step: { id?: string }) => step.id === 'deployment');
assert.equal(preflightStep.env.PLAY_DEPLOY_TARGET, '${{ steps.policy.outputs.target }}');
assert.equal(preflightStep.env.PLAY_CLOSED_TRACK, '${{ steps.policy.outputs.track }}');
assert.ok(preflightStep.run.includes('sign-mobile-release.sh --check'));
const finalSigningStep = workflow.jobs.bundle.steps.find((step: { id?: string }) => step.id === 'signing');
for (const step of [preflightStep, finalSigningStep]) {
  assert.equal(step.env.PLAY_SIGNING_TARGET, '${{ steps.policy.outputs.target }}', '서명은 입력 원문이 아닌 검증된 대상만 사용합니다.');
  assert.equal(step.env.PLAY_SIGNING_TRACK, '${{ steps.policy.outputs.track }}');
}
for (const variable of ['PLAY_WORKLOAD_IDENTITY_PROVIDER', 'PLAY_SERVICE_ACCOUNT']) {
  assert.equal(preflightStep.env[variable], '${{ vars.' + variable + ' }}');
  assert.ok(preflightStep.run.includes(variable), '배포 요청은 긴 빌드 전에 WIF 변수 누락을 발견합니다.');
}
assert.equal(workflow.concurrency['cancel-in-progress'], false);
const validationStep = workflow.jobs.bundle.steps.find((step: { run?: string }) => step.run?.includes('npm test'));
assert.ok(validationStep, '전체 테스트를 통과해야 Android 배포 빌드를 진행합니다.');
const validationEnvironment = { ...workflow.jobs.bundle.env, ...validationStep.env };
assert.notEqual(validationEnvironment.NODE_ENV, 'production', '서버 단위 테스트에 운영 모드가 전달되면 운영 세션 Secret을 요구합니다.');
assert.equal(workflow.jobs.bundle.env.NODE_ENV, 'production', 'Android 배포 빌드는 운영 모드를 유지합니다.');

function evaluateCondition(condition: string, github: object, inputs: object = {}, needs: object = {}, steps: object = {}, vars: object = {}) {
  return Function('github', 'inputs', 'needs', 'steps', 'vars', `return (${condition.replace(/^\$\{\{\s*|\s*\}\}$/g, '')});`)(github, inputs, needs, steps, vars);
}
for (const job of Object.values(workflow.jobs) as { env?: object; if?: string; steps: { env?: object; if?: string; uses?: string; with?: Record<string, string>; run?: string }[] }[]) {
  assert.ok(!JSON.stringify(job.env ?? {}).includes('secrets.'), 'job 공통 환경에 Secrets를 전달하지 않습니다.');
  for (const step of job.steps) {
    if (!JSON.stringify([step.env, step.with]).includes('secrets.')) continue;
    for (const eventName of ['pull_request', 'pull_request_target', 'push', 'workflow_dispatch']) {
      for (const ref of ['refs/heads/main', 'refs/pull/1/merge', 'refs/heads/build/mobile-aab']) {
        const github = { event_name: eventName, ref };
        const trusted = ref === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(eventName);
        const isPlayPublisher = job === workflow.jobs.deploy;
        const expected = isPlayPublisher ? (ref === 'refs/heads/main' && eventName === 'workflow_dispatch') : trusted;
        const authorization = isPlayPublisher ? { ops01_release_approved: true } : {};
        const needs = { bundle: { outputs: { deploy: 'true' } } };
        assert.equal(Boolean(evaluateCondition(job.if ?? step.if ?? 'true', github, authorization, needs)), expected, `${eventName}/${ref} Secrets 전달 경계가 잘못되었습니다.`);
        if (isPlayPublisher) {
          assert.equal(Boolean(evaluateCondition(job.if ?? step.if ?? 'true', github, { ops01_release_approved: false }, needs)), false, 'Explicit manual approval is required for every Play upload.');
        }
      }
    }
  }
}
const deploySteps = workflow.jobs.deploy.steps;
const guardIndex = deploySteps.findIndex((step: { run?: string }) => step.run?.includes('mobile-release-policy.mjs validate-deploy'));
const authIndex = deploySteps.findIndex((step: { uses?: string }) => step.uses === 'google-github-actions/auth@v3');
assert.ok(guardIndex >= 0 && authIndex > guardIndex, '인증 전에 배포 정책을 검사합니다.');
const deployGuard = deploySteps[guardIndex];
assert.equal(deployGuard.env.PLAY_DEPLOY_TARGET, '${{ needs.bundle.outputs.target }}');
assert.equal(deployGuard.env.PLAY_CLOSED_TRACK, '${{ needs.bundle.outputs.track }}');
assert.equal(deployGuard.env.PLAY_RELEASE_STATUS, '${{ needs.bundle.outputs.status }}');
for (const variable of ['PLAY_WORKLOAD_IDENTITY_PROVIDER', 'PLAY_SERVICE_ACCOUNT']) {
  assert.equal(deployGuard.env[variable], '${{ vars.' + variable + ' }}');
  assert.ok(deployGuard.run.includes(variable));
}
assert.equal(deploySteps[authIndex].with.workload_identity_provider, '${{ vars.PLAY_WORKLOAD_IDENTITY_PROVIDER }}');
assert.equal(deploySteps[authIndex].with.service_account, '${{ vars.PLAY_SERVICE_ACCOUNT }}');
assert.equal(deploySteps[authIndex].with.credentials_json, undefined);
assert.equal(deploySteps[authIndex].with.access_token_scopes, 'https://www.googleapis.com/auth/androidpublisher');
assert.equal(deploySteps[authIndex].with.create_credentials_file, false);
assert.equal(deploySteps[authIndex].with.export_environment_variables, false);
const publishSteps = deploySteps.filter((step: { env?: Record<string, string> }) => step.env?.PLAY_ACCESS_TOKEN);
assert.equal(publishSteps.length, 1);
assert.ok(publishSteps[0].run.includes('publish-mobile-play.py'));
assert.equal(publishSteps[0].env.PLAY_TARGET, '${{ needs.bundle.outputs.target }}');
assert.equal(publishSteps[0].env.PLAY_TRACK, '${{ needs.bundle.outputs.track }}');
assert.equal(publishSteps[0].env.RELEASE_STATUS, '${{ needs.bundle.outputs.status }}');
assert.ok(publishSteps[0].run.includes('--target "$PLAY_TARGET"'));
assert.ok(publishSteps[0].run.includes('--track "$PLAY_TRACK"'));
const reviewTemporary = mkdtempSync(path.join(tmpdir(), 'invitation-review-policy-'));
try {
  mkdirSync(path.join(reviewTemporary, 'play-artifacts'));
  writeFileSync(path.join(reviewTemporary, 'play-artifacts/fixture.aab'), 'fixture');
  for (const [target, track] of [['internal', 'internal'], ['closed', 'alpha']]) {
    const result = spawnSync('bash', ['-c', 'python3() { printf "%s\\n" "$@"; };\n' + publishSteps[0].run], {
      cwd: reviewTemporary,
      env: { ...process.env, PLAY_SEND_FOR_REVIEW: publishSteps[0].env.PLAY_SEND_FOR_REVIEW, BASE_NAME: 'fixture',
        VERSION_CODE: '211', RELEASE_NAME: 'fixture', PLAY_TARGET: target, PLAY_TRACK: track, RELEASE_STATUS: 'completed' },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const args = result.stdout.trim().split('\n');
    assert.ok(args.includes('--send-for-review'), '허용된 내부 자동·비공개 수동 배포는 자동 심사 앱의 명시적 제출 설정을 전달합니다.');
    assert.equal(args[args.indexOf('--target') + 1], target);
    assert.equal(args[args.indexOf('--track') + 1], track);
  }
  for (const [inputs, variables, expected] of [
    [{ closed_track: '' }, { PLAY_CLOSED_TRACK: '' }, 'alpha'],
    [{ closed_track: '' }, { PLAY_CLOSED_TRACK: 'closed-team' }, 'closed-team'],
    [{ closed_track: 'explicit-team' }, { PLAY_CLOSED_TRACK: 'closed-team' }, 'explicit-team'],
  ] as const) {
    const track = evaluateCondition(ciPolicyStep.env.PLAY_CLOSED_TRACK, {}, inputs, {}, {}, variables);
    assert.equal(track, expected);
    assert.deepEqual(resolvePlayTarget({ eventName: 'workflow_dispatch', ref: 'refs/heads/main', target: 'closed', closedTrack: track }), { target: 'closed', track: expected });
    assert.deepEqual(resolvePlayTarget({ eventName: 'push', ref: 'refs/heads/main', target: 'closed', closedTrack: track }), { target: 'internal', track: 'internal' });
  }
} finally {
  rmSync(reviewTemporary, { recursive: true, force: true });
}
const downloadStep = deploySteps.find((step: { uses?: string }) => step.uses?.startsWith('actions/download-artifact@'));
assert.equal(downloadStep.with.name, '${{ needs.bundle.outputs.artifact_name }}');
assert.equal(downloadStep.with['run-id'], undefined, '다른 실행의 산출물을 사용하지 않습니다.');
for (const job of [workflow.jobs.bundle, workflow.jobs.deploy]) {
  const checkout = job.steps.find((step: { uses?: string }) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with.ref, '${{ github.sha }}', '검사·빌드·게시가 같은 소스 SHA를 사용합니다.');
}
assert.equal(Boolean(evaluateCondition(workflow.jobs.deploy.if, { event_name: 'push', ref: 'refs/heads/main' }, {}, { bundle: { outputs: { deploy: 'false' } } })), false);
assert.ok(!JSON.stringify(workflow).includes('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'), '장기 JSON 비밀키 경로를 제거합니다.');

const accessJob = workflow.jobs['play-access'];
assert.ok(accessJob, '서명 키가 없어도 WIF와 Play 읽기 권한을 별도로 검증할 수 있어야 합니다.');
assert.equal(accessJob.needs, undefined, '접근 검사는 빌드나 서명 성공 여부에 의존하지 않습니다.');
assert.equal(accessJob.permissions.contents, 'read');
assert.equal(accessJob.permissions['id-token'], 'write');
assert.ok(!JSON.stringify(accessJob).includes('secrets.'));
const accessVariables = { PLAY_WORKLOAD_IDENTITY_PROVIDER: 'fixture-provider', PLAY_SERVICE_ACCOUNT: 'fixture-service', PLAY_AUTO_DEPLOY_ENABLED: 'false' };
for (const eventName of ['pull_request', 'pull_request_target', 'push', 'workflow_dispatch']) {
  for (const ref of ['refs/heads/main', 'refs/pull/1/merge', 'refs/heads/build/mobile-aab']) {
    const trusted = ref === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(eventName);
    assert.equal(Boolean(evaluateCondition(accessJob.if, { event_name: eventName, ref }, {}, {}, {}, accessVariables)), trusted);
  }
}
assert.equal(Boolean(evaluateCondition(accessJob.if, { event_name: 'push', ref: 'refs/heads/main' }, {}, {}, {}, { ...accessVariables, PLAY_AUTO_DEPLOY_ENABLED: 'true' })), false, '실제 배포에서는 중복 접근 검사를 생략합니다.');
assert.equal(Boolean(evaluateCondition(accessJob.if, { event_name: 'workflow_dispatch', ref: 'refs/heads/main' }, { deploy: true }, {}, {}, accessVariables)), false);
for (const variable of ['PLAY_WORKLOAD_IDENTITY_PROVIDER', 'PLAY_SERVICE_ACCOUNT']) {
  assert.equal(Boolean(evaluateCondition(accessJob.if, { event_name: 'push', ref: 'refs/heads/main' }, {}, {}, {}, { ...accessVariables, [variable]: '' })), false);
}
const accessAuth = accessJob.steps.find((step: { uses?: string }) => step.uses === 'google-github-actions/auth@v3');
assert.equal(accessAuth.with.workload_identity_provider, '${{ vars.PLAY_WORKLOAD_IDENTITY_PROVIDER }}');
assert.equal(accessAuth.with.service_account, '${{ vars.PLAY_SERVICE_ACCOUNT }}');
assert.equal(accessAuth.with.create_credentials_file, false);
assert.equal(accessAuth.with.export_environment_variables, false);
const accessRead = accessJob.steps.find((step: { env?: Record<string, string> }) => step.env?.PLAY_ACCESS_TOKEN);
const accessScript = accessRead.run.match(/python3 - <<'PY'\n([\s\S]*)\nPY\n?$/)?.[1];
assert.ok(accessScript, '읽기 권한 검사는 환경 변수로 받은 토큰을 Python 요청 헤더에만 사용합니다.');
const accessTemporary = mkdtempSync(path.join(tmpdir(), 'invitation-play-access-'));
try {
  const fixture = `import io, json, os, sys, tempfile, urllib.error, urllib.request
response_file = None
def fixture_open(request, timeout):
    global response_file
    assert request.get_method() == "GET"
    assert request.full_url == "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/kr.msgnote.mobileinvitation/tracks/internal/releases"
    assert request.get_header("Authorization") == "Bearer fixture-access-token"
    assert request.data is None
    assert timeout == 30
    mode = os.environ["ACCESS_FIXTURE"]
    if mode == "denied":
        response_file = tempfile.TemporaryFile()
        raise urllib.error.HTTPError(request.full_url, 403, "fixture-access-token", {}, response_file)
    payload = [] if mode == "malformed" else {"releases": []}
    return io.BytesIO(json.dumps(payload).encode("utf-8"))
urllib.request.urlopen = fixture_open
try:
    exec(sys.stdin.read())
finally:
    if response_file is not None:
        with open(os.environ["ACCESS_RESPONSE_CHECK"], "w", encoding="utf-8") as check:
            json.dump({"closed": response_file.closed}, check)
        response_file.close()
`;
  const responseCheck = path.join(accessTemporary, 'response-check');
  const checkAccess = (mode: string) => spawnSync('python3', ['-c', fixture], { input: accessScript, env: { ...process.env, PLAY_ACCESS_TOKEN: 'fixture-access-token', ACCESS_FIXTURE: mode, ACCESS_RESPONSE_CHECK: responseCheck, GITHUB_STEP_SUMMARY: path.join(accessTemporary, 'summary') }, encoding: 'utf8' });
  const success = checkAccess('success');
  assert.equal(success.status, 0, success.stderr);
  assert.ok(readFileSync(path.join(accessTemporary, 'summary'), 'utf8').includes('WIF 인증 및 내부 테스트 트랙 읽기 권한을 확인했습니다.'));
  for (const mode of ['denied', 'malformed']) {
    const result = checkAccess(mode);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(mode === 'denied' ? 'HTTP 403' : '응답 형식'));
    assert.ok(!`${result.stdout}${result.stderr}`.includes('fixture-access-token'), '권한 오류에서도 액세스 토큰을 출력하지 않습니다.');
    if (mode === 'denied') assert.equal(JSON.parse(readFileSync(responseCheck, 'utf8')).closed, true, 'HTTPError의 실제 응답 파일을 종료 전에 닫아야 합니다.');
  }
} finally {
  rmSync(accessTemporary, { recursive: true, force: true });
}

const ciCli = (overrides = {}) => spawnSync(process.execPath, [fileURLToPath(policyUrl), 'ci'], { env: { ...process.env, GITHUB_RUN_NUMBER: '1', GITHUB_RUN_ATTEMPT: '2', GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF: 'refs/pull/1/merge', PLAY_DEPLOY_TARGET: 'internal', PLAY_CLOSED_TRACK: '', PLAY_AUTO_DEPLOY_ENABLED: 'false', INPUT_DEPLOY: 'false', GITHUB_OUTPUT: '', GITHUB_ENV: '', ...overrides }, encoding: 'utf8' });
const cli = ciCli();
assert.equal(cli.status, 0, cli.stderr);
assert.deepEqual(JSON.parse(cli.stdout), { version_code: 112, trusted: false, deploy: false, target: 'internal', track: 'internal' });
const internalBuildCli = ciCli({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', PLAY_DEPLOY_TARGET: 'closed', PLAY_CLOSED_TRACK: 'production' });
assert.equal(internalBuildCli.status, 0, internalBuildCli.stderr);
assert.deepEqual(JSON.parse(internalBuildCli.stdout), { version_code: 112, trusted: true, deploy: false, target: 'internal', track: 'internal' });
const closedBuildCli = ciCli({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', PLAY_DEPLOY_TARGET: 'closed', PLAY_CLOSED_TRACK: 'alpha' });
assert.equal(closedBuildCli.status, 0, closedBuildCli.stderr);
assert.deepEqual(JSON.parse(closedBuildCli.stdout), { version_code: 112, trusted: true, deploy: false, target: 'closed', track: 'alpha' });
assert.notEqual(ciCli({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', PLAY_DEPLOY_TARGET: 'closed' }).status, 0);
assert.notEqual(ciCli({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', PLAY_DEPLOY_TARGET: 'production' }).status, 0);
const validateCli = (overrides = {}) => spawnSync(process.execPath, [fileURLToPath(policyUrl), 'validate-deploy'], { env: { ...process.env, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', INPUT_DEPLOY: 'true', SIGNED: 'true', PLAY_DEPLOY_TARGET: 'internal', PLAY_CLOSED_TRACK: '', PLAY_RELEASE_STATUS: 'completed', GITHUB_OUTPUT: '', ...overrides }, encoding: 'utf8' });
const internalCli = validateCli();
assert.equal(internalCli.status, 0, internalCli.stderr);
assert.deepEqual(JSON.parse(internalCli.stdout), { target: 'internal', track: 'internal', status: 'completed' });
const closedCli = validateCli({ PLAY_DEPLOY_TARGET: 'closed', PLAY_CLOSED_TRACK: 'alpha' });
assert.equal(closedCli.status, 0, closedCli.stderr);
assert.deepEqual(JSON.parse(closedCli.stdout), { target: 'closed', track: 'alpha', status: 'completed' });
assert.notEqual(validateCli({ PLAY_DEPLOY_TARGET: 'closed' }).status, 0);
assert.notEqual(validateCli({ PLAY_DEPLOY_TARGET: 'closed', PLAY_CLOSED_TRACK: 'internal' }).status, 0);
const automaticCli = validateCli({ GITHUB_EVENT_NAME: 'push', PLAY_AUTO_DEPLOY_ENABLED: 'true', PLAY_DEPLOY_TARGET: 'closed', PLAY_CLOSED_TRACK: 'alpha' });
assert.equal(automaticCli.status, 0, automaticCli.stderr);
assert.deepEqual(JSON.parse(automaticCli.stdout), { target: 'internal', track: 'internal', status: 'completed' });
console.log('mobile release version, metadata, trust policy and workflow integration checks passed');
