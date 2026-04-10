#!/usr/bin/env node

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const OUTPUT_PATH = path.join(process.cwd(), 'src', 'generated', 'memory-page-metadata.json');
const COLLECTION_NAME = 'memory-pages';
const STRICT_SYNC =
  process.argv.includes('--strict') || process.env.MEMORY_METADATA_SYNC_STRICT === 'true';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeVisibility(value) {
  return value === 'public' || value === 'unlisted' ? value : 'private';
}

function createSnapshotPayload(source, pages) {
  return {
    generatedAt: new Date().toISOString(),
    source,
    pages,
  };
}

async function writeSnapshot(payload) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function outputExists() {
  try {
    await fs.access(OUTPUT_PATH);
    return true;
  } catch {
    return false;
  }
}

function resolveApplicationDefaultCredentialsPath() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (!credentialsPath) {
    return null;
  }

  return path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);
}

function sanitizeApplicationDefaultCredentials() {
  const resolvedPath = resolveApplicationDefaultCredentialsPath();

  if (!resolvedPath) {
    return;
  }

  if (fsSync.existsSync(resolvedPath)) {
    return;
  }

  console.warn(
    `[memory-metadata] Ignoring missing GOOGLE_APPLICATION_CREDENTIALS path: ${resolvedPath}`
  );
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  sanitizeApplicationDefaultCredentials();

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

async function syncMemoryPageMetadata() {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE !== 'true') {
    await writeSnapshot(createSnapshotPayload('firebase-disabled', {}));
    console.log('[memory-metadata] Firebase disabled. Wrote empty metadata snapshot.');
    return;
  }

  const db = initializeFirebaseAdmin();
  const snapshot = await db.collection(COLLECTION_NAME).get();
  const pages = {};

  for (const doc of snapshot.docs) {
    const data = doc.data();

    pages[doc.id] = {
      pageSlug: doc.id,
      enabled: data.enabled === true,
      visibility: normalizeVisibility(data.visibility),
      title: normalizeString(data.title),
      introMessage: normalizeString(data.introMessage),
      seoTitle: normalizeString(data.seoTitle),
      seoDescription: normalizeString(data.seoDescription),
      seoNoIndex: data.seoNoIndex === true,
      heroImageUrl: normalizeString(data.heroImage?.url),
      heroThumbnailUrl: normalizeString(
        data.heroThumbnailUrl || data.heroImage?.thumbnailUrl || data.heroImage?.url
      ),
    };
  }

  await writeSnapshot(createSnapshotPayload('firestore', pages));
  console.log(`[memory-metadata] Synced ${snapshot.size} memory-page metadata records.`);
}

async function handleFailure(error) {
  if (STRICT_SYNC) {
    throw error;
  }

  if (await outputExists()) {
    console.warn('[memory-metadata] Sync failed. Keeping existing metadata snapshot.');
    console.warn(error);
    return;
  }

  await writeSnapshot(createSnapshotPayload('unavailable', {}));
  console.warn('[memory-metadata] Sync failed. Wrote empty metadata snapshot fallback.');
  console.warn(error);
}

syncMemoryPageMetadata().catch(async (error) => {
  try {
    await handleFailure(error);
  } catch (strictError) {
    console.error(strictError);
    process.exitCode = 1;
  }
});
