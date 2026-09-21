import { createRandomSuffix } from './id';
import { getStoredJson, setStoredJson } from './storage';

const STORAGE_KEY = 'mobile-invitation:pending-ticket-extensions';
type PendingExtension = { scope: string; requestId: string };

// Scope includes the server, page, and signed-in identity. Keep it in secure storage.
export async function getOrCreateTicketExtensionRequest(scope: string) {
  const pending = await getStoredJson<PendingExtension[]>(STORAGE_KEY, [], { sensitive: true });
  const existing = pending.find((item) => item.scope === scope);
  if (existing) return existing.requestId;
  const requestId = `extend_${Date.now().toString(36)}_${createRandomSuffix(24)}`;
  await setStoredJson(STORAGE_KEY, [...pending, { scope, requestId }], { sensitive: true });
  return requestId;
}

export async function completeTicketExtensionRequest(scope: string, requestId: string) {
  const pending = await getStoredJson<PendingExtension[]>(STORAGE_KEY, [], { sensitive: true });
  await setStoredJson(STORAGE_KEY, pending.filter((item) => item.scope !== scope || item.requestId !== requestId), { sensitive: true });
}
