import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const CLIENT_EDITOR_SESSION_COOKIE = 'client-editor-session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export interface ClientEditorSessionPayload {
  pageSlug: string;
  passwordVersion: number;
  expiresAt: number;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSessionSecret() {
  const configuredSecret = process.env.CLIENT_EDITOR_SESSION_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'local-client-editor-session-secret';
  }

  return null;
}

function signPayload(payloadBase64: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('CLIENT_EDITOR_SESSION_SECRET is required in production.');
  }

  return createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

export function createClientEditorSessionValue(
  payload: Omit<ClientEditorSessionPayload, 'expiresAt'>
) {
  const sessionPayload: ClientEditorSessionPayload = {
    ...payload,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadBase64 = base64UrlEncode(JSON.stringify(sessionPayload));
  const signature = signPayload(payloadBase64);

  return {
    value: `${payloadBase64}.${signature}`,
    expiresAt: sessionPayload.expiresAt,
  };
}

export function verifyClientEditorSessionValue(sessionValue: string | undefined | null) {
  if (!sessionValue) {
    return null;
  }

  const [payloadBase64, signature] = sessionValue.split('.');
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64);
  const provided = Buffer.from(signature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadBase64)) as ClientEditorSessionPayload;
    if (
      typeof parsed.pageSlug !== 'string' ||
      !parsed.pageSlug.trim() ||
      typeof parsed.passwordVersion !== 'number' ||
      !Number.isFinite(parsed.passwordVersion) ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      return null;
    }

    if (parsed.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      pageSlug: parsed.pageSlug.trim(),
      passwordVersion: parsed.passwordVersion,
      expiresAt: parsed.expiresAt,
    } satisfies ClientEditorSessionPayload;
  } catch {
    return null;
  }
}
