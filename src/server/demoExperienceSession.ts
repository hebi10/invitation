import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { getKstDateKey, getNextKstMidnight } from '@/lib/demoExperienceTime';
import type { DemoExperienceRole } from '@/types/demoExperience';

export const DEMO_EXPERIENCE_SESSION_COOKIE = 'demo-experience-session';

export interface DemoExperienceSessionPayload {
  sessionId: string;
  role: DemoExperienceRole;
  dateKey: string;
  expiresAt: number;
}

type DemoExperienceSessionOptions = {
  now?: Date;
  secret?: string;
};

function getSessionSecret(override?: string) {
  const explicit = override?.trim();
  if (explicit) {
    return explicit;
  }

  const configured = process.env.DEMO_EXPERIENCE_SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'local-demo-experience-session-secret';
  }

  throw new Error('DEMO_EXPERIENCE_SESSION_SECRET is required in production.');
}

function signPayload(payloadBase64: string, secret: string) {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

function readSignedPayload(
  value: string | null | undefined,
  options: DemoExperienceSessionOptions = {}
) {
  if (!value) {
    return null;
  }

  const [payloadBase64, signature] = value.split('.');
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64, getSessionSecret(options.secret));
  const provided = Buffer.from(signature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8')
    ) as Partial<DemoExperienceSessionPayload>;
    if (
      typeof parsed.sessionId !== 'string' ||
      !parsed.sessionId.trim() ||
      (parsed.role !== 'admin' && parsed.role !== 'customer') ||
      typeof parsed.dateKey !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.dateKey) ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      return null;
    }

    return {
      sessionId: parsed.sessionId.trim(),
      role: parsed.role,
      dateKey: parsed.dateKey,
      expiresAt: parsed.expiresAt,
    } satisfies DemoExperienceSessionPayload;
  } catch {
    return null;
  }
}

export function createDemoExperienceSessionValue(
  payload: Omit<DemoExperienceSessionPayload, 'expiresAt'>,
  options: DemoExperienceSessionOptions = {}
) {
  const now = options.now ?? new Date();
  const sessionPayload: DemoExperienceSessionPayload = {
    ...payload,
    expiresAt: Math.floor(getNextKstMidnight(now).getTime() / 1000),
  };
  const payloadBase64 = Buffer.from(JSON.stringify(sessionPayload), 'utf8').toString(
    'base64url'
  );

  return {
    value: `${payloadBase64}.${signPayload(payloadBase64, getSessionSecret(options.secret))}`,
    expiresAt: sessionPayload.expiresAt,
  };
}

export function verifyDemoExperienceSessionValue(
  value: string | null | undefined,
  options: DemoExperienceSessionOptions = {}
) {
  const payload = readSignedPayload(value, options);
  if (!payload) {
    return null;
  }

  const now = options.now ?? new Date();
  if (
    payload.expiresAt <= Math.floor(now.getTime() / 1000) ||
    payload.dateKey !== getKstDateKey(now)
  ) {
    return null;
  }

  return payload;
}

export function readSignedDemoExperienceSessionValue(
  value: string | null | undefined,
  options: DemoExperienceSessionOptions = {}
) {
  return readSignedPayload(value, options);
}

export function createDemoExperienceSessionId() {
  return randomUUID();
}

