import { NextResponse } from 'next/server';

import { isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  authorizeMobileClientEditorRequest,
} from '@/server/clientEditorMobileApi';
import {
  getServerEditableInvitationPageConfig,
  restoreServerInvitationPageConfig,
  saveServerInvitationPageConfig,
  setServerInvitationPagePublished,
} from '@/server/invitationPageServerService';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

function readTheme(value: unknown) {
  return isInvitationThemeKey(value) ? value : undefined;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const session = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const config = await getServerEditableInvitationPageConfig(pageSlug);
  if (!config) {
    return NextResponse.json({ error: 'Invitation page was not found.' }, { status: 404 });
  }

  return NextResponse.json(config);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const session = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
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

  try {
    if (action === 'save') {
      if (!body?.config || typeof body.config !== 'object') {
        return NextResponse.json(
          { error: 'Invitation page config is required.' },
          { status: 400 }
        );
      }

      await saveServerInvitationPageConfig(body.config, {
        published: body.published === true,
        defaultTheme,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'restore') {
      await restoreServerInvitationPageConfig(pageSlug, {
        published: body?.published === true,
        defaultTheme,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'setPublished') {
      if (typeof body?.published !== 'boolean') {
        return NextResponse.json(
          { error: 'Published state is required.' },
          { status: 400 }
        );
      }

      await setServerInvitationPagePublished(pageSlug, body.published, {
        defaultTheme,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    console.error('[mobile/client-editor/pages] failed to process request', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to update the invitation page.',
      },
      { status: 500 }
    );
  }
}
