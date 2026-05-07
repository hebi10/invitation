import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function readWorkspaceFile(filePath: string) {
  return readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const imageServiceSource = readWorkspaceFile('src/services/imageService.ts');

assert(
  imageServiceSource.includes('/api/admin/pages/${encodeURIComponent(pageSlug)}/images'),
  'admin editable image uploads must use the admin server API route'
);

assert(
  imageServiceSource.includes('/api/customer/events/${encodeURIComponent(pageSlug)}/images'),
  'owner editable image uploads must use the customer event server API route'
);

const uploadEditableMatch = imageServiceSource.match(
  /export async function uploadEditablePageImage[\s\S]*?\n}\n/
);

assert(uploadEditableMatch, 'uploadEditablePageImage function must exist');
assert(
  !uploadEditableMatch?.[0].includes('uploadPageEditorImage('),
  'uploadEditablePageImage must not bypass the server API with uploadPageEditorImage'
);

assert(
  existsSync(path.resolve(process.cwd(), 'src/app/api/admin/pages/[slug]/images/route.ts')),
  'admin image upload API route must exist'
);

assert(
  existsSync(path.resolve(process.cwd(), 'src/app/api/customer/events/[slug]/images/route.ts')),
  'customer owner image upload API route must exist'
);

const adminRouteSource = readWorkspaceFile('src/app/api/admin/pages/[slug]/images/route.ts');
const customerRouteSource = readWorkspaceFile(
  'src/app/api/customer/events/[slug]/images/route.ts'
);

assert(
  adminRouteSource.includes('verifyAdminRequest'),
  'admin image upload route must verify admin auth'
);

assert(
  customerRouteSource.includes('getCustomerEventOwnershipSnapshot'),
  'customer image upload route must verify event ownership'
);

assert(
  adminRouteSource.includes('saveServerOptimizedEditableImage') &&
    customerRouteSource.includes('saveServerOptimizedEditableImage'),
  'admin and customer image upload routes must use the shared server optimizer'
);

console.log('Admin/owner image upload routing checks passed.');
