import assert from 'node:assert/strict';

import { getEventInvitationMetadata } from '../src/app/_components/EventInvitationLayout';
import { createInvitationPageFromSeed } from '../src/config/weddingPages';
import { shinMinjeKimHyunjiConfig } from '../src/config/pages/shin-minje-kim-hyunji';

const page = createInvitationPageFromSeed(shinMinjeKimHyunjiConfig);
page.metadata.images.favicon = '/images/favicon.ico';

const metadata = getEventInvitationMetadata(page);
const metadataBase = metadata.metadataBase?.toString() ?? '';
const icons = metadata.icons as {
  icon?: string;
  shortcut?: string;
  apple?: string;
};
const openGraph = metadata.openGraph as {
  images?: Array<{ url: string }>;
};
const socialImageUrl = openGraph.images?.[0]?.url ?? '';

assert.equal(metadataBase, 'https://msgnote.kr/');
assert.equal(icons.icon, '/favicon.ico');
assert.equal(icons.shortcut, '/favicon.ico');
assert.equal(icons.apple, '/favicon.ico');
assert.equal(
  new URL(socialImageUrl, metadataBase).toString(),
  'https://msgnote.kr/images/sample-wedding-romantic.webp'
);

console.log('청첩장 운영 메타데이터 검증 통과');
