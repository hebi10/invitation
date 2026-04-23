import { NextResponse } from 'next/server';

import { setServerClientPassword } from '@/server/clientPasswordServerService';
import { getServerAuth } from '@/server/firebaseAdmin';
import { resolveStoredEventBySlug } from '@/server/repositories/eventRepository';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return NextResponse.json(
        { error: '로그인이 필요합니다. 다시 로그인해 주세요.' },
        { status: 401 }
      );
    }

    const serverAuth = getServerAuth();
    if (!serverAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin Auth를 초기화하지 못했습니다.' },
        { status: 500 }
      );
    }

    const decodedToken = await serverAuth.verifyIdToken(idToken);
    const body = (await request.json().catch(() => null)) as
      | { pageSlug?: unknown; password?: unknown }
      | null;
    const pageSlug =
      typeof body?.pageSlug === 'string' ? body.pageSlug.trim() : '';
    const password =
      typeof body?.password === 'string' ? body.password.trim() : '';

    if (!pageSlug || !password) {
      return NextResponse.json(
        { error: '청첩장 주소와 비밀번호를 모두 입력해 주세요.' },
        { status: 400 }
      );
    }

    const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
    if (!resolvedEvent) {
      return NextResponse.json(
        { error: '해당 청첩장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (resolvedEvent.summary.ownerUid !== decodedToken.uid) {
      return NextResponse.json(
        { error: '로그인한 계정에 연결된 청첩장만 비밀번호를 변경할 수 있습니다.' },
        { status: 403 }
      );
    }

    const savedPassword = await setServerClientPassword(pageSlug, password);

    return NextResponse.json({
      success: true,
      pageSlug: resolvedEvent.summary.slug,
      passwordVersion: savedPassword.passwordVersion,
    });
  } catch (error) {
    console.error('[customer/events/password] failed to update event password', error);
    return NextResponse.json(
      { error: '청첩장 비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
