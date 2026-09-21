import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

type PreviewGrant = { pageSlug: string; sessionId: string; expiresAt: number };
const PURPOSE = 'mobile-invitation-preview:v1:';

function sign(payload: string) {
  const secret = process.env.CLIENT_EDITOR_SESSION_SECRET?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'local-client-editor-session-secret' : '');
  if (!secret) throw new Error('CLIENT_EDITOR_SESSION_SECRET is required in production.');
  return createHmac('sha256', secret).update(PURPOSE + payload).digest('base64url');
}

export function issueInvitationPreviewToken(pageSlug: string, sessionId: string, sessionExpiresAt: number) {
  const expiresAt = Math.min(sessionExpiresAt, Math.floor(Date.now() / 1000) + 15 * 60);
  const payload = Buffer.from(JSON.stringify({ pageSlug, sessionId, expiresAt })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

export function verifyInvitationPreviewToken(token: string, pageSlug: string): PreviewGrant | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    const grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PreviewGrant;
    return grant.pageSlug === pageSlug && typeof grant.sessionId === 'string' && grant.sessionId &&
      Number.isFinite(grant.expiresAt) && grant.expiresAt > Math.floor(Date.now() / 1000) ? grant : null;
  } catch {
    return null;
  }
}
