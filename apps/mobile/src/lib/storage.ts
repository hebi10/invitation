import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

export async function getStoredString(key: string) {
  if (Platform.OS === 'web') {
    return readWebStorage(key);
  }

  return SecureStore.getItemAsync(normalizeNativeStorageKey(key));
}

export async function setStoredString(key: string, value: string | null) {
  if (Platform.OS === 'web') {
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

export async function getStoredJson<T>(key: string, fallback: T) {
  const value = await getStoredString(key);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function setStoredJson(key: string, value: unknown) {
  await setStoredString(key, JSON.stringify(value));
}
