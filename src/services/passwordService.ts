import {
  clientPasswordRepository,
  type ClientPassword,
} from '@/services/repositories/clientPasswordRepository';

export type { ClientPassword };

export async function getClientPassword(pageSlug: string): Promise<ClientPassword | null> {
  return clientPasswordRepository.findByPageSlug(pageSlug);
}

export async function getAllClientPasswords(): Promise<ClientPassword[]> {
  return clientPasswordRepository.listAll();
}

export async function setClientPassword(
  pageSlug: string,
  password: string
): Promise<ClientPassword> {
  return clientPasswordRepository.save(pageSlug, password);
}
