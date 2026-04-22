export type EventRolloutWriteMode = 'legacy-primary' | 'event-only';

const DEFAULT_EVENT_ROLLOUT_WRITE_MODE: EventRolloutWriteMode = 'event-only';

function normalizeBooleanFlag(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function parseIsoDate(value: string | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

export function getEventRolloutWriteMode(): EventRolloutWriteMode {
  const normalizedValue = process.env.EVENT_ROLLOUT_WRITE_MODE?.trim().toLowerCase();
  if (normalizedValue === 'event-only') {
    return 'event-only';
  }

  if (normalizedValue === 'legacy-primary') {
    return 'legacy-primary';
  }

  return DEFAULT_EVENT_ROLLOUT_WRITE_MODE;
}

export function getEventRolloutLegacyReadFallbackUntil() {
  return parseIsoDate(process.env.EVENT_ROLLOUT_LEGACY_READ_FALLBACK_UNTIL);
}

export function isLegacyReadFallbackEnabled(now = new Date()) {
  const explicitFlag = normalizeBooleanFlag(process.env.EVENT_ROLLOUT_ENABLE_LEGACY_READ_FALLBACK);
  const fallbackUntil = getEventRolloutLegacyReadFallbackUntil();

  if (explicitFlag === false) {
    return false;
  }

  if (fallbackUntil) {
    return now.getTime() <= fallbackUntil.getTime();
  }

  if (explicitFlag === true) {
    return true;
  }

  return false;
}

export function getEventRolloutCutoverConfig(now = new Date()) {
  const writeMode = getEventRolloutWriteMode();
  const legacyReadFallbackUntil = getEventRolloutLegacyReadFallbackUntil();
  const legacyReadFallbackEnabled = isLegacyReadFallbackEnabled(now);

  return {
    writeMode,
    legacyReadFallbackEnabled,
    legacyReadFallbackUntil,
  };
}
