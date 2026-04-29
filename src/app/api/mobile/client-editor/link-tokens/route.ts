import { NextResponse } from 'next/server';

import {
  authorizeMobileClientEditorRequest,
  buildMissingMobileClientEditorPermissionError,
  hasMobileClientEditorPermission,
} from '@/server/clientEditorMobileApi';
import {
  issueMobileClientEditorLinkToken,
  revokeActiveMobileClientEditorLinkTokens,
  type MobileClientEditorLinkTokenPurpose,
} from '@/server/mobileClientEditorLinkToken';
import {
  authorizeMobileClientEditorHighRiskToken,
  readMobileClientEditorHighRiskToken,
  writeMobileClientEditorAuditLog,
} from '@/server/mobileClientEditorHighRisk';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_LINK_TOKEN_RATE_LIMIT = {
  limit: 5,
  windowMs: 60 * 60 * 1000,
} as const;

function readPageSlug(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readPurpose(value: unknown) {
  return (value === 'mobile-login' ? value : 'mobile-login') as MobileClientEditorLinkTokenPurpose;
}

function buildHighRiskRequiredResponse() {
  return NextResponse.json(
    { error: 'Recent authentication is required for this action.' },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        pageSlug?: unknown;
        purpose?: unknown;
      }
    | null;
  const pageSlug = readPageSlug(body?.pageSlug);
  const purpose = readPurpose(body?.purpose);

  if (!pageSlug) {
    return NextResponse.json({ error: 'Page slug is required.' }, { status: 400 });
  }

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!hasMobileClientEditorPermission(access.permissions, 'canIssueLinkToken')) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError('canIssueLinkToken') },
      { status: 403 }
    );
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-client-editor-link-token-issue',
    keyParts: [pageSlug, purpose],
    ...MOBILE_CLIENT_EDITOR_LINK_TOKEN_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    await writeMobileClientEditorAuditLog({
      action: 'issueLinkToken',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason: 'rate_limited',
      metadata: { purpose },
    });

    return NextResponse.json(
      { error: 'Too many link token requests. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  if (
    !authorizeMobileClientEditorHighRiskToken(
      access,
      readMobileClientEditorHighRiskToken(request)
    )
  ) {
    await writeMobileClientEditorAuditLog({
      action: 'issueLinkToken',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason: 'recent_auth_required',
      metadata: { purpose },
    });

    const response = buildHighRiskRequiredResponse();
    Object.entries(buildRateLimitHeaders(rateLimitResult)).forEach(([key, value]) =>
      response.headers.set(key, value)
    );
    return response;
  }

  try {
      const issuedToken = await issueMobileClientEditorLinkToken({
        pageSlug,
        purpose,
        passwordVersion: access.session.passwordVersion,
      issuedBy: access.session.pageSlug,
      issuedByType: 'mobile-owner-session',
      origin: new URL(request.url).origin,
    });

    await writeMobileClientEditorAuditLog({
      action: 'issueLinkToken',
      result: 'success',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      metadata: {
        purpose,
        revokedExistingCount: issuedToken.revokedExistingCount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        purpose,
        expiresAt: issuedToken.record.expiresAt.toISOString(),
        deepLinkUrl: issuedToken.deepLinkUrl,
        webFallbackUrl: issuedToken.webFallbackUrl,
        revokedExistingCount: issuedToken.revokedExistingCount,
      },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[mobile/client-editor/link-tokens] failed to issue link token', error);
    await writeMobileClientEditorAuditLog({
      action: 'issueLinkToken',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason:
        error instanceof Error && error.message.trim()
          ? error.message
          : 'unknown_error',
      metadata: { purpose },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to issue the invitation link token.',
      },
      {
        status: 500,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageSlug = readPageSlug(searchParams.get('pageSlug'));
  const purpose = readPurpose(searchParams.get('purpose'));

  if (!pageSlug) {
    return NextResponse.json({ error: 'Page slug is required.' }, { status: 400 });
  }

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!hasMobileClientEditorPermission(access.permissions, 'canIssueLinkToken')) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError('canIssueLinkToken') },
      { status: 403 }
    );
  }

  if (
    !authorizeMobileClientEditorHighRiskToken(
      access,
      readMobileClientEditorHighRiskToken(request)
    )
  ) {
    await writeMobileClientEditorAuditLog({
      action: 'revokeLinkToken',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason: 'recent_auth_required',
      metadata: { purpose },
    });
    return buildHighRiskRequiredResponse();
  }

  try {
    const revokedCount = await revokeActiveMobileClientEditorLinkTokens(pageSlug, purpose);
    await writeMobileClientEditorAuditLog({
      action: 'revokeLinkToken',
      result: 'success',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      metadata: { purpose, revokedCount },
    });

    return NextResponse.json({
      success: true,
      purpose,
      revokedCount,
    });
  } catch (error) {
    console.error('[mobile/client-editor/link-tokens] failed to revoke link token', error);
    await writeMobileClientEditorAuditLog({
      action: 'revokeLinkToken',
      result: 'failure',
      pageSlug,
      sessionPageSlug: access.session.pageSlug,
      reason:
        error instanceof Error && error.message.trim()
          ? error.message
          : 'unknown_error',
      metadata: { purpose },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to revoke the invitation link token.',
      },
      { status: 500 }
    );
  }
}
