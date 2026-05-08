import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { escapeHtmlText } from '../src/utils/htmlEscaping.ts';

assert.equal(
  escapeHtmlText(`<img src=x onerror="alert('xss')">&`),
  '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;'
);

const files = [
  'src/components/sections/LocationMap/LocationMap.tsx',
  'src/components/sections/LocationMap/LocationMapSimple.tsx',
  'src/app/_components/themeRenderers/romanticLocationMap.tsx',
];

for (const file of files) {
  const source = readFileSync(file, 'utf8');

  assert.doesNotMatch(
    source,
    /content:\s*`[^`]*\$\{(?:markerTitle|venueName)/,
    `${file} must not interpolate raw venue text into Kakao InfoWindow HTML`
  );
}

console.log('kakao map infowindow sanitization checks passed');
