import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getPageCategoryCreateWizardHref,
  type PageCategoryTabKey,
} from '../src/app/admin/_components/adminPageUtils.ts';
import { getWizardSteps } from '../src/app/page-wizard/pageWizardData.ts';
import type { EventTypeKey } from '../src/lib/eventTypes.ts';

const lockedCreateRoutes: Array<{
  category: PageCategoryTabKey;
  href: string;
  eventType: EventTypeKey;
}> = [
  { category: 'invitation', href: '/page-wizard', eventType: 'wedding' },
  { category: 'birthday', href: '/birthday-wizard', eventType: 'birthday' },
  {
    category: 'first-birthday',
    href: '/first-birthday-wizard',
    eventType: 'first-birthday',
  },
  {
    category: 'general-event',
    href: '/general-event-wizard',
    eventType: 'general-event',
  },
  { category: 'opening', href: '/opening-wizard', eventType: 'opening' },
];

for (const { category, href, eventType } of lockedCreateRoutes) {
  assert.equal(
    getPageCategoryCreateWizardHref(category),
    href,
    `${category} should link to its dedicated page wizard create route`
  );

  const steps = getWizardSteps({
    eventType,
    includeSetupSteps: true,
    includeEventTypeStep: false,
  });

  assert.equal(
    steps.some((step) => step.key === 'eventType'),
    false,
    `${href} should not render the event type selection step`
  );
  assert.equal(
    steps[0]?.key,
    'theme',
    `${href} should start from the theme step after the event type is fixed`
  );

  const routeFile =
    href === '/page-wizard'
      ? path.join(process.cwd(), 'src/app/page-wizard/page.tsx')
      : path.join(process.cwd(), 'src/app', href, 'page.tsx');

  assert.equal(fs.existsSync(routeFile), true, `${href} route file should exist`);
}

console.log('page wizard event type lock checks passed');
