'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

import { useDialogLayer } from '@/hooks/useDialogLayer';
import type { RegisteredInvitationIntroPreset } from '@/lib/invitationIntroCatalog';
import {
  publicInvitationGifIntroSessionKey,
  shouldShowPublicInvitationGifIntro,
} from '@/lib/publicInvitationIntro';

import styles from './PublicInvitationGifIntro.module.css';

type Props = {
  slug: string;
  preset: RegisteredInvitationIntroPreset;
  preview?: boolean;
};

export default function PublicInvitationGifIntro({
  slug,
  preset,
  preview = false,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [gifError, setGifError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [replay, setReplay] = useState(0);

  const close = useCallback(() => {
    setVisible(false);
    if (!preview) {
      try {
        sessionStorage.setItem(publicInvitationGifIntroSessionKey(slug, preset.id), 'seen');
      } catch {
        // Session storage may be disabled in private browsing.
      }
    }
  }, [slug, preset.id, preview]);

  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(publicInvitationGifIntroSessionKey(slug, preset.id)) === 'seen';
    } catch {
      // Session storage is optional.
    }
    setVisible(shouldShowPublicInvitationGifIntro({
      preview,
      hash: window.location.hash,
      seen,
    }));
  }, [slug, preset.id, preview]);

  useLayoutEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionEnabled(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useDialogLayer(root, { open: visible, onClose: close });

  if (!visible) return null;
  const showGif = motionEnabled && !gifError;
  const source = showGif ? `${preset.gifSrc}?replay=${replay}` : preset.posterSrc;

  return createPortal(
    <div
      className={styles.backdrop}
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="선택한 초대장 인트로"
      data-public-invitation-gif-intro={preset.id}
      data-preview={preview ? 'true' : 'false'}
    >
      <div className={styles.stage}>
        <figure className={styles.poster}>
          {!posterError ? (
            <Image
              key={`${preset.id}-${source}`}
              src={source}
              alt={`${preset.label} 인트로`}
              width={480}
              height={600}
              unoptimized
              priority
              onError={() => {
                if (showGif) setGifError(true);
                else setPosterError(true);
              }}
              className={styles.image}
            />
          ) : (
            <span className={styles.fallback}>선택하신 초대장에 오신 것을 환영합니다.</span>
          )}
        </figure>
        <p className={styles.description} aria-live="polite">
          {gifError
            ? 'GIF를 불러오지 못해 정지 이미지를 표시합니다.'
            : !motionEnabled
              ? '모션 감소 설정에 따라 정지 이미지를 표시합니다.'
              : `${preset.label} · ${preset.durationMs / 1000}초`}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            data-dialog-initial-focus
            onClick={close}
          >
            {preview ? '미리보기 닫기' : '초대장 보기'}
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={!motionEnabled}
            onClick={() => {
              setGifError(false);
              setPosterError(false);
              setReplay((value) => value + 1);
            }}
          >
            다시 보기
          </button>
        </div>
        {!preview ? (
          <button type="button" className={styles.skip} onClick={close}>
            건너뛰기
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
