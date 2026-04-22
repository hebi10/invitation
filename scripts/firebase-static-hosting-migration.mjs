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
  const adminSnapshot = await db.collection('admin-users').get();
  const displayPeriodSnapshot = await db.collection('display-periods').get();
  const memorySnapshot = await db.collection('memory-pages').get();

  const legacyMemoryDocs = memorySnapshot.docs.filter((doc) =>
    LEGACY_MEMORY_FIELDS.some((field) => doc.data()[field] !== undefined)
  );

  console.log(JSON.stringify({
    adminUsers: adminSnapshot.size,
    displayPeriods: displayPeriodSnapshot.size,
    legacyMemoryPageCount: legacyMemoryDocs.length,
  }, null, 2));
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
