import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';

export interface ClientPassword {
  id: string;
  pageSlug: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientAccessRecord {
  pageSlug: string;
  editorTokenHash: string;
  createdAt: Date;
  updatedAt: Date;
}

type FirestoreModules = {
  collection: any;
  doc: any;
  getDoc: any;
  getDocs: any;
  query: any;
  setDoc: any;
  where: any;
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
      doc: firestore.doc,
      getDoc: firestore.getDoc,
      getDocs: firestore.getDocs,
      query: firestore.query,
      setDoc: firestore.setDoc,
      where: firestore.where,
    };
  }

  return { db, modules: firestoreModules };
}

function normalizeClientPassword(
  id: string,
  data: Record<string, any>
): ClientPassword | null {
  const pageSlug = typeof data.pageSlug === 'string' ? data.pageSlug.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!pageSlug || !password) {
    return null;
  }

  return {
    id,
    pageSlug,
    password,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function normalizeClientAccess(
  id: string,
  data: Record<string, any>
): ClientAccessRecord | null {
  const pageSlug =
    typeof data.pageSlug === 'string' && data.pageSlug.trim() ? data.pageSlug.trim() : id;
  const editorTokenHash =
    typeof data.editorTokenHash === 'string' ? data.editorTokenHash.trim() : '';

  if (!pageSlug || !editorTokenHash) {
    return null;
  }

  return {
    pageSlug,
    editorTokenHash,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function preferClientPassword(
  current: ClientPassword | undefined,
  nextRecord: ClientPassword
) {
  if (!current) {
    return nextRecord;
  }

  if (nextRecord.id === nextRecord.pageSlug && current.id !== current.pageSlug) {
    return nextRecord;
  }

  return nextRecord.updatedAt >= current.updatedAt ? nextRecord : current;
}

export async function hashClientPassword(password: string) {
  const normalized = password.trim();
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getClientPassword(pageSlug: string): Promise<ClientPassword | null> {
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
    const normalized = normalizeClientPassword(pageSlug, directSnapshot.data());
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

  let preferred: ClientPassword | null = null;

  snapshot.docs.forEach((docSnapshot: { id: string; data: () => Record<string, any> }) => {
    const normalized = normalizeClientPassword(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      return;
    }

    preferred = preferClientPassword(preferred ?? undefined, normalized);
  });

  return preferred;
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

  const passwordMap = new Map<string, ClientPassword>();

  snapshot.docs.forEach((docSnapshot: { id: string; data: () => Record<string, any> }) => {
    const normalized = normalizeClientPassword(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      return;
    }

    passwordMap.set(
      normalized.pageSlug,
      preferClientPassword(passwordMap.get(normalized.pageSlug), normalized)
    );
  });

  return [...passwordMap.values()].sort((left, right) =>
    left.pageSlug.localeCompare(right.pageSlug, 'ko')
  );
}

export async function getClientAccessRecord(
  pageSlug: string
): Promise<ClientAccessRecord | null> {
  if (!USE_FIREBASE) {
    return null;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.modules.getDoc(
    firestore.modules.doc(firestore.db, CLIENT_ACCESS_COLLECTION, pageSlug)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeClientAccess(pageSlug, snapshot.data());
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
    passwords.map(async (passwordRecord) => {
      const editorTokenHash = await hashClientPassword(passwordRecord.password);

      await firestore.modules.setDoc(
        firestore.modules.doc(
          firestore.db,
          CLIENT_ACCESS_COLLECTION,
          passwordRecord.pageSlug
        ),
        {
          pageSlug: passwordRecord.pageSlug,
          editorTokenHash,
          createdAt: passwordRecord.createdAt,
          updatedAt: passwordRecord.updatedAt,
        },
        { merge: true }
      );

      if (passwordRecord.id !== passwordRecord.pageSlug) {
        await firestore.modules.setDoc(
          firestore.modules.doc(
            firestore.db,
            CLIENT_PASSWORDS_COLLECTION,
            passwordRecord.pageSlug
          ),
          {
            pageSlug: passwordRecord.pageSlug,
            password: passwordRecord.password,
            createdAt: passwordRecord.createdAt,
            updatedAt: passwordRecord.updatedAt,
          },
          { merge: true }
        );
      }
    })
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
      password: normalizedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  const existing = await getClientPassword(normalizedSlug);
  const now = new Date();
  const createdAt = existing?.createdAt ?? now;
  const editorTokenHash = await hashClientPassword(normalizedPassword);

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, CLIENT_PASSWORDS_COLLECTION, normalizedSlug),
    {
      pageSlug: normalizedSlug,
      password: normalizedPassword,
      createdAt,
      updatedAt: now,
    },
    { merge: true }
  );

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, CLIENT_ACCESS_COLLECTION, normalizedSlug),
    {
      pageSlug: normalizedSlug,
      editorTokenHash,
      createdAt,
      updatedAt: now,
    },
    { merge: true }
  );

  return {
    id: normalizedSlug,
    pageSlug: normalizedSlug,
    password: normalizedPassword,
    createdAt,
    updatedAt: now,
  };
}

export async function getClientEditorTokenHash(
  pageSlug: string,
  inputPassword: string
): Promise<string | null> {
  const accessRecord = await getClientAccessRecord(pageSlug);
  if (!accessRecord) {
    return null;
  }

  const editorTokenHash = await hashClientPassword(inputPassword);
  return editorTokenHash === accessRecord.editorTokenHash ? editorTokenHash : null;
}

export async function verifyClientPassword(
  pageSlug: string,
  inputPassword: string
): Promise<boolean> {
  const editorTokenHash = await getClientEditorTokenHash(pageSlug, inputPassword);
  return Boolean(editorTokenHash);
}
