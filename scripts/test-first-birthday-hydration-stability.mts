import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  'src/app/_components/firstBirthday/themeRenderers/shared.tsx',
  'utf8'
);

assert.equal(
  source.includes('const countdownParts = useCountdownParts(model.countdownDate);'),
  true,
  'first-birthday countdown should be computed through the hydration-safe hook'
);
assert.equal(
  source.includes('const countdownParts = useMemo(\n    () => getCountdownParts'),
  false,
  'first-birthday countdown must not call Date.now during server/client render'
);
assert.equal(
  source.includes('const [now, setNow] = useState<number | null>(null);'),
  true,
  'first-birthday countdown should render a stable initial value before client mount'
);

console.log('first birthday hydration stability checks passed');
