'use client';

import { useEffect, useState } from 'react';
import styles from './LocationMap_1.module.css';

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
    kakaoMapInstance?: any;
  }
}

export default function LocationMap_1({ 
  mapUrl, 
  venueName, 
  address, 
  description,
  kakaoMapConfig
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [activeMapType, setActiveMapType] = useState<'google' | 'kakao'>('google');
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);
  const [zoomable, setZoomable] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

    const defaultLat = kakaoMapConfig?.latitude || 37.5665;
    const defaultLng = kakaoMapConfig?.longitude || 126.9780;
    const mapLevel = kakaoMapConfig?.level || 3;

    const options = {
      center: new window.kakao.maps.LatLng(defaultLat, defaultLng), 
      level: mapLevel
    };

    const map = new window.kakao.maps.Map(container, options);

    if (kakaoMapConfig) {
      const coords = new window.kakao.maps.LatLng(kakaoMapConfig.latitude, kakaoMapConfig.longitude);
      
      map.setCenter(coords);

      const marker = new window.kakao.maps.Marker({
        map: map,
        position: coords
      });

      const markerTitle = kakaoMapConfig.markerTitle || venueName || '웨딩홀';
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
            content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${venueName || '웨딩홀'}</div>`
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
        <div className={styles.loadingContainer}>
          <span>지도 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h2 className={styles.title}>오시는 길</h2>
        
        <div className={styles.mapTabs}>
          <button 
            className={`${styles.mapTab} ${activeMapType === 'google' ? styles.active : ''}`}
            onClick={() => setActiveMapType('google')}
          >
            Google
          </button>
          <button 
            className={`${styles.mapTab} ${activeMapType === 'kakao' ? styles.active : ''}`}
            onClick={() => setActiveMapType('kakao')}
          >
            Kakao
          </button>
        </div>

        <div className={styles.mapContainer}>
          {activeMapType === 'google' && mapUrl && (
            <iframe
              src={mapUrl}
              className={styles.mapFrame}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}

          {activeMapType === 'kakao' && (
            <div className={styles.kakaoMapWrapper}>
              <div 
                id="kakao-map" 
                className={styles.mapFrame}
              />
              {!kakaoMapLoaded && (
                <div className={styles.mapLoading}>
                  <span>카카오맵 로딩 중...</span>
                </div>
              )}
              <button 
                onClick={toggleZoomable}
                className={styles.zoomButton}
              >
                {zoomable ? '확대/축소 ON' : '확대/축소 OFF'}
              </button>
            </div>
          )}
        </div>

        <div className={styles.venueInfo}>
          <h3 className={styles.venueTitle}>예식장 정보</h3>
          <div className={styles.venueDetails}>
            <div className={styles.venueItem}>
              <span className={styles.venueLabel}>장소</span>
              <span className={styles.venueText}>{venueName}</span>
            </div>
            <div className={styles.venueItem}>
              <span className={styles.venueLabel}>주소</span>
              <span className={styles.venueText}>{address}</span>
            </div>
            {description && (
              <div className={styles.venueItem}>
                <span className={styles.venueLabel}>교통</span>
                <span className={styles.venueText}>{description}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.navigationSection}>
          <h3 className={styles.navigationTitle}>길찾기</h3>
          <div className={styles.navigationButtons}>
            <button 
              className={styles.navButton}
              onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address)}`, '_blank')}
            >
              네이버 지도
            </button>
            <button 
              className={styles.navButton}
              onClick={() => window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`, '_blank')}
            >
              카카오맵
            </button>
            <button 
              className={styles.navButton}
              onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank')}
            >
              구글 지도
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
