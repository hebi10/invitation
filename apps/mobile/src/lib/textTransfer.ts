import { Share } from 'react-native';

export type TextTransferMethod = 'clipboard' | 'share';

type BrowserClipboardApi = {
  readText?: () => Promise<string>;
  writeText?: (value: string) => Promise<void>;
};

function getBrowserClipboardApi(): BrowserClipboardApi | null {
  const globalNavigator =
    typeof globalThis === 'object' && 'navigator' in globalThis
      ? (globalThis.navigator as { clipboard?: BrowserClipboardApi })
      : null;

  return globalNavigator?.clipboard ?? null;
}

export async function readClipboardText() {
  const clipboardApi = getBrowserClipboardApi();
  if (!clipboardApi?.readText) {
    return null;
  }

  try {
    const value = await clipboardApi.readText();
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

export async function copyTextWithFallback(value: string): Promise<TextTransferMethod> {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw new Error('Text is required.');
  }

  const clipboardApi = getBrowserClipboardApi();
  if (clipboardApi?.writeText) {
    await clipboardApi.writeText(normalizedValue);
    return 'clipboard';
  }

  await Share.share({
    message: normalizedValue,
    url: normalizedValue,
  });
  return 'share';
}
