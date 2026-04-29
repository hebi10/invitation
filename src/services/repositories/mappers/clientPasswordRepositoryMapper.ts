import { toClientRepositoryDate } from '../clientFirestoreRepositoryCore';

export interface ClientPasswordRecord {
  id: string;
  pageSlug: string;
  hasPassword: boolean;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordIterations: number | null;
  passwordVersion: number;
  requiresReset: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientPasswordSummary {
  id: string;
  pageSlug: string;
  hasPassword: boolean;
  passwordVersion: number;
  requiresReset: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizeRepositoryClientPasswordRecord(
  id: string,
  data: Record<string, unknown>
): ClientPasswordRecord | null {
  const pageSlug =
    typeof data.pageSlug === 'string' && data.pageSlug.trim() ? data.pageSlug.trim() : id;
  const passwordHash =
    typeof data.passwordHash === 'string' && data.passwordHash.trim()
      ? data.passwordHash.trim()
      : null;
  const passwordSalt =
    typeof data.passwordSalt === 'string' && data.passwordSalt.trim()
      ? data.passwordSalt.trim()
      : null;
  const passwordIterations =
    typeof data.passwordIterations === 'number' && Number.isFinite(data.passwordIterations)
      ? data.passwordIterations
      : null;
  const legacyPassword =
    typeof data.password === 'string' && data.password.trim() ? data.password.trim() : null;
  const passwordVersion =
    typeof data.passwordVersion === 'number' && Number.isFinite(data.passwordVersion)
      ? data.passwordVersion
      : 1;
  const hasHash = Boolean(passwordHash && passwordSalt && passwordIterations);
  const hasPassword = Boolean(legacyPassword || hasHash);

  if (!pageSlug || !hasPassword) {
    return null;
  }

  return {
    id,
    pageSlug,
    hasPassword,
    passwordHash,
    passwordSalt,
    passwordIterations,
    passwordVersion,
    requiresReset: !hasHash,
    createdAt: toClientRepositoryDate(data.createdAt, new Date()),
    updatedAt: toClientRepositoryDate(data.updatedAt, new Date()),
  };
}

export function toClientPasswordSummary(
  record: ClientPasswordRecord
): ClientPasswordSummary {
  return {
    id: record.id,
    pageSlug: record.pageSlug,
    hasPassword: record.hasPassword,
    passwordVersion: record.passwordVersion,
    requiresReset: record.requiresReset,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
