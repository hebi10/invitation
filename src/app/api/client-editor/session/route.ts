import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { CLIENT_EDITOR_SESSION_COOKIE } from '@/server/clientEditorSession';
import { getAuthorizedClientEditorSession } from '@/server/clientEditorSessionAuth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageSlug = searchParams.get('pageSlug')?.trim() ?? '';

  if (!pageSlug) {
    return NextResponse.json(
      { authenticated: false, pageSlug: null },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const session = await getAuthorizedClientEditorSession(
    pageSlug,
    cookieStore.get(CLIENT_EDITOR_SESSION_COOKIE)?.value
  );

  return NextResponse.json({
    authenticated: Boolean(session),
    pageSlug: session?.session.pageSlug ?? null,
  });
}
