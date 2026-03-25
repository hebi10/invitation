'use client';

import { useEffect, useRef, useState } from 'react';

import { copyTextToClipboard } from '@/utils';

import styles from './LocationMap_2.module.css';

declare global {
  interface Window {
    kakao: any;
    kakaoMapInstance_2?: any;
  }
}

interface LocationMapProps {
  latitude: number;
  longitude: number;
  placeName: string;
  address: string;
  roadAddress?: string;
}

export default function LocationMap_2({
  latitude,
  longitude,
  placeName,
  address,
  roadAddress,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    const initializeKakaoMap = () => {
      try {
        const container = mapRef.current;
        if (!container) {
          return;
        }

        const map = new window.kakao.maps.Map(container, {
          center: new window.kakao.maps.LatLng(latitude, longitude),
          level: 3,
        });

        const markerPosition = new window.kakao.maps.LatLng(latitude, longitude);
        const marker = new window.kakao.maps.Marker({ position: markerPosition });
        marker.setMap(map);

        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:15px;font-size:14px;text-align:center;"><strong>${placeName}</strong></div>`,
          removable: false,
        });
        infoWindow.open(map, marker);

        window.kakaoMapInstance_2 = map;
        map.setZoomable(false);
        map.setDraggable(false);
      } catch (error) {
        console.error('LocationMap_2 map init failed:', error);
        setMapError(true);
      }
    };

    if (window.kakao?.maps) {
      window.kakao.maps.load(initializeKakaoMap);
      return;
    }

    script = document.createElement('script');
    script.async = true;
    script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=234add558ffec30aa714eb4644df46e3&autoload=false';
    script.onload = () => {
      if (!window.kakao?.maps) {
        setMapError(true);
        return;
      }

      window.kakao.maps.load(initializeKakaoMap);
    };
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);

    return () => {
      if (script?.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [latitude, longitude, placeName]);

  const toggleControl = () => {
    const map = window.kakaoMapInstance_2;
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

  const handleCopyAddress = async (text: string, key: string) => {
    const copied = await copyTextToClipboard(text);
    if (!copied) {
      return;
    }

    setCopiedTarget(key);
    window.setTimeout(() => {
      setCopiedTarget((current) => (current === key ? null : current));
    }, 2000);
  };

  const openKakaoMap = () => {
    const url = `https://map.kakao.com/link/map/${placeName},${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>오시는 길</h2>

      <div className={styles.addressSection}>
        <div className={styles.addressItem}>
          <span className={styles.addressLabel}>지번</span>
          <div className={styles.addressContent}>
            <span className={styles.addressText}>{address}</span>
            <button onClick={() => handleCopyAddress(address, 'address')} className={styles.copyButton} aria-label="주소 복사">
              {copiedTarget === 'address' ? '완료' : '복사'}
            </button>
          </div>
        </div>
        {roadAddress && (
          <div className={styles.addressItem}>
            <span className={styles.addressLabel}>도로명</span>
            <div className={styles.addressContent}>
              <span className={styles.addressText}>{roadAddress}</span>
              <button
                onClick={() => handleCopyAddress(roadAddress, 'roadAddress')}
                className={styles.copyButton}
                aria-label="도로명 주소 복사"
              >
                {copiedTarget === 'roadAddress' ? '완료' : '복사'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.mapWrapper}>
        {mapError ? (
          <div className={styles.mapError}>지도를 불러올 수 없습니다.</div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapRef} className={styles.map}></div>

            {!controlEnabled && (
              <div
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
              onClick={toggleControl}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                zIndex: 100,
                background: 'white',
                border: '1px solid #ccc',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                pointerEvents: 'auto',
              }}
            >
              {controlEnabled ? '지도 고정' : '지도 움직이기'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.buttonGroup}>
        <button onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address)}`, '_blank')} className={styles.button}>
          네이버지도
        </button>
        <button onClick={openKakaoMap} className={styles.button}>
          카카오맵
        </button>
        <button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank')} className={styles.button}>
          구글지도
        </button>
      </div>
    </section>
  );
}
