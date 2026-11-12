/**
 * Theme-agnostic invitation intro catalogue.
 * Only verified assets are registered. Customer selection and persistence are separate.
 */
export type InvitationIntroPreset = {
  id: string;
  label: string;
  description: string;
  gifSrc: string;
  posterSrc: string;
  durationMs: number;
  sha256: string;
  active: boolean;
  sortOrder: number;
};

export const INVITATION_INTRO_PRESETS = [
  {
    id: 'intro-01',
    label: '미니멀 타이포',
    description: '밝은 바탕 위에 초대 문구와 얇은 선이 나타납니다.',
    gifSrc: '/assets/invitation-intro/universal-2s.gif',
    posterSrc: '/assets/invitation-intro/poster.webp',
    durationMs: 2000,
    sha256: 'dcdc8c0560282a3da8b9e6cd5d10b5407fe4e7bb3da75fe66160260f802aa2b7',
    active: true,
    sortOrder: 1,
  },
] as const satisfies readonly InvitationIntroPreset[];

export type RegisteredInvitationIntroPreset = (typeof INVITATION_INTRO_PRESETS)[number];
export type InvitationIntroPresetId = RegisteredInvitationIntroPreset['id'];
export type InvitationIntroChoice = 'none' | InvitationIntroPresetId;

export function listAvailableInvitationIntroPresets(): RegisteredInvitationIntroPreset[] {
  return [...INVITATION_INTRO_PRESETS]
    .filter((preset) => preset.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getInvitationIntroPreset(value: unknown): RegisteredInvitationIntroPreset | null {
  if (typeof value !== 'string') return null;
  return listAvailableInvitationIntroPresets().find((preset) => preset.id === value) ?? null;
}

/**
 * Return null for missing or unfamiliar IDs. Never silently overwrite a saved legacy
 * introStyle or unknown future selection with "none".
 */
export function parseInvitationIntroChoice(value: unknown): InvitationIntroChoice | null {
  if (value === 'none') return 'none';
  const preset = getInvitationIntroPreset(value);
  return preset ? preset.id : null;
}
