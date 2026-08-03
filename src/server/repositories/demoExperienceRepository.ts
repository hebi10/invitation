import 'server-only';

import { stripUndefinedDeep } from '@/lib/invitationPagePersistence';
import { toDate } from '@/lib/invitationPageNormalization';
import type {
  DemoExperienceComment,
  DemoExperienceSaveInput,
  DemoExperienceSeedEvent,
  DemoExperienceStoredEvent,
} from '@/types/demoExperience';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

import { getServerFirestore } from '../firebaseAdmin';

const DEMO_EXPERIENCES_COLLECTION = 'demoExperiences';
const DEMO_EVENTS_COLLECTION = 'events';
const DEMO_CONTENT_COLLECTION = 'content';
const DEMO_CURRENT_CONTENT_DOC = 'current';
const DEMO_COMMENTS_COLLECTION = 'comments';
const DEMO_SLUG_INDEX_COLLECTION = 'slugIndex';
const DAILY_WORKSPACE_EVENT_ID = 'daily-workspace';
const DEMO_SEED_VERSION = 1;

interface DemoExperienceEventDocument {
  eventId: string;
  slug: string;
  kind: DemoExperienceStoredEvent['kind'];
  ownerUid: string | null;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoExperienceRepository {
  bootstrapDate(dateKey: string, seeds: DemoExperienceSeedEvent[]): Promise<void>;
  listEvents(dateKey: string): Promise<DemoExperienceStoredEvent[]>;
  findEventBySlug(
    dateKey: string,
    slug: string
  ): Promise<DemoExperienceStoredEvent | null>;
  saveDailyWorkspace(input: DemoExperienceSaveInput): Promise<DemoExperienceStoredEvent>;
  deleteDailyWorkspace(dateKey: string, slug: string): Promise<void>;
  listComments(dateKey: string, slug: string): Promise<DemoExperienceComment[]>;
  deleteComment(dateKey: string, slug: string, commentId: string): Promise<void>;
  recursiveDeleteDate(dateKey: string): Promise<void>;
}

export class DemoExperienceVersionConflictError extends Error {
  readonly currentVersion: number;

  constructor(currentVersion: number) {
    super('다른 체험자가 먼저 저장했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.');
    this.name = 'DemoExperienceVersionConflictError';
    this.currentVersion = currentVersion;
  }
}

function requireFirestore() {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('체험 데이터 저장소 연결을 확인하지 못했습니다.');
  }
  return db;
}

function normalizeDateKey(dateKey: string) {
  const normalized = dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('체험 날짜 형식이 올바르지 않습니다.');
  }
  return normalized;
}

function normalizeSlug(slug: string) {
  const normalized = slug.trim();
  if (!normalized) {
    throw new Error('체험 청첩장 주소가 필요합니다.');
  }
  return normalized;
}

function dateRootRef(dateKey: string) {
  return requireFirestore()
    .collection(DEMO_EXPERIENCES_COLLECTION)
    .doc(normalizeDateKey(dateKey));
}

function eventRef(dateKey: string, eventId: string) {
  return dateRootRef(dateKey).collection(DEMO_EVENTS_COLLECTION).doc(eventId);
}

function slugIndexRef(dateKey: string, slug: string) {
  return dateRootRef(dateKey)
    .collection(DEMO_SLUG_INDEX_COLLECTION)
    .doc(normalizeSlug(slug));
}

function contentRef(dateKey: string, eventId: string) {
  return eventRef(dateKey, eventId)
    .collection(DEMO_CONTENT_COLLECTION)
    .doc(DEMO_CURRENT_CONTENT_DOC);
}

function commentsRef(dateKey: string, eventId: string) {
  return eventRef(dateKey, eventId).collection(DEMO_COMMENTS_COLLECTION);
}

function normalizeEventDocument(
  eventId: string,
  data: Record<string, unknown>
): DemoExperienceEventDocument | null {
  const slug = typeof data.slug === 'string' ? data.slug.trim() : '';
  const kind = data.kind === 'seed' || data.kind === 'daily-workspace' ? data.kind : null;
  if (!slug || !kind) {
    return null;
  }

  return {
    eventId,
    slug,
    kind,
    ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : null,
    published: data.published === true,
    defaultTheme:
      typeof data.defaultTheme === 'string'
        ? (data.defaultTheme as InvitationThemeKey)
        : 'emotional',
    version:
      typeof data.version === 'number' && Number.isInteger(data.version)
        ? data.version
        : 0,
    createdAt: toDate(data.createdAt) ?? new Date(0),
    updatedAt: toDate(data.updatedAt) ?? new Date(0),
  };
}

async function hydrateEvent(
  dateKey: string,
  eventId: string,
  data: Record<string, unknown>
): Promise<DemoExperienceStoredEvent | null> {
  const event = normalizeEventDocument(eventId, data);
  if (!event) {
    return null;
  }

  const contentSnapshot = await contentRef(dateKey, eventId).get();
  const content = contentSnapshot.data()?.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return null;
  }

  return {
    ...event,
    config: content as InvitationPageSeed,
  };
}

async function resolveEventIdBySlug(dateKey: string, slug: string) {
  const snapshot = await slugIndexRef(dateKey, slug).get();
  const eventId = snapshot.data()?.eventId;
  return typeof eventId === 'string' && eventId.trim() ? eventId.trim() : null;
}

export const firestoreDemoExperienceRepository: DemoExperienceRepository = {
  async bootstrapDate(dateKey, seeds) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const db = requireFirestore();
    const rootRef = dateRootRef(normalizedDateKey);

    await db.runTransaction(async (transaction) => {
      const rootSnapshot = await transaction.get(rootRef);
      if (rootSnapshot.data()?.seedVersion === DEMO_SEED_VERSION) {
        return;
      }

      const createdAt = new Date();
      for (const seed of seeds) {
        const seedEventRef = eventRef(normalizedDateKey, seed.eventId);
        const seedContentRef = contentRef(normalizedDateKey, seed.eventId);
        const seedSlugIndexRef = slugIndexRef(normalizedDateKey, seed.slug);

        transaction.set(seedEventRef, {
          eventId: seed.eventId,
          slug: seed.slug,
          kind: 'seed',
          ownerUid: seed.ownerUid,
          published: seed.published,
          defaultTheme: seed.defaultTheme,
          version: seed.version,
          createdAt: seed.createdAt,
          updatedAt: seed.updatedAt,
        } satisfies DemoExperienceEventDocument);
        transaction.set(seedContentRef, {
          content: stripUndefinedDeep(seed.config),
          createdAt: seed.createdAt,
          updatedAt: seed.updatedAt,
        });
        transaction.set(seedSlugIndexRef, {
          eventId: seed.eventId,
          slug: seed.slug,
          kind: 'seed',
          createdAt: seed.createdAt,
          updatedAt: seed.updatedAt,
        });

        for (const comment of seed.comments) {
          transaction.set(commentsRef(normalizedDateKey, seed.eventId).doc(comment.id), {
            author: comment.author,
            message: comment.message,
            pageSlug: seed.slug,
            createdAt: comment.createdAt,
          });
        }
      }

      transaction.set(rootRef, {
        dateKey: normalizedDateKey,
        seedVersion: DEMO_SEED_VERSION,
        createdAt: rootSnapshot.data()?.createdAt ?? createdAt,
        updatedAt: createdAt,
      });
    });
  },

  async listEvents(dateKey) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const snapshot = await dateRootRef(normalizedDateKey)
      .collection(DEMO_EVENTS_COLLECTION)
      .get();
    const events = await Promise.all(
      snapshot.docs.map((document) =>
        hydrateEvent(normalizedDateKey, document.id, document.data() ?? {})
      )
    );

    return events
      .filter((event): event is DemoExperienceStoredEvent => event !== null)
      .sort((left, right) => right.updatedAt!.getTime() - left.updatedAt!.getTime());
  },

  async findEventBySlug(dateKey, slug) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const eventId = await resolveEventIdBySlug(normalizedDateKey, slug);
    if (!eventId) {
      return null;
    }

    const snapshot = await eventRef(normalizedDateKey, eventId).get();
    if (!snapshot.exists) {
      return null;
    }
    return hydrateEvent(normalizedDateKey, eventId, snapshot.data() ?? {});
  },

  async saveDailyWorkspace(input) {
    const normalizedDateKey = normalizeDateKey(input.dateKey);
    const normalizedSlug = normalizeSlug(input.slug);
    const db = requireFirestore();
    const workspaceRef = eventRef(normalizedDateKey, DAILY_WORKSPACE_EVENT_ID);
    const workspaceContentRef = contentRef(normalizedDateKey, DAILY_WORKSPACE_EVENT_ID);
    const workspaceSlugIndexRef = slugIndexRef(normalizedDateKey, normalizedSlug);
    let savedEvent: DemoExperienceStoredEvent | null = null;

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(workspaceRef);
      const stored = snapshot.exists
        ? normalizeEventDocument(DAILY_WORKSPACE_EVENT_ID, snapshot.data() ?? {})
        : null;
      if (stored?.kind === 'seed') {
        throw new Error('기본 체험 청첩장은 수정할 수 없습니다.');
      }

      const storedVersion = stored?.version ?? 0;
      if (storedVersion !== input.expectedVersion) {
        throw new DemoExperienceVersionConflictError(storedVersion);
      }

      const now = new Date();
      const nextVersion = storedVersion + 1;
      const createdAt = stored?.createdAt ?? now;
      const eventDocument = {
        eventId: DAILY_WORKSPACE_EVENT_ID,
        slug: normalizedSlug,
        kind: 'daily-workspace',
        ownerUid: 'demo-daily-customer',
        published: input.published,
        defaultTheme: input.defaultTheme,
        version: nextVersion,
        createdAt,
        updatedAt: now,
      } satisfies DemoExperienceEventDocument;

      transaction.set(workspaceRef, eventDocument);
      transaction.set(workspaceContentRef, {
        content: stripUndefinedDeep(input.config),
        createdAt,
        updatedAt: now,
      });
      transaction.set(workspaceSlugIndexRef, {
        eventId: DAILY_WORKSPACE_EVENT_ID,
        slug: normalizedSlug,
        kind: 'daily-workspace',
        createdAt,
        updatedAt: now,
      });

      savedEvent = {
        ...eventDocument,
        config: input.config,
      };
    });

    if (!savedEvent) {
      throw new Error('체험 청첩장을 저장하지 못했습니다.');
    }
    return savedEvent;
  },

  async deleteDailyWorkspace(dateKey, slug) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const normalizedSlug = normalizeSlug(slug);
    const eventId = await resolveEventIdBySlug(normalizedDateKey, normalizedSlug);
    if (!eventId) {
      return;
    }

    const targetRef = eventRef(normalizedDateKey, eventId);
    const targetSnapshot = await targetRef.get();
    if (!targetSnapshot.exists) {
      return;
    }
    const target = normalizeEventDocument(eventId, targetSnapshot.data() ?? {});
    if (!target || target.kind === 'seed') {
      throw new Error('기본 체험 청첩장은 삭제할 수 없습니다.');
    }

    const db = requireFirestore();
    await db.recursiveDelete(targetRef);
    await slugIndexRef(normalizedDateKey, normalizedSlug).delete();
  },

  async listComments(dateKey, slug) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const normalizedSlug = normalizeSlug(slug);
    const eventId = await resolveEventIdBySlug(normalizedDateKey, normalizedSlug);
    if (!eventId) {
      return [];
    }

    const snapshot = await commentsRef(normalizedDateKey, eventId).get();
    return snapshot.docs
      .map((document): DemoExperienceComment | null => {
        const data = document.data() ?? {};
        const author = typeof data.author === 'string' ? data.author : '';
        const message = typeof data.message === 'string' ? data.message : '';
        if (!author || !message) {
          return null;
        }
        return {
          id: document.id,
          author,
          message,
          pageSlug: normalizedSlug,
          createdAt: toDate(data.createdAt),
        };
      })
      .filter((comment): comment is DemoExperienceComment => comment !== null)
      .sort(
        (left, right) =>
          (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0)
      );
  },

  async deleteComment(dateKey, slug, commentId) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const normalizedSlug = normalizeSlug(slug);
    const normalizedCommentId = commentId.trim();
    if (!normalizedCommentId) {
      throw new Error('삭제할 댓글을 지정해 주세요.');
    }

    const eventId = await resolveEventIdBySlug(normalizedDateKey, normalizedSlug);
    if (!eventId) {
      return;
    }
    await commentsRef(normalizedDateKey, eventId).doc(normalizedCommentId).delete();
  },

  async recursiveDeleteDate(dateKey) {
    await requireFirestore().recursiveDelete(dateRootRef(normalizeDateKey(dateKey)));
  },
};
