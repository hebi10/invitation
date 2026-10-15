import { isRecord } from '@/lib/invitationPageNormalization';

export type WeddingCoverTextPosition = 'theme' | 'below' | 'top' | 'bottom';

export interface WeddingCoverSettings {
  focusX: number;
  focusY: number;
  textPosition: WeddingCoverTextPosition;
}

function normalizeFocus(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 50;
}

export function normalizeWeddingCoverSettings(value: unknown): WeddingCoverSettings {
  const settings = isRecord(value) ? value : {};
  return {
    focusX: normalizeFocus(settings.focusX),
    focusY: normalizeFocus(settings.focusY),
    textPosition:
      settings.textPosition === 'below' || settings.textPosition === 'top' || settings.textPosition === 'bottom'
        ? settings.textPosition
        : 'theme',
  };
}

export function resolveWeddingCoverTextPosition(
  theme: string,
  position: WeddingCoverTextPosition
): 'below' | 'top' | 'bottom' {
  return position === 'theme' ? (theme === 'romantic' ? 'bottom' : 'below') : position;
}
