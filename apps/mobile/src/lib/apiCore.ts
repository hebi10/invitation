import Constants from 'expo-constants';

import { toUserFacingApiMessage } from './apiErrors';

export const PRODUCTION_API_BASE_URL = 'https://msgnote.kr';

const TRANSIENT_LOCAL_API_PORTS = new Set(['3000', '3001']);
const ALLOWED_API_HOSTS = new Set([
  'msgnote.kr',
  'www.msgnote.kr',
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '0.0.0.0',
]);
const DEFAULT_GET_RETRY_COUNT = 1;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function readConfiguredApiBaseUrl() {
  const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  const extraApiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof extraApiBaseUrl === 'string' && extraApiBaseUrl.trim()) {
    return extraApiBaseUrl.trim();
  }

  return PRODUCTION_API_BASE_URL;
}

export const DEFAULT_API_BASE_URL = readConfiguredApiBaseUrl();

export function isTransientLocalApiBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `http://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== 'http:' || !TRANSIENT_LOCAL_API_PORTS.has(parsed.port)) {
      return false;
    }

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '10.0.2.2' ||
      hostname === '0.0.0.0' ||
      isPrivateIpv4Host(hostname)
    );
  } catch {
    return false;
  }
}

function isPrivateIpv4Host(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const [first, second, third, fourth] = match.slice(1).map(Number);
  const octets = [first, second, third, fourth];
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  if (first === 10) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return first === 192 && second === 168;
}

function isAllowedApiHost(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (!normalizedHostname) {
    return false;
  }

  return (
    ALLOWED_API_HOSTS.has(normalizedHostname) ||
    normalizedHostname.endsWith('.msgnote.kr') ||
    isPrivateIpv4Host(normalizedHostname)
  );
}

export function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim();
  const fallback = DEFAULT_API_BASE_URL.trim();
  const target = trimmed || fallback;

  if (!target) {
    return '';
  }

  const normalized = target.replace(/\/+$/g, '');
  const candidateUrl = normalized.startsWith('http://') || normalized.startsWith('https://')
    ? normalized
    : `https://${normalized}`;

  try {
    const parsed = new URL(candidateUrl);
    if (!isAllowedApiHost(parsed.hostname)) {
      return PRODUCTION_API_BASE_URL;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return PRODUCTION_API_BASE_URL;
  }
}

export function buildApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  return `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function waitForRetry(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method ?? 'GET').toUpperCase();
  const maxRetries = method === 'GET' ? DEFAULT_GET_RETRY_COUNT : 0;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (attempt >= maxRetries || !RETRYABLE_STATUS_CODES.has(response.status)) {
        return response;
      }
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
    }

    await waitForRetry(250 * (attempt + 1));
  }
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; [key: string]: unknown }
    | null;

  if (!response.ok) {
    throw new Error(toUserFacingApiMessage(payload?.error));
  }

  return payload as T;
}

export function createHeaders(token?: string, highRiskToken?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (highRiskToken) {
    headers['x-mobile-client-editor-high-risk-token'] = highRiskToken;
  }

  return headers;
}

export async function uploadFormDataResponse<T>(
  url: string,
  token: string,
  formData: FormData
): Promise<T> {
  if (typeof XMLHttpRequest === 'undefined') {
    return readJsonResponse<T>(
      await fetchWithRetry(url, {
        method: 'POST',
        headers: createHeaders(token),
        body: formData,
      })
    );
  }

  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('POST', url);
    request.timeout = 30000;
    request.setRequestHeader('Accept', 'application/json');
    if (token) {
      request.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    request.onload = () => {
      const rawText = request.responseText;
      let payload: { error?: string } | null = null;

      if (rawText) {
        try {
          payload = (JSON.parse(rawText) as { error?: string } | null) ?? null;
        } catch {
          payload = null;
        }
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(payload as T);
        return;
      }

      reject(new Error(toUserFacingApiMessage(payload?.error)));
    };

    request.onerror = () => {
      reject(new Error('이미지 업로드 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.'));
    };

    request.ontimeout = () => {
      reject(new Error('이미지 업로드 요청이 시간 초과되었습니다. 다시 시도해 주세요.'));
    };

    try {
      request.send(formData);
    } catch (error) {
      reject(
        error instanceof Error
          ? new Error(toUserFacingApiMessage(error.message))
          : new Error('이미지 업로드 요청을 시작하지 못했습니다. 다시 시도해 주세요.')
      );
    }
  });
}
