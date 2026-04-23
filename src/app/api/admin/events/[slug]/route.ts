import { NextResponse } from 'next/server';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { deleteAdminEventBySlug } from '@/server/adminEventDeletionService';
import { isServerAdminUserEnabled } from '@/server/adminUserServerService';
import { getServerAuth } from '@/server/firebaseAdmin';

async function authenticateAdminRequest(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!idToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: '로그인 토큰이 없습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      ),
    };
  }

  const serverAuth = getServerAuth();
  if (!serverAuth) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Firebase Admin Auth를 초기화하지 못했습니다.' },
        { status: 500 }
      ),
    };
  }

  const decodedToken = await serverAuth.verifyIdToken(idToken);
  const isAdmin = await isServerAdminUserEnabled(decodedToken.uid);

  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: '관리자 권한이 없습니다.' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    decodedToken,
  };
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { slug } = await context.params;
    const normalizedPageSlug = normalizeInvitationPageSlugInput(slug);

    if (!normalizedPageSlug) {
      return NextResponse.json(
        { error: '삭제할 청첩장 주소가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const deletedEvent = await deleteAdminEventBySlug(normalizedPageSlug);
    if (!deletedEvent) {
      return NextResponse.json(
        { error: '삭제할 청첩장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...deletedEvent,
    });
  } catch (error) {
    console.error('[api/admin/events/[slug]] failed to delete event', error);
    return NextResponse.json(
      { error: '청첩장 전체 삭제에 실패했습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
