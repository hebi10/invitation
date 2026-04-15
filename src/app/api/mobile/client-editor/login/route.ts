import { NextResponse } from 'next/server';

import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import { createClientEditorSessionValue } from '@/server/clientEditorSession';
import {
  buildMobileInvitationLinks,
  MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
} from '@/server/clientEditorMobileApi';
import { verifyServerClientPassword } from '@/server/clientPasswordServerService';
import { getServerEditableInvitationPageConfig } from '@/server/invitationPageServerService';

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

    const verification = await verifyServerClientPassword(pageSlug, password);
    if (!verification.verified || !verification.record) {
      return NextResponse.json({ error: 'Invalid page password.' }, { status: 401 });
    }

    const config = await getServerEditableInvitationPageConfig(pageSlug);
    const { value, expiresAt } = createClientEditorSessionValue(
      {
        pageSlug,
        passwordVersion: verification.record.passwordVersion,
      },
      {
        ttlSeconds: MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
      }
    );
    const links = buildMobileInvitationLinks(
      new URL(request.url).origin,
      pageSlug,
      config?.defaultTheme ?? DEFAULT_INVITATION_THEME
    );

    return NextResponse.json({
      authenticated: true,
      session: {
        token: value,
        expiresAt,
        pageSlug,
      },
      dashboardPage: config,
      page: config
        ? {
            slug: config.slug,
            displayName: config.config.displayName,
            published: config.published,
            productTier: config.productTier,
            defaultTheme: config.defaultTheme,
            features: config.features,
          }
        : null,
      links,
    });
  } catch (error) {
    console.error('[mobile/client-editor/login] failed to create mobile session', error);
    return NextResponse.json(
      { error: 'Failed to verify the page password.' },
      { status: 500 }
    );
  }
}
