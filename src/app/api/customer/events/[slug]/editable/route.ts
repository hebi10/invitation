import { NextResponse } from 'next/server';

import { isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  GENERIC_SERVER_ERROR_MESSAGE,
  toSafeHttpErrorResponse,
} from '@/server/apiErrorResponse';
import {
  CustomerApiAuthError,
  verifyCustomerUid,
} from '@/server/customerApiAuth';
import {
  getCustomerEditableInvitationPageSnapshot,
  saveCustomerEditableInvitationPageConfig,
} from '@/server/customerEventsService';
import type { InvitationPageSeed } from '@/types/invitationPage';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    const { slug } = await context.params;
    const snapshot = await getCustomerEditableInvitationPageSnapshot(ownerUid, slug);

    return NextResponse.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/customer/events/editable] failed to load editable event', error);
    return NextResponse.json(
      { error: '청첩장 편집 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    const { slug } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | {
          config?: unknown;
          published?: unknown;
          defaultTheme?: unknown;
        }
      | null;

    if (!body?.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
      return NextResponse.json(
        { error: '저장할 청첩장 정보가 없습니다.' },
        { status: 400 }
      );
    }

    const snapshot = await saveCustomerEditableInvitationPageConfig(ownerUid, slug, {
      config: body.config as InvitationPageSeed,
      published: typeof body.published === 'boolean' ? body.published : undefined,
      defaultTheme: isInvitationThemeKey(body.defaultTheme)
        ? body.defaultTheme
        : undefined,
    });

    return NextResponse.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/customer/events/editable] failed to save editable event', error);
    return NextResponse.json(
      { error: GENERIC_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}
