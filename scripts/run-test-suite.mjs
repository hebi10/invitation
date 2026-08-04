import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const core = [
  'validate-theme-extension',
  'test-admin-created-event-ownership',
  'test-admin-customer-account-assignment-filters',
  'test-admin-event-preview-links',
  'test-admin-event-workspace-model',
  'test-birthday-event-rendering',
  'test-classic-r-theme',
  'test-customer-page-wizard-save-route',
  'test-customer-event-self-claim',
  'test-customer-wallet-compensation',
  'test-demo-experience-core',
  'test-demo-experience-admin-gateway',
  'test-demo-experience-customer',
  'test-demo-experience-preview',
  'test-demo-experience-seeds',
  'test-demo-experience-wizard',
  'test-dummy-event-seeds',
  'test-event-ownership-invite-policy',
  'test-event-slug-index',
  'test-first-birthday-page-rendering',
  'test-image-upload-optimization',
  'test-homepage-ui-contracts',
  'test-kakao-share-url-policy',
  'test-opening-event-rendering',
  'test-page-wizard-event-type-lock',
  'test-page-wizard-workspace',
  'test-page-wizard-schedule-time',
  'test-romantic-empty-state',
  'test-sample-invitation-fallback',
  'test-wedding-theme-accessibility',
  'test-wedding-theme-performance',
  'test-wedding-theme-style-contracts',
];

const security = [
  'test-admin-api-auth',
  'test-admin-owner-image-upload-routing',
  'test-customer-api-auth',
  'test-customer-auth-route-policy',
  'test-demo-experience-session',
  'test-demo-experience-api-policy',
  'test-demo-experience-cleanup-policy',
  'test-editable-image-upload-validation',
  'test-event-ownership-invite-routes',
  'test-kakao-address-search-error-policy',
  'test-kakao-map-infowindow-sanitization',
  'test-mobile-customer-auth-policy',
  'test-mobile-device-id-and-billing-policy',
  'test-mobile-save-entitlement-policy',
  'test-mobile-session-security-policy',
  'test-public-access-block-reasons',
  'test-rate-limit-policy',
  'test-security-hardening',
];

const architecture = [
  'test-api-repository-boundary',
  'test-demo-experience-boundary',
  'test-demo-experience-routes',
  'test-event-write-paths',
  'test-project-guardrails',
  'test-route-docs-consistency',
  'test-service-repository-boundary',
];

const emulator = [
  'test-billing-fulfillment-lock',
  'test-demo-experience-repository-emulator',
  'test-event-ownership-invite-emulator',
  'test-firestore-rules-emulator',
  'test-storage-rules-emulator',
];

const unique = (testIds) => [...new Set(testIds)];
const suites = {
  core,
  security,
  architecture,
  emulator,
  fast: unique([...core, ...security, ...architecture]),
};
const allTestIds = unique(Object.values(suites).flat());
const scriptsDirectory = path.resolve(process.cwd(), 'scripts');

function resolveNpxCliPath() {
  const nodeDirectory = path.dirname(process.execPath);
  const candidates = [
    process.env.npm_execpath
      ? path.join(path.dirname(process.env.npm_execpath), 'npx-cli.js')
      : null,
    path.join(nodeDirectory, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.resolve(nodeDirectory, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

const npxCliPath = resolveNpxCliPath();

function testFilePath(testId) {
  return path.join(scriptsDirectory, `${testId}.mts`);
}

function validateRegistry() {
  for (const [suiteName, testIds] of Object.entries(suites)) {
    if (unique(testIds).length !== testIds.length) {
      throw new Error(`테스트 묶음에 중복 항목이 있습니다: ${suiteName}`);
    }
  }

  const missingFiles = allTestIds.filter((testId) => !existsSync(testFilePath(testId)));
  if (missingFiles.length > 0) {
    throw new Error(`테스트 파일을 찾을 수 없습니다: ${missingFiles.join(', ')}`);
  }
  if (!npxCliPath) {
    throw new Error('npm 실행 파일(npx-cli.js)을 찾을 수 없습니다.');
  }
}

function printRegistry() {
  console.log('사용 가능한 테스트 묶음:');
  for (const [suiteName, testIds] of Object.entries(suites)) {
    console.log(`- ${suiteName} (${testIds.length})`);
  }
  console.log('\n사용 가능한 개별 테스트:');
  for (const testId of allTestIds) {
    console.log(`- ${testId}`);
  }
}

function resolveTests(target) {
  if (suites[target]) {
    return suites[target];
  }
  if (allTestIds.includes(target)) {
    return [target];
  }
  return null;
}

validateRegistry();

const target = process.argv[2] ?? 'fast';
if (target === '--list') {
  printRegistry();
  process.exit(0);
}

const selectedTests = resolveTests(target);
if (!selectedTests) {
  console.error(`알 수 없는 테스트 묶음 또는 테스트 ID입니다: ${target}\n`);
  printRegistry();
  process.exit(1);
}

for (const testId of selectedTests) {
  console.log(`\n[test-suite] ${testId}`);
  const result = spawnSync(
    process.execPath,
    [npxCliPath, '--yes', 'tsx', '--conditions', 'react-server', testFilePath(testId)],
    {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: 'inherit',
    }
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
