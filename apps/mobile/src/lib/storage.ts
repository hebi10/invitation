import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type StorageOptions = {
  sensitive?: boolean;
};

export const MOBILE_DEVICE_ID_STORAGE_KEY = 'mobile-invitation:device-id';

const warnedSensitiveWebStorageKeys = new Set<string>();
let cachedMobileDeviceId: string | null = null;
let pendingMobileDeviceId: Promise<string> | null = null;

function normalizeNativeStorageKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) {
    return 'mobile_invitation_storage';
  }

  const normalized = trimmed
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'mobile_invitation_storage';
}

async function readWebStorage(key: string) {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function warnSensitiveWebStorage(key: string) {
  if (warnedSensitiveWebStorageKeys.has(key)) {
    return;
  }

  warnedSensitiveWebStorageKeys.add(key);
  console.warn(
    `[mobile/storage] skipped persisting sensitive data for "${key}" on web localStorage.`
  );
}

async function writeWebStorage(key: string, value: string | null) {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, value);
  } catch {
    // noop
  }
}

export async function getStoredString(key: string, options: StorageOptions = {}) {
  if (Platform.OS === 'web') {
    if (options.sensitive) {
      await writeWebStorage(key, null);
      warnSensitiveWebStorage(key);
      return null;
    }

    return readWebStorage(key);
  }

  return SecureStore.getItemAsync(normalizeNativeStorageKey(key));
}

export async function setStoredString(
  key: string,
  value: string | null,
  options: StorageOptions = {}
) {
  if (Platform.OS === 'web') {
    if (options.sensitive) {
      await writeWebStorage(key, null);
      warnSensitiveWebStorage(key);
      return;
    }

    await writeWebStorage(key, value);
    return;
  }

  const normalizedKey = normalizeNativeStorageKey(key);

  if (value === null) {
    await SecureStore.deleteItemAsync(normalizedKey);
    return;
  }

  await SecureStore.setItemAsync(normalizedKey, value);
}

export async function getStoredJson<T>(
  key: string,
  fallback: T,
  options: StorageOptions = {}
) {
  const value = await getStoredString(key, options);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function setStoredJson(
  key: string,
  value: unknown,
  options: StorageOptions = {}
) {
  await setStoredString(key, JSON.stringify(value), options);
}

function normalizeMobileDeviceId(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  if (!normalized || normalized.length > 128) {
    return '';
  }

  return /^[a-zA-Z0-9._:-]+$/.test(normalized) ? normalized : '';
}

function readRandomUuid() {
  const cryptoProvider = globalThis.crypto as
    | {
        randomUUID?: () => string;
        getRandomValues?: (array: Uint8Array) => Uint8Array;
      }
    | undefined;

  if (typeof cryptoProvider?.randomUUID === 'function') {
    return cryptoProvider.randomUUID();
  }

  if (typeof cryptoProvider?.getRandomValues === 'function') {
    const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function createMobileDeviceId() {
  return `mid_${readRandomUuid()}`;
}

export async function getOrCreateMobileDeviceId() {
  if (cachedMobileDeviceId) {
    return cachedMobileDeviceId;
  }

  if (!pendingMobileDeviceId) {
    pendingMobileDeviceId = (async () => {
      try {
        const storedDeviceId = normalizeMobileDeviceId(
          await getStoredString(MOBILE_DEVICE_ID_STORAGE_KEY)
        );
        if (storedDeviceId) {
          cachedMobileDeviceId = storedDeviceId;
          return storedDeviceId;
        }
      } catch {
        // Continue with an in-memory id if secure storage is temporarily unavailable.
      }

      const nextDeviceId = createMobileDeviceId();
      cachedMobileDeviceId = nextDeviceId;

      try {
        await setStoredString(MOBILE_DEVICE_ID_STORAGE_KEY, nextDeviceId);
      } catch {
        // The id is still usable for the current app session.
      }

      return nextDeviceId;
    })().finally(() => {
      pendingMobileDeviceId = null;
    });
  }

  return pendingMobileDeviceId;
}
