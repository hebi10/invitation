'use client';

import { useState, useEffect } from 'react';
import styles from './LocationMap.module.css';

declare global {
  interface Window {
    kakao: any;
  }
}

interface LocationMapProps {
  mapUrl?: string; // Google Maps embed URL
  address: string;
  venueName: string;
  description?: string;
}

type MapType = 'google' | 'kakao';

export default function LocationMap({ 
  mapUrl, 
  address, 
  venueName, 
  description
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [activeMapType, setActiveMapType] = useState<MapType>('google');
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);

  // 클라이언트 사이드에서만 실행되도록 보장
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 카카오 지도 API 로드
  useEffect(() => {
    if (!isClient) return;

    const loadKakaoMap = () => {
      // 카카오맵 스크립트가 이미 로드되어 있는지 확인
      if (window.kakao && window.kakao.maps) {
        initKakaoMap();
        return;
      }

      // 카카오맵 스크립트 동적 로드
      const script = document.createElement('script');
      script.async = true;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=234add558ffec30aa714eb4644df46e3&autoload=false`;
      
      script.onload = () => {
        window.kakao.maps.load(() => {
          initKakaoMap();
        });
      };
      
      document.head.appendChild(script);
    };

    const initKakaoMap = () => {
      try {
        // 주소로 좌표 검색
        const geocoder = new window.kakao.maps.services.Geocoder();
        
        geocoder.addressSearch(address, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            
            const mapContainer = document.getElementById('kakao-map');
            if (!mapContainer) return;

            const mapOption = {
              center: coords,
              level: 3
            };

            const map = new window.kakao.maps.Map(mapContainer, mapOption);
            
            // 마커 생성
            const marker = new window.kakao.maps.Marker({
              position: coords
            });
            marker.setMap(map);

            // 인포윈도우 생성
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:10px;font-size:14px;text-align:center;"><strong>${venueName}</strong><br/>${address}</div>`
            });
            
            // 마커 클릭 시 인포윈도우 표시
            window.kakao.maps.event.addListener(marker, 'click', () => {
              infowindow.open(map, marker);
            });

            setKakaoMapLoaded(true);
          } else {
            console.error('카카오맵 주소 검색 실패');
            setKakaoMapLoaded(false);
          }
        });
      } catch (error) {
        console.error('카카오맵 초기화 실패:', error);
        setKakaoMapLoaded(false);
      }
    };

    if (activeMapType === 'kakao') {
      loadKakaoMap();
    }
  }, [isClient, activeMapType, address, venueName]);

  // 주소 복사 함수
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      alert('주소가 복사되었습니다!');
    } catch (err) {
      console.error('주소 복사 실패:', err);
    }
  };

  // 지도 앱으로 열기 함수들
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

          <div className={styles.infoContainer}>
            <div className={styles.venueInfo}>
              <h3 className={styles.venueName}>
                <span className={styles.venueIcon}>🏛️</span>
                {venueName}
              </h3>
              
              <div className={styles.addressSection}>
                <p className={styles.address}>
                  <span className={styles.addressIcon}>📍</span>
                  {address}
                </p>
                <button 
                  className={styles.copyButton}
                  onClick={copyAddress}
                >
                  📋 복사
                </button>
              </div>

              {description && (
                <p className={styles.description}>
                  <span className={styles.descriptionIcon}>�</span>
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
      ) : (
        // 폴백: 지도 URL이 없는 경우
        <div className={styles.fallbackContainer}>
          <div className={styles.fallbackContent}>
            <span className={styles.fallbackIcon}>🗺️</span>
            <h3 className={styles.fallbackTitle}>지도를 준비 중입니다</h3>
            <p className={styles.fallbackMessage}>
              지도 정보가 설정되지 않았습니다.
            </p>
            <div className={styles.fallbackInfo}>
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
          </div>
        </div>
      )
    </div>
  );
}
