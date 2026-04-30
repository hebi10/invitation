import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AuthorizedMobileClientEditorAccess } from './clientEditorMobileApi';
import { firestoreEventAuditLogRepository } from './repositories/eventAuditLogRepository';

export const MOBILE_CLIENT_EDITOR_HIGH_RISK_TOKEN_HEADER =
  'x-mobile-client-editor-high-risk-token';
export const MOBILE_CLIENT_EDITOR_HIGH_RISK_TTL_SECONDS = 10 * 60;

export type MobileClientEditorHighRiskAction =
  | 'verifyHighRisk'
  | 'publishInvitation'
  | 'managePaidFeature'
  | 'transferTickets'
  | 'issueLinkToken'
  | 'exchangeLinkToken'
  | 'revokeLinkToken'
  | 'changePassword'
  | 'reissueLinkToken'
  | 'deleteInvitation'
  | 'bulkDeleteGuestbook';

export interface MobileClientEditorHighRiskSessionPayload {
  pageSlug: string;
  passwordVersion: number;
  sessionId?: string | null;
  deviceIdHash?: string | null;
  allowedActions?: MobileClientEditorHighRiskAction[];
  verifiedAt: number;
  expiresAt: number;
}

interface MobileClientEditorAuditLogInput {
  action: MobileClientEditorHighRiskAction;
  result: 'success' | 'failure';
  pageSlug: string;
  sessionPageSlug?: string | null;
  reason?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getHighRiskSecret() {
  const configuredSecret = process.env.MOBILE_CLIENT_EDITOR_HIGH_RISK_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  const sharedSecret = process.env.CLIENT_EDITOR_SESSION_SECRET?.trim();
  if (sharedSecret) {
    return sharedSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'local-mobile-client-editor-high-risk-secret';
  }

  return null;
}

function signPayload(payloadBase64: string) {
  const secret = getHighRiskSecret();
  if (!secret) {
    throw new Error('MOBILE_CLIENT_EDITOR_HIGH_RISK_SECRET is required in production.');
  }

  return createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

export function createMobileClientEditorHighRiskSessionValue(
  payload: Omit<MobileClientEditorHighRiskSessionPayload, 'verifiedAt' | 'expiresAt'>,
  options: { ttlSeconds?: number } = {}
) {
  const ttlSeconds =
    typeof options.ttlSeconds === 'number' &&
    Number.isFinite(options.ttlSeconds) &&
    options.ttlSeconds > 0
      ? Math.floor(options.ttlSeconds)
      : MOBILE_CLIENT_EDITOR_HIGH_RISK_TTL_SECONDS;
  const verifiedAt = Math.floor(Date.now() / 1000);
  const sessionPayload: MobileClientEditorHighRiskSessionPayload = {
    ...payload,
    verifiedAt,
    expiresAt: verifiedAt + ttlSeconds,
  };
  const payloadBase64 = base64UrlEncode(JSON.stringify(sessionPayload));
  const signature = signPayload(payloadBase64);

  return {
    value: `${payloadBase64}.${signature}`,
    expiresAt: sessionPayload.expiresAt,
    verifiedAt: sessionPayload.verifiedAt,
  };
}

export function verifyMobileClientEditorHighRiskSessionValue(
  sessionValue: string | undefined | null
) {
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
    const parsed = JSON.parse(
      base64UrlDecode(payloadBase64)
    ) as MobileClientEditorHighRiskSessionPayload;
    if (
      typeof parsed.pageSlug !== 'string' ||
      !parsed.pageSlug.trim() ||
      typeof parsed.passwordVersion !== 'number' ||
      !Number.isFinite(parsed.passwordVersion) ||
      typeof parsed.verifiedAt !== 'number' ||
      !Number.isFinite(parsed.verifiedAt) ||
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
        sessionId:
          typeof parsed.sessionId === 'string' && parsed.sessionId.trim()
            ? parsed.sessionId.trim()
            : null,
        deviceIdHash:
          typeof parsed.deviceIdHash === 'string' && parsed.deviceIdHash.trim()
            ? parsed.deviceIdHash.trim()
            : null,
        allowedActions: Array.isArray(parsed.allowedActions)
          ? parsed.allowedActions.filter(
              (action): action is MobileClientEditorHighRiskAction =>
                typeof action === 'string'
            )
          : undefined,
        verifiedAt: parsed.verifiedAt,
        expiresAt: parsed.expiresAt,
      } satisfies MobileClientEditorHighRiskSessionPayload;
  } catch {
    return null;
  }
}

export function readMobileClientEditorHighRiskToken(request: Request) {
  return request.headers.get(MOBILE_CLIENT_EDITOR_HIGH_RISK_TOKEN_HEADER)?.trim() || null;
}

export function authorizeMobileClientEditorHighRiskToken(
  access: AuthorizedMobileClientEditorAccess,
  highRiskToken: string | undefined | null,
  action?: MobileClientEditorHighRiskAction | null
) {
  const highRiskSession = verifyMobileClientEditorHighRiskSessionValue(highRiskToken);
  if (!highRiskSession) {
    return null;
  }

  if (
    highRiskSession.pageSlug !== access.session.pageSlug ||
      highRiskSession.passwordVersion !== access.session.passwordVersion
  ) {
    return null;
  }

  if (
    highRiskSession.sessionId &&
    highRiskSession.sessionId !== access.session.sessionId
  ) {
    return null;
  }

  if (
    highRiskSession.deviceIdHash &&
    highRiskSession.deviceIdHash !== access.session.deviceIdHash
  ) {
    return null;
  }

  if (
    action &&
    Array.isArray(highRiskSession.allowedActions) &&
    !highRiskSession.allowedActions.includes(action)
  ) {
    return null;
  }

  return highRiskSession;
}

export async function writeMobileClientEditorAuditLog({
  action,
  result,
  pageSlug,
  sessionPageSlug,
  reason,
  metadata,
}: MobileClientEditorAuditLogInput) {
  try {
    await firestoreEventAuditLogRepository.write({
      action,
      result,
      pageSlug,
      sessionPageSlug: sessionPageSlug ?? null,
      reason,
      metadata,
    });
  } catch (error) {
    console.error('[mobile-client-editor/high-risk] failed to write audit log', error);
  }
}
