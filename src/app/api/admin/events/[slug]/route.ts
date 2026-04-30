import { NextResponse } from 'next/server';

import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { deleteAdminEventBySlug } from '@/server/adminEventDeletionService';
import { getServerInvitationPageBySlug } from '@/server/invitationPageServerService';

function toAdminApiErrorResponse(error: unknown) {
  if (error instanceof AdminApiAuthError) {
    return toSafeHttpErrorResponse(error);
  }

  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await verifyAdminRequest(request);

    const { slug } = await context.params;
    const normalizedPageSlug = normalizeInvitationPageSlugInput(slug);

    if (!normalizedPageSlug) {
      return NextResponse.json(
        { error: '청첩장 주소가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const page = await getServerInvitationPageBySlug(normalizedPageSlug, {
      includePrivate: true,
      sampleFallbackMode: 'when-firestore-unavailable',
    });

    if (!page) {
      return NextResponse.json(
        { error: '청첩장 페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      page,
    });
  } catch (error) {
    const authErrorResponse = toAdminApiErrorResponse(error);
    if (authErrorResponse) {
      return authErrorResponse;
    }

    console.error('[api/admin/events/[slug]] failed to load event', error);
    return NextResponse.json(
      { error: '청첩장 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await verifyAdminRequest(request);

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
    const authErrorResponse = toAdminApiErrorResponse(error);
    if (authErrorResponse) {
      return authErrorResponse;
    }

    console.error('[api/admin/events/[slug]] failed to delete event', error);
    return NextResponse.json(
      { error: '청첩장 전체 삭제에 실패했습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
