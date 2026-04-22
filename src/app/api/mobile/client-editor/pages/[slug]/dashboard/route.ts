import { NextResponse } from 'next/server';

import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import {
  authorizeMobileClientEditorRequest,
  buildMissingMobileClientEditorPermissionError,
  getServerGuestbookCommentCountByPageSlug,
  buildMobileInvitationLinks,
  getServerGuestbookCommentsByPageSlug,
  hasMobileClientEditorPermission,
} from '@/server/clientEditorMobileApi';
import {
  getServerEditableInvitationPageConfig,
  getServerInvitationPageDisplayPeriodSummary,
} from '@/server/invitationPageServerService';
import { getServerPageTicketCount } from '@/server/pageTicketServerService';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();
  const { searchParams } = new URL(request.url);
  const includeComments = searchParams.get('includeComments') === 'true';

  const session = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const requiredPermissions = includeComments
    ? (['canViewDashboard', 'canManageGuestbook'] as const)
    : ('canViewDashboard' as const);
  if (!hasMobileClientEditorPermission(session.permissions, requiredPermissions)) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError(requiredPermissions) },
      { status: 403 }
    );
  }

  const page = await getServerEditableInvitationPageConfig(pageSlug);
  if (!page) {
    return NextResponse.json({ error: 'Invitation page was not found.' }, { status: 404 });
  }

  const [displayPeriod, guestbookPayload, ticketCount] = await Promise.all([
    getServerInvitationPageDisplayPeriodSummary(pageSlug),
    includeComments
      ? getServerGuestbookCommentsByPageSlug(pageSlug).then((comments) => ({
          comments,
          commentCount: comments.length,
          commentsIncluded: true,
        }))
      : getServerGuestbookCommentCountByPageSlug(pageSlug).then((commentCount) => ({
          comments: [],
          commentCount,
          commentsIncluded: false,
        })),
    getServerPageTicketCount(pageSlug),
  ]);

  return NextResponse.json({
    page,
    comments: guestbookPayload.comments,
    commentCount: guestbookPayload.commentCount,
    commentsIncluded: guestbookPayload.commentsIncluded,
    permissions: session.permissions,
    links: buildMobileInvitationLinks(
      new URL(request.url).origin,
      pageSlug,
      page.defaultTheme ?? DEFAULT_INVITATION_THEME
    ),
    ticketCount,
    displayPeriod: {
      enabled: displayPeriod.enabled,
      startDate: displayPeriod.startDate?.toISOString() ?? null,
      endDate: displayPeriod.endDate?.toISOString() ?? null,
    },
  });
}
