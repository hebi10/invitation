'use client';

import { useEffect, useMemo, useState } from 'react';

import { usePageImages } from '@/hooks';

interface WeddingKakaoShareButtonProps {
  title: string;
  description: string;
  imageUrl: string;
  pageSlug: string;
  variant?: 'default' | 'space';
}

declare global {
  interface Window {
    Kakao: any;
  }
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
  transition: 'all 0.25s ease',
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
    hoverBackground: 'linear-gradient(135deg, #fff3bf 0%, #f3e4b7 100%)',
    hoverBoxShadow: '0 12px 28px rgba(87, 67, 32, 0.12)',
  },
  space: {
    background:
      'linear-gradient(135deg, rgba(142, 197, 252, 0.18) 0%, rgba(224, 195, 252, 0.22) 100%)',
    color: '#f5f8ff',
    borderColor: 'rgba(200, 220, 255, 0.24)',
    boxShadow: '0 12px 30px rgba(53, 83, 140, 0.22)',
    hoverBackground:
      'linear-gradient(135deg, rgba(142, 197, 252, 0.26) 0%, rgba(224, 195, 252, 0.3) 100%)',
    hoverBoxShadow: '0 14px 34px rgba(53, 83, 140, 0.32)',
  },
} as const;

export default function WeddingKakaoShareButton({
  title,
  description,
  imageUrl,
  pageSlug,
  variant = 'default',
}: WeddingKakaoShareButtonProps) {
  const [isKakaoReady, setIsKakaoReady] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const { mainImage } = usePageImages(pageSlug);
  const shareImageUrl = mainImage?.url || imageUrl;
  const variantStyle = buttonVariantStyles[variant];
  const kakaoAppKey =
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ||
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ||
    '';

  useEffect(() => {
    const initKakao = () => {
      if (!window.Kakao) {
        return;
      }

      if (!kakaoAppKey) {
        console.warn('[WeddingKakaoShareButton] missing Kakao JavaScript key');
        return;
      }

      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoAppKey);
      }

      if (window.Kakao.Share) {
        setIsKakaoReady(true);
      }
    };

    if (window.Kakao) {
      initKakao();
      return;
    }

    const checkKakao = window.setInterval(() => {
      if (window.Kakao) {
        initKakao();
        window.clearInterval(checkKakao);
      }
    }, 100);

    const timeout = window.setTimeout(() => {
      window.clearInterval(checkKakao);
    }, 10000);

    return () => {
      window.clearInterval(checkKakao);
      window.clearTimeout(timeout);
    };
  }, [kakaoAppKey]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timer = window.setTimeout(() => setFeedbackMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const buttonLabel = useMemo(() => {
    return feedbackMessage || '카카오톡으로 공유';
  }, [feedbackMessage]);

  const handleKakaoShare = () => {
    if (!kakaoAppKey) {
      setFeedbackMessage('카카오 공유 키가 설정되지 않았습니다');
      return;
    }

    if (!(window.Kakao && window.Kakao.Share && isKakaoReady)) {
      setFeedbackMessage('카카오 공유를 준비 중입니다');
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}`;

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: shareImageUrl,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: '청첩장 보기',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });

    setFeedbackMessage('카카오 공유창을 열었습니다');
  };

  return (
    <div
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
          background: variantStyle.background,
          color: variantStyle.color,
          boxShadow: variantStyle.boxShadow,
          borderColor: variantStyle.borderColor,
        }}
        onMouseOver={(event) => {
          event.currentTarget.style.background = variantStyle.hoverBackground;
          event.currentTarget.style.transform = 'translateY(-2px)';
          event.currentTarget.style.boxShadow = variantStyle.hoverBoxShadow;
        }}
        onMouseOut={(event) => {
          event.currentTarget.style.background = variantStyle.background;
          event.currentTarget.style.transform = 'translateY(0)';
          event.currentTarget.style.boxShadow = variantStyle.boxShadow;
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              variant === 'space' ? 'rgba(255,255,255,0.14)' : 'rgba(59,45,22,0.08)',
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
        >
          K
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
