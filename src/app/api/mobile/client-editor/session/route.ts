import { NextResponse } from 'next/server';

import {
  authorizeMobileClientEditorRequest,
  buildMissingMobileClientEditorPermissionError,
  hasMobileClientEditorPermission,
  loadMobileClientEditorPageSnapshot,
} from '@/server/clientEditorMobileApi';

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

  if (!hasMobileClientEditorPermission(session.permissions, 'canViewDashboard')) {
    return NextResponse.json(
      {
        authenticated: false,
        pageSlug: null,
        error: buildMissingMobileClientEditorPermissionError('canViewDashboard'),
      },
      { status: 403 }
    );
  }

  const snapshot = await loadMobileClientEditorPageSnapshot(
    new URL(request.url).origin,
    pageSlug
  );

  return NextResponse.json({
    authenticated: true,
    pageSlug: session.session.pageSlug,
    permissions: snapshot.permissions,
    dashboardPage: snapshot.dashboardPage,
    page: snapshot.page,
    links: snapshot.links,
  });
}
