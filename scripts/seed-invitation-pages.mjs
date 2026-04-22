#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EVENTS_COLLECTION = 'events';
const EVENT_CONTENT_COLLECTION = 'content';
const EVENT_CURRENT_CONTENT_DOC = 'current';
const EVENT_SLUG_INDEX_COLLECTION = 'eventSlugIndex';
const DEFAULT_EVENT_TYPE = 'wedding';
const DEFAULT_INVITATION_THEME = 'emotional';

function getFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    undefined
  );
}

function hasServiceAccountJson() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function hasApplicationDefaultCredentials() {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function loadEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
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
    const unwrappedValue = rawValue.replace(/^(['"])(.*)\1$/, '$2');

    if (!process.env[key]) {
      process.env[key] = unwrappedValue;
    }
  });
}

function loadLocalEnvironment() {
  const projectRoot = process.cwd();
  ['.env.local', '.env'].forEach((fileName) => {
    loadEnvironmentFile(path.join(projectRoot, fileName));
  });
}

function parseArgs(argv) {
  const [, , command = 'analyze', ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith('--')) {
      continue;
    }

    const key = value.slice(2);
    const nextValue = rest[index + 1];
    if (!nextValue || nextValue.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = nextValue;
    index += 1;
  }

  return { command, options };
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  if (hasServiceAccountJson()) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id ?? getFirebaseProjectId(),
    });
  } else {
    if (!hasApplicationDefaultCredentials()) {
      throw new Error(
        [
          'Firebase Admin credentials were not found.',
          'Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS,',
          'or run "gcloud auth application-default login" before executing this script.',
        ].join(' ')
      );
    }

    initializeApp({
      credential: applicationDefault(),
      projectId: getFirebaseProjectId(),
    });
  }

  return getFirestore();
}

async function loadWeddingSeeds() {
  const moduleUrl = pathToFileURL(path.join(process.cwd(), 'src/config/weddingPages.ts')).href;
  const weddingPagesModule = await import(moduleUrl);

  if (typeof weddingPagesModule.getAllWeddingPageSeeds !== 'function') {
    throw new Error('getAllWeddingPageSeeds export was not found.');
  }

  return weddingPagesModule.getAllWeddingPageSeeds();
}

function cloneSeed(seed) {
  return JSON.parse(JSON.stringify(seed));
}

function buildEventId(seed) {
  return `evt_${seed.slug}`;
}

function readSupportedVariants(seed) {
  return Object.keys(seed.variants ?? {}).filter((entry) => entry.trim().length > 0);
}

function resolveDefaultTheme(seed, existingSummary) {
  if (typeof existingSummary?.defaultTheme === 'string' && existingSummary.defaultTheme.trim()) {
    return existingSummary.defaultTheme.trim();
  }

  const availableVariant = Object.entries(seed.variants ?? {}).find(([, value]) => {
    return typeof value === 'object' && value !== null && value.available !== false;
  });

  return availableVariant?.[0] ?? DEFAULT_INVITATION_THEME;
}

function buildEventSummaryPayload(seed, existingSummary) {
  const now = new Date();
  const supportedVariants = readSupportedVariants(seed);
  const nextPublished =
    typeof existingSummary?.visibility?.published === 'boolean'
      ? existingSummary.visibility.published
      : existingSummary?.published ?? true;
  const nextDisplayStartAt =
    existingSummary?.visibility?.displayStartAt ??
    existingSummary?.displayPeriod?.startDate ??
    null;
  const nextDisplayEndAt =
    existingSummary?.visibility?.displayEndAt ??
    existingSummary?.displayPeriod?.endDate ??
    null;
  const nextTicketBalance =
    typeof existingSummary?.stats?.ticketBalance === 'number'
      ? existingSummary.stats.ticketBalance
      : typeof existingSummary?.stats?.ticketCount === 'number'
        ? existingSummary.stats.ticketCount
        : 0;
  const nextCommentCount =
    typeof existingSummary?.stats?.commentCount === 'number'
      ? existingSummary.stats.commentCount
      : 0;

  return {
    eventId: buildEventId(seed),
    eventType: existingSummary?.eventType ?? DEFAULT_EVENT_TYPE,
    slug: seed.slug,
    status: existingSummary?.status ?? 'active',
    title: seed.displayName,
    displayName: seed.displayName,
    summary:
      typeof seed.description === 'string' && seed.description.trim()
        ? seed.description.trim()
        : null,
    supportedVariants,
    published: nextPublished,
    defaultTheme: resolveDefaultTheme(seed, existingSummary),
    featureFlags:
      seed.features && typeof seed.features === 'object' ? cloneSeed(seed.features) : {},
    stats: {
      commentCount: nextCommentCount,
      ticketCount: nextTicketBalance,
      ticketBalance: nextTicketBalance,
    },
    visibility: {
      published: nextPublished,
      displayStartAt: nextDisplayStartAt,
      displayEndAt: nextDisplayEndAt,
    },
    displayPeriod:
      nextDisplayStartAt || nextDisplayEndAt
        ? {
            isActive: Boolean(nextDisplayStartAt && nextDisplayEndAt),
            startDate: nextDisplayStartAt,
            endDate: nextDisplayEndAt,
          }
        : null,
    hasCustomConfig: true,
    hasCustomContent: true,
    createdAt: existingSummary?.createdAt ?? now,
    updatedAt: now,
    lastSavedAt: now,
    version:
      typeof existingSummary?.version === 'number' && Number.isFinite(existingSummary.version)
        ? existingSummary.version + 1
        : 1,
    migratedFromPageSlug: existingSummary?.migratedFromPageSlug ?? seed.slug,
  };
}

function buildEventContentPayload(seed, existingContent, eventSummary) {
  const now = new Date();

  return {
    schemaVersion: 1,
    eventType: eventSummary.eventType,
    slug: seed.slug,
    content: cloneSeed(seed),
    themeState: {
      defaultTheme: eventSummary.defaultTheme,
      variants: cloneSeed(seed.variants ?? {}),
    },
    productTier: seed.productTier ?? null,
    featureFlags:
      seed.features && typeof seed.features === 'object' ? cloneSeed(seed.features) : {},
    seedSourceSlug: seed.slug,
    createdAt: existingContent?.createdAt ?? eventSummary.createdAt ?? now,
    updatedAt: now,
  };
}

function buildEventSlugIndexPayload(seed, existingSlugIndex, eventSummary) {
  const now = new Date();

  return {
    slug: seed.slug,
    eventId: eventSummary.eventId,
    eventType: eventSummary.eventType,
    status: 'active',
    targetSlug: null,
    createdAt: existingSlugIndex?.createdAt ?? eventSummary.createdAt ?? now,
    updatedAt: now,
  };
}

async function collectSeedStatus(db, seeds) {
  const statuses = await Promise.all(
    seeds.map(async (seed) => {
      const eventId = buildEventId(seed);
      const [summarySnapshot, contentSnapshot, slugIndexSnapshot] = await Promise.all([
        db.collection(EVENTS_COLLECTION).doc(eventId).get(),
        db
          .collection(EVENTS_COLLECTION)
          .doc(eventId)
          .collection(EVENT_CONTENT_COLLECTION)
          .doc(EVENT_CURRENT_CONTENT_DOC)
          .get(),
        db.collection(EVENT_SLUG_INDEX_COLLECTION).doc(seed.slug).get(),
      ]);

      return {
        seed,
        eventId,
        hasSummary: summarySnapshot.exists,
        hasContent: contentSnapshot.exists,
        hasSlugIndex: slugIndexSnapshot.exists,
        summaryData: summarySnapshot.exists ? summarySnapshot.data() : null,
        contentData: contentSnapshot.exists ? contentSnapshot.data() : null,
        slugIndexData: slugIndexSnapshot.exists ? slugIndexSnapshot.data() : null,
      };
    })
  );

  return statuses;
}

async function analyze(db, seeds) {
  const statuses = await collectSeedStatus(db, seeds);
  const missingSummary = statuses.filter((entry) => !entry.hasSummary).map((entry) => entry.seed.slug);
  const missingContent = statuses.filter((entry) => !entry.hasContent).map((entry) => entry.seed.slug);
  const missingSlugIndex = statuses.filter((entry) => !entry.hasSlugIndex).map((entry) => entry.seed.slug);

  console.log(
    JSON.stringify(
      {
        seedCount: seeds.length,
        summaryCount: statuses.filter((entry) => entry.hasSummary).length,
        contentCount: statuses.filter((entry) => entry.hasContent).length,
        slugIndexCount: statuses.filter((entry) => entry.hasSlugIndex).length,
        missingSummaryCount: missingSummary.length,
        missingContentCount: missingContent.length,
        missingSlugIndexCount: missingSlugIndex.length,
        missingSummary,
        missingContent,
        missingSlugIndex,
      },
      null,
      2
    )
  );
}

async function seedPages(db, seeds, execute, overwrite) {
  const statuses = await collectSeedStatus(db, seeds);
  let summaryWrites = 0;
  let contentWrites = 0;
  let slugIndexWrites = 0;
  let skipped = 0;

  for (const entry of statuses) {
    const shouldWriteSummary = overwrite || !entry.hasSummary;
    const shouldWriteContent = overwrite || !entry.hasContent;
    const shouldWriteSlugIndex = overwrite || !entry.hasSlugIndex;

    if (!shouldWriteSummary && !shouldWriteContent && !shouldWriteSlugIndex) {
      skipped += 1;
      continue;
    }

    const eventSummary = buildEventSummaryPayload(entry.seed, entry.summaryData);

    if (execute) {
      if (shouldWriteSummary) {
        await db
          .collection(EVENTS_COLLECTION)
          .doc(entry.eventId)
          .set(eventSummary, { merge: true });
      }

      if (shouldWriteContent) {
        await db
          .collection(EVENTS_COLLECTION)
          .doc(entry.eventId)
          .collection(EVENT_CONTENT_COLLECTION)
          .doc(EVENT_CURRENT_CONTENT_DOC)
          .set(
            buildEventContentPayload(entry.seed, entry.contentData, eventSummary),
            { merge: true }
          );
      }

      if (shouldWriteSlugIndex) {
        await db
          .collection(EVENT_SLUG_INDEX_COLLECTION)
          .doc(entry.seed.slug)
          .set(
            buildEventSlugIndexPayload(entry.seed, entry.slugIndexData, eventSummary),
            { merge: true }
          );
      }
    }

    if (shouldWriteSummary) {
      summaryWrites += 1;
    }

    if (shouldWriteContent) {
      contentWrites += 1;
    }

    if (shouldWriteSlugIndex) {
      slugIndexWrites += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? 'execute' : 'dry-run',
        overwrite,
        summaryWrites,
        contentWrites,
        slugIndexWrites,
        skipped,
      },
      null,
      2
    )
  );
}

async function validate(db, seeds) {
  const statuses = await collectSeedStatus(db, seeds);
  const invalidEntries = statuses
    .filter((entry) => !entry.hasSummary || !entry.hasContent || !entry.hasSlugIndex)
    .map((entry) => ({
      slug: entry.seed.slug,
      missingSummary: !entry.hasSummary,
      missingContent: !entry.hasContent,
      missingSlugIndex: !entry.hasSlugIndex,
    }));

  console.log(
    JSON.stringify(
      {
        seedCount: seeds.length,
        validCount: seeds.length - invalidEntries.length,
        invalidCount: invalidEntries.length,
        invalidEntries,
      },
      null,
      2
    )
  );
}

async function main() {
  loadLocalEnvironment();

  const { command, options } = parseArgs(process.argv);
  const execute = options.execute === true;
  const overwrite = options.overwrite === true;
  const db = initializeFirebaseAdmin();
  const seeds = await loadWeddingSeeds();

  if (command === 'analyze') {
    await analyze(db, seeds);
    return;
  }

  if (command === 'seed') {
    await seedPages(db, seeds, execute, overwrite);
    return;
  }

  if (command === 'validate') {
    await validate(db, seeds);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
