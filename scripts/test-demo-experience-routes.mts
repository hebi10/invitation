import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

assert.ok(existsSync('src/app/experience/admin/page.tsx'));
assert.ok(existsSync('src/app/experience/admin/layout.tsx'));
assert.ok(existsSync('src/app/experience/page-wizard/layout.tsx'));

const homePage = readFileSync('src/app/page.tsx', 'utf8');
const experienceLayout = readFileSync('src/app/experience/layout.tsx', 'utf8');
const experienceAdminPage = readFileSync(
  'src/app/experience/admin/page.tsx',
  'utf8'
);
const experienceAdminLayout = readFileSync(
  'src/app/experience/admin/layout.tsx',
  'utf8'
);
const experienceWizardPage = readFileSync(
  'src/app/experience/page-wizard/page.tsx',
  'utf8'
);
const experienceWizardLayout = readFileSync(
  'src/app/experience/page-wizard/layout.tsx',
  'utf8'
);
const experienceCustomerPage = readFileSync(
  'src/app/experience/my-invitations/page.tsx',
  'utf8'
);
const adminClient = readFileSync('src/app/admin/AdminPageClient.tsx', 'utf8');
const wizardClient = readFileSync(
  'src/app/page-wizard/PageWizardClient.tsx',
  'utf8'
);
const customerClient = readFileSync(
  'src/app/my-invitations/MyInvitationsClient.tsx',
  'utf8'
);

assert.match(
  homePage,
  /import ExperienceStartButton from '.\/_components\/ExperienceStartButton'/
);
assert.match(homePage, /<ExperienceStartButton \/>/);
assert.match(experienceLayout, /ExperienceBanner/);
for (const page of [experienceAdminPage, experienceWizardPage, experienceCustomerPage]) {
  assert.doesNotMatch(page, /demoExperience\w+Gateway|buildAppRoutes/);
}
assert.match(adminClient, /experience\s*\?\s*demoExperienceAdminDataGateway/);
assert.match(wizardClient, /experience\s*\?\s*demoExperienceWizardPersistenceGateway/);
assert.match(customerClient, /experience\s*\?\s*demoExperienceCustomerDataGateway/);
assert.doesNotMatch(experienceAdminPage, /AuthenticatedAppProviders/);
assert.match(experienceAdminLayout, /AdminOverlayProvider/);
assert.match(experienceAdminLayout, /data-admin-ui/);
assert.doesNotMatch(experienceAdminLayout, /AuthenticatedAppProviders/);
assert.match(experienceWizardLayout, /swiper\/css/);
assert.match(experienceWizardLayout, /swiper\/css\/pagination/);

console.log('demo experience route checks passed');
