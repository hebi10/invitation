'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InvitationPage } from '@/types/invitationPage';
import {
  collectInvitationPreviewMediaUrls, materializeInvitationPreviewMedia, type InvitationPreviewMediaMode,
} from '@/lib/invitationPreviewMedia';

type PreviewResult = {
  source: InvitationPage;
  slug: string;
  mode: InvitationPreviewMediaMode;
  sessionKey: string;
  readToken: () => Promise<string | null>;
  page: InvitationPage | null;
  error: string;
};

/** Revoke all local image URLs on a page/account/session change or unmount. */
export function useProtectedInvitationPreviewMedia(page: InvitationPage | null | undefined,
  slug: string, mode: InvitationPreviewMediaMode, sessionKey: string,
  readToken: () => Promise<string | null>) {
  const protectedMedia = useMemo(() => Boolean(page && collectInvitationPreviewMediaUrls(page, slug, mode).length), [page, slug, mode]);
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    if (!page || !protectedMedia) return;
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    void (async () => {
      try {
        const token = await readToken();
        if (!token) throw new Error('다시 로그인한 뒤 미리보기를 열어 주세요.');
        controller.signal.throwIfAborted();
        const resolved = await materializeInvitationPreviewMedia(page, slug, mode, token, controller.signal);
        if (controller.signal.aborted) { resolved.dispose(); return; }
        dispose = resolved.dispose;
        setResult({ source: page, slug, mode, sessionKey, readToken, page: resolved.page, error: '' });
      } catch {
        if (!controller.signal.aborted) {
          setResult({ source: page, slug, mode, sessionKey, readToken, page: null,
            error: '사진을 불러오지 못했습니다. 로그인 또는 미리보기 권한을 다시 확인해 주세요.' });
        }
      }
    })();
    return () => { controller.abort(); dispose?.(); };
  }, [page, protectedMedia, slug, mode, sessionKey, readToken]);

  if (!page || !protectedMedia) return { page: page ?? null, error: '', protectedMedia };
  const current = result?.source === page && result.slug === slug && result.mode === mode &&
    result.sessionKey === sessionKey && result.readToken === readToken ? result : null;
  return { page: current?.page ?? null, error: current?.error ?? '', protectedMedia };
}
