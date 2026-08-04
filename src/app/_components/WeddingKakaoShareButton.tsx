'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getPublicKakaoJavaScriptKey } from '@/lib/publicRuntimeConfig';
import type { InvitationShareMode } from '@/types/invitationPage';

import { buildKakaoShareImageCandidates } from './kakaoShareUtils';

const KAKAO_SHARE_SCRIPT_ID = 'kakao-share-sdk';
const KAKAO_SHARE_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
const KAKAO_SHARE_SDK_INTEGRITY =
  'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4';
let kakaoShareSdkPromise: Promise<NonNullable<Window['Kakao']>> | null = null;

function loadKakaoShareSdk() {
  if (window.Kakao) {
    return Promise.resolve(window.Kakao);
  }

  if (!kakaoShareSdkPromise) {
    kakaoShareSdkPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(
        KAKAO_SHARE_SCRIPT_ID
      ) as HTMLScriptElement | null;
      const handleLoad = () => {
        if (window.Kakao) {
          resolve(window.Kakao);
          return;
        }

        kakaoShareSdkPromise = null;
        reject(new Error('Kakao Share SDK did not initialize correctly.'));
      };
      const handleError = () => {
        kakaoShareSdkPromise = null;
        reject(new Error('Failed to load Kakao Share SDK.'));
      };

      if (existingScript) {
        existingScript.addEventListener('load', handleLoad, { once: true });
        existingScript.addEventListener('error', handleError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = KAKAO_SHARE_SCRIPT_ID;
      script.src = KAKAO_SHARE_SDK_URL;
      script.integrity = KAKAO_SHARE_SDK_INTEGRITY;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.head.appendChild(script);
    });
  }

  return kakaoShareSdkPromise;
}

interface WeddingKakaoShareButtonProps {
  title: string;
  description: string;
  imageUrl: string;
  fallbackImageUrl?: string;
  shareMode?: InvitationShareMode;
  variant?: 'default' | 'space' | 'classic';
}

const buttonBaseStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.7rem',
  minHeight: '48px',
  padding: '0.9rem 1.25rem',
  margin: '0 auto',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.95rem',
  transition:
    'color 0.25s ease, background-color 0.25s ease, border-color 0.25s ease, transform 0.25s ease',
  width: '100%',
  maxWidth: '700px',
  borderRadius: '16px',
  border: '1px solid transparent',
} as const;

const buttonVariantStyles = {
  default: {
    background: 'linear-gradient(135deg, #fff8df 0%, #f6edd0 100%)',
    color: '#3b2d16',
    borderColor: 'rgba(87, 67, 32, 0.12)',
    boxShadow: '0 10px 24px rgba(87, 67, 32, 0.08)',
  },
  space: {
    background:
      'linear-gradient(135deg, rgba(142, 197, 252, 0.18) 0%, rgba(224, 195, 252, 0.22) 100%)',
    color: '#f5f8ff',
    borderColor: 'rgba(200, 220, 255, 0.24)',
    boxShadow: '0 12px 30px rgba(53, 83, 140, 0.22)',
  },
  classic: {
    background: '#fbfaf7',
    color: '#302a24',
    borderColor: 'rgba(48, 42, 36, 0.28)',
    boxShadow: 'none',
    borderRadius: '0',
  },
} as const;

function buildLinkSharePayload(shareUrl: string, title: string, description: string) {
  return {
    objectType: 'text' as const,
    text: `${title}\n${description}`,
    link: {
      mobileWebUrl: shareUrl,
      webUrl: shareUrl,
    },
    buttons: [
      {
        title: '초대장 보기',
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  };
}

function buildCardSharePayload(
  shareUrl: string,
  title: string,
  description: string,
  imageUrl: string
) {
  return {
    objectType: 'feed' as const,
    content: {
      title,
      description,
      imageUrl,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: '초대장 보기',
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  };
}

function preloadShareImage(imageUrl: string) {
  if (!imageUrl || typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const image = new window.Image();
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);
    };

    const timeout = window.setTimeout(() => finish(false), 4000);

    image.onload = () => {
      window.clearTimeout(timeout);
      finish(true);
    };

    image.onerror = () => {
      window.clearTimeout(timeout);
      finish(false);
    };

    image.decoding = 'async';
    image.src = imageUrl;
  });
}

async function resolveCardShareImageUrl(candidates: string[]) {
  for (const candidate of candidates) {
    if (await preloadShareImage(candidate)) {
      return candidate;
    }
  }

  return '';
}

function openKakaoShare(payload: Record<string, unknown>) {
  const kakaoShare = window.Kakao?.Share;
  if (!kakaoShare) {
    throw new Error('Kakao Share SDK is not ready.');
  }

  kakaoShare.sendDefault(payload);
}

export default function WeddingKakaoShareButton({
  title,
  description,
  imageUrl,
  fallbackImageUrl,
  shareMode = 'card',
  variant = 'default',
}: WeddingKakaoShareButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isKakaoReady, setIsKakaoReady] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [resolvedCardImageUrl, setResolvedCardImageUrl] = useState('');
  const variantStyle = buttonVariantStyles[variant];
  const isClassicVariant = variant === 'classic';
  const kakaoAppKey = getPublicKakaoJavaScriptKey();
  const shareImageCandidates = useMemo(() => {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    return buildKakaoShareImageCandidates([imageUrl, fallbackImageUrl], origin);
  }, [fallbackImageUrl, imageUrl]);

  const prepareKakaoShare = useCallback(async () => {
    if (!kakaoAppKey) {
      return false;
    }

    try {
      const kakao = await loadKakaoShareSdk();
      if (!kakao.isInitialized()) {
        kakao.init(kakaoAppKey);
      }

      const ready = Boolean(kakao.Share);
      setIsKakaoReady(ready);
      return ready;
    } catch {
      return false;
    }
  }, [kakaoAppKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !kakaoAppKey) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      void prepareKakaoShare();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void prepareKakaoShare();
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [kakaoAppKey, prepareKakaoShare]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timer = window.setTimeout(() => setFeedbackMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  useEffect(() => {
    if (shareMode !== 'card') {
      setResolvedCardImageUrl('');
      return;
    }

    const initialCandidate = shareImageCandidates[0] ?? '';
    setResolvedCardImageUrl(initialCandidate);

    if (!initialCandidate) {
      return;
    }

    let cancelled = false;

    const prepareCardShareImage = async () => {
      const nextImageUrl = await resolveCardShareImageUrl(shareImageCandidates);

      if (cancelled) {
        return;
      }

      setResolvedCardImageUrl(nextImageUrl);
    };

    void prepareCardShareImage();

    return () => {
      cancelled = true;
    };
  }, [shareImageCandidates, shareMode]);

  const buttonLabel = useMemo(() => feedbackMessage || '카카오톡 공유하기', [feedbackMessage]);

  const handleKakaoShare = async () => {
    if (!kakaoAppKey) {
      setFeedbackMessage('카카오 공유 설정이 준비되지 않았습니다.');
      return;
    }

    if (!isKakaoReady && !(await prepareKakaoShare())) {
      setFeedbackMessage('카카오 공유를 준비하지 못했습니다.');
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}`;
    const linkPayload = buildLinkSharePayload(shareUrl, title, description);
    const cardImageUrl = resolvedCardImageUrl || shareImageCandidates[0] || '';

    try {
      if (shareMode === 'link') {
        openKakaoShare(linkPayload);
        setFeedbackMessage('카카오톡 공유를 열었습니다.');
        return;
      }

      if (!cardImageUrl) {
        openKakaoShare(linkPayload);
        setFeedbackMessage('대표 이미지 확인 후 링크 공유로 전환했습니다.');
        return;
      }

      openKakaoShare(buildCardSharePayload(shareUrl, title, description, cardImageUrl));
      setFeedbackMessage('카카오톡 공유를 열었습니다.');
    } catch (error) {
      console.error('[WeddingKakaoShareButton] failed to open Kakao share', error);

      if (shareMode === 'card') {
        try {
          openKakaoShare(linkPayload);
          setFeedbackMessage('카드 공유에 실패해 링크 공유로 전환했습니다.');
          return;
        } catch (fallbackError) {
          console.error(
            '[WeddingKakaoShareButton] failed to open Kakao link share fallback',
            fallbackError
          );
        }
      }

      setFeedbackMessage('카카오톡 공유를 열지 못했습니다.');
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '0.6rem',
        margin: '20px 0',
      }}
    >
      <button
        onClick={handleKakaoShare}
        type="button"
        style={{
          ...buttonBaseStyle,
          ...variantStyle,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: isClassicVariant ? 'auto' : '28px',
            height: isClassicVariant ? 'auto' : '28px',
            borderRadius: isClassicVariant ? '0' : '999px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              variant === 'space'
                ? 'rgba(255,255,255,0.14)'
                : isClassicVariant
                  ? 'transparent'
                  : 'rgba(59,45,22,0.08)',
            fontSize: isClassicVariant ? '0.72rem' : '0.82rem',
            fontWeight: 700,
            letterSpacing: isClassicVariant ? '0.14em' : '0',
          }}
        >
          {isClassicVariant ? 'KAKAO' : 'K'}
        </span>
        <span>{buttonLabel}</span>
      </button>
      {feedbackMessage ? (
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: '0.84rem',
            color:
              variant === 'space'
                ? 'rgba(245, 248, 255, 0.76)'
                : 'rgba(59, 45, 22, 0.72)',
          }}
        >
          {feedbackMessage}
        </p>
      ) : null}
    </div>
  );
}
