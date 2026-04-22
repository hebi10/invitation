#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  getFirestore,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type WriteBatch,
} from 'firebase-admin/firestore';

type DeleteMode = 'analyze' | 'execute';

type LegacyCollectionStats = {
  collection: string;
  documentCount: number;
  nestedDocumentCount?: number;
};

const DELETE_ORDER = [
  'client-passwords',
  'display-periods',
  'invitation-page-registry',
  'invitation-page-configs',
  'guestbooks',
  'page-ticket-balances',
] as const;

const BATCH_SIZE = 400;

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

function getFirebaseProjectId() {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    null
  );
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id ?? getFirebaseProjectId() ?? undefined,
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
    projectId: getFirebaseProjectId() ?? undefined,
  });
  return getFirestore();
}

function parseMode(argv: string[]): DeleteMode {
  const mode = argv[2] ?? 'analyze';
  if (mode !== 'analyze' && mode !== 'execute') {
    throw new Error('Mode must be one of: analyze, execute.');
  }

  return mode;
}

class BatchDeleter {
  private batch: WriteBatch | null = null;
  private pending = 0;
  private committedBatches = 0;
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async delete(docRef: DocumentReference) {
    if (!this.batch) {
      this.batch = this.db.batch();
    }

    this.batch.delete(docRef);
    this.pending += 1;

    if (this.pending >= BATCH_SIZE) {
      await this.flush();
    }
  }

  async flush() {
    if (!this.batch || this.pending === 0) {
      return;
    }

    await this.batch.commit();
    this.batch = null;
    this.pending = 0;
    this.committedBatches += 1;
  }

  getCommittedBatches() {
    return this.committedBatches;
  }
}

async function countFlatCollection(collection: CollectionReference) {
  const snapshot = await collection.get();
  return snapshot.size;
}

async function countGuestbooks(db: Firestore): Promise<LegacyCollectionStats> {
  const guestbookSnapshot = await db.collection('guestbooks').get();
  let nestedCommentCount = 0;

  for (const guestbookDoc of guestbookSnapshot.docs) {
    const commentSnapshot = await guestbookDoc.ref.collection('comments').get();
    nestedCommentCount += commentSnapshot.size;
  }

  return {
    collection: 'guestbooks',
    documentCount: guestbookSnapshot.size,
    nestedDocumentCount: nestedCommentCount,
  };
}

async function analyzeLegacyCollections(db: Firestore) {
  const stats: LegacyCollectionStats[] = [];

  for (const collectionName of DELETE_ORDER) {
    if (collectionName === 'guestbooks') {
      stats.push(await countGuestbooks(db));
      continue;
    }

    stats.push({
      collection: collectionName,
      documentCount: await countFlatCollection(db.collection(collectionName)),
    });
  }

  return stats;
}

async function deleteFlatCollection(
  db: Firestore,
  collectionName: string,
  deleter: BatchDeleter
) {
  const snapshot = await db.collection(collectionName).get();
  for (const docSnapshot of snapshot.docs) {
    await deleter.delete(docSnapshot.ref);
  }
  return {
    collection: collectionName,
    deletedDocumentCount: snapshot.size,
  };
}

async function deleteGuestbooksCollection(db: Firestore, deleter: BatchDeleter) {
  const guestbookSnapshot = await db.collection('guestbooks').get();
  let deletedGuestbookCount = 0;
  let deletedCommentCount = 0;

  for (const guestbookDoc of guestbookSnapshot.docs) {
    const commentSnapshot = await guestbookDoc.ref.collection('comments').get();
    for (const commentDoc of commentSnapshot.docs) {
      await deleter.delete(commentDoc.ref);
      deletedCommentCount += 1;
    }

    await deleter.delete(guestbookDoc.ref);
    deletedGuestbookCount += 1;
  }

  return {
    collection: 'guestbooks',
    deletedDocumentCount: deletedGuestbookCount,
    deletedNestedDocumentCount: deletedCommentCount,
  };
}

async function executeDeletion(db: Firestore) {
  const deleter = new BatchDeleter(db);
  const results: Array<Record<string, unknown>> = [];

  for (const collectionName of DELETE_ORDER) {
    if (collectionName === 'guestbooks') {
      results.push(await deleteGuestbooksCollection(db, deleter));
      continue;
    }

    results.push(await deleteFlatCollection(db, collectionName, deleter));
  }

  await deleter.flush();

  return {
    deletedCollections: results,
    committedBatches: deleter.getCommittedBatches(),
  };
}

async function main() {
  loadLocalEnvironment();
  const mode = parseMode(process.argv);
  const db = initializeFirebaseAdmin();

  if (mode === 'analyze') {
    const stats = await analyzeLegacyCollections(db);
    console.log(
      JSON.stringify(
        {
          mode,
          generatedAt: new Date().toISOString(),
          collections: stats,
        },
        null,
        2
      )
    );
    return;
  }

  const before = await analyzeLegacyCollections(db);
  const deletion = await executeDeletion(db);
  const after = await analyzeLegacyCollections(db);

  console.log(
    JSON.stringify(
      {
        mode,
        generatedAt: new Date().toISOString(),
        before,
        ...deletion,
        after,
      },
      null,
      2
    )
  );
}

void main();
