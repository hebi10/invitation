'use client';

import { useEffect, useState } from 'react';
import styles from './LocationMap.module.css';

interface LocationMapProps {
  mapUrl?: string;
  venueName: string;
  address: string;
  description?: string;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function LocationMap({ 
  mapUrl, 
  venueName, 
  address, 
  description 
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [activeMapType, setActiveMapType] = useState<'google' | 'kakao'>('google');
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Kakao Maps API 로드
  useEffect(() => {
    if (!isClient || activeMapType !== 'kakao') return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=234add558ffec30aa714eb4644df46e3&libraries=services&autoload=false`;
    
    script.onload = () => {
      window.kakao.maps.load(() => {
        initializeKakaoMap();
      });
    };
    
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [isClient, activeMapType, address, venueName]);

  const initializeKakaoMap = () => {
    const container = document.getElementById('kakao-map');
    if (!container) return;

    const options = {
      center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 기본 서울 좌표
      level: 3
    };

    const map = new window.kakao.maps.Map(container, options);
    const geocoder = new window.kakao.maps.services.Geocoder();

    // 주소로 좌표 검색
    geocoder.addressSearch(address, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        
        // 지도 중심을 결과값으로 받은 위치로 이동
        map.setCenter(coords);
        
        // 마커 생성
        const marker = new window.kakao.maps.Marker({
          map: map,
          position: coords
        });

        // 인포윈도우 생성
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${venueName}</div>`
        });
        
        infowindow.open(map, marker);
        setKakaoMapLoaded(true);
      } else {
        console.error('Kakao Maps 주소 검색 실패:', status);
        setKakaoMapLoaded(true); // 실패해도 로딩 상태는 해제
      }
    });
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      alert('주소가 복사되었습니다!');
    } catch (err) {
      console.error('주소 복사 실패:', err);
      alert('주소 복사에 실패했습니다.');
    }
  };

  const openNaverMap = () => {
    window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address + ' ' + venueName)}`);
  };

  const openKakaoMap = () => {
    window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address + ' ' + venueName)}`);
  };

  const openGoogleMaps = () => {
    window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address + ' ' + venueName)}`);
  };

  // 클라이언트 사이드가 아니면 로딩 표시
  if (!isClient) {
    return (
      <div className={styles.wrapper}>
        <div style={{ 
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          margin: '1rem'
        }}>
          <span>지도 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>오시는 길</h2>
          
          {/* 지도 타입 선택 탭 */}
          <div className={styles.mapTabs}>
            <button 
              className={`${styles.mapTab} ${activeMapType === 'google' ? styles.active : ''}`}
              onClick={() => setActiveMapType('google')}
            >
              <span className={styles.tabIcon}>🔵</span>
              Google
            </button>
            <button 
              className={`${styles.mapTab} ${activeMapType === 'kakao' ? styles.active : ''}`}
              onClick={() => setActiveMapType('kakao')}
            >
              <span className={styles.tabIcon}>🟡</span>
              Kakao
            </button>
          </div>
        </div>

        <div className={styles.mapContainer}>
          {/* Google Maps */}
          {activeMapType === 'google' && mapUrl && (
            <>
              <iframe
                src={mapUrl}
                className={styles.mapFrame}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className={styles.mapBadge}>
                <span className={styles.badgeIcon}>🔵</span>
                <span className={styles.badgeText}>Google Maps</span>
              </div>
            </>
          )}

          {/* Kakao Map */}
          {activeMapType === 'kakao' && (
            <>
              <div 
                id="kakao-map" 
                className={styles.mapFrame}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  borderRadius: '12px'
                }}
              />
              <div className={styles.mapBadge}>
                <span className={styles.badgeIcon}>🟡</span>
                <span className={styles.badgeText}>Kakao Map</span>
              </div>
              {!kakaoMapLoaded && (
                <div className={styles.mapLoading}>
                  <span>카카오맵 로딩 중...</span>
                </div>
              )}
            </>
          )}

          {/* 폴백: Google Maps URL이 없고 Google Maps 탭이 선택된 경우 */}
          {activeMapType === 'google' && !mapUrl && (
            <div className={styles.mapFallback}>
              <span className={styles.fallbackIcon}>🗺️</span>
              <p className={styles.fallbackMessage}>
                Google Maps URL이 설정되지 않았습니다.
              </p>
            </div>
          )}
        </div>

        {/* 장소 정보 */}
        <div className={styles.venueInfo}>
          <div className={styles.venueDetails}>
            <h3 className={styles.venueTitle}>
              <span className={styles.titleIcon}>💒</span>
              예식장 정보
            </h3>
            <div className={styles.venueCard}>
              <h4 className={styles.venueName}>
                <span className={styles.venueIcon}>🏛️</span>
                {venueName}
              </h4>
              <p className={styles.address}>
                <span className={styles.addressIcon}>📍</span>
                {address}
              </p>
              {description && (
                <p className={styles.description}>
                  <span className={styles.descriptionIcon}>🚇</span>
                  {description}
                </p>
              )}
            </div>

            <div className={styles.mapButtons}>
              <h4 className={styles.mapButtonsTitle}>
                <span className={styles.navigationIcon}>🧭</span>
                길찾기
              </h4>
              <div className={styles.buttonGrid}>
                <button 
                  className={styles.mapButton}
                  onClick={openNaverMap}
                >
                  <span className={styles.buttonIcon}>🟢</span>
                  <span className={styles.buttonText}>네이버 지도</span>
                </button>
                <button 
                  className={styles.mapButton}
                  onClick={openKakaoMap}
                >
                  <span className={styles.buttonIcon}>🟡</span>
                  <span className={styles.buttonText}>카카오맵</span>
                </button>
                <button 
                  className={styles.mapButton}
                  onClick={openGoogleMaps}
                >
                  <span className={styles.buttonIcon}>🔵</span>
                  <span className={styles.buttonText}>구글 지도</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
