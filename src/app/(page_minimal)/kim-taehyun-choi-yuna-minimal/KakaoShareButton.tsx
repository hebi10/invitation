'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePageImages } from '@/hooks';

interface KakaoShareButtonProps {
  title: string;
  description: string;
  imageUrl: string;
}

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function KakaoShareButton({ title, description, imageUrl }: KakaoShareButtonProps) {
  const [isKakaoReady, setIsKakaoReady] = useState(false);
  const pathname = usePathname();
  const pageSlug = pathname.split('/').pop()?.replace('-minimal', '') || '';
  const { mainImage } = usePageImages(pageSlug);
  const actualImageUrl = mainImage?.url || imageUrl;

  useEffect(() => {
    const initKakao = () => {
      if (typeof window !== 'undefined' && window.Kakao) {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY);
        }
        if (window.Kakao.Share) setIsKakaoReady(true);
      }
    };

    if (window.Kakao) {
      initKakao();
    } else {
      const checkKakao = setInterval(() => {
        if (window.Kakao) {
          initKakao();
          clearInterval(checkKakao);
        }
      }, 100);
      const timeout = setTimeout(() => clearInterval(checkKakao), 10000);
      return () => { clearInterval(checkKakao); clearTimeout(timeout); };
    }
  }, []);

  const handleKakaoShare = () => {
    if (typeof window !== 'undefined' && window.Kakao && window.Kakao.Share && isKakaoReady) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title, description, imageUrl: actualImageUrl, link: { mobileWebUrl: window.location.href, webUrl: window.location.href } },
        buttons: [{ title: '청첩장 보기', link: { mobileWebUrl: window.location.href, webUrl: window.location.href } }]
      });
    } else {
      alert('카카오톡 공유 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0 0' }}>
      <button onClick={handleKakaoShare} style={{ display: 'block', background: '#FEE500', border: 'none', padding: '0.8rem 1.5rem', margin: '0 auto', color: '#000', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '700px' }} onMouseOver={(e) => { e.currentTarget.style.background = '#E8D000'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#FEE500'; e.currentTarget.style.transform = 'translateY(0)'; }}>
        카카오톡 공유
      </button>
    </div>
  );
}
