import { NextResponse } from 'next/server';

import { isInvitationVersionError, requireInvitationContentVersion } from '@/lib/invitationContentVersion';
import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { isInvitationThemeKey } from '@/lib/invitationThemes';
import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { toInvitationPublicationErrorResponse, toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  requestAdminEventDeletion,
  retryAdminEventDeletion,
} from '@/server/adminEventDeletionService';
import {
  getServerEditableInvitationPageConfig,
  getServerInvitationPageBySlug,
  saveServerInvitationPageConfig,
  setServerInvitationPagePublished,
} from '@/server/invitationPageServerService';
import type { InvitationPageSeed } from '@/types/invitationPage';

type DeleteEventRequestBody = {
  retry?: unknown;
};

type UpdateEventRequestBody = {
  published?: unknown;
  defaultTheme?: unknown;
  expectedVersion?: unknown;
  expectedReviewRequestedAt?: unknown;
  config?: unknown;
};

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await verifyAdminRequest(request);
    const slug = normalizeInvitationPageSlugInput((await context.params).slug);
    const body = (await request.json().catch(() => null)) as UpdateEventRequestBody | null;
    if (!slug || typeof body?.published !== 'boolean') {
      return NextResponse.json({ error: '청첩장 주소와 공개 설정을 확인해 주세요.' }, { status: 400 });
    }
    const defaultTheme = isInvitationThemeKey(body.defaultTheme) ? body.defaultTheme : undefined;

    if (body.config !== undefined) {
      const config = body.config as Partial<InvitationPageSeed> | null;
      if (!config || typeof config !== 'object' || Array.isArray(config) ||
          normalizeInvitationPageSlugInput(config.slug) !== slug ||
          body.expectedReviewRequestedAt !== undefined) {
        return NextResponse.json({ error: '저장할 청첩장 정보를 확인해 주세요.' }, { status: 400 });
      }
      await saveServerInvitationPageConfig({ ...config, slug } as InvitationPageSeed, {
        expectedVersion: requireInvitationContentVersion(body.expectedVersion),
        published: body.published,
        requireSeparatePublicationReview: true,
        defaultTheme,
      });
      const editableConfig = await getServerEditableInvitationPageConfig(slug);
      return NextResponse.json({ success: true, editableConfig });
    }

    const expectedVersion = body.published || body.expectedVersion !== undefined
      ? requireInvitationContentVersion(body.expectedVersion)
      : undefined;
    const expectedReviewRequestedAt = body.expectedReviewRequestedAt;
    if (expectedReviewRequestedAt !== undefined &&
        (typeof expectedReviewRequestedAt !== 'string' || !body.published || expectedVersion === undefined)) {
      return NextResponse.json({ error: '검토 요청 정보를 확인해 주세요.' }, { status: 400 });
    }
    await setServerInvitationPagePublished(slug, body.published, {
      defaultTheme,
      expectedVersion,
      expectedReviewRequestedAt,
      requireReviewMatch: true,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isInvitationVersionError(error)) {
      return NextResponse.json({
        error: error.message, code: error.code,
        ...('currentVersion' in error ? { currentVersion: error.currentVersion } : {}),
      }, { status: error.status });
    }
    const publicationError = toInvitationPublicationErrorResponse(error);
    if (publicationError) return publicationError;
    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return toSafeHttpErrorResponse(error as Error & { status: number });
    }
    console.error('[api/admin/events/[slug]] failed to update publication', error);
    return NextResponse.json({ error: '공개 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const adminToken = await verifyAdminRequest(request);
    const body = (await request.json().catch(() => null)) as DeleteEventRequestBody | null;

    const { slug } = await context.params;
    const normalizedPageSlug = normalizeInvitationPageSlugInput(slug);

    if (!normalizedPageSlug) {
      return NextResponse.json(
        { error: '삭제할 청첩장 주소가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const deletionResult = body?.retry === true
      ? await retryAdminEventDeletion(normalizedPageSlug, adminToken.uid)
      : await requestAdminEventDeletion(normalizedPageSlug, adminToken.uid);
    if (!deletionResult) {
      return NextResponse.json(
        { error: '삭제할 청첩장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...deletionResult,
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
