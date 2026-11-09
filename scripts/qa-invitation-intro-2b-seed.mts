import { mkdirSync, writeFileSync } from 'node:fs';
import { createInitialWizardConfig } from '../src/app/page-wizard/pageWizardData.ts';

const seed = createInitialWizardConfig('wedding');
seed.slug = 'intro-2b-local-preview';
seed.couple.groom.name = '테스트신랑';
seed.couple.bride.name = '테스트신부';
seed.groomName = seed.couple.groom.name;
seed.brideName = seed.couple.bride.name;
seed.displayName = '2-B 검증용 청첩장';
seed.date = '2027년 4월 17일';
seed.venue = '샘플 예식장';
seed.metadata.images.wedding = '/images/home-wedding/portrait.webp';
seed.introStyle = 'none';

mkdirSync('artifacts/quiet-invitation-2b', { recursive: true });
writeFileSync(
  'artifacts/quiet-invitation-2b/local-preview-seed.json',
  JSON.stringify(seed, null, 2) + '\n',
  'utf8'
);
console.log('Generated test-only wedding seed without account, purchase or Firebase writes');
