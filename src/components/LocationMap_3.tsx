'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './LocationMap_3.module.css';

interface LocationMapProps {
  location: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  naverMapUrl?: string;
  googleMapUrl?: string;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function LocationMap_3({
  location,
  address,
  coordinates,
  naverMapUrl,
  googleMapUrl
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState(false);
  const KAKAO_APP_KEY = '234add558ffec30aa714eb4644df46e3';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          if (mapRef.current) {
            const options = {
              center: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng),
              level: 3
            };

            const map = new window.kakao.maps.Map(mapRef.current, options);

            const markerPosition = new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng);
            const marker = new window.kakao.maps.Marker({
              position: markerPosition,
              map: map
            });

            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:10px 15px;font-size:14px;color:#333;font-weight:500;">${location}</div>`,
              removable: false
            });

            infowindow.open(map, marker);
            setMapLoaded(true);
          }
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [coordinates.lat, coordinates.lng, location]);

  return (
    <section className={styles.container}>
      {/* 우주 배경 */}
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>

      {/* 타이틀 */}
      <div className={styles.header}>
        <div className={styles.starIcon}>✦</div>
        <h2 className={styles.title}>Location</h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      {/* 장소 정보 */}
      <div className={styles.locationInfo}>
        <div className={styles.locationName}>{location}</div>
        <div className={styles.locationAddress}>{address}</div>
      </div>

      {/* 지도 컨테이너 */}
      <div className={styles.mapWrapper}>
        <div className={styles.mapContainer}>
          <div ref={mapRef} className={styles.map}></div>
          
          {/* 터치 컨트롤 오버레이 */}
          {!touchEnabled && (
            <div className={styles.mapOverlay}>
              <div className={styles.overlayMessage}>
                <svg className={styles.touchIcon} viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C12 2 12 10 12 12M12 12C12 14 12 22 12 22M12 12C14 12 22 12 22 12M12 12C10 12 2 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>지도를 움직이려면 컨트롤을 활성화하세요</span>
              </div>
            </div>
          )}

          {/* 터치 컨트롤 버튼 */}
          <button
            onClick={() => setTouchEnabled(!touchEnabled)}
            className={`${styles.controlButton} ${touchEnabled ? styles.controlActive : ''}`}
            aria-label={touchEnabled ? '지도 컨트롤 비활성화' : '지도 컨트롤 활성화'}
          >
            <svg className={styles.controlIcon} viewBox="0 0 24 24" fill="none">
              {touchEnabled ? (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                  <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2"/>
                </>
              )}
            </svg>
            <span className={styles.controlText}>
              {touchEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* 지도 앱 버튼들 */}
        <div className={styles.mapButtons}>
          <button
            onClick={() => {
              const kakaoUrl = `https://map.kakao.com/link/map/${location},${coordinates.lat},${coordinates.lng}`;
              window.open(kakaoUrl, '_blank');
            }}
            className={styles.mapButton}
          >
            <span className={styles.buttonLabel}>카카오맵</span>
            <svg className={styles.buttonArrow} viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {naverMapUrl && (
            <button
              onClick={() => window.open(naverMapUrl, '_blank')}
              className={styles.mapButton}
            >
              <span className={styles.buttonLabel}>네이버지도</span>
              <svg className={styles.buttonArrow} viewBox="0 0 24 24" fill="none">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {googleMapUrl && (
            <button
              onClick={() => window.open(googleMapUrl, '_blank')}
              className={styles.mapButton}
            >
              <span className={styles.buttonLabel}>구글지도</span>
              <svg className={styles.buttonArrow} viewBox="0 0 24 24" fill="none">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 장식 요소 */}
      <div className={styles.decorations}>
        <div className={styles.comet}></div>
        <div className={styles.planetRing}></div>
      </div>
    </section>
  );
}
