'use client';

import { useEffect } from 'react';

interface KakaoShareButtonProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
}

const KakaoShareButton_1: React.FC<KakaoShareButtonProps> = ({
  title = "결혼식에 초대합니다",
  description = "저희의 소중한 날을 함께해 주세요",
  imageUrl,
  linkUrl
}) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.integrity = 'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init('45c4cb6f8bd30e01f86c3bd5de79b8ab');
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const shareKakao = () => {
    if (window.Kakao && window.Kakao.Share) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: description,
          imageUrl: imageUrl || 'https://your-default-image-url.com/default.jpg',
          link: {
            mobileWebUrl: linkUrl || window.location.href,
            webUrl: linkUrl || window.location.href,
          },
        },
        buttons: [
          {
            title: '청첩장 보기',
            link: {
              mobileWebUrl: linkUrl || window.location.href,
              webUrl: linkUrl || window.location.href,
            },
          },
        ],
      });
    }
  };

  return (
    <button 
      onClick={shareKakao}
      style={{
        background: '#FEE500',
        border: 'none',
        borderRadius: '8px',
        padding: '0.8rem 1.5rem',
        color: '#000',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = '#E8D000';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#FEE500';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      카카오톡 공유
    </button>
  );
};

declare global {
  interface Window {
    Kakao: any;
  }
}

export default KakaoShareButton_1;
