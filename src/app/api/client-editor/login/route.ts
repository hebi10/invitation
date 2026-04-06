import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  CLIENT_EDITOR_SESSION_COOKIE,
  createClientEditorSessionValue,
} from '@/server/clientEditorSession';
import { verifyServerClientPassword } from '@/server/clientPasswordServerService';

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
        { error: '페이지 주소와 비밀번호를 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const verification = await verifyServerClientPassword(pageSlug, password);
    if (!verification.verified || !verification.record) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const { value, expiresAt } = createClientEditorSessionValue({
      pageSlug,
      passwordVersion: verification.record.passwordVersion,
    });

    const cookieStore = await cookies();
    cookieStore.set(CLIENT_EDITOR_SESSION_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expiresAt * 1000),
    });

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('[client-editor/login] failed to create editor session', error);
    return NextResponse.json(
      { error: '페이지 비밀번호를 확인하지 못했습니다.' },
      { status: 500 }
    );
  }
}
