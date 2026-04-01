#!/usr/bin/env node

import process from 'node:process';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const LEGACY_MEMORY_FIELDS = ['slug', 'passwordProtected', 'passwordHash', 'passwordHint'];

function parseArgs(argv) {
  const [, , command = 'analyze', ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value.startsWith('--')) {
      const key = value.slice(2);
      const nextValue = rest[index + 1];
      if (!nextValue || nextValue.startsWith('--')) {
        options[key] = true;
      } else {
        options[key] = nextValue;
        index += 1;
      }
    }
  }

  return { command, options };
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
    });
  }

  return getFirestore();
}

async function analyze(db) {
  const collections = await db.listCollections();
  const legacyCommentCollections = collections.filter((collection) => collection.id.startsWith('comments-'));
  const adminSnapshot = await db.collection('admin-users').get();
  const displayPeriodSnapshot = await db.collection('display-periods').get();
  const memorySnapshot = await db.collection('memory-pages').get();
  const commentsSnapshot = await db.collection('comments').get();

  const legacyMemoryDocs = memorySnapshot.docs.filter((doc) =>
    LEGACY_MEMORY_FIELDS.some((field) => doc.data()[field] !== undefined)
  );

  console.log(JSON.stringify({
    adminUsers: adminSnapshot.size,
    displayPeriods: displayPeriodSnapshot.size,
    comments: commentsSnapshot.size,
    legacyCommentCollections: legacyCommentCollections.map((collection) => collection.id),
    legacyMemoryPageCount: legacyMemoryDocs.length,
  }, null, 2));
}

async function migrateComments(db, execute) {
  const collections = await db.listCollections();
  const legacyCollections = collections.filter((collection) => collection.id.startsWith('comments-'));

  let migratedCount = 0;
  for (const collection of legacyCollections) {
    const pageSlug = collection.id.replace(/^comments-/, '');
    const snapshot = await collection.get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const payload = {
        author: data.author ?? '',
        message: data.message ?? '',
        pageSlug: data.pageSlug ?? pageSlug,
        createdAt: data.createdAt ?? data.timestamp ?? new Date(),
      };

      if (execute) {
        await db.collection('comments').doc(doc.id).set(payload, { merge: true });
      }

      migratedCount += 1;
    }
  }

  console.log(`${execute ? 'Migrated' : 'Would migrate'} ${migratedCount} legacy comments.`);
}

async function sanitizeMemoryPages(db, execute) {
  const snapshot = await db.collection('memory-pages').get();
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const update = {};

    if (data.pageSlug !== doc.id) {
      update.pageSlug = doc.id;
    }

    if (data.visibility === 'private' || data.visibility === 'unlisted') {
      update.seoNoIndex = true;
    }

    for (const field of LEGACY_MEMORY_FIELDS) {
      if (data[field] !== undefined) {
        update[field] = FieldValue.delete();
      }
    }

    if (Object.keys(update).length === 0) {
      continue;
    }

    if (execute) {
      await doc.ref.update(update);
    }

    updatedCount += 1;
  }

  console.log(`${execute ? 'Sanitized' : 'Would sanitize'} ${updatedCount} memory-pages documents.`);
}

async function main() {
  const { command, options } = parseArgs(process.argv);
  const execute = options.execute === true;
  const db = initializeFirebaseAdmin();

  if (command === 'analyze') {
    await analyze(db);
    return;
  }

  if (command === 'migrate-comments') {
    await migrateComments(db, execute);
    return;
  }

  if (command === 'sanitize-memory-pages') {
    await sanitizeMemoryPages(db, execute);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
