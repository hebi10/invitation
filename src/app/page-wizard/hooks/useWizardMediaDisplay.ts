'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentFirebaseIdToken } from '@/services/adminAuth';
import { mapInvitationImageFields, materializeInvitationMediaUrls } from '@/lib/invitationPreviewMedia';
import { collectWizardProtectedMediaUrls, resolveWizardMediaDisplayUrl } from '@/lib/invitationStableMedia';
import type { InvitationPageSeed } from '@/types/invitationPage';

const EMPTY_OBJECTS: ReadonlyMap<string, string> = new Map();
type Result = { key: string; objects: ReadonlyMap<string, string>; error: string };

/** The image set, not every text keystroke, controls authenticated image downloads. */
export function useWizardMediaDisplay(config: InvitationPageSeed | null, slug: string, accountUid: string) {
  const urlsKey = useMemo(() => JSON.stringify(config ? collectWizardProtectedMediaUrls(config, slug) : []), [config, slug]);
  const key = JSON.stringify([slug, accountUid, urlsKey]);
  const hasProtectedImages = urlsKey !== '[]';
  const [result, setResult] = useState<Result | null>(null);
  const current = result?.key === key ? result : null;

  useEffect(() => {
    if (!hasProtectedImages || !accountUid || !slug) return;
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    void (async () => {
      try {
        const token = await getCurrentFirebaseIdToken();
        if (!token) throw new Error('인증이 필요합니다.');
        controller.signal.throwIfAborted();
        const media = await materializeInvitationMediaUrls(JSON.parse(urlsKey) as string[], slug, 'customer', token, controller.signal);
        if (controller.signal.aborted) { media.dispose(); return; }
        dispose = media.dispose;
        setResult({ key, objects: media.objects, error: '' });
      } catch {
        if (!controller.signal.aborted) setResult({ key, objects: EMPTY_OBJECTS, error: '보호된 이미지를 불러오지 못했습니다. 로그인 및 이미지 상태를 확인해 주세요.' });
      }
    })();
    return () => { controller.abort(); dispose?.(); };
  }, [key, urlsKey, slug, accountUid, hasProtectedImages]);

  const objects = current?.objects ?? EMPTY_OBJECTS;
  const resolve = useCallback((value: string) => resolveWizardMediaDisplayUrl(value, slug, objects), [slug, objects]);
  const displayConfig = useMemo(() => config ? mapInvitationImageFields(config, resolve) : null, [config, resolve]);
  return { resolve, displayConfig, loading: hasProtectedImages && Boolean(accountUid) && !current,
    error: current?.error ?? (hasProtectedImages && !accountUid ? '로그인 후 보호된 이미지를 확인해 주세요.' : '') };
}
