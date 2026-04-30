import assert from 'node:assert/strict';

import {
  SHORTCUT_ITEMS,
  getPageCategoryPreviewLinks,
} from '../src/app/admin/_components/adminPageUtils.ts';
import {
  buildEventPreviewPath,
  getEventPreviewLinks,
} from '../src/lib/eventPreviewLinks.ts';

assert.deepEqual(
  SHORTCUT_ITEMS.map((item) => item.key),
  ['emotional', 'romantic', 'simple']
);

const firstBirthdayLinks = getPageCategoryPreviewLinks('first-birthday', {
  slug: 'first-birthday-ian-spring',
});

assert.deepEqual(
  firstBirthdayLinks.map((link) => link.path),
  [
    '/first-birthday-ian-spring/first-birthday-pink',
    '/first-birthday-ian-spring/first-birthday-mint',
  ]
);
assert.equal(
  firstBirthdayLinks.some((link) => link.path.includes('/emotional')),
  false
);

const openingLinks = getPageCategoryPreviewLinks('opening', {
  slug: 'opening-bloom-cafe',
});
assert.deepEqual(
  openingLinks.map((link) => link.path),
  ['/opening-bloom-cafe/opening-natural', '/opening-bloom-cafe/opening-modern']
);

const birthdayLinks = getPageCategoryPreviewLinks('birthday', {
  slug: 'birthday-minseo-picnic',
});
assert.deepEqual(
  birthdayLinks.map((link) => link.path),
  [
    '/birthday-minseo-picnic/birthday-minimal',
    '/birthday-minseo-picnic/birthday-floral',
  ]
);

const generalEventLinks = getPageCategoryPreviewLinks('general-event', {
  slug: 'general-event-brand-night',
});
assert.deepEqual(
  generalEventLinks.map((link) => link.path),
  [
    '/general-event-brand-night/general-event-elegant',
    '/general-event-brand-night/general-event-vivid',
  ]
);

assert.equal(
  buildEventPreviewPath('birthday-minseo-picnic', 'birthday', 'emotional'),
  '/birthday-minseo-picnic/birthday-minimal'
);
assert.equal(
  buildEventPreviewPath('general-event-brand-night', 'general-event', 'emotional'),
  '/general-event-brand-night/general-event-elegant'
);
assert.equal(
  buildEventPreviewPath('opening-bloom-cafe', 'opening', 'emotional'),
  '/opening-bloom-cafe/opening-natural'
);

const customerBirthdayLinks = getEventPreviewLinks({
  slug: 'birthday-minseo-picnic',
  eventType: 'birthday',
  availableThemes: ['emotional'],
  defaultTheme: 'emotional',
});
assert.deepEqual(
  customerBirthdayLinks.map((link) => link.href),
  [
    '/birthday-minseo-picnic/birthday-minimal',
    '/birthday-minseo-picnic/birthday-floral',
  ]
);

console.log('admin event preview link checks passed');
