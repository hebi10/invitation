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
  setServerInvitationPageVariantAvailability,
} from '@/server/invitationPageServerService';
import {
  adjustServerPageTicketCount,
  transferServerPageTicketCount,
} from '@/server/pageTicketServerService';
import { getAuthorizedClientEditorSession } from '@/server/clientEditorSessionAuth';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

function readTheme(value: unknown) {
  return isInvitationThemeKey(value) ? value : undefined;
}

function readVariantKey(value: unknown) {
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
        variantKey?: unknown;
        available?: unknown;
        amount?: unknown;
        targetPageSlug?: unknown;
        targetToken?: unknown;
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

      const trustedConfig = buildTrustedPageConfig(body.config, pageSlug);
      if (!trustedConfig) {
        return NextResponse.json(
          {
            error: 'Invitation page slug does not match the authenticated session.',
          },
          { status: 400 }
        );
      }

      await saveServerInvitationPageConfig(trustedConfig, {
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

    if (action === 'setVariantAvailability') {
      const variantKey = readVariantKey(body?.variantKey);

      if (!variantKey || typeof body?.available !== 'boolean') {
        return NextResponse.json(
          { error: 'Variant key and availability are required.' },
          { status: 400 }
        );
      }

      await setServerInvitationPageVariantAvailability(pageSlug, variantKey, body.available, {
        published: body?.published === true,
        defaultTheme,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'adjustTicketCount') {
      if (typeof body?.amount !== 'number' || !Number.isFinite(body.amount)) {
        return NextResponse.json(
          { error: 'Ticket count adjustment amount is required.' },
          { status: 400 }
        );
      }

      const ticketCount = await adjustServerPageTicketCount(pageSlug, body.amount);
      return NextResponse.json({ success: true, ticketCount });
    }

    if (action === 'transferTicketCount') {
      const targetPageSlug =
        typeof body?.targetPageSlug === 'string' ? body.targetPageSlug.trim() : '';
      const targetToken =
        typeof body?.targetToken === 'string' ? body.targetToken.trim() : '';

      if (!targetPageSlug || !targetToken) {
        return NextResponse.json(
          { error: 'Target page slug and session are required.' },
          { status: 400 }
        );
      }

      if (typeof body?.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
        return NextResponse.json(
          { error: 'Transfer ticket count amount is required.' },
          { status: 400 }
        );
      }

      if (targetPageSlug === pageSlug) {
        return NextResponse.json(
          { error: 'Target page slug must be different.' },
          { status: 400 }
        );
      }

      const targetSession = await getAuthorizedClientEditorSession(targetPageSlug, targetToken);
      if (!targetSession) {
        return NextResponse.json(
          { error: 'Target invitation page authorization failed.' },
          { status: 401 }
        );
      }

      const ticketTransfer = await transferServerPageTicketCount(
        pageSlug,
        targetPageSlug,
        body.amount
      );

      return NextResponse.json({
        success: true,
        ticketCount: ticketTransfer.sourceTicketCount,
        targetTicketCount: ticketTransfer.targetTicketCount,
        targetPageSlug,
      });
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
