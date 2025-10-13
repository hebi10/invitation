'use client';

import { useEffect, useState } from 'react';
import styles from './LocationMap.module.css';

interface LocationMapProps {
  mapUrl?: string;
  venueName: string;
  address: string;
  description?: string;
  kakaoMapConfig?: {
    latitude: number;
    longitude: number;
    level?: number;
    markerTitle?: string;
  };
}

declare global {
  interface Window {
    kakao: any;
    kakaoMapInstance?: any; // ✅ 카카오맵 인스턴스 저장용
  }
}

export default function LocationMap({ 
  mapUrl, 
  venueName, 
  address, 
  description,
  kakaoMapConfig
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [activeMapType, setActiveMapType] = useState<'google' | 'kakao'>('google');
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);
  const [zoomable, setZoomable] = useState(false); // ✅ 확대/축소 상태

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

    // config가 있으면 config 사용, 없으면 기본 서울 좌표
    const defaultLat = kakaoMapConfig?.latitude || 37.5665;
    const defaultLng = kakaoMapConfig?.longitude || 126.9780;
    const mapLevel = kakaoMapConfig?.level || 3;

    const options = {
      center: new window.kakao.maps.LatLng(defaultLat, defaultLng), 
      level: mapLevel
    };

    const map = new window.kakao.maps.Map(container, options);

    // kakaoMapConfig가 있으면 직접 좌표 사용, 없으면 주소 검색
    if (kakaoMapConfig) {
      const coords = new window.kakao.maps.LatLng(kakaoMapConfig.latitude, kakaoMapConfig.longitude);
      
      map.setCenter(coords);

      const marker = new window.kakao.maps.Marker({
        map: map,
        position: coords
      });

      const markerTitle = kakaoMapConfig.markerTitle || venueName;
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${markerTitle}</div>`
      });

      infowindow.open(map, marker);

      setTimeout(() => {
        map.relayout();
        map.setCenter(coords);
      }, 0);

      window.kakaoMapInstance = map;
      map.setZoomable(false);
      setKakaoMapLoaded(true);
    } else {
      // 기존 주소 검색 방식
      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

          map.setCenter(coords);

          const marker = new window.kakao.maps.Marker({
            map: map,
            position: coords
          });

          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${venueName}</div>`
          });

          infowindow.open(map, marker);

          setTimeout(() => {
            map.relayout();
            map.setCenter(coords);
          }, 0);

          window.kakaoMapInstance = map;
          map.setZoomable(false);
          setKakaoMapLoaded(true);
        } else {
          console.error('Kakao Maps 주소 검색 실패:', status);
          setKakaoMapLoaded(true);
        }
      });
    }
  };

  // ✅ 확대/축소 토글
  const toggleZoomable = () => {
    const map = window.kakaoMapInstance;
    if (!map) return;

    const newState = !zoomable;
    map.setZoomable(newState);
    setZoomable(newState);
  };

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
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div 
                id="kakao-map" 
                className={styles.mapFrame}
                style={{ width: '100%', height: '100%', borderRadius: '12px' }}
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
              {/* ✅ 확대/축소 버튼 */}
              <button 
                onClick={toggleZoomable}
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  zIndex: 10,
                  background: 'white',
                  border: '1px solid #ccc',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                {zoomable ? '확대/축소 ON' : '확대/축소 OFF'}
              </button>
            </div>
          )}
        </div>

        {/* 예식장 정보 섹션 */}
        <div className={styles.venueInfoSection}>
          <div className={styles.venueInfoHeader}>
            <span className={styles.venueInfoIcon}>💒</span>
            <h3 className={styles.venueInfoTitle}>예식장 정보</h3>
          </div>
          
          <div className={styles.venueDetails}>
            <div className={styles.venueMainInfo}>
              <div className={styles.venueNameSection}>
                <span className={styles.venueIcon}>🏛️</span>
                <span className={styles.venueName}>{venueName}</span>
              </div>
              
              <div className={styles.venueAddressSection}>
                <span className={styles.addressIcon}>📍</span>
                <span className={styles.venueAddress}>{address}</span>
              </div>
              
              {description && (
                <div className={styles.venueDescriptionSection}>
                  <span className={styles.descIcon}>🚇</span>
                  <span className={styles.venueDescription}>{description}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 길찾기 버튼 섹션 */}
        <div className={styles.navigationSection}>
          <div className={styles.navigationHeader}>
            <span className={styles.navigationIcon}>🧭</span>
            <h3 className={styles.navigationTitle}>길찾기</h3>
          </div>
          
          <div className={styles.navigationButtons}>
            <button 
              className={styles.navButton}
              onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address)}`, '_blank')}
            >
              <span className={styles.navButtonIcon}>🟢</span>
              <span className={styles.navButtonText}>네이버 지도</span>
            </button>
            
            <button 
              className={styles.navButton}
              onClick={() => window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`, '_blank')}
            >
              <span className={styles.navButtonIcon}>🟡</span>
              <span className={styles.navButtonText}>카카오맵</span>
            </button>
            
            <button 
              className={styles.navButton}
              onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank')}
            >
              <span className={styles.navButtonIcon}>🔵</span>
              <span className={styles.navButtonText}>구글 지도</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
