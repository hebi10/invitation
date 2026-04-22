export const GUESTBOOK_COMMENT_PENDING_DELETE_RETENTION_DAYS = 30;

export type GuestbookCommentStatus = 'public' | 'hidden' | 'pending_delete';
export type GuestbookCommentAction = 'hide' | 'restore' | 'scheduleDelete';

export interface GuestbookCommentStatusPatch {
  status: GuestbookCommentStatus;
  deleted: boolean;
  hiddenAt: Date | null;
  deletedAt: Date | null;
  scheduledDeleteAt: Date | null;
  restoredAt: Date | null;
}

type GuestbookCommentDateCandidate = {
  toDate?: () => Date;
};

export function readGuestbookCommentDate(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as GuestbookCommentDateCandidate).toDate === 'function'
  ) {
    const toDate = (value as GuestbookCommentDateCandidate).toDate;
    return typeof toDate === 'function' ? toDate() : null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

export function normalizeGuestbookCommentStatus(
  value: unknown,
  deleted: unknown = false
): GuestbookCommentStatus {
  if (value === 'public' || value === 'hidden' || value === 'pending_delete') {
    return value;
  }

  return deleted === true ? 'pending_delete' : 'public';
}

export function readGuestbookCommentStatus(data: {
  status?: unknown;
  deleted?: unknown;
}) {
  return normalizeGuestbookCommentStatus(data.status, data.deleted);
}

export function buildGuestbookCommentScheduledDeleteAt(baseDate = new Date()) {
  return new Date(
    baseDate.getTime() + GUESTBOOK_COMMENT_PENDING_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
}

export function buildGuestbookCommentStatusPatch(
  action: GuestbookCommentAction,
  now = new Date()
): GuestbookCommentStatusPatch {
  if (action === 'hide') {
    return {
      status: 'hidden',
      deleted: false,
      hiddenAt: now,
      deletedAt: null,
      scheduledDeleteAt: null,
      restoredAt: null,
    };
  }

  if (action === 'restore') {
    return {
      status: 'public',
      deleted: false,
      hiddenAt: null,
      deletedAt: null,
      scheduledDeleteAt: null,
      restoredAt: now,
    };
  }

  return {
    status: 'pending_delete',
    deleted: true,
    hiddenAt: null,
    deletedAt: now,
    scheduledDeleteAt: buildGuestbookCommentScheduledDeleteAt(now),
    restoredAt: null,
  };
}

export function readGuestbookCommentScheduledDeleteAt(data: {
  scheduledDeleteAt?: unknown;
}) {
  return readGuestbookCommentDate(data.scheduledDeleteAt);
}

export function isGuestbookCommentPendingPurge(
  data: {
    status?: unknown;
    deleted?: unknown;
    scheduledDeleteAt?: unknown;
  },
  now = new Date()
) {
  const status = readGuestbookCommentStatus(data);
  if (status !== 'pending_delete') {
    return false;
  }

  const scheduledDeleteAt = readGuestbookCommentScheduledDeleteAt(data);
  return Boolean(scheduledDeleteAt && scheduledDeleteAt.getTime() <= now.getTime());
}

export function isGuestbookCommentVisibleToPublic(
  data: {
    status?: unknown;
    deleted?: unknown;
    scheduledDeleteAt?: unknown;
  },
  now = new Date()
) {
  return (
    readGuestbookCommentStatus(data) === 'public' &&
    !isGuestbookCommentPendingPurge(data, now)
  );
}

export function isGuestbookCommentVisibleToManager(
  data: {
    status?: unknown;
    deleted?: unknown;
    scheduledDeleteAt?: unknown;
  },
  now = new Date()
) {
  return !isGuestbookCommentPendingPurge(data, now);
}

export function isGuestbookCommentAction(value: unknown): value is GuestbookCommentAction {
  return value === 'hide' || value === 'restore' || value === 'scheduleDelete';
}
