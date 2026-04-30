import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readText(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const customerEditableRoute = readText(
  'src/app/api/customer/events/[slug]/editable/route.ts'
);
const customerEventService = readText('src/services/customerEventService.ts');
const wizardPersistence = readText(
  'src/app/page-wizard/hooks/useWizardPersistence.ts'
);

assert(
  customerEditableRoute.includes('export async function POST'),
  'Customer editable route must expose POST for customer-owned page saves.'
);

assert(
  customerEditableRoute.includes('saveCustomerEditableInvitationPageConfig'),
  'Customer editable POST must save through the server customer event service.'
);

assert(
  customerEventService.includes('saveCustomerEditableInvitationPageConfig('),
  'Client customer event service must expose a page-wizard save API helper.'
);

assert(
  wizardPersistence.includes('saveCustomerEditableInvitationPageConfig'),
  'Page wizard persistence must call the customer save API for non-admin sessions.'
);

assert(
  wizardPersistence.includes('isAdminLoggedIn') &&
    wizardPersistence.includes('saveInvitationPageConfig') &&
    wizardPersistence.includes('saveCustomerEditableInvitationPageConfig'),
  'Page wizard persistence must keep admin direct saves and split customer saves.'
);

console.log('customer page wizard save route checks passed');
