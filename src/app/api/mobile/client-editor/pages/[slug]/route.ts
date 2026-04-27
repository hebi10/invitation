import { NextResponse } from 'next/server';

import { isInvitationThemeKey } from '@/lib/invitationThemes';
import {
  authorizeMobileClientEditorRequest,
  authorizeMobileClientEditorToken,
  buildMissingMobileClientEditorPermissionError,
  hasMobileClientEditorPermission,
  type AuthorizedMobileClientEditorAccess,
} from '@/server/clientEditorMobileApi';
import {
  extendServerInvitationPageDisplayPeriod,
  getServerEditableInvitationPageConfig,
  restoreServerInvitationPageConfig,
  saveServerInvitationPageConfig,
  setServerInvitationPageDisplayPeriod,
  setServerInvitationPagePublished,
  setServerInvitationPageVariantAvailability,
} from '@/server/invitationPageServerService';
import {
  adjustServerPageTicketCount,
  transferServerPageTicketCount,
} from '@/server/pageTicketServerService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';
import {
  authorizeMobileClientEditorHighRiskToken,
  readMobileClientEditorHighRiskToken,
  writeMobileClientEditorAuditLog,
  type MobileClientEditorHighRiskAction,
} from '@/server/mobileClientEditorHighRisk';
import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';
import type { MobileClientEditorPermissionKey } from '@/types/mobileClientEditor';

const MOBILE_CLIENT_EDITOR_MUTATION_RATE_LIMIT = {
  limit: 30,
  windowMs: 60 * 1000,
} as const;

const PAGE_ACTION_REQUIRED_PERMISSIONS: Record<string, MobileClientEditorPermissionKey> = {
  save: 'canEditInvitation',
  restore: 'canEditInvitation',
  setPublished: 'canManagePublication',
  setVariantAvailability: 'canManagePublication',
  adjustTicketCount: 'canManageTickets',
  extendDisplayPeriod: 'canManageDisplayPeriod',
  setDisplayPeriod: 'canManageDisplayPeriod',
  transferTicketCount: 'canManageTickets',
};

type MobileClientEditorPageActionBody = {
  action?: unknown;
  config?: InvitationPageSeed;
  published?: unknown;
  defaultTheme?: unknown;
  variantKey?: unknown;
  available?: unknown;
  amount?: unknown;
  months?: unknown;
  enabled?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  targetPageSlug?: unknown;
  targetToken?: unknown;
};

type ResolvedHighRiskRequirement = {
  action: MobileClientEditorHighRiskAction;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function readTheme(value: unknown) {
  return isInvitationThemeKey(value) ? value : undefined;
}

function readVariantKey(value: unknown) {
  return isInvitationThemeKey(value) ? value : undefined;
}

function readDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildTrustedPageConfig(
  config: InvitationPageSeed,
  pageSlug: string
): InvitationPageSeed | null {
  const requestedSlug =
    typeof config.slug === 'string' ? config.slug.trim() : '';

  if (requestedSlug && requestedSlug !== pageSlug) {
    return null;
  }

  return {
    ...config,
    slug: pageSlug,
  };
}

async function resolveHighRiskRequirement(
  pageSlug: string,
  action: string,
  body: MobileClientEditorPageActionBody | null
): Promise<ResolvedHighRiskRequirement | null> {
  if (action === 'adjustTicketCount') {
    return {
      action: 'managePaidFeature',
      metadata: {
        sourceAction: action,
        amount:
          typeof body?.amount === 'number' && Number.isFinite(body.amount)
            ? body.amount
            : null,
      },
    };
  }

  if (action === 'extendDisplayPeriod') {
    return {
      action: 'managePaidFeature',
      metadata: {
        sourceAction: action,
        months:
          typeof body?.months === 'number' && Number.isFinite(body.months)
            ? Math.max(1, Math.trunc(body.months))
            : 1,
      },
    };
  }

  if (action === 'setDisplayPeriod') {
    return {
      action: 'managePaidFeature',
      metadata: {
        sourceAction: action,
        enabled: body?.enabled === true,
      },
    };
  }

  if (action === 'transferTicketCount') {
    return {
      action: 'transferTickets',
      metadata: {
        sourceAction: action,
        amount:
          typeof body?.amount === 'number' && Number.isFinite(body.amount)
            ? body.amount
            : null,
        targetPageSlug:
          typeof body?.targetPageSlug === 'string' ? body.targetPageSlug.trim() : null,
      },
    };
  }

  if (action === 'setVariantAvailability') {
    if (body?.available !== true) {
      return null;
    }

    return {
      action: 'managePaidFeature',
      metadata: {
        sourceAction: action,
        variantKey: typeof body?.variantKey === 'string' ? body.variantKey : null,
      },
    };
  }

  if (action !== 'save' && action !== 'restore' && action !== 'setPublished') {
    return null;
  }

  if (body?.published !== true) {
    return null;
  }

  const currentConfig = await getServerEditableInvitationPageConfig(pageSlug);
  if (currentConfig?.published === true) {
    return null;
  }

  return {
    action: 'publishInvitation',
    metadata: {
      sourceAction: action,
    },
  };
}

function buildHighRiskRequiredResponse() {
  return NextResponse.json(
    { error: 'Recent authentication is required for this action.' },
    { status: 403 }
  );
}

async function writeHighRiskActionAuditLog(
  access: AuthorizedMobileClientEditorAccess,
  pageSlug: string,
  requirement: ResolvedHighRiskRequirement | null,
  result: 'success' | 'failure',
  reason?: string | null,
  metadata?: Record<string, string | number | boolean | null | undefined>
) {
  if (!requirement) {
    return;
  }

  await writeMobileClientEditorAuditLog({
    action: requirement.action,
    result,
    pageSlug,
    sessionPageSlug: access.session.pageSlug,
    reason,
    metadata: {
      ...requirement.metadata,
      ...metadata,
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!hasMobileClientEditorPermission(access.permissions, 'canEditInvitation')) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError('canEditInvitation') },
      { status: 403 }
    );
  }

  const config = await getServerEditableInvitationPageConfig(pageSlug);
  if (!config) {
    return NextResponse.json({ error: 'Invitation page was not found.' }, { status: 404 });
  }

  return NextResponse.json(config);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as MobileClientEditorPageActionBody | null;

  const action = typeof body?.action === 'string' ? body.action : '';
  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-client-editor-mutation',
    keyParts: [pageSlug, action || 'unknown'],
    ...MOBILE_CLIENT_EDITOR_MUTATION_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const requiredPermission = PAGE_ACTION_REQUIRED_PERMISSIONS[action];
  if (!requiredPermission) {
    return NextResponse.json(
      { error: 'Unsupported action.' },
      {
        status: 400,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  if (!hasMobileClientEditorPermission(access.permissions, requiredPermission)) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError(requiredPermission) },
      {
        status: 403,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const highRiskRequirement = await resolveHighRiskRequirement(pageSlug, action, body);
  if (highRiskRequirement) {
    const highRiskAccess = authorizeMobileClientEditorHighRiskToken(
      access,
      readMobileClientEditorHighRiskToken(request)
    );

    if (!highRiskAccess) {
      await writeHighRiskActionAuditLog(
        access,
        pageSlug,
        highRiskRequirement,
        'failure',
        'recent_auth_required'
      );

      const response = buildHighRiskRequiredResponse();
      Object.entries(buildRateLimitHeaders(rateLimitResult)).forEach(([key, value]) =>
        response.headers.set(key, value)
      );
      return response;
    }
  }

  const defaultTheme = readTheme(body?.defaultTheme) as InvitationThemeKey | undefined;

  try {
    if (action === 'save') {
      if (!body?.config || typeof body.config !== 'object') {
        return NextResponse.json(
          { error: 'Invitation page config is required.' },
          { status: 400 }
        );
      }

      const trustedConfig = buildTrustedPageConfig(body.config, pageSlug);
      if (!trustedConfig) {
        return NextResponse.json(
          {
            error: 'Invitation page slug does not match the authenticated session.',
          },
          { status: 400 }
        );
      }

      await saveServerInvitationPageConfig(trustedConfig, {
        published: body.published === true,
        defaultTheme,
      });
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success');
      return NextResponse.json(
        { success: true },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'restore') {
      await restoreServerInvitationPageConfig(pageSlug, {
        published: body?.published === true,
        defaultTheme,
      });
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success');
      return NextResponse.json(
        { success: true },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'setPublished') {
      if (typeof body?.published !== 'boolean') {
        return NextResponse.json(
          { error: 'Published state is required.' },
          { status: 400 }
        );
      }

      await setServerInvitationPagePublished(pageSlug, body.published, {
        defaultTheme,
      });
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success');
      return NextResponse.json(
        { success: true },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'setVariantAvailability') {
      const variantKey = readVariantKey(body?.variantKey);

      if (!variantKey || typeof body?.available !== 'boolean') {
        return NextResponse.json(
          { error: 'Variant key and availability are required.' },
          { status: 400 }
        );
      }

      await setServerInvitationPageVariantAvailability(pageSlug, variantKey, body.available, {
        published: body?.published === true,
        defaultTheme,
      });
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success', null, {
        variantKey,
        available: body.available,
      });
      return NextResponse.json(
        { success: true },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'adjustTicketCount') {
      if (typeof body?.amount !== 'number' || !Number.isFinite(body.amount)) {
        return NextResponse.json(
          { error: 'Ticket count adjustment amount is required.' },
          { status: 400 }
        );
      }

      const ticketCount = await adjustServerPageTicketCount(pageSlug, body.amount);
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success', null, {
        amount: body.amount,
        ticketCount,
      });
      return NextResponse.json(
        { success: true, ticketCount },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'extendDisplayPeriod') {
      const months =
        typeof body?.months === 'number' && Number.isFinite(body.months)
          ? Math.max(1, Math.trunc(body.months))
          : 1;

      const displayPeriod = await extendServerInvitationPageDisplayPeriod(pageSlug, months);
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success', null, {
        months,
        endDate: displayPeriod.endDate.toISOString(),
      });
      return NextResponse.json(
        {
          success: true,
          startDate: displayPeriod.startDate.toISOString(),
          endDate: displayPeriod.endDate.toISOString(),
        },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'setDisplayPeriod') {
      if (typeof body?.enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Display period enabled state is required.' },
          { status: 400 }
        );
      }

      const startDate = readDate(body?.startDate);
      const endDate = readDate(body?.endDate);

      if (body.enabled && (!startDate || !endDate)) {
        return NextResponse.json(
          {
            error:
              body?.startDate || body?.endDate
                ? 'Display period date is invalid.'
                : 'Display period dates are required.',
          },
          { status: 400 }
        );
      }

      const displayPeriod = await setServerInvitationPageDisplayPeriod(pageSlug, {
        enabled: body.enabled,
        startDate,
        endDate,
      });
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success', null, {
        enabled: displayPeriod.enabled,
        startDate: displayPeriod.startDate?.toISOString() ?? null,
        endDate: displayPeriod.endDate?.toISOString() ?? null,
      });

      return NextResponse.json(
        {
          success: true,
          enabled: displayPeriod.enabled,
          startDate: displayPeriod.startDate?.toISOString() ?? null,
          endDate: displayPeriod.endDate?.toISOString() ?? null,
        },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }

    if (action === 'transferTicketCount') {
      const targetPageSlug =
        typeof body?.targetPageSlug === 'string' ? body.targetPageSlug.trim() : '';
      const targetToken =
        typeof body?.targetToken === 'string' ? body.targetToken.trim() : '';

      if (!targetPageSlug || !targetToken) {
        return NextResponse.json(
          { error: 'Target page slug and session are required.' },
          { status: 400 }
        );
      }

      if (typeof body?.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
        return NextResponse.json(
          { error: 'Transfer ticket count amount is required.' },
          { status: 400 }
        );
      }

      if (targetPageSlug === pageSlug) {
        return NextResponse.json(
          { error: 'Target page slug must be different.' },
          { status: 400 }
        );
      }

      const targetAccess = await authorizeMobileClientEditorToken(targetPageSlug, targetToken);
      if (!targetAccess) {
        await writeHighRiskActionAuditLog(
          access,
          pageSlug,
          highRiskRequirement,
          'failure',
          'target_authorization_failed',
          { targetPageSlug }
        );
        return NextResponse.json(
          { error: 'Target invitation page authorization failed.' },
          { status: 401 }
        );
      }

      if (!hasMobileClientEditorPermission(targetAccess.permissions, 'canManageTickets')) {
        await writeHighRiskActionAuditLog(
          access,
          pageSlug,
          highRiskRequirement,
          'failure',
          'target_missing_ticket_permission',
          { targetPageSlug }
        );
        return NextResponse.json(
          { error: buildMissingMobileClientEditorPermissionError('canManageTickets') },
          { status: 403 }
        );
      }

      const ticketTransfer = await transferServerPageTicketCount(
        pageSlug,
        targetPageSlug,
        body.amount
      );
      await writeHighRiskActionAuditLog(access, pageSlug, highRiskRequirement, 'success', null, {
        amount: body.amount,
        targetPageSlug,
        sourceTicketCount: ticketTransfer.sourceTicketCount,
        targetTicketCount: ticketTransfer.targetTicketCount,
      });

      return NextResponse.json(
        {
          success: true,
          ticketCount: ticketTransfer.sourceTicketCount,
          targetTicketCount: ticketTransfer.targetTicketCount,
          targetPageSlug,
        },
        { headers: buildRateLimitHeaders(rateLimitResult) }
      );
    }
  } catch (error) {
    console.error('[mobile/client-editor/pages] failed to process request', error);
    await writeHighRiskActionAuditLog(
      access,
      pageSlug,
      highRiskRequirement,
      'failure',
      error instanceof Error && error.message.trim()
        ? error.message
        : 'unknown_error'
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to update the invitation page.',
      },
      { status: 500 }
    );
  }
}
