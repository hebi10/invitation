import { createRequire, register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getHomeLinkRenderProps,
  handleExperienceNoticeKeyDown,
  shouldDismissExperienceNotice,
} from '../src/app/_components/homeInteractionPolicy';

const findings: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    findings.push(message);
  }
}

assert(
  JSON.stringify(getHomeLinkRenderProps(false)) === '{}',
  'internal home links must stay in the current tab.'
);
assert(
  JSON.stringify(getHomeLinkRenderProps(true)) ===
    JSON.stringify({ target: '_blank', rel: 'noreferrer' }),
  'external home links must open in a protected new tab.'
);
assert(
  shouldDismissExperienceNotice('Escape', false),
  'Escape must dismiss an idle experience notice.'
);
assert(
  !shouldDismissExperienceNotice('Escape', true) &&
    !shouldDismissExperienceNotice('Enter', false),
  'Loading or unrelated keys must not dismiss the experience notice.'
);

let dismissed = false;
assert(
  handleExperienceNoticeKeyDown('Escape', false, () => {
    dismissed = true;
  }) &&
    dismissed,
  'Escape keyboard handling must run the supplied dismiss action.'
);

// Keep the standalone sample connected to the service, without inserting
// service navigation into the homepage's embedded invitation preview.
Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const { default: SampleInvitationPage } = await import('../src/app/sample-invitation/page.tsx');
const { default: SampleInvitation } = await import('../src/app/sample-invitation/SampleInvitation.tsx');
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query');

for (const scenario of [
  { query: {}, expectedServiceLinks: true, label: 'standalone sample' },
  { query: { embed: '1' }, expectedServiceLinks: false, label: 'embedded preview' },
  { query: { embed: '0' }, expectedServiceLinks: true, label: 'non-embedded sample' },
]) {
  const page = await SampleInvitationPage({ searchParams: Promise.resolve(scenario.query) });
  const sample = SampleInvitation(page.props);
  // Own the provider here so the guestbook's cache timer is cleared after SSR.
  const client = new QueryClient();
  let markup: string;
  try {
    markup = renderToStaticMarkup(
      React.createElement(QueryClientProvider, { client }, sample.props.children)
    );
  } finally {
    client.clear();
  }
  assert(
    markup.includes('href="/"') === scenario.expectedServiceLinks,
    `${scenario.label}: home navigation must follow the display context.`
  );
  assert(
    markup.includes('href="https://kmong.com/gig/686626"') === scenario.expectedServiceLinks,
    `${scenario.label}: production inquiry must follow the display context.`
  );
  assert(
    markup.includes('id="wedding-cover-title"') && markup.includes('id="wedding-location"'),
    `${scenario.label}: cover and directions must remain available.`
  );
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log('homepage UI contract checks passed');
