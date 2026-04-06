import { createClientPasswordHashRecord } from '@/lib/clientPasswordCrypto';
import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';

export interface ClientPassword {
  id: string;
  pageSlug: string;
  hasPassword: boolean;
  passwordVersion: number;
  legacyPlaintextStored: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type FirestoreModules = {
  collection: any;
  deleteDoc: any;
  doc: any;
  getDoc: any;
  getDocs: any;
  query: any;
  setDoc: any;
  where: any;
  deleteField: any;
};

type NormalizedClientPasswordDocument = {
  id: string;
  pageSlug: string;
  hasPassword: boolean;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordIterations: number | null;
  passwordVersion: number;
  legacyPassword: string | null;
  legacyPlaintextStored: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const CLIENT_PASSWORDS_COLLECTION = 'client-passwords';
const CLIENT_ACCESS_COLLECTION = 'client-access';

let firestoreModules: FirestoreModules | null = null;

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

  const parsed = value ? new Date(String(value)) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function ensureFirestoreModules() {
  if (!USE_FIREBASE) {
    return null;
  }

  const { db } = await ensureFirebaseInit();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  if (!firestoreModules) {
    const firestore = await import('firebase/firestore');
    firestoreModules = {
      collection: firestore.collection,
      deleteDoc: firestore.deleteDoc,
      doc: firestore.doc,
      getDoc: firestore.getDoc,
      getDocs: firestore.getDocs,
      query: firestore.query,
      setDoc: firestore.setDoc,
      where: firestore.where,
      deleteField: firestore.deleteField,
    };
  }

  return { db, modules: firestoreModules };
}

function normalizeClientPasswordDocument(
  id: string,
  data: Record<string, any>
): NormalizedClientPasswordDocument | null {
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
  const hasPassword = Boolean(
    legacyPassword || (passwordHash && passwordSalt && passwordIterations)
  );

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
    legacyPassword,
    legacyPlaintextStored: Boolean(legacyPassword),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function toClientPassword(record: NormalizedClientPasswordDocument): ClientPassword {
  return {
    id: record.id,
    pageSlug: record.pageSlug,
    hasPassword: record.hasPassword,
    passwordVersion: record.passwordVersion,
    legacyPlaintextStored: record.legacyPlaintextStored,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function preferClientPassword(
  current: NormalizedClientPasswordDocument | undefined,
  nextRecord: NormalizedClientPasswordDocument
) {
  if (!current) {
    return nextRecord;
  }

  if (nextRecord.id === nextRecord.pageSlug && current.id !== current.pageSlug) {
    return nextRecord;
  }

  return nextRecord.updatedAt >= current.updatedAt ? nextRecord : current;
}

async function getClientPasswordDocument(
  pageSlug: string
): Promise<NormalizedClientPasswordDocument | null> {
  if (!USE_FIREBASE) {
    return null;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return null;
  }

  const directSnapshot = await firestore.modules.getDoc(
    firestore.modules.doc(firestore.db, CLIENT_PASSWORDS_COLLECTION, pageSlug)
  );

  if (directSnapshot.exists()) {
    const normalized = normalizeClientPasswordDocument(pageSlug, directSnapshot.data());
    if (normalized) {
      return normalized;
    }
  }

  const snapshot = await firestore.modules.getDocs(
    firestore.modules.query(
      firestore.modules.collection(firestore.db, CLIENT_PASSWORDS_COLLECTION),
      firestore.modules.where('pageSlug', '==', pageSlug)
    )
  );

  let preferred: NormalizedClientPasswordDocument | null = null;

  snapshot.docs.forEach((docSnapshot: { id: string; data: () => Record<string, any> }) => {
    const normalized = normalizeClientPasswordDocument(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      return;
    }

    preferred = preferClientPassword(preferred ?? undefined, normalized);
  });

  return preferred;
}

export async function getClientPassword(pageSlug: string): Promise<ClientPassword | null> {
  const record = await getClientPasswordDocument(pageSlug);
  return record ? toClientPassword(record) : null;
}

export async function getAllClientPasswords(): Promise<ClientPassword[]> {
  if (!USE_FIREBASE) {
    return [];
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return [];
  }

  const snapshot = await firestore.modules.getDocs(
    firestore.modules.collection(firestore.db, CLIENT_PASSWORDS_COLLECTION)
  );

  const passwordMap = new Map<string, NormalizedClientPasswordDocument>();

  snapshot.docs.forEach((docSnapshot: { id: string; data: () => Record<string, any> }) => {
    const normalized = normalizeClientPasswordDocument(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      return;
    }

    passwordMap.set(
      normalized.pageSlug,
      preferClientPassword(passwordMap.get(normalized.pageSlug), normalized)
    );
  });

  return [...passwordMap.values()]
    .map(toClientPassword)
    .sort((left, right) => left.pageSlug.localeCompare(right.pageSlug, 'ko'));
}

export async function syncClientPasswordAccess(): Promise<ClientPassword[]> {
  const passwords = await getAllClientPasswords();

  if (!USE_FIREBASE || passwords.length === 0) {
    return passwords;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return passwords;
  }

  await Promise.all(
    passwords.map((passwordRecord) =>
      firestore.modules
        .deleteDoc(
          firestore.modules.doc(
            firestore.db,
            CLIENT_ACCESS_COLLECTION,
            passwordRecord.pageSlug
          )
        )
        .catch(() => undefined)
    )
  );

  return passwords;
}

export async function setClientPassword(
  pageSlug: string,
  password: string
): Promise<ClientPassword> {
  const normalizedSlug = pageSlug.trim();
  const normalizedPassword = password.trim();

  if (!normalizedSlug || !normalizedPassword) {
    throw new Error('Page slug and password are required.');
  }

  if (!USE_FIREBASE) {
    return {
      id: normalizedSlug,
      pageSlug: normalizedSlug,
      hasPassword: true,
      passwordVersion: 1,
      legacyPlaintextStored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  const existing = await getClientPasswordDocument(normalizedSlug);
  const now = new Date();
  const createdAt = existing?.createdAt ?? now;
  const passwordHashRecord = await createClientPasswordHashRecord(normalizedPassword);
  const passwordVersion = (existing?.passwordVersion ?? 0) + 1;

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, CLIENT_PASSWORDS_COLLECTION, normalizedSlug),
    {
      pageSlug: normalizedSlug,
      ...passwordHashRecord,
      passwordVersion,
      createdAt,
      updatedAt: now,
      password: firestore.modules.deleteField(),
      editorTokenHash: firestore.modules.deleteField(),
    },
    { merge: true }
  );

  await firestore.modules
    .deleteDoc(
      firestore.modules.doc(firestore.db, CLIENT_ACCESS_COLLECTION, normalizedSlug)
    )
    .catch(() => undefined);

  return {
    id: normalizedSlug,
    pageSlug: normalizedSlug,
    hasPassword: true,
    passwordVersion,
    legacyPlaintextStored: false,
    createdAt,
    updatedAt: now,
  };
}
