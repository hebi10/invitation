import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readText(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const storageSource = readText('apps/mobile/src/lib/storage.ts');
const apiCoreSource = readText('apps/mobile/src/lib/apiCore.ts');
const billingSource = readText('apps/mobile/src/lib/billing.ts');

assert(
  storageSource.includes('MOBILE_DEVICE_ID_STORAGE_KEY') &&
    storageSource.includes('getOrCreateMobileDeviceId') &&
    storageSource.includes('setStoredString(MOBILE_DEVICE_ID_STORAGE_KEY'),
  'Mobile device id must be generated once and persisted through the mobile storage abstraction.'
);

assert(
  apiCoreSource.includes("from './storage'") &&
    apiCoreSource.includes('getOrCreateMobileDeviceId') &&
    apiCoreSource.includes("'x-mobile-device-id'") &&
    apiCoreSource.includes('appendMobileDeviceIdHeader(init)') &&
    apiCoreSource.includes('fetch(input, requestInit)'),
  'fetchWithRetry must attach x-mobile-device-id to every shared mobile API request.'
);

assert(
  apiCoreSource.includes("request.setRequestHeader('x-mobile-device-id'") &&
    apiCoreSource.includes("request.setRequestHeader('x-mobile-client-editor-high-risk-token'"),
  'XMLHttpRequest uploads must include the mobile device id and preserve high-risk token support.'
);

assert(
  !billingSource.includes('createMockPurchaseResult') &&
    !billingSource.includes('isProductionNativeRuntime') &&
    billingSource.includes("Platform.OS !== 'android'") &&
    billingSource.includes("startsWith('goog_')"),
  'Every environment must require Google Play billing without a mock fallback.'
);

console.log('mobile device id and billing policy checks passed');
