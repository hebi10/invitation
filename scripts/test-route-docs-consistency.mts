import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { EVENT_TYPE_KEYS, EVENT_TYPE_META } from '@/lib/eventTypes';

const root = process.cwd();
const readUtf8 = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), 'utf8');

const readme = readUtf8('README.md');
const securityChecklist = readUtf8('docs/security-hardening-checklist.md');
const eventTypeRegistry = readUtf8('docs/event-type-registry.md');

const currentRoutes = [
  ['/admin', 'src/app/admin/page.tsx'],
  ['/my-invitations', 'src/app/my-invitations/page.tsx'],
  ['/page-wizard', 'src/app/page-wizard/page.tsx'],
  ['/birthday-wizard', 'src/app/birthday-wizard/page.tsx'],
  ['/first-birthday-wizard', 'src/app/first-birthday-wizard/page.tsx'],
  ['/general-event-wizard', 'src/app/general-event-wizard/page.tsx'],
  ['/opening-wizard', 'src/app/opening-wizard/page.tsx'],
  ['/experience/admin', 'src/app/experience/admin/page.tsx'],
  ['/experience/page-wizard/{slug}', 'src/app/experience/page-wizard/[slug]/page.tsx'],
  ['/experience/my-invitations', 'src/app/experience/my-invitations/page.tsx'],
  ['/experience/preview/{slug}/{theme}', 'src/app/experience/preview/[slug]/[[...theme]]/page.tsx'],
  ['/memory/{slug}', 'src/app/memory/[slug]/page.tsx'],
  ['/{slug}', 'src/app/[slug]/page.tsx'],
  ['/{slug}/{theme}', 'src/app/[slug]/[theme]/page.tsx'],
] as const;

for (const [route, sourcePath] of currentRoutes) {
  assert.ok(
    existsSync(path.join(root, sourcePath)),
    `Current route source must exist: ${sourcePath}`
  );
  assert.ok(readme.includes(route), `README must document ${route}`);
}

assert.equal(
  existsSync(path.join(root, 'src/app/page-editor/page.tsx')),
  false,
  'Removed page-editor UI route must stay absent.'
);
assert.equal(
  readme.includes('/page-editor'),
  false,
  'README must not describe the removed page-editor UI as a current route.'
);

for (const route of ['/admin', '/my-invitations', '/page-wizard/{slug}']) {
  assert.ok(
    securityChecklist.includes(route),
    `Security checklist must document ${route}`
  );
}
assert.equal(
  securityChecklist.includes('/page-editor'),
  false,
  'Security checklist must not contain manual QA for the removed page-editor UI.'
);

for (const eventType of EVENT_TYPE_KEYS) {
  const meta = EVENT_TYPE_META[eventType];
  for (const expectedValue of [
    `\`${eventType}\``,
    meta.label,
    meta.adminLabel,
    meta.customerLabel,
    `\`${String(meta.enabled)}\``,
    `\`${meta.defaultRendererKey}\``,
    `\`${meta.defaultEditorKey}\``,
    `\`${meta.defaultWizardStepConfigKey}\``,
  ]) {
    assert.ok(
      eventTypeRegistry.includes(expectedValue),
      `Event type registry must include ${eventType}: ${expectedValue}`
    );
  }
}

console.log('route documentation consistency checks passed');
