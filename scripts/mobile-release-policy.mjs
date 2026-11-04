import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_VERSION_CODE = 2100000000;
const PACKAGE_NAME = 'kr.msgnote.mobileinvitation';

export function parseAndroidVersionCode(value = '11') {
  if (!/^[1-9][0-9]*$/.test(String(value))) {
    throw new Error('Android versionCode는 11 이상 정수여야 합니다.');
  }
  const code = Number(value);
  if (!Number.isSafeInteger(code) || code < 11 || code > MAX_VERSION_CODE) {
    throw new Error('Android versionCode 허용 범위는 11..2100000000입니다.');
  }
  return code;
}

export function createCiVersionCode(runNumber, runAttempt) {
  if (!/^[1-9][0-9]*$/.test(String(runNumber)) || !/^[1-9][0-9]?$/.test(String(runAttempt))) {
    throw new Error('GitHub 실행 번호는 양의 정수, 재실행 번호는 1..99여야 합니다.');
  }
  return parseAndroidVersionCode(String(10 + Number(runNumber) * 100 + Number(runAttempt)));
}

export function isTrustedReleaseEvent({ eventName, ref }) {
  return ref === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(eventName);
}

export function shouldDeployRelease({ eventName, ref, autoDeployEnabled, manualDeploy }) {
  return isTrustedReleaseEvent({ eventName, ref }) && (
    (eventName === 'push' && autoDeployEnabled === 'true') ||
    (eventName === 'workflow_dispatch' && (manualDeploy === true || manualDeploy === 'true'))
  );
}

export function readAndroidGradleMetadata(gradle, expectedVersionCode) {
  const readOne = (pattern, label) => {
    const matches = [...gradle.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`Android ${label} 선언이 정확히 하나여야 합니다.`);
    return matches[0][1];
  };
  const packageName = readOne(/\bapplicationId\s+['"]([^'"]+)['"]/g, 'package');
  const versionCode = parseAndroidVersionCode(readOne(/\bversionCode\s+([0-9]+)\b/g, 'versionCode'));
  const versionName = readOne(/\bversionName\s+['"]([^'"]+)['"]/g, 'versionName');
  if (packageName !== PACKAGE_NAME) throw new Error('Android package가 청첩장 앱과 다릅니다.');
  if (versionCode !== parseAndroidVersionCode(String(expectedVersionCode))) throw new Error('생성된 Android versionCode가 CI 번호와 다릅니다.');
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(versionName)) throw new Error('Android versionName 형식이 올바르지 않습니다.');
  return { packageName, versionCode, versionName };
}

export function resolvePlayTarget(policy) {
  const target = policy.eventName === 'push' && policy.ref === 'refs/heads/main' ? 'internal' : policy.target ?? 'internal';
  if (!['internal', 'closed'].includes(target)) throw new Error('PLAY_DEPLOY_TARGET은 internal 또는 closed만 허용합니다.');
  if (target === 'closed' && (policy.eventName !== 'workflow_dispatch' || !isTrustedReleaseEvent(policy))) {
    throw new Error('비공개 테스트 대상은 main 수동 실행에서만 선택할 수 있습니다.');
  }
  const track = target === 'internal' ? 'internal' : policy.closedTrack ?? '';
  if (target === 'closed' && (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(track) || ['production', 'beta', 'internal', 'internalsharing', 'qa'].includes(track.toLowerCase()))) {
    throw new Error('PLAY_CLOSED_TRACK에 실제 비공개 테스트 트랙 ID를 지정하세요. 운영·공개·내부 트랙은 허용하지 않습니다.');
  }
  return { target, track };
}

export function validatePlayDeployment(policy) {
  if (!shouldDeployRelease(policy)) throw new Error('Play 배포는 main push 자동 배포 또는 main 수동 배포만 허용합니다.');
  if (policy.signed !== 'true') throw new Error('기존 청첩장 키로 서명된 APK/AAB가 필요합니다. 서명 Secrets 4개를 확인하세요.');
  const { target, track } = resolvePlayTarget(policy);
  const status = policy.status || 'completed';
  if (!['completed', 'draft'].includes(status)) throw new Error('PLAY_RELEASE_STATUS는 completed 또는 draft만 허용합니다.');
  return { target, track, status };
}

function environmentPolicy() {
  return {
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    autoDeployEnabled: process.env.PLAY_AUTO_DEPLOY_ENABLED,
    manualDeploy: process.env.INPUT_DEPLOY,
    signed: process.env.SIGNED,
    target: process.env.PLAY_DEPLOY_TARGET,
    closedTrack: process.env.PLAY_CLOSED_TRACK,
    status: process.env.PLAY_RELEASE_STATUS,
  };
}

function writeOutputs(values) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
  }
  console.log(JSON.stringify(values));
}

function main() {
  const command = process.argv[2];
  if (command === 'ci') {
    const versionCode = createCiVersionCode(process.env.GITHUB_RUN_NUMBER, process.env.GITHUB_RUN_ATTEMPT);
    const policy = environmentPolicy();
    writeOutputs({ version_code: versionCode, trusted: isTrustedReleaseEvent(policy), deploy: shouldDeployRelease(policy), ...resolvePlayTarget(policy) });
    if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `EXPO_ANDROID_VERSION_CODE=${versionCode}\n`);
  } else if (command === 'prepare') {
    const gradlePath = process.argv[3];
    const metadata = readAndroidGradleMetadata(readFileSync(gradlePath, 'utf8'), process.env.EXPO_ANDROID_VERSION_CODE);
    const sha = process.env.GITHUB_SHA ?? '';
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('소스 SHA가 올바르지 않습니다.');
    appendFileSync(gradlePath, '\nandroid { buildTypes { release { signingConfig null } } }\n');
    const baseName = `invitation-${metadata.versionName}-code${metadata.versionCode}-${sha.slice(0, 12)}`;
    writeOutputs({ package_name: metadata.packageName, version_name: metadata.versionName, version_code: metadata.versionCode, base_name: baseName, artifact_name: `${baseName}-signed`, release_name: `${metadata.versionName} (${metadata.versionCode}) ${sha.slice(0, 12)}` });
  } else if (command === 'validate-deploy') {
    writeOutputs(validatePlayDeployment(environmentPolicy()));
  } else {
    throw new Error('사용법: mobile-release-policy.mjs ci | prepare <build.gradle> | validate-deploy');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Android 배포 정책 검증 실패');
    process.exitCode = 1;
  }
}
