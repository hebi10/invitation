import { NextResponse } from 'next/server';

import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import {
  authorizeMobileClientEditorRequest,
  buildMobileInvitationLinks,
} from '@/server/clientEditorMobileApi';
import { getServerEditableInvitationPageConfig } from '@/server/invitationPageServerService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageSlug = searchParams.get('pageSlug')?.trim() ?? '';

  if (!pageSlug) {
    return NextResponse.json(
      { authenticated: false, pageSlug: null },
      { status: 400 }
    );
  }

  const session = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!session) {
    return NextResponse.json({ authenticated: false, pageSlug: null });
  }

  const config = await getServerEditableInvitationPageConfig(pageSlug);
  const links = buildMobileInvitationLinks(
    new URL(request.url).origin,
    pageSlug,
    config?.defaultTheme ?? DEFAULT_INVITATION_THEME
  );

  return NextResponse.json({
    authenticated: true,
    pageSlug: session.session.pageSlug,
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
}
