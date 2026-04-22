import { NextResponse } from 'next/server';

import { createClientEditorSessionValue } from '@/server/clientEditorSession';
import {
  loadMobileClientEditorPageSnapshot,
  MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
} from '@/server/clientEditorMobileApi';
import { exchangeMobileClientEditorLinkToken } from '@/server/mobileClientEditorLinkToken';
import { writeMobileClientEditorAuditLog } from '@/server/mobileClientEditorHighRisk';
import {
  applyScopedInMemoryRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_LINK_TOKEN_EXCHANGE_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
} as const;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: unknown }
    | null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return NextResponse.json(
      { error: 'Invitation link token is required.' },
      { status: 400 }
    );
  }

  const rateLimitResult = applyScopedInMemoryRateLimit({
    request,
    scope: 'mobile-client-editor-link-token-exchange',
    ...MOBILE_CLIENT_EDITOR_LINK_TOKEN_EXCHANGE_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many invitation link attempts. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    const exchangeResult = await exchangeMobileClientEditorLinkToken(token);

    if (exchangeResult.status !== 'ok') {
      const pageSlug = exchangeResult.record?.pageSlug ?? null;
      await writeMobileClientEditorAuditLog({
        action: 'exchangeLinkToken',
        result: 'failure',
        pageSlug: pageSlug ?? 'unknown-page',
        sessionPageSlug: pageSlug,
        reason: exchangeResult.status,
      });

      const errorMap: Record<typeof exchangeResult.status, string> = {
        invalid: 'Invitation link token is invalid.',
        used: 'Invitation link token was already used.',
        expired: 'Invitation link token has expired.',
        revoked: 'Invitation link token has been revoked.',
      };

      return NextResponse.json(
        { error: errorMap[exchangeResult.status] },
        {
          status: 401,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { record } = exchangeResult;
    const { value, expiresAt } = createClientEditorSessionValue(
      {
        pageSlug: record.pageSlug,
        passwordVersion: record.passwordVersion,
      },
      {
        ttlSeconds: MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
      }
    );
    const snapshot = await loadMobileClientEditorPageSnapshot(
      new URL(request.url).origin,
      record.pageSlug
    );

    await writeMobileClientEditorAuditLog({
      action: 'exchangeLinkToken',
      result: 'success',
      pageSlug: record.pageSlug,
      sessionPageSlug: record.pageSlug,
      metadata: {
        purpose: record.purpose,
      },
    });

    return NextResponse.json(
      {
        authenticated: true,
        permissions: snapshot.permissions,
        session: {
          token: value,
          expiresAt,
          pageSlug: record.pageSlug,
        },
        dashboardPage: snapshot.dashboardPage,
        page: snapshot.page,
        links: snapshot.links,
      },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error(
      '[mobile/client-editor/link-tokens/exchange] failed to exchange link token',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to exchange the invitation link token.',
      },
      {
        status: 500,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }
}
