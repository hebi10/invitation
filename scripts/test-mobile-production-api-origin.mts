import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync('apps/mobile/app.config.ts', 'utf8');
const apiCore = readFileSync('apps/mobile/src/lib/apiCore.ts', 'utf8');
const preferences = readFileSync('apps/mobile/src/contexts/PreferencesContext.tsx', 'utf8');
const origin = 'https://invite.msgnote.kr';

assert.ok(config.includes(`const PRODUCTION_API_BASE_URL = '${origin}'`));
assert.ok(apiCore.includes(`const PRODUCTION_API_BASE_URL = '${origin}'`));
assert.match(apiCore, /isLegacyProductionApiBaseUrl\(value: string\)/);
assert.match(preferences, /isLegacyProductionApiBaseUrl\(normalizedStoredApiBaseUrl\)/);
console.log('Mobile Firebase API uses the App Hosting domain and migrates stored legacy defaults.');
