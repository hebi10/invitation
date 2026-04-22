import { NextResponse } from 'next/server';

import { createClientEditorSessionValue } from '@/server/clientEditorSession';
import {
  loadMobileClientEditorPageSnapshot,
  MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
} from '@/server/clientEditorMobileApi';
import { verifyServerClientPassword } from '@/server/clientPasswordServerService';
import {
  applyScopedInMemoryRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_LOGIN_RATE_LIMIT = {
  limit: 10,
  windowMs: 5 * 60 * 1000,
} as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { pageSlug?: unknown; password?: unknown }
      | null;
    const pageSlug =
      typeof body?.pageSlug === 'string' ? body.pageSlug.trim() : '';
    const password =
      typeof body?.password === 'string' ? body.password.trim() : '';

    if (!pageSlug || !password) {
      return NextResponse.json(
        { error: 'Page slug and password are required.' },
        { status: 400 }
      );
    }

    const rateLimitResult = applyScopedInMemoryRateLimit({
      request,
      scope: 'mobile-client-editor-login',
      keyParts: [pageSlug],
      ...MOBILE_CLIENT_EDITOR_LOGIN_RATE_LIMIT,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const verification = await verifyServerClientPassword(pageSlug, password);
    if (!verification.verified || !verification.record) {
      return NextResponse.json(
        { error: 'Invalid page password.' },
        {
          status: 401,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { value, expiresAt } = createClientEditorSessionValue(
      {
        pageSlug,
        passwordVersion: verification.record.passwordVersion,
      },
      {
        ttlSeconds: MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
      }
    );
    const snapshot = await loadMobileClientEditorPageSnapshot(
      new URL(request.url).origin,
      pageSlug
    );

    return NextResponse.json(
      {
        authenticated: true,
        permissions: snapshot.permissions,
        session: {
          token: value,
          expiresAt,
          pageSlug,
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
    console.error('[mobile/client-editor/login] failed to create mobile session', error);
    return NextResponse.json(
      { error: 'Failed to verify the page password.' },
      { status: 500 }
    );
  }
}
