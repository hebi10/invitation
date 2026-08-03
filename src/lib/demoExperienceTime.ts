const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getKstDateKey(now = new Date()) {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function getNextKstMidnight(now = new Date()) {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  const nextMidnightInShiftedUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1
  );

  return new Date(nextMidnightInShiftedUtc - KST_OFFSET_MS);
}

export function isDemoExperienceDateExpired(issuedDateKey: string, now = new Date()) {
  return issuedDateKey.trim() !== getKstDateKey(now);
}

