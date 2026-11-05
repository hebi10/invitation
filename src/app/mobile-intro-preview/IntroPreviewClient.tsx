'use client';

import { useState } from 'react';
import WeddingIntro from '@/components/sections/WeddingIntro/WeddingIntro';
import { SAMPLE_WEDDING_COVER } from '@/config/homeWeddingSample';
import { WEDDING_INTRO_OPTIONS, type WeddingIntroStyle } from '@/lib/weddingIntro';

export default function IntroPreviewClient({ style }: { style: WeddingIntroStyle }) {
  const [run, setRun] = useState(0);
  const option = WEDDING_INTRO_OPTIONS.find((item) => item.value === style);

  return (
    <main style={{ minHeight: '100dvh', background: '#faf8f5', color: '#2b2828', display: 'grid', alignContent: 'center', padding: 24, gap: 18, textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 13, letterSpacing: '0.1em' }}>WEDDING INVITATION</p>
      <h1 style={{ fontSize: 25, fontWeight: 600, margin: 0 }}>첫 화면 연출 미리보기</h1>
      <p style={{ margin: 0 }}>{option?.label ?? '사용 안 함'}</p>
      <p style={{ margin: 0, lineHeight: 1.8, color: '#6c625e' }}>
        {option?.description ?? '청첩장 표지를 바로 보여줍니다.'}
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>김도윤 · 이서연</p>
      <button
        type="button"
        onClick={() => setRun((current) => current + 1)}
        style={{ minHeight: 48, background: '#785847', border: '1px solid #785847', color: '#fff', fontSize: 15 }}
      >
        연출 다시 보기
      </button>
      <p style={{ margin: 0, fontSize: 12, color: '#6c625e' }}>샘플 이미지와 가상 정보만 사용하며 청첩장을 저장하거나 수정하지 않습니다.</p>
      {style !== 'none' ? (
        <WeddingIntro
          key={`${style}-${run}`}
          style={style}
          slug="mobile-intro-preview"
          groomName="김도윤"
          brideName="이서연"
          date="2027년 4월 17일"
          imageUrl={SAMPLE_WEDDING_COVER}
          theme="simple"
          preview
          connectToCover={false}
        />
      ) : null}
    </main>
  );
}
