import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  applyWizardDateInputToConfig,
  applyWizardTimeInputToConfig,
  buildWeddingDateObject,
  createInitialWizardConfig,
  prepareWizardConfigForSave,
} from '@/app/page-wizard/pageWizardData';

const config = createInitialWizardConfig('wedding');

assert.equal(
  applyWizardDateInputToConfig(config, '2026-10-24'),
  true,
  'valid date input should update wizard date state'
);
assert.equal(config.weddingDateTime.year, 2026);
assert.equal(config.weddingDateTime.month, 9);
assert.equal(config.weddingDateTime.day, 24);

assert.equal(
  applyWizardTimeInputToConfig(config, '14:30'),
  true,
  'valid time input should update wizard time state'
);
assert.equal(config.weddingDateTime.hour, 14);
assert.equal(config.weddingDateTime.minute, 30);

const invalidConfig = structuredClone(config);
assert.equal(
  applyWizardTimeInputToConfig(invalidConfig, '24:90'),
  false,
  'invalid time input should be ignored'
);
assert.equal(invalidConfig.weddingDateTime.hour, 14);
assert.equal(invalidConfig.weddingDateTime.minute, 30);

const weddingDate = buildWeddingDateObject(config);
assert.ok(weddingDate, 'valid wizard schedule should build a Date object');
assert.equal(weddingDate.getHours(), 14);
assert.equal(weddingDate.getMinutes(), 30);

const prepared = prepareWizardConfigForSave(config, 'qa-schedule-time');
assert.equal(prepared.weddingDateTime.hour, 14);
assert.equal(prepared.weddingDateTime.minute, 30);
assert.equal(prepared.pageData?.ceremonyTime, '오후 2:30');
assert.equal(prepared.pageData?.ceremony?.time, '오후 2:30');

for (const rendererPath of [
  'src/app/_components/themeRenderers/emotional.tsx',
  'src/app/_components/themeRenderers/simple.tsx',
]) {
  const source = fs.readFileSync(rendererPath, 'utf8');
  assert.equal(
    source.includes('weddingDate={`${state.pageConfig.date} ${pageData?.ceremonyTime ?? \'\'}'),
    false,
    `${rendererPath} should pass the date separately so Cover does not duplicate ceremony time`
  );
  assert.equal(
    source.includes('weddingDate={state.pageConfig.date}'),
    true,
    `${rendererPath} should let Cover append ceremonyTime once`
  );
}

console.log('page wizard schedule time checks passed');
