import 'server-only';

import { firestoreServerAdminUserRepository } from './repositories/adminUserRepository';

export async function isServerAdminUserEnabled(uid: string) {
  return firestoreServerAdminUserRepository.isEnabled(uid);
}

export async function listServerAdminUserIds() {
  return firestoreServerAdminUserRepository.listEnabledIds();
}
