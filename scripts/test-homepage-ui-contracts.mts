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

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log('homepage UI contract checks passed');
