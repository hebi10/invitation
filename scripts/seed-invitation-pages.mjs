#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PAGE_CONFIG_COLLECTION = 'invitation-page-configs';
const PAGE_REGISTRY_COLLECTION = 'invitation-page-registry';

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

function buildConfigPayload(seed, existingConfig) {
  const now = new Date();

  return {
    ...cloneSeed(seed),
    seedSourceSlug: seed.slug,
    createdAt: existingConfig?.createdAt ?? now,
    updatedAt: now,
  };
}

function buildRegistryPayload(seed, existingRegistry) {
  const now = new Date();

  return {
    pageSlug: seed.slug,
    published: existingRegistry?.published ?? true,
    hasCustomConfig: true,
    createdAt: existingRegistry?.createdAt ?? now,
    updatedAt: now,
  };
}

async function collectSeedStatus(db, seeds) {
  const statuses = await Promise.all(
    seeds.map(async (seed) => {
      const [configSnapshot, registrySnapshot] = await Promise.all([
        db.collection(PAGE_CONFIG_COLLECTION).doc(seed.slug).get(),
        db.collection(PAGE_REGISTRY_COLLECTION).doc(seed.slug).get(),
      ]);

      return {
        seed,
        hasConfig: configSnapshot.exists,
        hasRegistry: registrySnapshot.exists,
        configData: configSnapshot.exists ? configSnapshot.data() : null,
        registryData: registrySnapshot.exists ? registrySnapshot.data() : null,
      };
    })
  );

  return statuses;
}

async function analyze(db, seeds) {
  const statuses = await collectSeedStatus(db, seeds);
  const missingConfig = statuses.filter((entry) => !entry.hasConfig).map((entry) => entry.seed.slug);
  const missingRegistry = statuses.filter((entry) => !entry.hasRegistry).map((entry) => entry.seed.slug);

  console.log(
    JSON.stringify(
      {
        seedCount: seeds.length,
        configCount: statuses.filter((entry) => entry.hasConfig).length,
        registryCount: statuses.filter((entry) => entry.hasRegistry).length,
        missingConfigCount: missingConfig.length,
        missingRegistryCount: missingRegistry.length,
        missingConfig,
        missingRegistry,
      },
      null,
      2
    )
  );
}

async function seedPages(db, seeds, execute, overwrite) {
  const statuses = await collectSeedStatus(db, seeds);
  let configWrites = 0;
  let registryWrites = 0;
  let skipped = 0;

  for (const entry of statuses) {
    const shouldWriteConfig = overwrite || !entry.hasConfig;
    const shouldWriteRegistry = overwrite || !entry.hasRegistry;

    if (!shouldWriteConfig && !shouldWriteRegistry) {
      skipped += 1;
      continue;
    }

    if (execute) {
      if (shouldWriteConfig) {
        await db
          .collection(PAGE_CONFIG_COLLECTION)
          .doc(entry.seed.slug)
          .set(buildConfigPayload(entry.seed, entry.configData), { merge: true });
      }

      if (shouldWriteRegistry) {
        await db
          .collection(PAGE_REGISTRY_COLLECTION)
          .doc(entry.seed.slug)
          .set(buildRegistryPayload(entry.seed, entry.registryData), { merge: true });
      }
    }

    if (shouldWriteConfig) {
      configWrites += 1;
    }

    if (shouldWriteRegistry) {
      registryWrites += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? 'execute' : 'dry-run',
        overwrite,
        configWrites,
        registryWrites,
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
    .filter((entry) => !entry.hasConfig || !entry.hasRegistry)
    .map((entry) => ({
      slug: entry.seed.slug,
      missingConfig: !entry.hasConfig,
      missingRegistry: !entry.hasRegistry,
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
