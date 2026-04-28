import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getServerEditableInvitationPageConfig,
  restoreServerInvitationPageConfig,
  saveServerInvitationPageConfig,
  setServerInvitationPagePublished,
} from '@/server/invitationPageServerService';
import { CLIENT_EDITOR_SESSION_COOKIE } from '@/server/clientEditorSession';
import { getAuthorizedClientEditorSession } from '@/server/clientEditorSessionAuth';
import { isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';
import {
  isWebClientEditorAdminOnly,
  WEB_CLIENT_EDITOR_ADMIN_ONLY_MESSAGE,
} from '@/server/webClientEditorPolicy';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

const CLIENT_EDITOR_MUTATION_RATE_LIMIT = {
  limit: 30,
  windowMs: 60 * 1000,
} as const;

async function authorizePageSession(pageSlug: string) {
  const cookieStore = await cookies();
  return getAuthorizedClientEditorSession(
    pageSlug,
    cookieStore.get(CLIENT_EDITOR_SESSION_COOKIE)?.value
  );
}

function readTheme(value: unknown) {
  return isInvitationThemeKey(value) ? value : undefined;
}

function buildTrustedPageConfig(
  config: InvitationPageSeed,
  pageSlug: string
): InvitationPageSeed | null {
  const requestedSlug =
    typeof config.slug === 'string' ? config.slug.trim() : '';

  if (requestedSlug && requestedSlug !== pageSlug) {
    return null;
  }

  return {
    ...config,
    slug: pageSlug,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (isWebClientEditorAdminOnly()) {
    return NextResponse.json(
      { error: WEB_CLIENT_EDITOR_ADMIN_ONLY_MESSAGE },
      { status: 403 }
    );
  }

  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const session = await authorizePageSession(pageSlug);
  if (!session) {
    return NextResponse.json({ error: '편집 권한이 없습니다. 다시 로그인해 주세요.' }, { status: 401 });
  }

  const config = await getServerEditableInvitationPageConfig(pageSlug);
  if (!config) {
    return NextResponse.json({ error: '청첩장 페이지를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(config);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (isWebClientEditorAdminOnly()) {
    return NextResponse.json(
      { error: WEB_CLIENT_EDITOR_ADMIN_ONLY_MESSAGE },
      { status: 403 }
    );
  }

  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const session = await authorizePageSession(pageSlug);
  if (!session) {
    return NextResponse.json({ error: '편집 권한이 없습니다. 다시 로그인해 주세요.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: unknown;
        config?: InvitationPageSeed;
        published?: unknown;
        defaultTheme?: unknown;
      }
    | null;

  const action = typeof body?.action === 'string' ? body.action : '';
  const defaultTheme = readTheme(body?.defaultTheme) as InvitationThemeKey | undefined;
  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'client-editor-mutation',
    keyParts: [pageSlug, action || 'unknown'],
    ...CLIENT_EDITOR_MUTATION_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    if (action === 'save') {
      if (!body?.config || typeof body.config !== 'object') {
        return NextResponse.json(
          { error: '저장할 청첩장 설정 정보가 필요합니다.' },
          { status: 400 }
        );
      }

      const trustedConfig = buildTrustedPageConfig(body.config, pageSlug);
      if (!trustedConfig) {
        return NextResponse.json(
          {
            error:
              'Invitation page slug does not match the authenticated session.',
          },
          { status: 400 }
        );
      }

      await saveServerInvitationPageConfig(trustedConfig, {
        published: body.published === true,
        defaultTheme,
      });
      return NextResponse.json(
        { success: true },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'restore') {
      await restoreServerInvitationPageConfig(pageSlug, {
        published: body?.published === true,
        defaultTheme,
      });
      return NextResponse.json(
        { success: true },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'setPublished') {
      if (typeof body?.published !== 'boolean') {
        return NextResponse.json(
          { error: '공개 상태 값이 필요합니다.' },
          { status: 400 }
        );
      }

      await setServerInvitationPagePublished(pageSlug, body.published, {
        defaultTheme,
      });
      return NextResponse.json(
        { success: true },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      { error: '지원하지 않는 요청입니다.' },
      {
        status: 400,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[client-editor/pages] failed to process request', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : '청첩장 정보를 업데이트하지 못했습니다.',
      },
      { status: 500 }
    );
  }
}
