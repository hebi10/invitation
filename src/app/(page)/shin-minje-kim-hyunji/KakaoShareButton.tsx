'use client';

import { useEffect, useState } from 'react';

interface KakaoShareButtonProps {
  title: string;
  description: string;
  imageUrl: string;
}

// 카카오 SDK 타입 선언
declare global {
  interface Window {
    Kakao: any;
  }
}

export default function KakaoShareButton({ title, description, imageUrl }: KakaoShareButtonProps) {
  const [isKakaoReady, setIsKakaoReady] = useState(false);

  useEffect(() => {
    const initKakao = () => {
      if (typeof window !== 'undefined' && window.Kakao) {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY);
        }
        // Share API가 준비되었는지 확인
        if (window.Kakao.Share) {
          setIsKakaoReady(true);
        }
      }
    };

    // SDK가 이미 로드된 경우
    if (window.Kakao) {
      initKakao();
    } else {
      // SDK 로드를 기다림
      const checkKakao = setInterval(() => {
        if (window.Kakao) {
          initKakao();
          clearInterval(checkKakao);
        }
      }, 100);

      // 10초 후 타임아웃
      const timeout = setTimeout(() => {
        clearInterval(checkKakao);
      }, 10000);

      return () => {
        clearInterval(checkKakao);
        clearTimeout(timeout);
      };
    }
  }, []);

  const handleKakaoShare = () => {
    if (typeof window !== 'undefined' && window.Kakao && window.Kakao.Share && isKakaoReady) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description,
          imageUrl,
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
    } else {
      alert('카카오톡 공유 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      margin: '20px 0'
    }}>
      <button
        onClick={handleKakaoShare}
        style={{
          backgroundColor: '#FEE500',
          border: 'none',
          borderRadius: '25px',
          padding: '10px 24px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#3C1E1E',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        }}
      >
        💬 카카오톡으로 공유하기
      </button>
    </div>
  );
}
