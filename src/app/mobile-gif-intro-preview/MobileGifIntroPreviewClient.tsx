'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import type { InvitationIntroPreset } from '@/lib/invitationIntroCatalog';

export default function MobileGifIntroPreviewClient({
  preset,
}: {
  preset: InvitationIntroPreset;
}) {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setMotionAllowed(!preference.matches);
    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => preference.removeEventListener('change', syncPreference);
  }, []);

  const showGif = motionAllowed && !gifFailed;
  const source = showGif ? `${preset.gifSrc}?replay=${run}` : preset.posterSrc;

  return (
    <main
      data-intro-gif-preview
      style={{
        background: '#fff',
        color: '#252525',
        minHeight: '100dvh',
        display: 'grid',
        justifyItems: 'center',
        alignContent: 'center',
        padding: 20,
        gap: 14,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>인트로 GIF 미리보기</h1>
      <p style={{ fontSize: 15, margin: 0 }}>{preset.label}</p>
      <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{preset.description}</p>
      <div
        style={{
          width: 'min(100%, 320px)',
          border: '1px solid #d8d8d8',
          background: '#f7f7f7',
          padding: 8,
        }}
      >
        <Image
          key={`${preset.id}-${showGif ? run : 'poster'}`}
          src={source}
          alt={`${preset.label} ${showGif ? 'GIF 재생' : '정지 포스터'}`}
          width={480}
          height={600}
          unoptimized
          onError={() => setGifFailed(true)}
          style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '58dvh', objectFit: 'contain' }}
        />
      </div>
      {gifFailed ? (
        <p role="status" style={{ color: '#555', margin: 0, fontSize: 13 }}>
          GIF를 불러오지 못해 정지 포스터로 대체했습니다.
        </p>
      ) : !motionAllowed ? (
        <p role="status" style={{ color: '#555', margin: 0, fontSize: 13 }}>
          모션 감소 설정에 따라 정지 포스터만 표시합니다.
        </p>
      ) : null}
      <button
        type="button"
        disabled={!motionAllowed}
        onClick={() => {
          setGifFailed(false);
          setRun((current) => current + 1);
        }}
        style={{
          width: 'min(100%, 320px)',
          minHeight: 48,
          padding: '12px 18px',
          border: '1px solid #333',
          background: motionAllowed ? '#333' : '#eee',
          color: motionAllowed ? '#fff' : '#666',
          fontSize: 15,
        }}
      >
        2초 GIF 다시 보기
      </button>
      <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.6 }}>
        샘플 파일만 재생합니다. 고객 정보와 저장값은 변경되지 않습니다.
      </p>
    </main>
  );
}
