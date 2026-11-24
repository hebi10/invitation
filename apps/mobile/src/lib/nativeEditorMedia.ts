const PRODUCTION_ORIGIN = 'https://invite.msgnote.kr';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function isStableNativeMediaReference(value: string) {
  const source = value.trim();
  return source.startsWith('/api/public/media/') || source.startsWith(PRODUCTION_ORIGIN + '/api/public/media/');
}

export function buildNativeEditorMediaTarget(value: string, slug: string, baseUrl: string, allowLocal = false): string | null {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug)) return null;
  const source = value.trim();
  const relative = source.startsWith(PRODUCTION_ORIGIN + '/') ? source.slice(PRODUCTION_ORIGIN.length) : source;
  const prefix = `/api/public/media/${slug}/`;
  if (!relative.startsWith(prefix) || !relative.endsWith('/')) return null;
  try {
    const file = decodeURIComponent(relative.slice(prefix.length, -1));
    if (!file || file.length > 250 || !/\.(?:jpe?g|png|webp)$/i.test(file) ||
        /[\\/\u0000-\u001f\u007f%?#]/.test(file) || relative !== prefix + encodeURIComponent(file) + '/') return null;
    const base = new URL(baseUrl);
    const local = allowLocal && base.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '10.0.2.2'].includes(base.hostname) && ['3000', '3001'].includes(base.port);
    if (base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
        (base.origin !== PRODUCTION_ORIGIN && !local)) return null;
    return base.origin + `/api/mobile/client-editor/pages/${slug}/media/${encodeURIComponent(file)}/`;
  } catch { return null; }
}

function encodeBase64(bytes: Uint8Array) {
  const chunks: string[] = [];
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index], b = bytes[index + 1] ?? 0, c = bytes[index + 2] ?? 0;
    result += BASE64[a >> 2] + BASE64[((a & 3) << 4) | (b >> 4)] +
      (index + 1 < bytes.length ? BASE64[((b & 15) << 2) | (c >> 6)] : '=') +
      (index + 2 < bytes.length ? BASE64[c & 63] : '=');
    if (result.length >= 8192) { chunks.push(result); result = ''; }
  }
  chunks.push(result);
  return chunks.join('');
}

function matchesImage(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value);
  return type === 'image/webp' && bytes.length >= 12 &&
    [82,73,70,70].every((value, i) => bytes[i] === value) &&
    [87,69,66,80].every((value, i) => bytes[i + 8] === value);
}

type MediaResponse = Pick<Response, 'ok' | 'headers' | 'arrayBuffer'>;
export async function readNativeEditorMedia(input: {
  reference: string; slug: string; baseUrl: string; allowLocal?: boolean;
  token: string; deviceId: string; signal: AbortSignal;
}, fetchImage: (url: string, init: RequestInit) => Promise<MediaResponse>) {
  const target = buildNativeEditorMediaTarget(input.reference, input.slug, input.baseUrl, input.allowLocal);
  if (!target || !input.token || !input.deviceId || /\s/.test(input.token) || /[\r\n]/.test(input.deviceId) || input.signal.aborted) {
    throw new Error('이미지 접근 권한을 확인해 주세요.');
  }
  const response = await fetchImage(target, {
    method: 'GET', headers: { Authorization: `Bearer ${input.token}`, 'x-mobile-device-id': input.deviceId, Accept: 'image/jpeg,image/png,image/webp' },
    cache: 'no-store', redirect: 'error', credentials: 'omit', signal: input.signal,
  });
  const type = response.headers.get('content-type') ?? '';
  const length = Number(response.headers.get('content-length'));
  if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type) ||
      !Number.isSafeInteger(length) || length <= 0 || length > MAX_IMAGE_BYTES) throw new Error('이미지를 불러오지 못했습니다.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (input.signal.aborted || bytes.length !== length || !matchesImage(bytes, type)) throw new Error('이미지 전송을 확인하지 못했습니다.');
  return `data:${type};base64,${encodeBase64(bytes)}`;
}

/** Stable pilot uploads retain the server thumbnail identity, while older uploads keep local preview behavior. */
export function selectNativeUploadPreviewReference(image: { url: string; previewUrl: string }, local: string, slug: string) {
  if (isStableNativeMediaReference(image.url)) {
    return buildNativeEditorMediaTarget(image.previewUrl, slug, PRODUCTION_ORIGIN) ? image.previewUrl : image.url;
  }
  return local || image.previewUrl || image.url;
}
