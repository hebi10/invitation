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
  googleMapUrl,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [touchEnabled, setTouchEnabled] = useState(false);
  const kakaoAppKey = '234add558ffec30aa714eb4644df46e3';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoAppKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (!window.kakao?.maps || !mapRef.current) {
        return;
      }

      window.kakao.maps.load(() => {
        if (!mapRef.current) {
          return;
        }

        const options = {
          center: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng),
          level: 3,
        };

        const map = new window.kakao.maps.Map(mapRef.current, options);
        const markerPosition = new window.kakao.maps.LatLng(
          coordinates.lat,
          coordinates.lng
        );
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          map,
        });

        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:10px 15px;font-size:14px;color:#333;font-weight:500;">${location}</div>`,
          removable: false,
        });

        infowindow.open(map, marker);
      });
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [coordinates.lat, coordinates.lng, kakaoAppKey, location]);

  return (
    <section className={styles.container}>
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>

      <div className={styles.header}>
        <div className={styles.starIcon}>✦</div>
        <h2 className={styles.title}>Location</h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      <div className={styles.locationInfo}>
        <div className={styles.locationName}>{location}</div>
        <div className={styles.locationAddress}>{address}</div>
      </div>

      <div className={styles.mapWrapper}>
        <div className={styles.mapContainer}>
          <div ref={mapRef} className={styles.map}></div>

          {!touchEnabled ? (
            <div className={styles.mapOverlay}>
              <div className={styles.overlayMessage}></div>
            </div>
          ) : null}

          <button
            onClick={() => setTouchEnabled((current) => !current)}
            className={`${styles.controlButton} ${
              touchEnabled ? styles.controlActive : ''
            }`}
            aria-label={touchEnabled ? '지도 컨트롤 비활성화' : '지도 컨트롤 활성화'}
          >
            <svg className={styles.controlIcon} viewBox="0 0 24 24" fill="none">
              {touchEnabled ? (
                <>
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <line
                    x1="2"
                    y1="2"
                    x2="22"
                    y2="22"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>
            <span className={styles.controlText}>
              컨트롤 {touchEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

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
              <path
                d="M7 17L17 7M17 7H7M17 7V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            onClick={() => {
              const naverUrl =
                naverMapUrl || `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;
              window.open(naverUrl, '_blank');
            }}
            className={styles.mapButton}
          >
            <span className={styles.buttonLabel}>네이버맵</span>
            <svg className={styles.buttonArrow} viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17L17 7M17 7H7M17 7V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            onClick={() => {
              const googleUrl =
                googleMapUrl ||
                `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
              window.open(googleUrl, '_blank');
            }}
            className={styles.mapButton}
          >
            <span className={styles.buttonLabel}>구글지도</span>
            <svg className={styles.buttonArrow} viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17L17 7M17 7H7M17 7V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.decorations}>
        <div className={styles.comet}></div>
        <div className={styles.planetRing}></div>
      </div>
    </section>
  );
}
