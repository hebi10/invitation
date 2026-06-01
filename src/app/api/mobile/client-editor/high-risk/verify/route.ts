import { NextResponse } from 'next/server';

import {
  authorizeMobileClientEditorRequest,
  type AuthorizedMobileClientEditorAccess,
} from '@/server/clientEditorMobileApi';
import { getServerAuth } from '@/server/firebaseAdmin';
import {
  createMobileClientEditorHighRiskSessionValue,
  type MobileClientEditorHighRiskAction,
  writeMobileClientEditorAuditLog,
} from '@/server/mobileClientEditorHighRisk';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_HIGH_RISK_VERIFY_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;
const MOBILE_CLIENT_EDITOR_HIGH_RISK_RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000;

const MOBILE_CLIENT_EDITOR_HIGH_RISK_ACTIONS: readonly MobileClientEditorHighRiskAction[] = [
  'publishInvitation',
  'managePaidFeature',
  'transferTickets',
  'issueLinkToken',
  'revokeLinkToken',
] as const;

function readTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecentTimestamp(value: number) {
  return Date.now() - value <= MOBILE_CLIENT_EDITOR_HIGH_RISK_RECENT_AUTH_WINDOW_MS;
}

function isRecentlyIssuedMobileSession(
  access: AuthorizedMobileClientEditorAccess
) {
  const createdAt = access.mobileSession?.createdAt?.getTime();
  return (
    typeof createdAt === 'number' &&
    Number.isFinite(createdAt) &&
    isRecentTimestamp(createdAt)
  );
}

async function verifyRecentCustomerAuth(
  access: AuthorizedMobileClientEditorAccess,
  customerIdToken: string
) {
  const ownerUid =
    access.session.ownerUid?.trim() || access.mobileSession?.ownerUid?.trim() || '';
  if (!ownerUid) {
    return true;
  }

  if (!customerIdToken) {
    return false;
  }

  const serverAuth = getServerAuth();
  if (!serverAuth) {
    return false;
  }

  try {
    const decoded = await serverAuth.verifyIdToken(customerIdToken);
    const authTimeSeconds =
      typeof decoded.auth_time === 'number' && Number.isFinite(decoded.auth_time)
        ? decoded.auth_time
        : 0;

    return decoded.uid === ownerUid && isRecentTimestamp(authTimeSeconds * 1000);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { pageSlug?: unknown; customerIdToken?: unknown }
    | null;
  const pageSlug = readTrimmedString(body?.pageSlug);
  const customerIdToken = readTrimmedString(body?.customerIdToken);

  if (!pageSlug) {
    return NextResponse.json(
      { error: 'Page slug is required.' },
      { status: 400 }
    );
  }

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-client-editor-high-risk-verify',
    keyParts: [pageSlug],
    ...MOBILE_CLIENT_EDITOR_HIGH_RISK_VERIFY_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    await writeMobileClientEditorAuditLog({
      action: 'verifyHighRisk',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason: 'rate_limited',
    });

    return NextResponse.json(
      { error: 'Too many high-risk verification attempts. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const hasRecentCustomerAuth = await verifyRecentCustomerAuth(access, customerIdToken);
  const hasRecentDeviceBoundSession =
    Boolean(access.session.deviceIdHash) && isRecentlyIssuedMobileSession(access);

  if (!hasRecentCustomerAuth && !hasRecentDeviceBoundSession) {
    await writeMobileClientEditorAuditLog({
      action: 'verifyHighRisk',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason: 'recent_auth_required',
    });

    return NextResponse.json(
      { error: 'Recent customer authentication is required.' },
      {
        status: 401,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const highRiskSession = createMobileClientEditorHighRiskSessionValue({
    pageSlug,
    passwordVersion: access.session.passwordVersion,
    sessionId: access.session.sessionId ?? null,
    deviceIdHash: access.session.deviceIdHash ?? null,
    allowedActions: [...MOBILE_CLIENT_EDITOR_HIGH_RISK_ACTIONS],
  });

  await writeMobileClientEditorAuditLog({
    action: 'verifyHighRisk',
    result: 'success',
    pageSlug,
    sessionPageSlug: access.session.pageSlug,
  });

  return NextResponse.json(
    {
      verified: true,
      session: {
        token: highRiskSession.value,
        pageSlug,
        verifiedAt: highRiskSession.verifiedAt * 1000,
        expiresAt: highRiskSession.expiresAt * 1000,
      },
    },
    {
      headers: buildRateLimitHeaders(rateLimitResult),
    }
  );
}
