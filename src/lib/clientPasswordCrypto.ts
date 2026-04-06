const PASSWORD_HASH_VERSION = 1;
const PASSWORD_HASH_ITERATIONS = 210_000;
const PASSWORD_HASH_ALGORITHM = 'SHA-256';
const PASSWORD_HASH_KEY_LENGTH_BITS = 256;

export interface ClientPasswordHashRecord {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  passwordVersion: number;
}

function getCryptoApi() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available.');
  }

  return globalThis.crypto;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  if (!value || value.length % 2 !== 0) {
    throw new Error('Invalid hex input.');
  }

  return new Uint8Array(
    Array.from({ length: value.length / 2 }, (_, index) =>
      Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
    )
  );
}

function normalizePassword(password: string) {
  return password.trim();
}

async function derivePasswordHash(
  password: string,
  saltHex: string,
  iterations: number
) {
  const cryptoApi = getCryptoApi();
  const encoder = new TextEncoder();
  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(normalizePassword(password)),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations,
      hash: PASSWORD_HASH_ALGORITHM,
    },
    keyMaterial,
    PASSWORD_HASH_KEY_LENGTH_BITS
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

function createSaltHex() {
  const cryptoApi = getCryptoApi();
  const salt = new Uint8Array(16);
  cryptoApi.getRandomValues(salt);
  return bytesToHex(salt);
}

export async function createClientPasswordHashRecord(
  password: string
): Promise<ClientPasswordHashRecord> {
  const normalizedPassword = normalizePassword(password);
  if (!normalizedPassword) {
    throw new Error('Password is required.');
  }

  const passwordSalt = createSaltHex();
  const passwordIterations = PASSWORD_HASH_ITERATIONS;

  return {
    passwordHash: await derivePasswordHash(
      normalizedPassword,
      passwordSalt,
      passwordIterations
    ),
    passwordSalt,
    passwordIterations,
    passwordVersion: PASSWORD_HASH_VERSION,
  };
}

export async function verifyClientPasswordHashRecord(
  password: string,
  record: Pick<
    ClientPasswordHashRecord,
    'passwordHash' | 'passwordSalt' | 'passwordIterations'
  >
) {
  const normalizedPassword = normalizePassword(password);
  if (!normalizedPassword) {
    return false;
  }

  const nextHash = await derivePasswordHash(
    normalizedPassword,
    record.passwordSalt,
    record.passwordIterations
  );

  return nextHash === record.passwordHash;
}
