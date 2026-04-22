#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore, type WriteBatch } from 'firebase-admin/firestore';

import {
  normalizeInvitationPageSlugBase,
  normalizeInvitationPageSlugInput,
  stripUndefinedDeep,
} from '../src/lib/invitationPagePersistence.ts';
import { DEFAULT_INVITATION_THEME } from '../src/lib/invitationThemes.ts';

type BackfillMode = 'dry-run' | 'execute' | 'validate';
type BackfillFailure = {
  target: string;
  id: string;
  reason: string;
};
type BackfillCounters = Record<string, number>;
type FirestoreData = Record<string, unknown>;

const PAGE_CONFIG_COLLECTION = 'invitation-page-configs';
const PAGE_REGISTRY_COLLECTION = 'invitation-page-registry';
const DISPLAY_PERIOD_COLLECTION = 'display-periods';
const CLIENT_PASSWORD_COLLECTION = 'client-passwords';
const GUESTBOOKS_COLLECTION = 'guestbooks';
const COMMENTS_COLLECTION = 'comments';
const PAGE_TICKET_COLLECTION = 'page-ticket-balances';
const LEGACY_LINK_TOKEN_COLLECTION = 'mobile-client-editor-link-tokens';
const LEGACY_AUDIT_LOG_COLLECTION = 'mobile-client-editor-audit-logs';
const LEGACY_BILLING_COLLECTION = 'mobile-billing-fulfillments';

const EVENTS_COLLECTION = 'events';
const EVENT_CONTENT_COLLECTION = 'content';
const EVENT_CURRENT_CONTENT_DOC = 'current';
const EVENT_SECRET_COLLECTION = 'eventSecrets';
const EVENT_SLUG_INDEX_COLLECTION = 'eventSlugIndex';
const EVENT_LINK_TOKEN_COLLECTION = 'linkTokens';
const EVENT_AUDIT_LOG_COLLECTION = 'auditLogs';
const BILLING_COLLECTION = 'billingFulfillments';

const DEFAULT_EVENT_TYPE = 'wedding';
const DEFAULT_BATCH_SIZE = 400;

type LegacyBundle = {
  slug: string;
  config: FirestoreData | null;
  registry: FirestoreData | null;
  displayPeriod: FirestoreData | null;
  secret: FirestoreData | null;
  ticket: FirestoreData | null;
  comments: Array<{ id: string; data: FirestoreData }>;
  linkTokens: Array<{ id: string; data: FirestoreData }>;
  auditLogs: Array<{ id: string; data: FirestoreData }>;
};

type BackfillOptions = {
  mode: BackfillMode;
  slug: string | null;
  resumeFrom: string | null;
  limit: number | null;
  batchSize: number;
};

type PlannedWrite = {
  path: string;
  data: FirestoreData;
  merge: boolean;
  kind: string;
};

function isRecord(value: unknown): value is FirestoreData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function toDate(value: unknown): Date | null {
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

function maxDate(...values: Array<unknown>) {
  const dates = values.map(toDate).filter((value): value is Date => value instanceof Date);
  if (!dates.length) {
    return null;
  }

  return new Date(Math.max(...dates.map((value) => value.getTime())));
}

export function normalizeBackfillSlug(value: string) {
  const normalized = normalizeInvitationPageSlugInput(value);
  return normalized ? normalizeInvitationPageSlugBase(normalized) : null;
}

export function buildBackfillEventId(pageSlug: string) {
  return `evt_${pageSlug}`;
}

function normalizeTicketCount(value: unknown) {
  const count = readFiniteNumber(value);
  return count === null ? null : Math.max(0, Math.floor(count));
}

function pickDefaultTheme(config: FirestoreData | null, registry: FirestoreData | null) {
  const registryTheme = readString(registry?.defaultTheme);
  if (registryTheme) {
    return registryTheme;
  }

  const variants = isRecord(config?.variants) ? config.variants : null;
  const availableVariant = variants
    ? Object.entries(variants).find(([, value]) => {
        return !isRecord(value) || value.available !== false;
      })
    : null;

  return availableVariant?.[0] ?? DEFAULT_INVITATION_THEME;
}

function readSupportedVariants(config: FirestoreData | null) {
  const variants = isRecord(config?.variants) ? config.variants : null;
  if (!variants) {
    return [];
  }

  return Object.keys(variants).filter((entry) => entry.trim().length > 0);
}

function readDisplayPeriod(data: FirestoreData | null) {
  if (!data) {
    return null;
  }

  return {
    isActive: data.isActive === true,
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
  };
}

function readFeatureFlags(config: FirestoreData | null) {
  return isRecord(config?.features) ? config.features : {};
}

export function buildBackfillEventSummary(
  bundle: Pick<
    LegacyBundle,
    'slug' | 'config' | 'registry' | 'displayPeriod' | 'ticket' | 'comments'
  >,
  now = new Date()
) {
  const eventId = buildBackfillEventId(bundle.slug);
  const displayPeriod = readDisplayPeriod(bundle.displayPeriod);
  const ticketCount = normalizeTicketCount(bundle.ticket?.ticketCount);
  const commentCount = bundle.comments.length > 0 ? bundle.comments.length : null;
  const published = readBoolean(bundle.registry?.published) ?? true;
  const defaultTheme = pickDefaultTheme(bundle.config, bundle.registry);
  const supportedVariants = readSupportedVariants(bundle.config);
  const displayName = readString(bundle.config?.displayName);
  const createdAt =
    toDate(bundle.registry?.createdAt) ??
    toDate(bundle.config?.createdAt) ??
    toDate(bundle.displayPeriod?.createdAt) ??
    now;
  const updatedAt =
    maxDate(
      bundle.registry?.updatedAt,
      bundle.config?.updatedAt,
      bundle.displayPeriod?.updatedAt,
      bundle.ticket?.updatedAt,
      now
    ) ?? now;

  return {
    eventId,
    eventType: DEFAULT_EVENT_TYPE,
    slug: bundle.slug,
    status: 'active',
    title: displayName,
    displayName,
    summary: readString(bundle.config?.description),
    supportedVariants,
    published,
    defaultTheme,
    featureFlags: readFeatureFlags(bundle.config),
    stats: {
      commentCount,
      ticketCount,
      ticketBalance: ticketCount,
    },
    visibility: {
      published,
      displayStartAt: displayPeriod?.startDate ?? null,
      displayEndAt: displayPeriod?.endDate ?? null,
    },
    displayPeriod,
    hasCustomConfig:
      readBoolean(bundle.registry?.hasCustomConfig) ?? Boolean(bundle.config),
    hasCustomContent:
      readBoolean(bundle.registry?.hasCustomConfig) ?? Boolean(bundle.config),
    createdAt,
    updatedAt,
    lastSavedAt: toDate(bundle.config?.updatedAt),
    version: 1,
    migratedFromPageSlug: bundle.slug,
  } satisfies FirestoreData;
}

function buildSlugIndexPayload(slug: string, summary: FirestoreData) {
  return {
    slug,
    eventId: readString(summary.eventId) ?? buildBackfillEventId(slug),
    eventType: readString(summary.eventType) ?? DEFAULT_EVENT_TYPE,
    status: 'active',
    targetSlug: null,
    createdAt: toDate(summary.createdAt) ?? new Date(),
    updatedAt: toDate(summary.updatedAt) ?? new Date(),
  } satisfies FirestoreData;
}

function buildContentObject(config: FirestoreData) {
  const content = { ...config };
  delete content.createdAt;
  delete content.updatedAt;
  delete content.editorTokenHash;
  delete content.seedSourceSlug;
  return content;
}

export function buildBackfillContentPayload(
  slug: string,
  config: FirestoreData,
  summary: FirestoreData
) {
  return stripUndefinedDeep({
    schemaVersion: 1,
    eventType: readString(summary.eventType) ?? DEFAULT_EVENT_TYPE,
    slug,
    content: {
      ...buildContentObject(config),
      slug,
    },
    themeState: {
      defaultTheme: readString(summary.defaultTheme) ?? DEFAULT_INVITATION_THEME,
      variants: isRecord(config.variants) ? config.variants : {},
    },
    productTier: readString(config.productTier),
    featureFlags: readFeatureFlags(config),
    seedSourceSlug: readString(config.seedSourceSlug),
    createdAt: toDate(config.createdAt) ?? toDate(summary.createdAt) ?? new Date(),
    updatedAt: toDate(config.updatedAt) ?? toDate(summary.updatedAt) ?? new Date(),
  }) as FirestoreData;
}

function buildSecretPayload(slug: string, eventId: string, secret: FirestoreData) {
  return stripUndefinedDeep({
    eventId,
    slug,
    pageSlug: slug,
    passwordHash: readString(secret.passwordHash),
    passwordSalt: readString(secret.passwordSalt),
    passwordIterations: readFiniteNumber(secret.passwordIterations),
    passwordVersion: readFiniteNumber(secret.passwordVersion) ?? 1,
    password: readString(secret.password),
    createdAt: toDate(secret.createdAt),
    updatedAt: toDate(secret.updatedAt),
  }) as FirestoreData;
}

export function normalizeBackfillCommentStatus(data: FirestoreData) {
  const status = readString(data.status);
  if (status === 'public' || status === 'hidden' || status === 'pending_delete') {
    return status;
  }

  return data.deleted === true ? 'pending_delete' : 'public';
}

function buildCommentPayload(slug: string, eventId: string, data: FirestoreData) {
  const status = normalizeBackfillCommentStatus(data);
  return {
    ...data,
    eventId,
    slug,
    pageSlug: slug,
    status,
    deleted: status === 'pending_delete',
  } satisfies FirestoreData;
}

function buildLinkTokenPayload(slug: string, eventId: string, data: FirestoreData) {
  return stripUndefinedDeep({
    eventId,
    slug,
    pageSlug: slug,
    tokenHash: readString(data.tokenHash),
    purpose: readString(data.purpose),
    passwordVersion: readFiniteNumber(data.passwordVersion),
    createdAt: toDate(data.createdAt),
    expiresAt: toDate(data.expiresAt),
    usedAt: toDate(data.usedAt),
    revokedAt: toDate(data.revokedAt),
    lastValidatedAt: toDate(data.lastValidatedAt),
    issuedBy: readString(data.issuedBy),
    issuedByType: readString(data.issuedByType),
  }) as FirestoreData;
}

function buildAuditLogPayload(slug: string, eventId: string, data: FirestoreData) {
  return stripUndefinedDeep({
    ...data,
    eventId,
    slug,
    pageSlug: slug,
    actor: isRecord(data.actor)
      ? data.actor
      : {
          type: 'mobile-owner-session',
          sessionEventId: readString(data.sessionPageSlug),
        },
  }) as FirestoreData;
}

export function buildBillingMirrorPayload(data: FirestoreData, now = new Date()) {
  const rawCreatedPageSlug = readString(data.createdPageSlug);
  const rawTargetPageSlug = readString(data.targetPageSlug);
  const createdPageSlug = rawCreatedPageSlug ? normalizeBackfillSlug(rawCreatedPageSlug) : null;
  const targetPageSlug = rawTargetPageSlug ? normalizeBackfillSlug(rawTargetPageSlug) : null;
  const createdEventId = createdPageSlug ? buildBackfillEventId(createdPageSlug) : null;
  const targetEventId = targetPageSlug ? buildBackfillEventId(targetPageSlug) : null;
  return stripUndefinedDeep({
    ...data,
    eventId: targetEventId ?? createdEventId,
    createdEventId,
    targetEventId,
    migratedFromCollection: LEGACY_BILLING_COLLECTION,
    migratedAt: now,
  }) as FirestoreData;
}

function isDateLike(value: unknown) {
  return value instanceof Date || toDate(value) instanceof Date;
}

function areComparableDatesEqual(left: unknown, right: unknown) {
  return (toDate(left)?.getTime() ?? null) === (toDate(right)?.getTime() ?? null);
}

function findSubsetMismatches(
  expected: unknown,
  actual: unknown,
  fieldPath = ''
): string[] {
  if (expected === undefined) {
    return [];
  }

  if (expected === null) {
    return actual === null || actual === undefined ? [] : [fieldPath || '<root>'];
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) {
      return [fieldPath || '<root>'];
    }

    return expected.flatMap((entry, index) =>
      findSubsetMismatches(entry, actual[index], `${fieldPath}[${index}]`)
    );
  }

  if (isDateLike(expected)) {
    return areComparableDatesEqual(expected, actual) ? [] : [fieldPath || '<root>'];
  }

  if (isRecord(expected)) {
    if (!isRecord(actual)) {
      return [fieldPath || '<root>'];
    }

    return Object.entries(expected).flatMap(([key, value]) => {
      const nextPath = fieldPath ? `${fieldPath}.${key}` : key;
      return findSubsetMismatches(value, actual[key], nextPath);
    });
  }

  return expected === actual ? [] : [fieldPath || '<root>'];
}

function pushMismatchFailures(
  failures: BackfillFailure[],
  target: string,
  id: string,
  expected: FirestoreData,
  actual: FirestoreData | null | undefined
) {
  if (!actual) {
    failures.push({ target, id, reason: 'missing document' });
    return;
  }

  const mismatchFields = findSubsetMismatches(expected, actual);
  if (mismatchFields.length > 0) {
    failures.push({
      target,
      id,
      reason: `field mismatch: ${mismatchFields.join(', ')}`,
    });
  }
}

function omitTopLevelFields(
  data: FirestoreData | null | undefined,
  fields: string[]
): FirestoreData | null {
  if (!data) {
    return null;
  }

  const cloned = { ...data };
  fields.forEach((field) => {
    delete cloned[field];
  });
  return cloned;
}

function increment(counters: BackfillCounters, key: string, amount = 1) {
  counters[key] = (counters[key] ?? 0) + amount;
}

function getFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    undefined
  );
}

function loadEnvironmentFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function loadLocalEnvironment() {
  ['.env.local', '.env'].forEach((fileName) => {
    loadEnvironmentFile(path.join(process.cwd(), fileName));
  });
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id ?? getFirebaseProjectId(),
    });
    return getFirestore();
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      'Firebase Admin credentials are required. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: getFirebaseProjectId(),
  });
  return getFirestore();
}

function parseArgs(argv: string[]): BackfillOptions {
  const [, , rawMode = 'dry-run', ...rest] = argv;
  if (rawMode !== 'dry-run' && rawMode !== 'execute' && rawMode !== 'validate') {
    throw new Error('Mode must be one of: dry-run, execute, validate.');
  }

  const options: BackfillOptions = {
    mode: rawMode,
    slug: null,
    resumeFrom: null,
    limit: null,
    batchSize: DEFAULT_BATCH_SIZE,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    const value = rest[index + 1];
    if (key === '--slug' && value) {
      options.slug = normalizeBackfillSlug(value);
      index += 1;
    } else if (key === '--resume-from' && value) {
      options.resumeFrom = normalizeBackfillSlug(value);
      index += 1;
    } else if (key === '--limit' && value) {
      options.limit = Math.max(1, Number.parseInt(value, 10));
      index += 1;
    } else if (key === '--batch-size' && value) {
      options.batchSize = Math.min(
        450,
        Math.max(1, Number.parseInt(value, 10) || DEFAULT_BATCH_SIZE)
      );
      index += 1;
    }
  }

  return options;
}

async function getCollectionData(db: Firestore, collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    data: (docSnapshot.data() ?? {}) as FirestoreData,
  }));
}

async function collectSlugs(db: Firestore, options: BackfillOptions) {
  if (options.slug) {
    return [options.slug];
  }

  const slugs = new Set<string>();
  const addSlug = (value: unknown) => {
    const normalized = typeof value === 'string' ? normalizeBackfillSlug(value) : '';
    if (normalized) {
      slugs.add(normalized);
    }
  };

  const [
    configs,
    registries,
    displayPeriods,
    secrets,
    tickets,
    linkTokens,
    auditLogs,
    billingRecords,
    guestbookRefs,
  ] = await Promise.all([
    getCollectionData(db, PAGE_CONFIG_COLLECTION),
    getCollectionData(db, PAGE_REGISTRY_COLLECTION),
    getCollectionData(db, DISPLAY_PERIOD_COLLECTION),
    getCollectionData(db, CLIENT_PASSWORD_COLLECTION),
    getCollectionData(db, PAGE_TICKET_COLLECTION),
    getCollectionData(db, LEGACY_LINK_TOKEN_COLLECTION),
    getCollectionData(db, LEGACY_AUDIT_LOG_COLLECTION),
    getCollectionData(db, LEGACY_BILLING_COLLECTION),
    db.collection(GUESTBOOKS_COLLECTION).listDocuments(),
  ]);

  configs.forEach((entry) => addSlug(entry.id));
  registries.forEach((entry) => addSlug(readString(entry.data.pageSlug) ?? entry.id));
  displayPeriods.forEach((entry) => addSlug(readString(entry.data.pageSlug) ?? entry.id));
  secrets.forEach((entry) => addSlug(readString(entry.data.pageSlug) ?? entry.id));
  tickets.forEach((entry) => addSlug(readString(entry.data.pageSlug) ?? entry.id));
  linkTokens.forEach((entry) => addSlug(entry.data.pageSlug));
  auditLogs.forEach((entry) => addSlug(entry.data.pageSlug));
  billingRecords.forEach((entry) => {
    addSlug(entry.data.createdPageSlug);
    addSlug(entry.data.targetPageSlug);
  });
  guestbookRefs.forEach((docRef) => addSlug(docRef.id));

  const sorted = [...slugs].sort();
  const resumed = options.resumeFrom
    ? sorted.filter((slug) => slug >= options.resumeFrom!)
    : sorted;
  return options.limit ? resumed.slice(0, options.limit) : resumed;
}

async function getDirectOrPageSlugDoc(
  db: Firestore,
  collectionName: string,
  slug: string
) {
  const directSnapshot = await db.collection(collectionName).doc(slug).get();
  if (directSnapshot.exists) {
    return (directSnapshot.data() ?? {}) as FirestoreData;
  }

  const snapshot = await db
    .collection(collectionName)
    .where('pageSlug', '==', slug)
    .limit(1)
    .get();
  const matched = snapshot.docs[0] ?? null;
  return matched ? ((matched.data() ?? {}) as FirestoreData) : null;
}

async function loadLegacyBundle(db: Firestore, slug: string): Promise<LegacyBundle> {
  const [
    configSnapshot,
    registrySnapshot,
    displayPeriod,
    secret,
    ticketSnapshot,
    commentsSnapshot,
    linkTokensSnapshot,
    auditLogsSnapshot,
  ] = await Promise.all([
    db.collection(PAGE_CONFIG_COLLECTION).doc(slug).get(),
    db.collection(PAGE_REGISTRY_COLLECTION).doc(slug).get(),
    getDirectOrPageSlugDoc(db, DISPLAY_PERIOD_COLLECTION, slug),
    getDirectOrPageSlugDoc(db, CLIENT_PASSWORD_COLLECTION, slug),
    db.collection(PAGE_TICKET_COLLECTION).doc(slug).get(),
    db.collection(GUESTBOOKS_COLLECTION).doc(slug).collection(COMMENTS_COLLECTION).get(),
    db.collection(LEGACY_LINK_TOKEN_COLLECTION).where('pageSlug', '==', slug).get(),
    db.collection(LEGACY_AUDIT_LOG_COLLECTION).where('pageSlug', '==', slug).get(),
  ]);

  return {
    slug,
    config: configSnapshot.exists ? ((configSnapshot.data() ?? {}) as FirestoreData) : null,
    registry: registrySnapshot.exists
      ? ((registrySnapshot.data() ?? {}) as FirestoreData)
      : null,
    displayPeriod,
    secret,
    ticket: ticketSnapshot.exists ? ((ticketSnapshot.data() ?? {}) as FirestoreData) : null,
    comments: commentsSnapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      data: (docSnapshot.data() ?? {}) as FirestoreData,
    })),
    linkTokens: linkTokensSnapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      data: (docSnapshot.data() ?? {}) as FirestoreData,
    })),
    auditLogs: auditLogsSnapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      data: (docSnapshot.data() ?? {}) as FirestoreData,
    })),
  };
}

function hasAnyLegacyData(bundle: LegacyBundle) {
  return Boolean(
    bundle.config ||
      bundle.registry ||
      bundle.displayPeriod ||
      bundle.secret ||
      bundle.ticket ||
      bundle.comments.length ||
      bundle.linkTokens.length ||
      bundle.auditLogs.length
  );
}

function buildWritesForBundle(bundle: LegacyBundle, now = new Date()) {
  const writes: PlannedWrite[] = [];
  const summary = buildBackfillEventSummary(bundle, now);
  const eventId = readString(summary.eventId) ?? buildBackfillEventId(bundle.slug);

  writes.push({
    kind: 'eventSummary',
    path: `${EVENTS_COLLECTION}/${eventId}`,
    data: summary,
    merge: true,
  });
  writes.push({
    kind: 'eventSlugIndex',
    path: `${EVENT_SLUG_INDEX_COLLECTION}/${bundle.slug}`,
    data: buildSlugIndexPayload(bundle.slug, summary),
    merge: true,
  });

  if (bundle.config) {
    writes.push({
      kind: 'eventContent',
      path: `${EVENTS_COLLECTION}/${eventId}/${EVENT_CONTENT_COLLECTION}/${EVENT_CURRENT_CONTENT_DOC}`,
      data: buildBackfillContentPayload(bundle.slug, bundle.config, summary),
      merge: true,
    });
  }

  if (bundle.secret) {
    writes.push({
      kind: 'eventSecret',
      path: `${EVENT_SECRET_COLLECTION}/${eventId}`,
      data: buildSecretPayload(bundle.slug, eventId, bundle.secret),
      merge: true,
    });
  }

  bundle.comments.forEach((comment) => {
    writes.push({
      kind: 'eventComment',
      path: `${EVENTS_COLLECTION}/${eventId}/${COMMENTS_COLLECTION}/${comment.id}`,
      data: buildCommentPayload(bundle.slug, eventId, comment.data),
      merge: true,
    });
  });

  bundle.linkTokens.forEach((token) => {
    writes.push({
      kind: 'eventLinkToken',
      path: `${EVENTS_COLLECTION}/${eventId}/${EVENT_LINK_TOKEN_COLLECTION}/${token.id}`,
      data: buildLinkTokenPayload(bundle.slug, eventId, token.data),
      merge: true,
    });
  });

  bundle.auditLogs.forEach((log) => {
    writes.push({
      kind: 'eventAuditLog',
      path: `${EVENTS_COLLECTION}/${eventId}/${EVENT_AUDIT_LOG_COLLECTION}/${log.id}`,
      data: buildAuditLogPayload(bundle.slug, eventId, log.data),
      merge: true,
    });
  });

  return writes;
}

async function assertSlugIndexWritable(db: Firestore, slug: string) {
  const eventId = buildBackfillEventId(slug);
  const snapshot = await db.collection(EVENT_SLUG_INDEX_COLLECTION).doc(slug).get();
  if (!snapshot.exists) {
    return;
  }

  const data = snapshot.data() ?? {};
  const existingEventId = readString(data.eventId);
  const status = readString(data.status) ?? 'active';
  if (existingEventId && existingEventId !== eventId && status !== 'revoked') {
    throw new Error(
      `Slug is already linked to ${existingEventId} with status ${status}.`
    );
  }
}

class BatchWriter {
  private batch: WriteBatch | null = null;
  private pending = 0;
  private committedBatches = 0;
  private readonly db: Firestore;
  private readonly batchSize: number;

  constructor(db: Firestore, batchSize: number) {
    this.db = db;
    this.batchSize = batchSize;
  }

  async set(write: PlannedWrite) {
    if (!this.batch) {
      this.batch = this.db.batch();
    }

    this.batch.set(this.db.doc(write.path), write.data, { merge: write.merge });
    this.pending += 1;

    if (this.pending >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (!this.batch || this.pending === 0) {
      return;
    }

    await this.batch.commit();
    this.committedBatches += 1;
    this.batch = null;
    this.pending = 0;
  }

  getCommittedBatches() {
    return this.committedBatches;
  }
}

async function runDryRunOrExecute(
  db: Firestore,
  mode: 'dry-run' | 'execute',
  options: BackfillOptions
) {
  const slugs = await collectSlugs(db, options);
  const failures: BackfillFailure[] = [];
  const counters: BackfillCounters = {};
  const writer = new BatchWriter(db, options.batchSize);

  for (const slug of slugs) {
    try {
      increment(counters, 'scannedSlug');
      await assertSlugIndexWritable(db, slug);
      const bundle = await loadLegacyBundle(db, slug);
      if (!hasAnyLegacyData(bundle)) {
        increment(counters, 'skippedSlug');
        increment(counters, 'skippedEmptySlug');
        continue;
      }

      const writes = buildWritesForBundle(bundle);
      increment(counters, 'plannedWrite', writes.length);
      writes.forEach((write) => increment(counters, write.kind));

      if (mode === 'execute') {
        for (const write of writes) {
          await writer.set(write);
        }
      }

      increment(counters, 'successSlug');
      increment(counters, 'processedSlug');
    } catch (error) {
      increment(counters, 'failedSlug');
      failures.push({
        target: 'slug',
        id: slug,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const billingResult = await backfillBillingRecords(db, mode, writer);
  Object.entries(billingResult.counters).forEach(([key, value]) => {
    increment(counters, key, value);
  });
  failures.push(...billingResult.failures);

  if (mode === 'execute') {
    await writer.flush();
  }

  return {
    mode,
    scannedSlugCount: slugs.length,
    counters,
    committedBatches: mode === 'execute' ? writer.getCommittedBatches() : 0,
    failures,
  };
}

async function backfillBillingRecords(
  db: Firestore,
  mode: 'dry-run' | 'execute',
  writer: BatchWriter
) {
  const counters: BackfillCounters = {};
  const failures: BackfillFailure[] = [];
  const snapshot = await db.collection(LEGACY_BILLING_COLLECTION).get();

  for (const docSnapshot of snapshot.docs) {
    try {
      const write: PlannedWrite = {
        kind: 'billingFulfillment',
        path: `${BILLING_COLLECTION}/${docSnapshot.id}`,
        data: buildBillingMirrorPayload((docSnapshot.data() ?? {}) as FirestoreData),
        merge: true,
      };
      increment(counters, 'scannedBillingFulfillment');
      increment(counters, write.kind);
      if (mode === 'execute') {
        await writer.set(write);
      }
      increment(counters, 'successBillingFulfillment');
    } catch (error) {
      increment(counters, 'failedBillingFulfillment');
      failures.push({
        target: 'billingFulfillment',
        id: docSnapshot.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { counters, failures };
}

async function validateSlug(db: Firestore, slug: string) {
  const failures: BackfillFailure[] = [];
  const eventId = buildBackfillEventId(slug);
  const bundle = await loadLegacyBundle(db, slug);
  if (!hasAnyLegacyData(bundle)) {
    return failures;
  }

  const [eventSnapshot, slugIndexSnapshot] = await Promise.all([
    db.collection(EVENTS_COLLECTION).doc(eventId).get(),
    db.collection(EVENT_SLUG_INDEX_COLLECTION).doc(slug).get(),
  ]);
  const eventData = eventSnapshot.exists
    ? ((eventSnapshot.data() ?? {}) as FirestoreData)
    : null;
  const slugIndexData = slugIndexSnapshot.exists
    ? ((slugIndexSnapshot.data() ?? {}) as FirestoreData)
    : null;
  const validationNow =
    toDate(eventData?.createdAt) ??
    toDate(eventData?.updatedAt) ??
    toDate(slugIndexData?.createdAt) ??
    toDate(slugIndexData?.updatedAt) ??
    new Date();
  const expectedSummary = buildBackfillEventSummary(bundle, validationNow);
  const expectedSlugIndex = buildSlugIndexPayload(slug, expectedSummary);

  pushMismatchFailures(
    failures,
    'events',
    eventId,
    omitTopLevelFields(expectedSummary, ['createdAt', 'updatedAt']),
    omitTopLevelFields(eventData, ['createdAt', 'updatedAt'])
  );
  pushMismatchFailures(
    failures,
    'eventSlugIndex',
    slug,
    omitTopLevelFields(expectedSlugIndex, ['createdAt', 'updatedAt']),
    omitTopLevelFields(slugIndexData, ['createdAt', 'updatedAt'])
  );

  if (bundle.config) {
    const expectedContent = buildBackfillContentPayload(slug, bundle.config, expectedSummary);
    const contentSnapshot = await db
      .collection(EVENTS_COLLECTION)
      .doc(eventId)
      .collection(EVENT_CONTENT_COLLECTION)
      .doc(EVENT_CURRENT_CONTENT_DOC)
      .get();
    pushMismatchFailures(
      failures,
      'eventContent',
      slug,
      expectedContent,
      contentSnapshot.exists ? ((contentSnapshot.data() ?? {}) as FirestoreData) : null
    );
  }

  if (bundle.secret) {
    const expectedSecret = buildSecretPayload(slug, eventId, bundle.secret);
    const secretSnapshot = await db.collection(EVENT_SECRET_COLLECTION).doc(eventId).get();
    pushMismatchFailures(
      failures,
      'eventSecrets',
      eventId,
      expectedSecret,
      secretSnapshot.exists ? ((secretSnapshot.data() ?? {}) as FirestoreData) : null
    );
  }

  const commentCollection = db
    .collection(EVENTS_COLLECTION)
    .doc(eventId)
    .collection(COMMENTS_COLLECTION);
  const commentSnapshot = await commentCollection.get();
  if (commentSnapshot.size !== bundle.comments.length) {
    failures.push({
      target: 'eventCommentCount',
      id: slug,
      reason: `count mismatch: expected=${bundle.comments.length}, actual=${commentSnapshot.size}`,
    });
  }
  for (const comment of bundle.comments) {
    const snapshot = await commentCollection.doc(comment.id).get();
    pushMismatchFailures(
      failures,
      'eventComment',
      `${slug}/${comment.id}`,
      buildCommentPayload(slug, eventId, comment.data),
      snapshot.exists ? ((snapshot.data() ?? {}) as FirestoreData) : null
    );
  }

  const tokenCollection = db
    .collection(EVENTS_COLLECTION)
    .doc(eventId)
    .collection(EVENT_LINK_TOKEN_COLLECTION);
  const tokenSnapshot = await tokenCollection.get();
  if (tokenSnapshot.size !== bundle.linkTokens.length) {
    failures.push({
      target: 'eventLinkTokenCount',
      id: slug,
      reason: `count mismatch: expected=${bundle.linkTokens.length}, actual=${tokenSnapshot.size}`,
    });
  }
  for (const token of bundle.linkTokens) {
    const snapshot = await tokenCollection.doc(token.id).get();
    pushMismatchFailures(
      failures,
      'eventLinkToken',
      `${slug}/${token.id}`,
      buildLinkTokenPayload(slug, eventId, token.data),
      snapshot.exists ? ((snapshot.data() ?? {}) as FirestoreData) : null
    );
  }

  const auditLogCollection = db
    .collection(EVENTS_COLLECTION)
    .doc(eventId)
    .collection(EVENT_AUDIT_LOG_COLLECTION);
  const auditLogSnapshot = await auditLogCollection.get();
  if (auditLogSnapshot.size !== bundle.auditLogs.length) {
    failures.push({
      target: 'eventAuditLogCount',
      id: slug,
      reason: `count mismatch: expected=${bundle.auditLogs.length}, actual=${auditLogSnapshot.size}`,
    });
  }
  for (const log of bundle.auditLogs) {
    const snapshot = await auditLogCollection.doc(log.id).get();
    pushMismatchFailures(
      failures,
      'eventAuditLog',
      `${slug}/${log.id}`,
      buildAuditLogPayload(slug, eventId, log.data),
      snapshot.exists ? ((snapshot.data() ?? {}) as FirestoreData) : null
    );
  }

  return failures;
}

async function validateBillingRecords(db: Firestore) {
  const failures: BackfillFailure[] = [];
  const snapshot = await db.collection(LEGACY_BILLING_COLLECTION).get();

  for (const docSnapshot of snapshot.docs) {
    const targetSnapshot = await db.collection(BILLING_COLLECTION).doc(docSnapshot.id).get();
    const targetData = targetSnapshot.exists
      ? ((targetSnapshot.data() ?? {}) as FirestoreData)
      : null;
    pushMismatchFailures(
      failures,
      'billingFulfillment',
      docSnapshot.id,
      buildBillingMirrorPayload(
        (docSnapshot.data() ?? {}) as FirestoreData,
        toDate(targetData?.migratedAt) ?? new Date()
      ),
      targetData
    );
  }

  return {
    failures,
    scannedCount: snapshot.size,
  };
}

async function runValidate(db: Firestore, options: BackfillOptions) {
  const slugs = await collectSlugs(db, options);
  const failures: BackfillFailure[] = [];
  const counters: BackfillCounters = {
    validatedSlug: 0,
    validSlug: 0,
    failedSlug: 0,
  };

  for (const slug of slugs) {
    increment(counters, 'validatedSlug');
    const slugFailures = await validateSlug(db, slug);
    failures.push(...slugFailures);
    if (slugFailures.length > 0) {
      increment(counters, 'failedSlug');
    } else {
      increment(counters, 'validSlug');
    }
  }
  const billingResult = await validateBillingRecords(db);
  failures.push(...billingResult.failures);
  counters.failure = failures.length;
  counters.validatedBillingFulfillment = billingResult.scannedCount;

  return {
    mode: 'validate' as const,
    scannedSlugCount: slugs.length,
    counters,
    committedBatches: 0,
    failures,
  };
}

async function main() {
  loadLocalEnvironment();
  const options = parseArgs(process.argv);
  const db = initializeFirebaseAdmin();
  const result =
    options.mode === 'validate'
      ? await runValidate(db, options)
      : await runDryRunOrExecute(db, options.mode, options);

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        options,
        ...result,
        ok: result.failures.length === 0,
      },
      null,
      2
    )
  );

  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
