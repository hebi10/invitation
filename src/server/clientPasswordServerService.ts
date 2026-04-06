import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import { createClientPasswordHashRecord, verifyClientPasswordHashRecord } from '@/lib/clientPasswordCrypto';

import { getServerFirestore } from './firebaseAdmin';

export interface ServerClientPasswordRecord {
  pageSlug: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordIterations: number | null;
  passwordVersion: number;
  legacyPassword: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const CLIENT_PASSWORDS_COLLECTION = 'client-passwords';

function toDate(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function normalizePasswordRecord(
  pageSlug: string,
  data: Record<string, unknown>
): ServerClientPasswordRecord | null {
  const normalizedPageSlug =
    typeof data.pageSlug === 'string' && data.pageSlug.trim() ? data.pageSlug.trim() : pageSlug;
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

  if (
    !normalizedPageSlug ||
    (!legacyPassword && !(passwordHash && passwordSalt && passwordIterations))
  ) {
    return null;
  }

  return {
    pageSlug: normalizedPageSlug,
    passwordHash,
    passwordSalt,
    passwordIterations,
    passwordVersion,
    legacyPassword,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getServerClientPasswordRecord(pageSlug: string) {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(CLIENT_PASSWORDS_COLLECTION)
    .doc(normalizedPageSlug)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizePasswordRecord(normalizedPageSlug, snapshot.data() ?? {});
}

async function upgradeLegacyPasswordRecord(
  pageSlug: string,
  record: ServerClientPasswordRecord,
  password: string
) {
  const db = getServerFirestore();
  if (!db) {
    return;
  }

  const passwordHashRecord = await createClientPasswordHashRecord(password);
  const now = new Date();

  await db
    .collection(CLIENT_PASSWORDS_COLLECTION)
    .doc(pageSlug)
    .set(
      {
        pageSlug,
        ...passwordHashRecord,
        passwordVersion: (record.passwordVersion ?? 0) + 1,
        createdAt: record.createdAt ?? now,
        updatedAt: now,
        password: FieldValue.delete(),
        editorTokenHash: FieldValue.delete(),
      },
      { merge: true }
    );
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

  const record = await getServerClientPasswordRecord(normalizedPageSlug);
  if (!record) {
    return {
      verified: false,
      record: null,
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

    return {
      verified: false,
      record,
    } as const;
  }

  if (!record.passwordHash || !record.passwordSalt || !record.passwordIterations) {
    return {
      verified: false,
      record,
    } as const;
  }

  const verified = await verifyClientPasswordHashRecord(normalizedPassword, {
    passwordHash: record.passwordHash,
    passwordSalt: record.passwordSalt,
    passwordIterations: record.passwordIterations,
  });

  return {
    verified,
    record,
  } as const;
}
