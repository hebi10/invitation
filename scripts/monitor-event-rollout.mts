#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

type MonitorOptions = {
  hours: number;
  latestLimit: number;
};

type MonitorEntry = {
  id: string;
  createdAt: string | null;
  domain: string | null;
  lookupType: string | null;
  lookupValue: string | null;
  reason: string | null;
  mismatchFields: string[];
  attemptCount: number | null;
  operation: string | null;
  sourceOfTruth: string | null;
};

const COLLECTIONS = [
  'event-write-through-failures',
  'event-read-fallback-logs',
  'event-rollout-mismatches',
] as const;

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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

function parseArgs(argv: string[]): MonitorOptions {
  const options: MonitorOptions = {
    hours: 24,
    latestLimit: 5,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (key === '--hours' && value) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.hours = parsed;
      }
      index += 1;
      continue;
    }

    if (key === '--latest' && value) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.latestLimit = parsed;
      }
      index += 1;
    }
  }

  return options;
}

function summarizeByKey(entries: MonitorEntry[], key: keyof MonitorEntry) {
  return Object.entries(
    entries.reduce<Record<string, number>>((acc, entry) => {
      const value = entry[key];
      const bucket =
        typeof value === 'string' && value.trim()
          ? value.trim()
          : Array.isArray(value) && value.length > 0
            ? value.join(',')
            : 'unknown';
      acc[bucket] = (acc[bucket] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => ({ name, count }));
}

function mapEntry(docSnapshot: QueryDocumentSnapshot): MonitorEntry {
  const data = docSnapshot.data() ?? {};
  return {
    id: docSnapshot.id,
    createdAt: toDate(data.createdAt)?.toISOString() ?? null,
    domain: readString(data.domain),
    lookupType: readString(data.lookupType),
    lookupValue: readString(data.lookupValue),
    reason: readString(data.reason),
    mismatchFields: Array.isArray(data.mismatchFields)
      ? data.mismatchFields.flatMap((value) => (typeof value === 'string' ? [value] : []))
      : [],
    attemptCount: readNumber(data.attemptCount),
    operation: readString(data.operation),
    sourceOfTruth: readString(data.sourceOfTruth),
  };
}

async function main() {
  loadLocalEnvironment();
  const options = parseArgs(process.argv);
  const db = initializeFirebaseAdmin();

  const cutoff = new Date(Date.now() - options.hours * 60 * 60 * 1000);
  const result: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    lookbackHours: options.hours,
    latestLimit: options.latestLimit,
    collections: {},
    ok: true,
  };

  for (const collectionName of COLLECTIONS) {
    const snapshot = await db
      .collection(collectionName)
      .where('createdAt', '>=', cutoff)
      .orderBy('createdAt', 'desc')
      .get();

    const entries = snapshot.docs.map(mapEntry);
    result.collections = {
      ...(result.collections as Record<string, unknown>),
      [collectionName]: {
        count: entries.length,
        byDomain: summarizeByKey(entries, 'domain'),
        latest: entries.slice(0, options.latestLimit),
      },
    };
  }

  console.log(JSON.stringify(result, null, 2));
}

void main();
