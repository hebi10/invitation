import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { CLIENT_EDITOR_SESSION_COOKIE } from '@/server/clientEditorSession';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_EDITOR_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  return NextResponse.json({ success: true });
}
