export type EventSlugIndexStatus = 'active' | 'redirect' | 'revoked';

export interface EventSlugIndexOwner {
  slug: string;
  eventId: string;
  status: EventSlugIndexStatus;
}

export class EventSlugIndexConflictError extends Error {
  readonly slug: string;
  readonly currentEventId: string;
  readonly nextEventId: string;

  constructor(options: { slug: string; currentEventId: string; nextEventId: string }) {
    super(`Slug "${options.slug}" is already linked to event "${options.currentEventId}".`);
    this.name = 'EventSlugIndexConflictError';
    this.slug = options.slug;
    this.currentEventId = options.currentEventId;
    this.nextEventId = options.nextEventId;
  }
}

export function normalizeEventSlugIndexStatus(value: unknown): EventSlugIndexStatus {
  if (value === 'active' || value === 'redirect' || value === 'revoked') {
    return value;
  }

  return 'active';
}

export function isReservedEventSlugIndexStatus(status: EventSlugIndexStatus) {
  return status === 'active' || status === 'redirect';
}

export function assertEventSlugIndexOwnership(options: {
  slug: string;
  nextEventId: string;
  existingRecord: EventSlugIndexOwner | null;
}) {
  const { slug, nextEventId, existingRecord } = options;
  if (!existingRecord) {
    return;
  }

  if (existingRecord.eventId === nextEventId) {
    return;
  }

  if (!isReservedEventSlugIndexStatus(existingRecord.status)) {
    return;
  }

  throw new EventSlugIndexConflictError({
    slug,
    currentEventId: existingRecord.eventId,
    nextEventId,
  });
}
