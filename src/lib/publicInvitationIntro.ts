import type { EventTypeKey } from '@/lib/eventTypes';
import { getInvitationIntroPreset, parseInvitationIntroChoice } from '@/lib/invitationIntroCatalog';
import type { RegisteredInvitationIntroPreset } from '@/lib/invitationIntroCatalog';
import { normalizeWeddingIntroStyle, type WeddingIntroStyle } from '@/lib/weddingIntro';

export type PublicInvitationIntroDecision =
  | { kind: 'gif'; preset: RegisteredInvitationIntroPreset }
  | { kind: 'legacy-wedding'; style: Exclude<WeddingIntroStyle, 'none'> }
  | { kind: 'none' };

/**
 * A verified customer choice takes priority over legacy animations for all event types.
 * Unknown future IDs must not silently disable an older customer's working intro.
 */
export function resolvePublicInvitationIntro(
  introPresetId: unknown,
  introStyle: unknown,
  eventType: EventTypeKey
): PublicInvitationIntroDecision {
  const choice = parseInvitationIntroChoice(introPresetId);
  if (choice === 'none') return { kind: 'none' };
  if (choice) {
    const preset = getInvitationIntroPreset(choice);
    if (preset) return { kind: 'gif', preset };
  }

  const legacy = normalizeWeddingIntroStyle(introStyle);
  if (eventType === 'wedding' && legacy !== 'none') {
    return { kind: 'legacy-wedding', style: legacy };
  }

  return { kind: 'none' };
}

/** Deep-linked sections and completed intros are not gated again in the same session. */
export function shouldShowPublicInvitationGifIntro({
  preview = false,
  hash = '',
  seen = false,
}: {
  preview?: boolean;
  hash?: string;
  seen?: boolean;
}) {
  return preview || (!hash && !seen);
}

export function publicInvitationGifIntroSessionKey(slug: string, presetId: string) {
  return `invitation-intro:gif:v1:${slug}:${presetId}`;
}
