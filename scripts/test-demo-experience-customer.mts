import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const customerClient = readFileSync(
  'src/app/my-invitations/MyInvitationsClient.tsx',
  'utf8'
);
const experienceCustomerPage = readFileSync(
  'src/app/experience/my-invitations/page.tsx',
  'utf8'
);

assert.match(customerClient, /gateway\.listEvents/);
assert.match(customerClient, /gateway\.listComments/);
assert.match(customerClient, /routes\.wizardEdit/);
assert.match(customerClient, /routes\.preview/);
assert.doesNotMatch(experienceCustomerPage, /getCustomerWalletSnapshot/);

console.log('demo experience customer checks passed');
