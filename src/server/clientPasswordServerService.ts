import 'server-only';

import { createClientPasswordHashRecord, verifyClientPasswordHashRecord } from '@/lib/clientPasswordCrypto';

import {
  firestoreEventSecretRepository,
  type EventSecretRecord as ServerClientPasswordRecord,
} from './repositories/eventSecretRepository';

export async function getServerClientPasswordRecord(pageSlug: string) {
  return firestoreEventSecretRepository.findByPageSlug(pageSlug);
}

async function ensureServerClientPasswordRecord(pageSlug: string) {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return null;
  }

  return getServerClientPasswordRecord(normalizedPageSlug);
}

async function upgradeLegacyPasswordRecord(
  pageSlug: string,
  record: ServerClientPasswordRecord,
  password: string
) {
  if (!firestoreEventSecretRepository.isAvailable()) {
    return;
  }

  const passwordHashRecord = await createClientPasswordHashRecord(password);
  const now = new Date();

  await firestoreEventSecretRepository.saveByPageSlug({
    pageSlug,
    passwordHash: passwordHashRecord.passwordHash,
    passwordSalt: passwordHashRecord.passwordSalt,
    passwordIterations: passwordHashRecord.passwordIterations,
    passwordVersion: (record.passwordVersion ?? 0) + 1,
    createdAt: record.createdAt ?? now,
    updatedAt: now,
  });
}

async function clearLegacyPasswordRecord(
  pageSlug: string,
  record: ServerClientPasswordRecord
) {
  if (
    !firestoreEventSecretRepository.isAvailable() ||
    !record.passwordHash ||
    !record.passwordSalt ||
    !record.passwordIterations ||
    !record.legacyPassword
  ) {
    return;
  }

  const now = new Date();
  await firestoreEventSecretRepository.saveByPageSlug({
    pageSlug,
    passwordHash: record.passwordHash,
    passwordSalt: record.passwordSalt,
    passwordIterations: record.passwordIterations,
    passwordVersion: record.passwordVersion,
    createdAt: record.createdAt ?? now,
    updatedAt: now,
  });
}

export async function verifyServerClientPassword(pageSlug: string, password: string) {
  const normalizedPageSlug = pageSlug.trim();
  const normalizedPassword = password.trim();

  if (!normalizedPageSlug || !normalizedPassword) {
    return {
      verified: false,
      record: null,
    } as const;
  }

  const record =
    (await getServerClientPasswordRecord(normalizedPageSlug)) ??
    (await ensureServerClientPasswordRecord(normalizedPageSlug));
  if (!record) {
    return {
      verified: false,
      record: null,
    } as const;
  }

  if (record.passwordHash && record.passwordSalt && record.passwordIterations) {
    const verified = await verifyClientPasswordHashRecord(normalizedPassword, {
      passwordHash: record.passwordHash,
      passwordSalt: record.passwordSalt,
      passwordIterations: record.passwordIterations,
    });

    if (verified && record.legacyPassword) {
      await clearLegacyPasswordRecord(normalizedPageSlug, record);
      const cleanedRecord = await getServerClientPasswordRecord(normalizedPageSlug);
      return {
        verified: true,
        record: cleanedRecord ?? record,
      } as const;
    }

    return {
      verified,
      record,
    } as const;
  }

  if (record.legacyPassword) {
    const verified = record.legacyPassword === normalizedPassword;
    if (verified) {
      await upgradeLegacyPasswordRecord(normalizedPageSlug, record, normalizedPassword);
      const upgradedRecord = await getServerClientPasswordRecord(normalizedPageSlug);
      return {
        verified: true,
        record: upgradedRecord ?? record,
      } as const;
    }
  }

  return {
    verified: false,
    record,
  } as const;
}

export async function setServerClientPassword(pageSlug: string, password: string) {
  const normalizedPageSlug = pageSlug.trim();
  const normalizedPassword = password.trim();

  if (!normalizedPageSlug || !normalizedPassword) {
    throw new Error('Page slug and password are required.');
  }

  if (!firestoreEventSecretRepository.isAvailable()) {
    throw new Error('Server Firestore is not available.');
  }

  const existing = await getServerClientPasswordRecord(normalizedPageSlug);
  const now = new Date();
  const createdAt = existing?.createdAt ?? now;
  const passwordHashRecord = await createClientPasswordHashRecord(normalizedPassword);
  const passwordVersion = (existing?.passwordVersion ?? 0) + 1;

  await firestoreEventSecretRepository.saveByPageSlug({
    pageSlug: normalizedPageSlug,
    passwordHash: passwordHashRecord.passwordHash,
    passwordSalt: passwordHashRecord.passwordSalt,
    passwordIterations: passwordHashRecord.passwordIterations,
    passwordVersion,
    createdAt,
    updatedAt: now,
  });

  const savedRecord = await getServerClientPasswordRecord(normalizedPageSlug);
  if (!savedRecord) {
    throw new Error('Failed to update the page password.');
  }

  return savedRecord;
}
