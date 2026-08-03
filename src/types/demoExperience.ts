import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

export type DemoExperienceRole = 'admin' | 'customer';

export type DemoExperienceEventKind = 'seed' | 'daily-workspace';

export type DemoExperienceErrorCode =
  | 'DEMO_SESSION_REQUIRED'
  | 'DEMO_ROLE_FORBIDDEN'
  | 'DEMO_DAY_ROLLED_OVER'
  | 'DEMO_SEED_READ_ONLY'
  | 'VERSION_CONFLICT';

export interface DemoExperienceSessionSnapshot {
  sessionId: string;
  role: DemoExperienceRole;
  dateKey: string;
  expiresAt: number;
}

export interface DemoExperienceComment {
  id: string;
  author: string;
  message: string;
  pageSlug: string;
  createdAt: Date | null;
}

export interface DemoExperienceSeedEvent {
  eventId: string;
  slug: string;
  kind: 'seed';
  ownerUid: string | null;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  version: number;
  config: InvitationPageSeed;
  createdAt: Date;
  updatedAt: Date;
  comments: DemoExperienceComment[];
}

export interface DemoExperienceStoredEvent {
  eventId: string;
  slug: string;
  kind: DemoExperienceEventKind;
  ownerUid: string | null;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  version: number;
  config: InvitationPageSeed;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface DemoExperienceSaveInput {
  dateKey: string;
  slug: string;
  config: InvitationPageSeed;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  expectedVersion: number;
}
