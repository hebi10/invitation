'use client';

import { useEffect, useState } from 'react';

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
  display: 'block',
  border: 'none',
  padding: '0.8rem 1.5rem',
  margin: '0 auto',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'all 0.3s ease',
  width: '100%',
  maxWidth: '700px',
} as const;

const buttonVariantStyles = {
  default: {
    background: '#FEE500',
    color: '#000',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    hoverBackground: '#E8D000',
    hoverBoxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  space: {
    background: 'linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%)',
    color: '#0a0e27',
    boxShadow: '0 4px 15px rgba(142, 197, 252, 0.4)',
    hoverBackground: 'linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%)',
    hoverBoxShadow: '0 6px 20px rgba(142, 197, 252, 0.6)',
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
  const { mainImage } = usePageImages(pageSlug);
  const shareImageUrl = mainImage?.url || imageUrl;
  const variantStyle = buttonVariantStyles[variant];

  useEffect(() => {
    const initKakao = () => {
      if (!window.Kakao) {
        return;
      }

      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY);
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
  }, []);

  const handleKakaoShare = () => {
    if (!(window.Kakao && window.Kakao.Share && isKakaoReady)) {
      alert('카카오톡 공유 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: shareImageUrl,
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
      buttons: [
        {
          title: '청첩장 보기',
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
      ],
    });
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        margin: '20px 0',
      }}
    >
      <button
        onClick={handleKakaoShare}
        style={{
          ...buttonBaseStyle,
          background: variantStyle.background,
          color: variantStyle.color,
          boxShadow: variantStyle.boxShadow,
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
        카카오톡 공유
      </button>
    </div>
  );
}
