'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/contexts';
import { getCurrentFirebaseIdToken } from '@/services/adminAuth';
import { materializeInvitationMediaUrls } from '@/lib/invitationPreviewMedia';
import { getWizardProtectedMediaUrl, isStableInvitationImageReference } from '@/lib/invitationStableMedia';

type Result = { key: string; url: string; error: boolean };
function useAdminMediaObject(reference: string, slug: string, enabled: boolean, attempt = 0) {
  const { isAdminLoggedIn, authUser } = useAdmin();
  const uid = isAdminLoggedIn ? authUser?.uid ?? '' : '';
  const protectedRef = isStableInvitationImageReference(reference);
  const path = protectedRef ? getWizardProtectedMediaUrl(reference, slug) : null;
  const key = JSON.stringify([reference, slug, uid, attempt]);
  const [result, setResult] = useState<Result | null>(null);
  const current = result?.key === key && enabled && uid ? result : null;
  useEffect(() => {
    if (!enabled || !uid || !path) return;
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    void (async () => {
      try {
        const token = await getCurrentFirebaseIdToken();
        if (!token) throw new Error('Authentication required');
        controller.signal.throwIfAborted();
        const loaded = await materializeInvitationMediaUrls([path], slug, 'customer', token, controller.signal);
        if (controller.signal.aborted) { loaded.dispose(); return; }
        dispose = loaded.dispose;
        const url = loaded.objects.get(path);
        if (!url) { dispose(); throw new Error('Image unavailable'); }
        setResult({ key, url, error: false });
      } catch {
        if (!controller.signal.aborted) setResult({ key, url: '', error: true });
      }
    })();
    return () => { controller.abort(); dispose?.(); };
  }, [enabled, uid, path, slug, key]);
  return { protectedRef, url: protectedRef ? current?.url ?? '' : reference,
    error: protectedRef && (!uid || !path || current?.error === true) };
}

export function AdminMediaThumbnail({ reference, slug, alt, className }: {
  reference: string; slug: string; alt: string; className?: string;
}) {
  const marker = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const protectedRef = isStableInvitationImageReference(reference);
  useEffect(() => {
    if (!protectedRef || visible || !marker.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '120px' });
    observer.observe(marker.current);
    return () => observer.disconnect();
  }, [protectedRef, visible]);
  const media = useAdminMediaObject(reference, slug, visible);
  if (!protectedRef) return reference ? <img className={className} src={reference} alt={alt} loading="lazy" decoding="async" />
    : <span className={className}>미지원 이미지</span>;
  return <span ref={marker} className={className} style={{ display: 'block', minHeight: 48 }}>
    {media.url ? <img className={className} src={media.url} alt={alt} decoding="async" />
      : <span role="status">{media.error ? '사진 확인 필요' : '사진 불러오는 중'}</span>}
  </span>;
}

export function AdminMediaVariantLink({ reference, slug, label }: { reference: string; slug: string; label: string }) {
  const [attempt, setAttempt] = useState(0);
  const requested = attempt > 0;
  const media = useAdminMediaObject(reference, slug, requested, attempt);
  if (!reference) return <span>{label} 확인 필요</span>;
  if (!media.protectedRef || media.url) return <a href={media.url} target="_blank" rel="noreferrer">{label}</a>;
  return <button type="button" disabled={requested && !media.error} onClick={() => {
    setAttempt(value => value + 1);
  }}>{requested ? media.error ? label + ' 다시 불러오기' : label + ' 불러오는 중' : label + ' 불러오기'}</button>;
}
