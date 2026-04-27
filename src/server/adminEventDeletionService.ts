import 'server-only';

import {
  deleteEventAndOperationalRecordsBySlug,
  type DeleteAdminEventResult,
} from './repositories/adminEventDeletionRepository';

export type { DeleteAdminEventResult };

export async function deleteAdminEventBySlug(pageSlug: string): Promise<DeleteAdminEventResult | null> {
  return deleteEventAndOperationalRecordsBySlug(pageSlug);
}
