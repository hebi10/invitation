'use client';

import { useEffect, useRef, useState } from 'react';

import { copyTextToClipboard } from '@/utils';
import {
  buildGoogleMapSearchUrl,
  buildKakaoMapSearchUrl,
  buildNaverMapSearchUrl,
  loadKakaoMapsSdk,
} from '@/utils/kakaoMaps';

import styles from './LocationMapSimple.module.css';

interface LocationMapProps {
  venueName: string;
  address: string;
  description?: string;
  contact?: string;
  kakaoMapConfig?: {
    latitude: number;
    longitude: number;
    level?: number;
    markerTitle?: string;
  };
}

declare global {
  interface Window {
    kakao?: any;
    kakaoMapInstance?: any;
  }
}

export default function LocationMapSimple({
  venueName,
  address,
  description,
  contact,
  kakaoMapConfig,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);
  const [isAddressCopied, setIsAddressCopied] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    void loadKakaoMapsSdk()
      .then(() => {
        initializeKakaoMap();
      })
      .catch((error) => {
        console.error('[LocationMap] failed to load Kakao Maps SDK', error);
        setKakaoMapLoaded(true);
      });
  }, [isClient, address, venueName, kakaoMapConfig]);

  const initializeKakaoMap = () => {
    const container = mapRef.current;
    if (!container || !window.kakao?.maps) {
      return;
    }

    try {
      container.innerHTML = '';

      const defaultLat = kakaoMapConfig?.latitude || 37.5665;
      const defaultLng = kakaoMapConfig?.longitude || 126.9780;
      const mapLevel = kakaoMapConfig?.level || 3;

      const options = {
        center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
        level: mapLevel,
      };

      const map = new window.kakao.maps.Map(container, options);

      if (kakaoMapConfig) {
        const coords = new window.kakao.maps.LatLng(
          kakaoMapConfig.latitude,
          kakaoMapConfig.longitude
        );

        map.setCenter(coords);

        const marker = new window.kakao.maps.Marker({
          map,
          position: coords,
        });

        const markerTitle = kakaoMapConfig.markerTitle || venueName || '웨딩홀';
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${markerTitle}</div>`,
        });

        infowindow.open(map, marker);

        window.setTimeout(() => {
          map.relayout();
          map.setCenter(coords);
        }, 50);

        window.kakaoMapInstance = map;
        map.setZoomable(false);
        map.setDraggable(false);
        setKakaoMapLoaded(true);
        return;
      }

      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

          map.setCenter(coords);

          const marker = new window.kakao.maps.Marker({
            map,
            position: coords,
          });

          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${venueName || '웨딩홀'}</div>`,
          });

          infowindow.open(map, marker);

          window.setTimeout(() => {
            map.relayout();
            map.setCenter(coords);
          }, 50);

          window.kakaoMapInstance = map;
          map.setZoomable(false);
          map.setDraggable(false);
          setKakaoMapLoaded(true);
          return;
        }

        console.error('[LocationMap] address search failed', status);
        setKakaoMapLoaded(true);
      });
    } catch (error) {
      console.error('[LocationMap] failed to initialize map instance', error);
      setKakaoMapLoaded(true);
    }
  };

  const toggleControl = () => {
    const map = window.kakaoMapInstance;
    if (!map) {
      return;
    }

    setControlEnabled((prev) => {
      const next = !prev;
      map.setZoomable(next);
      map.setDraggable(next);
      return next;
    });
  };

  const handleCopyAddress = async () => {
    const copied = await copyTextToClipboard(address);
    if (!copied) {
      return;
    }

    setIsAddressCopied(true);
    window.setTimeout(() => setIsAddressCopied(false), 2000);
  };

  if (!isClient) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingContainer}>
          <span>지도를 불러오는 중입니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h2 className={styles.title}>오시는 길</h2>

        <div className={styles.mapContainer}>
          <div className={styles.kakaoMapWrapper}>
            <div ref={mapRef} className={styles.mapFrame} />
            {!kakaoMapLoaded && (
              <div className={styles.mapLoading}>
                <span>카카오맵을 불러오는 중입니다.</span>
              </div>
            )}

            {!controlEnabled && (
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  zIndex: 5,
                  cursor: 'not-allowed',
                  pointerEvents: 'auto',
                }}
              />
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleControl();
            }}
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              zIndex: 100,
              background: 'white',
              border: '1px solid #dee2e6',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              fontFamily: 'Arial, sans-serif',
              color: '#495057',
              transition: 'all 0.3s ease',
              pointerEvents: 'auto',
            }}
            type="button"
          >
            {controlEnabled ? '지도 고정' : '지도 움직이기'}
          </button>
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
              <div className={styles.addressContent}>
                <span className={styles.venueText}>{address}</span>
                <button
                  className={styles.addressCopyButton}
                  onClick={handleCopyAddress}
                  type="button"
                >
                  {isAddressCopied ? '복사 완료' : '주소 복사'}
                </button>
              </div>
            </div>
            {contact && (
              <div className={styles.venueItem}>
                <span className={styles.venueLabel}>전화</span>
                <a
                  href={`tel:${contact.replace(/-/g, '')}`}
                  className={styles.venueContact}
                >
                  {contact}
                </a>
              </div>
            )}
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
              onClick={() => window.open(buildNaverMapSearchUrl(address), '_blank')}
              type="button"
            >
              네이버 지도
            </button>
            <button
              className={styles.navButton}
              onClick={() => window.open(buildKakaoMapSearchUrl(address), '_blank')}
              type="button"
            >
              카카오맵
            </button>
            <button
              className={styles.navButton}
              onClick={() => window.open(buildGoogleMapSearchUrl(address), '_blank')}
              type="button"
            >
              구글 지도
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
