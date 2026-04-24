import { createClientPasswordHashRecord } from '@/lib/clientPasswordCrypto';

import { ensureClientFirestoreState } from './clientFirestoreRepositoryCore';
import {
  CLIENT_EVENT_SECRETS_COLLECTION,
  resolveClientStoredEventBySlug,
  upsertClientEventSummary,
} from './clientEventRepositoryCore';
import {
  type ClientPasswordRecord,
  normalizeRepositoryClientPasswordRecord,
  toClientPasswordSummary,
  type ClientPasswordSummary,
} from './mappers/clientPasswordRepositoryMapper';
import { requireTrimmedString } from './repositoryValidators';

export type { ClientPasswordSummary as ClientPassword };

export interface ClientPasswordRepository {
  isAvailable(): boolean;
  findByPageSlug(pageSlug: string): Promise<ClientPasswordSummary | null>;
  listAll(): Promise<ClientPasswordSummary[]>;
  save(pageSlug: string, password: string): Promise<ClientPasswordSummary>;
}

async function findEventSecretByPageSlug(pageSlug: string) {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return null;
  }

  const resolvedEvent = await resolveClientStoredEventBySlug(normalizedPageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.modules.getDoc(
    firestore.modules.doc(
      firestore.db,
      CLIENT_EVENT_SECRETS_COLLECTION,
      resolvedEvent.summary.eventId
    )
  );
  if (!snapshot.exists()) {
    return null;
  }

  const normalized = normalizeRepositoryClientPasswordRecord(
    resolvedEvent.summary.eventId,
    {
      pageSlug: resolvedEvent.summary.slug,
      ...snapshot.data(),
    }
  );

  return normalized ? toClientPasswordSummary(normalized) : null;
}

async function listEventPasswords() {
  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return [];
  }

  const [secretSnapshot, eventSnapshot] = await Promise.all([
    firestore.modules.getDocs(
      firestore.modules.collection(firestore.db, CLIENT_EVENT_SECRETS_COLLECTION)
    ),
    firestore.modules.getDocs(firestore.modules.collection(firestore.db, 'events')),
  ]);

  const eventSlugById = new Map<string, string>();
  eventSnapshot.docs.forEach((docSnapshot: { id: string; data: () => Record<string, unknown> }) => {
    const slug = docSnapshot.data().slug;
    if (typeof slug === 'string' && slug.trim()) {
      eventSlugById.set(docSnapshot.id, slug.trim());
    }
  });

  return secretSnapshot.docs
    .map((docSnapshot: { id: string; data: () => Record<string, unknown> }) =>
      normalizeRepositoryClientPasswordRecord(docSnapshot.id, {
        pageSlug:
          eventSlugById.get(docSnapshot.id) ??
          (typeof docSnapshot.data().slug === 'string' ? docSnapshot.data().slug : docSnapshot.id),
        ...docSnapshot.data(),
      })
    )
    .filter(
      (record: ClientPasswordRecord | null): record is ClientPasswordRecord =>
        record !== null
    )
    .map(toClientPasswordSummary)
    .sort(
      (left: ClientPasswordSummary, right: ClientPasswordSummary) =>
        left.pageSlug.localeCompare(right.pageSlug, 'ko')
    );
}

export const clientPasswordRepository: ClientPasswordRepository = {
  isAvailable() {
    return process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
  },

  async findByPageSlug(pageSlug) {
    const normalizedPageSlug = requireTrimmedString(pageSlug, {
      fieldLabel: 'Page slug',
      message: 'Page slug and password are required.',
    });

    return findEventSecretByPageSlug(normalizedPageSlug);
  },

  async listAll() {
    return listEventPasswords();
  },

  async save(pageSlug, password) {
    const normalizedSlug = requireTrimmedString(pageSlug, {
      fieldLabel: 'Page slug',
      message: 'Page slug and password are required.',
    });
    const normalizedPassword = requireTrimmedString(password, {
      fieldLabel: 'Password',
      message: 'Page slug and password are required.',
    });
    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      throw new Error('Firestore is not initialized.');
    }

    const existing = await findEventSecretByPageSlug(normalizedSlug);
    const now = new Date();
    const createdAt = existing?.createdAt ?? now;
    const passwordHashRecord = await createClientPasswordHashRecord(normalizedPassword);
    const passwordVersion = (existing?.passwordVersion ?? 0) + 1;

    const resolvedEvent =
      (await resolveClientStoredEventBySlug(normalizedSlug)) ??
      (await upsertClientEventSummary({
        slug: normalizedSlug,
        hasCustomConfig: true,
        createdAt,
        updatedAt: now,
      }));

    await firestore.modules.setDoc(
      firestore.modules.doc(
        firestore.db,
        CLIENT_EVENT_SECRETS_COLLECTION,
        resolvedEvent.summary.eventId
      ),
      {
        eventId: resolvedEvent.summary.eventId,
        slug: resolvedEvent.summary.slug,
        ...passwordHashRecord,
        passwordVersion,
        createdAt,
        updatedAt: now,
        password: firestore.modules.deleteField(),
        editorTokenHash: firestore.modules.deleteField(),
      },
      { merge: true }
    );

    await upsertClientEventSummary({
      slug: resolvedEvent.summary.slug,
      hasCustomConfig: true,
      createdAt,
      updatedAt: now,
      hasPassword: true,
      passwordVersion,
      passwordRequiresReset: false,
      passwordUpdatedAt: now,
    });

    return {
      id: resolvedEvent.summary.eventId,
      pageSlug: resolvedEvent.summary.slug,
      hasPassword: true,
      passwordVersion,
      requiresReset: false,
      createdAt,
      updatedAt: now,
    };
  },
};
