import { NextResponse } from 'next/server';

import { DEFAULT_INVITATION_THEME } from '@/lib/invitationThemes';
import {
  authorizeMobileClientEditorRequest,
  buildMobileInvitationLinks,
  getServerGuestbookCommentsByPageSlug,
} from '@/server/clientEditorMobileApi';
import { getServerEditableInvitationPageConfig } from '@/server/invitationPageServerService';
import { getServerPageTicketCount } from '@/server/pageTicketServerService';

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

  const page = await getServerEditableInvitationPageConfig(pageSlug);
  if (!page) {
    return NextResponse.json({ error: 'Invitation page was not found.' }, { status: 404 });
  }

  const [comments, ticketCount] = await Promise.all([
    getServerGuestbookCommentsByPageSlug(pageSlug),
    getServerPageTicketCount(pageSlug),
  ]);

  return NextResponse.json({
    page,
    comments,
    links: buildMobileInvitationLinks(
      new URL(request.url).origin,
      pageSlug,
      page.defaultTheme ?? DEFAULT_INVITATION_THEME
    ),
    ticketCount,
  });
}
