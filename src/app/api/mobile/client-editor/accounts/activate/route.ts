import { NextResponse } from 'next/server';
import { canOpenOwnedWeddingPage } from '@/lib/mobileAccountOwnership';

import { CLIENT_EDITOR_OWNER_SESSION_VERSION } from '@/server/clientEditorSession';
import {
  buildMobileInvitationLinks,
  createServerBackedMobileClientEditorSession,
  MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
  readMobileClientEditorDeviceId,
  resolveMobileClientEditorPermissions,
} from '@/server/clientEditorMobileApi';
import { CustomerApiAuthError, verifyCustomerRequest } from '@/server/customerApiAuth';
import { getCustomerEventOwnershipSnapshot } from '@/server/customerEventsService';
import { GENERIC_SERVER_ERROR_MESSAGE } from '@/server/apiErrorResponse';
import {
  getServerEditableInvitationPageConfig,
  getServerInvitationPageDisplayPeriodSummary,
} from '@/server/invitationPageServerService';
import { getServerPageTicketCount } from '@/server/pageTicketServerService';
import { applyScopedRateLimit, buildRateLimitHeaders } from '@/server/requestRateLimit';

const RESTORE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 } as const;

export async function POST(request: Request) {
  try {
    const customer = await verifyCustomerRequest(request, { requireVerified: true });
    const data = (await request.json().catch(() => null)) as { pageSlug?: unknown } | null;
    const slug = typeof data?.pageSlug === 'string' ? data.pageSlug.trim() : '';

    if (!slug || slug.length > 100 || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug)) {
      return NextResponse.json({ error: '청첩장 주소 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const rateLimit = await applyScopedRateLimit({
      request,
      scope: 'mobile-client-editor-account-restore',
      keyParts: [customer.uid, slug],
      ...RESTORE_LIMIT,
    });
    const headers = buildRateLimitHeaders(rateLimit);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429, headers });
    }

    const ownership = await getCustomerEventOwnershipSnapshot(customer.uid, slug);
    if (!ownership.summary || !canOpenOwnedWeddingPage(ownership, slug)) {
      return NextResponse.json({ error: '이 계정으로 관리할 수 있는 청첩장이 아닙니다.' }, { status: 403, headers });
    }

    const [page, displayPeriod, ticketCount] = await Promise.all([
      getServerEditableInvitationPageConfig(slug),
      getServerInvitationPageDisplayPeriodSummary(slug),
      getServerPageTicketCount(slug),
    ]);
    if (!page) {
      return NextResponse.json({ error: '청첩장 정보를 찾지 못했습니다.' }, { status: 404, headers });
    }

    const { value, expiresAt, scopes } = await createServerBackedMobileClientEditorSession({
      pageSlug: slug,
      passwordVersion: CLIENT_EDITOR_OWNER_SESSION_VERSION,
      ownerUid: customer.uid,
      eventId: ownership.summary.eventId,
      deviceId: readMobileClientEditorDeviceId(request),
      issuedVia: 'account-restore',
      ttlSeconds: MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS,
    });

    return NextResponse.json({
      permissions: resolveMobileClientEditorPermissions({ scopes }),
      session: { token: value, expiresAt, pageSlug: slug },
      dashboardPage: page,
      page: {
        slug: page.slug,
        displayName: page.config.displayName,
        published: page.published,
        productTier: page.productTier,
        defaultTheme: page.defaultTheme,
        features: page.features,
        ticketCount,
        displayPeriod: {
          enabled: displayPeriod.enabled,
          startDate: displayPeriod.startDate?.toISOString() ?? null,
          endDate: displayPeriod.endDate?.toISOString() ?? null,
        },
      },
      links: buildMobileInvitationLinks(new URL(request.url).origin, slug, page.defaultTheme),
    }, { headers });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[mobile/account-restore] failed to activate owned invitation', error);
    return NextResponse.json({ error: GENERIC_SERVER_ERROR_MESSAGE }, { status: 500 });
  }
}
