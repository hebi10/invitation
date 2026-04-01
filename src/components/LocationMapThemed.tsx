'use client';

import { useEffect, useState } from 'react';

import { copyTextToClipboard } from '@/utils';
import {
  buildGoogleMapApiSearchUrl,
  buildKakaoMapSearchUrl,
  buildNaverMapSearchUrl,
  loadKakaoMapsSdk,
} from '@/utils/kakaoMaps';

interface LocationMapThemedProps {
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
  styles: Record<string, string>;
  mapId: string;
  title: string;
  subtitle: string;
  markerColor: string;
  controlBorder: string;
  controlRadius: string;
  controlFontFamily?: string;
  controlActiveColor: string;
}

declare global {
  interface Window {
    kakao?: any;
    kakaoMapInstance?: any;
  }
}

export default function LocationMapThemed({
  venueName,
  address,
  description,
  contact,
  kakaoMapConfig,
  styles,
  mapId,
  title,
  subtitle,
  markerColor,
  controlBorder,
  controlRadius,
  controlFontFamily,
  controlActiveColor,
}: LocationMapThemedProps) {
  const [isClient, setIsClient] = useState(false);
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(false);
  const [isAddressCopied, setIsAddressCopied] = useState(false);

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
        console.error('[LocationMapThemed] failed to load Kakao Maps SDK', error);
        setKakaoMapLoaded(true);
      });
  }, [isClient, mapId, venueName, kakaoMapConfig]);

  const initializeKakaoMap = () => {
    const container = document.getElementById(mapId);
    if (!container || !window.kakao?.maps) {
      return;
    }

    try {
      container.innerHTML = '';

      const defaultLat = kakaoMapConfig?.latitude || 37.5665;
      const defaultLng = kakaoMapConfig?.longitude || 126.978;
      const mapLevel = kakaoMapConfig?.level || 3;

      const map = new window.kakao.maps.Map(container, {
        center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
        level: mapLevel,
      });

      map.setZoomable(false);
      map.setDraggable(false);

      const coords = new window.kakao.maps.LatLng(
        kakaoMapConfig?.latitude || defaultLat,
        kakaoMapConfig?.longitude || defaultLng,
      );

      map.setCenter(coords);

      const marker = new window.kakao.maps.Marker({
        map,
        position: coords,
      });

      const markerTitle = kakaoMapConfig?.markerTitle || venueName || '예식장';
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="width:200px;text-align:center;padding:8px 0;font-size:13px;font-weight:600;color:${markerColor};">${markerTitle}</div>`,
      });

      infowindow.open(map, marker);

      window.setTimeout(() => {
        map.relayout();
        map.setCenter(coords);
      }, 50);

      window.kakaoMapInstance = map;
      setKakaoMapLoaded(true);
    } catch (error) {
      console.error('[LocationMapThemed] failed to initialize map instance', error);
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

  const copyAddress = async () => {
    const copied = await copyTextToClipboard(address);
    if (!copied) {
      return;
    }

    setIsAddressCopied(true);
    window.setTimeout(() => setIsAddressCopied(false), 2000);
  };

  return (
    <section className={styles.container}>
      {'topDecoration' in styles && (
        <svg className={styles.topDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      )}

      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.venueInfo}>
        <h3 className={styles.venueName}>{venueName}</h3>
        <p className={styles.address}>{address}</p>
        {description && <p className={styles.description}>{description}</p>}
      </div>

      <div className={styles.mapContainer}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div id={mapId} className={styles.map}></div>
          {!kakaoMapLoaded && (
            <div className={styles.mapLoading}>
              <div className={styles.spinner}></div>
              <p>지도를 불러오는 중입니다.</p>
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
              border: controlBorder,
              padding: '8px 16px',
              borderRadius: controlRadius,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              color: controlEnabled ? controlActiveColor : '#999',
              transition: 'all 0.3s ease',
              pointerEvents: 'auto',
              fontFamily: controlFontFamily,
            }}
            type="button"
          >
            {controlEnabled ? '지도 고정' : '지도 움직이기'}
          </button>
        </div>
      </div>

      <div className={styles.buttonGrid}>
        <button className={styles.mapButton} onClick={copyAddress} type="button">
          {isAddressCopied ? '복사 완료' : '주소 복사'}
        </button>
        <button className={styles.mapButton} onClick={() => window.open(buildKakaoMapSearchUrl(address), '_blank')} type="button">
          카카오맵
        </button>
        <button className={styles.mapButton} onClick={() => window.open(buildNaverMapSearchUrl(address), '_blank')} type="button">
          네이버지도
        </button>
        <button className={styles.mapButton} onClick={() => window.open(buildGoogleMapApiSearchUrl(address), '_blank')} type="button">
          구글지도
        </button>
      </div>

      {contact && (
        <div className={styles.contact}>
          <p className={styles.contactLabel}>문의</p>
          <p className={styles.contactInfo}>{contact}</p>
        </div>
      )}

      {'bottomDecoration' in styles && (
        <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      )}
    </section>
  );
}
