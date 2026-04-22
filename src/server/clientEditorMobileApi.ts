import 'server-only';

import {
  type GuestbookCommentStatus,
  isGuestbookCommentPendingPurge,
  isGuestbookCommentVisibleToManager,
  readGuestbookCommentStatus,
} from '@/lib/guestbookComments';
import {
  buildInvitationThemeRoutePath,
  DEFAULT_INVITATION_THEME,
  INVITATION_THEME_KEYS,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import type {
  MobileClientEditorPermissionKey,
  MobileClientEditorPermissions,
} from '@/types/mobileClientEditor';
import type { ServerEditableInvitationPageConfig } from '@/server/invitationPageServerService';

import { getAuthorizedClientEditorSession } from './clientEditorSessionAuth';
import {
  getServerEditableInvitationPageConfig,
  getServerInvitationPageDisplayPeriodSummary,
} from './invitationPageServerService';
import { getServerPageTicketCount } from './pageTicketServerService';
import { firestoreEventCommentRepository } from './repositories/eventCommentRepository';

export const MOBILE_CLIENT_EDITOR_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MOBILE_INVITATION_PUBLIC_ORIGIN = 'https://msgnote.kr';

export interface ServerGuestbookCommentSummary {
  id: string;
  author: string;
  message: string;
  pageSlug: string;
  status: GuestbookCommentStatus;
  createdAt: string | null;
  hiddenAt: string | null;
  deletedAt: string | null;
  scheduledDeleteAt: string | null;
  restoredAt: string | null;
}

type AuthorizedClientEditorSession = NonNullable<
  Awaited<ReturnType<typeof getAuthorizedClientEditorSession>>
>;

export type AuthorizedMobileClientEditorAccess = AuthorizedClientEditorSession & {
  permissions: MobileClientEditorPermissions;
};

const OWNER_MOBILE_CLIENT_EDITOR_PERMISSIONS: Readonly<MobileClientEditorPermissions> = {
  canViewDashboard: true,
  canEditInvitation: true,
  canManageGuestbook: true,
  canUploadImages: true,
  canManagePublication: true,
  canManageDisplayPeriod: true,
  canManageTickets: true,
  canIssueLinkToken: true,
};

function toIsoString(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

export function buildServerGuestbookCommentSummary(
  commentId: string,
  pageSlug: string,
  data: Record<string, unknown>
): ServerGuestbookCommentSummary | null {
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  if (!message) {
    return null;
  }

  return {
    id: commentId,
    author:
      typeof data.author === 'string' && data.author.trim()
        ? data.author.trim()
        : '익명',
    message,
    pageSlug:
      typeof data.pageSlug === 'string' && data.pageSlug.trim()
        ? data.pageSlug.trim()
        : pageSlug,
    status: readGuestbookCommentStatus(data),
    createdAt: toIsoString(data.createdAt),
    hiddenAt: toIsoString(data.hiddenAt),
    deletedAt: toIsoString(data.deletedAt),
    scheduledDeleteAt: toIsoString(data.scheduledDeleteAt),
    restoredAt: toIsoString(data.restoredAt),
  };
}

export function readMobileClientEditorToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

export function resolveMobileClientEditorPermissions(): MobileClientEditorPermissions {
  return {
    ...OWNER_MOBILE_CLIENT_EDITOR_PERMISSIONS,
  };
}

export function hasMobileClientEditorPermission(
  permissions: MobileClientEditorPermissions,
  requiredPermission:
    | MobileClientEditorPermissionKey
    | readonly MobileClientEditorPermissionKey[]
) {
  const requiredPermissions: readonly MobileClientEditorPermissionKey[] = Array.isArray(
    requiredPermission
  )
    ? requiredPermission
    : [requiredPermission];

  return requiredPermissions.every((permission) => permissions[permission] === true);
}

export function buildMissingMobileClientEditorPermissionError(
  requiredPermission:
    | MobileClientEditorPermissionKey
    | readonly MobileClientEditorPermissionKey[]
) {
  const requiredPermissions: readonly MobileClientEditorPermissionKey[] = Array.isArray(
    requiredPermission
  )
    ? requiredPermission
    : [requiredPermission];

  return `Missing mobile client editor permission: ${requiredPermissions.join(', ')}.`;
}

export async function authorizeMobileClientEditorToken(
  pageSlug: string,
  sessionValue: string | undefined | null
) {
  const authorizedSession = await getAuthorizedClientEditorSession(pageSlug, sessionValue);
  if (!authorizedSession) {
    return null;
  }

  return {
    ...authorizedSession,
    permissions: resolveMobileClientEditorPermissions(),
  } satisfies AuthorizedMobileClientEditorAccess;
}

export async function authorizeMobileClientEditorRequest(
  request: Request,
  pageSlug: string
) {
  return authorizeMobileClientEditorToken(pageSlug, readMobileClientEditorToken(request));
}

export async function getServerGuestbookCommentsByPageSlug(pageSlug: string) {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return [] as ServerGuestbookCommentSummary[];
  }

  if (!firestoreEventCommentRepository.isAvailable()) {
    return [] as ServerGuestbookCommentSummary[];
  }

  const storedComments = await firestoreEventCommentRepository.listByPageSlug(
    normalizedPageSlug
  );
  const now = new Date();
  const purgeTasks: Array<Promise<unknown>> = [];

  const comments = storedComments
    .map((commentRecord) => {
      const data = commentRecord.data;
      if (!isGuestbookCommentVisibleToManager(data, now)) {
        if (isGuestbookCommentPendingPurge(data, now)) {
          purgeTasks.push(
            firestoreEventCommentRepository
              .deleteByPageSlugAndId(normalizedPageSlug, commentRecord.id)
              .catch(() => null)
          );
        }
        return null;
      }

      return buildServerGuestbookCommentSummary(
        commentRecord.id,
        normalizedPageSlug,
        data
      );
    })
    .filter(
      (comment): comment is ServerGuestbookCommentSummary =>
        comment !== null
    )
    .sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });

  if (purgeTasks.length > 0) {
    await Promise.all(purgeTasks);
  }

  return comments;
}

export async function getServerGuestbookCommentCountByPageSlug(pageSlug: string) {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    return 0;
  }

  if (!firestoreEventCommentRepository.isAvailable()) {
    return 0;
  }

  const storedComments = await firestoreEventCommentRepository.listByPageSlug(
    normalizedPageSlug
  );
  const now = new Date();
  const purgeTasks: Array<Promise<unknown>> = [];

  let count = 0;
  storedComments.forEach((commentRecord) => {
    const data = commentRecord.data;
    if (!isGuestbookCommentVisibleToManager(data, now)) {
      if (isGuestbookCommentPendingPurge(data, now)) {
        purgeTasks.push(
          firestoreEventCommentRepository
            .deleteByPageSlugAndId(normalizedPageSlug, commentRecord.id)
            .catch(() => null)
        );
      }
      return;
    }

    const comment = buildServerGuestbookCommentSummary(
      commentRecord.id,
      normalizedPageSlug,
      data
    );
    if (comment) {
      count += 1;
    }
  });

  if (purgeTasks.length > 0) {
    await Promise.all(purgeTasks);
  }

  return count;
}

function resolveMobileInvitationPublicOrigin(origin: string) {
  try {
    const normalized = new URL(origin).origin.trim();
    if (!normalized) {
      return MOBILE_INVITATION_PUBLIC_ORIGIN;
    }

    return normalized.replace(/\/+$/g, '');
  } catch {
    return MOBILE_INVITATION_PUBLIC_ORIGIN;
  }
}

export function buildMobileInvitationLinks(
  origin: string,
  pageSlug: string,
  defaultTheme: InvitationThemeKey = DEFAULT_INVITATION_THEME
) {
  const baseOrigin = resolveMobileInvitationPublicOrigin(origin);
  const normalizedPageSlug = pageSlug.trim().replace(/^\/+|\/+$/g, '');
  const themeUrls = INVITATION_THEME_KEYS.reduce<Record<InvitationThemeKey, string>>(
    (accumulator, theme) => {
      accumulator[theme] = `${baseOrigin}${buildInvitationThemeRoutePath(
        normalizedPageSlug,
        theme
      )}`;
      return accumulator;
    },
    {} as Record<InvitationThemeKey, string>
  );

  return {
    publicUrl: `${baseOrigin}/${normalizedPageSlug}`,
    previewUrls: {
      default: themeUrls[defaultTheme],
      ...themeUrls,
    },
  };
}

function buildMobileClientEditorPageSummary(
  config: ServerEditableInvitationPageConfig | null,
  ticketCount: number,
  displayPeriod: {
    enabled: boolean;
    startDate: Date | null;
    endDate: Date | null;
  }
) {
  if (!config) {
    return null;
  }

  return {
    slug: config.slug,
    displayName: config.config.displayName,
    published: config.published,
    productTier: config.productTier,
    defaultTheme: config.defaultTheme,
    features: config.features,
    ticketCount,
    displayPeriod: {
      enabled: displayPeriod.enabled,
      startDate: displayPeriod.startDate?.toISOString() ?? null,
      endDate: displayPeriod.endDate?.toISOString() ?? null,
    },
  };
}

export async function loadMobileClientEditorPageSnapshot(origin: string, pageSlug: string) {
  const [config, displayPeriod, ticketCount] = await Promise.all([
    getServerEditableInvitationPageConfig(pageSlug),
    getServerInvitationPageDisplayPeriodSummary(pageSlug),
    getServerPageTicketCount(pageSlug),
  ]);
  const links = buildMobileInvitationLinks(
    origin,
    pageSlug,
    config?.defaultTheme ?? DEFAULT_INVITATION_THEME
  );

  return {
    permissions: resolveMobileClientEditorPermissions(),
    dashboardPage: config,
    page: buildMobileClientEditorPageSummary(config, ticketCount, displayPeriod),
    links,
  };
}
