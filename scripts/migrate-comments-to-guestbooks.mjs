#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const LEGACY_UNIFIED_COLLECTION = 'comments';
const LEGACY_PREFIX = 'comments-';
const GUESTBOOKS_COLLECTION = 'guestbooks';
const GUESTBOOK_COMMENTS_COLLECTION = 'comments';

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

function normalizePageSlug(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

function getTargetCommentRef(db, pageSlug, commentId) {
  return db
    .collection(GUESTBOOKS_COLLECTION)
    .doc(pageSlug)
    .collection(GUESTBOOK_COMMENTS_COLLECTION)
    .doc(commentId);
}

function buildGuestbookMeta(pageSlug) {
  return {
    pageSlug,
    updatedAt: new Date(),
  };
}

function buildCommentPayload(data, pageSlug, sourceCollection) {
  return {
    ...data,
    author: typeof data.author === 'string' ? data.author : '',
    message: typeof data.message === 'string' ? data.message : '',
    pageSlug,
    createdAt: data.createdAt ?? data.timestamp ?? new Date(),
    migratedFrom: sourceCollection,
  };
}

async function collectSourceComments(db) {
  const sourceEntries = [];
  const legacyCollections = [];

  const unifiedSnapshot = await db.collection(LEGACY_UNIFIED_COLLECTION).get();
  unifiedSnapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const pageSlug = normalizePageSlug(data.pageSlug);
    if (!pageSlug) {
      return;
    }

    sourceEntries.push({
      key: `${pageSlug}:${docSnapshot.id}`,
      pageSlug,
      commentId: docSnapshot.id,
      sourceCollection: LEGACY_UNIFIED_COLLECTION,
      data,
    });
  });

  const collections = await db.listCollections();
  for (const collection of collections) {
    if (!collection.id.startsWith(LEGACY_PREFIX)) {
      continue;
    }

    legacyCollections.push(collection.id);
    const pageSlug = normalizePageSlug(
      collection.id.replace(new RegExp(`^${LEGACY_PREFIX}`), '')
    );
    if (!pageSlug) {
      continue;
    }

    const snapshot = await collection.get();
    snapshot.docs.forEach((docSnapshot) => {
      sourceEntries.push({
        key: `${pageSlug}:${docSnapshot.id}`,
        pageSlug,
        commentId: docSnapshot.id,
        sourceCollection: collection.id,
        data: docSnapshot.data(),
      });
    });
  }

  return {
    sourceEntries,
    legacyCollections,
    unifiedCount: unifiedSnapshot.size,
  };
}

async function collectTargetComments(db) {
  const snapshot = await db.collectionGroup(GUESTBOOK_COMMENTS_COLLECTION).get();
  return snapshot.docs
    .filter((docSnapshot) => docSnapshot.ref.path.startsWith(`${GUESTBOOKS_COLLECTION}/`))
    .map((docSnapshot) => {
      const pageSlug = docSnapshot.ref.parent.parent?.id ?? normalizePageSlug(docSnapshot.data().pageSlug);
      return {
        key: `${pageSlug}:${docSnapshot.id}`,
        pageSlug,
        commentId: docSnapshot.id,
        data: docSnapshot.data(),
      };
    })
    .filter((entry) => Boolean(entry.pageSlug));
}

async function analyze(db) {
  const [{ sourceEntries, legacyCollections, unifiedCount }, targetEntries, guestbookRoots] =
    await Promise.all([
      collectSourceComments(db),
      collectTargetComments(db),
      db.collection(GUESTBOOKS_COLLECTION).get(),
    ]);

  console.log(
    JSON.stringify(
      {
        unifiedComments: unifiedCount,
        legacyCommentCollections: legacyCollections,
        legacyCommentCount: sourceEntries.filter(
          (entry) => entry.sourceCollection !== LEGACY_UNIFIED_COLLECTION
        ).length,
        sourceCommentCount: sourceEntries.length,
        guestbookRootCount: guestbookRoots.size,
        targetCommentCount: targetEntries.length,
      },
      null,
      2
    )
  );
}

async function migrate(db, execute) {
  const { sourceEntries } = await collectSourceComments(db);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const entry of sourceEntries) {
    if (!entry.pageSlug) {
      skippedCount += 1;
      continue;
    }

    if (execute) {
      await db
        .collection(GUESTBOOKS_COLLECTION)
        .doc(entry.pageSlug)
        .set(buildGuestbookMeta(entry.pageSlug), { merge: true });

      await getTargetCommentRef(db, entry.pageSlug, entry.commentId).set(
        buildCommentPayload(entry.data, entry.pageSlug, entry.sourceCollection),
        { merge: true }
      );
    }

    migratedCount += 1;
  }

  console.log(
    `${execute ? 'Migrated' : 'Would migrate'} ${migratedCount} comments to ${GUESTBOOKS_COLLECTION}/{pageSlug}/${GUESTBOOK_COMMENTS_COLLECTION}.`
  );

  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} comments because pageSlug could not be resolved.`);
  }
}

async function validate(db) {
  const [{ sourceEntries }, targetEntries] = await Promise.all([
    collectSourceComments(db),
    collectTargetComments(db),
  ]);

  const sourceKeys = new Set(sourceEntries.map((entry) => entry.key));
  const targetKeys = new Set(targetEntries.map((entry) => entry.key));
  const missingKeys = [...sourceKeys].filter((key) => !targetKeys.has(key));

  console.log(
    JSON.stringify(
      {
        sourceUniqueCount: sourceKeys.size,
        targetUniqueCount: targetKeys.size,
        missingCount: missingKeys.length,
        missingSample: missingKeys.slice(0, 20),
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
  const db = initializeFirebaseAdmin();

  if (command === 'analyze') {
    await analyze(db);
    return;
  }

  if (command === 'migrate') {
    await migrate(db, execute);
    return;
  }

  if (command === 'validate') {
    await validate(db);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
