import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getPageCategoryCreateWizardHref,
  type PageCategoryTabKey,
} from '../src/app/admin/_components/adminPageUtils.ts';
import {
  getPageWizardCreateHrefForEventType,
  getSelectableThemeKeysForEventType,
  isDedicatedPageWizardEventType,
} from '../src/app/page-wizard/pageWizardEventConfig.ts';
import {
  BIRTHDAY_THEME_KEYS,
} from '../src/app/_components/birthday/birthdayThemes.ts';
import {
  GENERAL_EVENT_THEME_KEYS,
} from '../src/app/_components/generalEvent/generalEventThemes.ts';
import {
  getSelectableFirstBirthdayThemeKeys,
} from '../src/app/_components/firstBirthday/firstBirthdayThemes.ts';
import { OPENING_THEME_KEYS } from '../src/app/_components/opening/openingThemes.ts';
import { getWizardSteps } from '../src/app/page-wizard/pageWizardData.ts';
import type { EventTypeKey } from '../src/lib/eventTypes.ts';
import { getSelectableInvitationThemeKeys } from '../src/lib/invitationThemes.ts';

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

  assert.equal(
    getPageWizardCreateHrefForEventType(eventType),
    href,
    `${eventType} should resolve to its canonical create route`
  );

  assert.equal(
    isDedicatedPageWizardEventType(eventType),
    eventType !== 'wedding',
    `${eventType} dedicated route status should match its canonical URL`
  );
}

assert.deepEqual(
  getSelectableThemeKeysForEventType('wedding'),
  getSelectableInvitationThemeKeys().filter(
    (theme) =>
      !theme.startsWith('first-birthday-') &&
      !theme.startsWith('birthday-') &&
      !theme.startsWith('general-event-') &&
      !theme.startsWith('opening-')
  ),
  'wedding wizard should only show wedding themes'
);

assert.deepEqual(
  getSelectableThemeKeysForEventType('birthday'),
  [...BIRTHDAY_THEME_KEYS],
  'birthday wizard should only show birthday themes'
);

assert.deepEqual(
  getSelectableThemeKeysForEventType('first-birthday'),
  getSelectableFirstBirthdayThemeKeys(),
  'first birthday wizard should only show first birthday themes'
);

assert.deepEqual(
  getSelectableThemeKeysForEventType('general-event'),
  [...GENERAL_EVENT_THEME_KEYS],
  'general event wizard should only show general event themes'
);

assert.deepEqual(
  getSelectableThemeKeysForEventType('opening'),
  [...OPENING_THEME_KEYS],
  'opening wizard should only show opening themes'
);

const pageWizardSource = fs.readFileSync(
  path.join(process.cwd(), 'src/app/page-wizard/page.tsx'),
  'utf8'
);
assert.match(
  pageWizardSource,
  /redirect\(/,
  '/page-wizard legacy eventType query should redirect to the canonical route'
);

console.log('page wizard event type lock checks passed');
