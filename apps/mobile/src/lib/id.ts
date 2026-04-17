const RANDOM_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function createRandomSuffix(length = 6) {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * RANDOM_SUFFIX_ALPHABET.length);
    return RANDOM_SUFFIX_ALPHABET[index];
  }).join('');
}
