'use client';

import { useEffect, useRef, useState } from 'react';

import type {
  KakaoAddressSearchResult,
  KakaoLatLng,
  KakaoMapInstance,
} from '@/types/kakao';
import { loadKakaoMapsSdk } from '@/utils/kakaoMaps';

import styles from './romantic.module.css';

export interface RomanticKakaoMapConfig {
  latitude: number;
  longitude: number;
  level?: number;
  markerTitle?: string;
}

function readWindowKakaoMaps() {
  return window.kakao;
}

function hasValidRomanticKakaoCoordinates(config?: RomanticKakaoMapConfig) {
  if (!config) {
    return false;
  }

  return (
    Number.isFinite(config.latitude) &&
    Number.isFinite(config.longitude) &&
    !(config.latitude === 0 && config.longitude === 0)
  );
}

export default function RomanticLocationMap({
  address,
  kakaoMapConfig,
  venueName,
}: {
  address: string;
  kakaoMapConfig?: RomanticKakaoMapConfig;
  venueName: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(false);
  const hasAddress = Boolean(address.trim());
  const hasCoordinates = hasValidRomanticKakaoCoordinates(kakaoMapConfig);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (!hasAddress && !hasCoordinates) {
      setIsMapLoaded(true);
      return;
    }

    let cancelled = false;

    void loadKakaoMapsSdk()
      .then(() => {
        if (cancelled) {
          return;
        }

        const kakao = readWindowKakaoMaps();
        const container = mapRef.current;

        if (!container || !kakao?.maps) {
          setIsMapLoaded(true);
          return;
        }

        try {
          container.innerHTML = '';

          const map = new kakao.maps.Map(container, {
            center: hasCoordinates
              ? new kakao.maps.LatLng(kakaoMapConfig!.latitude, kakaoMapConfig!.longitude)
              : new kakao.maps.LatLng(37.5665, 126.978),
            level: kakaoMapConfig?.level || 3,
          });

          mapInstanceRef.current = map;

          const finalizeMap = (coords: KakaoLatLng, markerTitle: string) => {
            map.setCenter(coords);

            const marker = new kakao.maps.Marker({
              map,
              position: coords,
            });

            const infowindow = new kakao.maps.InfoWindow({
              content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${markerTitle}</div>`,
            });

            infowindow.open(map, marker);

            window.setTimeout(() => {
              map.relayout();
              map.setCenter(coords);
            }, 50);

            map.setZoomable(false);
            map.setDraggable(false);
            setIsMapLoaded(true);
          };

          if (hasCoordinates && kakaoMapConfig) {
            const coords = new kakao.maps.LatLng(kakaoMapConfig.latitude, kakaoMapConfig.longitude);
            finalizeMap(coords, kakaoMapConfig.markerTitle || venueName);
            return;
          }

          const geocoder = new kakao.maps.services.Geocoder();

          geocoder.addressSearch(
            address.trim(),
            (result: KakaoAddressSearchResult[], status) => {
              if (cancelled) {
                return;
              }

              if (status === kakao.maps.services.Status.OK && result?.[0]) {
                const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                finalizeMap(coords, venueName);
                return;
              }

              setIsMapLoaded(true);
            }
          );
        } catch {
          setIsMapLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsMapLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, hasAddress, hasCoordinates, isClient, kakaoMapConfig, venueName]);

  const toggleControl = () => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    setControlEnabled((current) => {
      const next = !current;
      map.setZoomable(next);
      map.setDraggable(next);
      return next;
    });
  };

  if (!hasAddress && !hasCoordinates) {
    return (
      <div className={styles.mapPlaceholder}>
        <div className={styles.mapLabel}>{venueName}</div>
      </div>
    );
  }

  return (
    <div className={styles.mapPlaceholder}>
      {isClient ? <div ref={mapRef} className={styles.mapFrame} /> : null}
      {!isMapLoaded ? (
        <div className={styles.mapLoading}>{'\uC9C0\uB3C4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.'}</div>
      ) : null}
      {!controlEnabled && isMapLoaded ? <div className={styles.mapInteractionShield} /> : null}
      <button type="button" className={styles.mapControlButton} onClick={toggleControl}>
        {controlEnabled ? '\uC9C0\uB3C4 \uACE0\uC815' : '\uC9C0\uB3C4 \uC6C0\uC9C1\uC774\uAE30'}
      </button>
      <div className={styles.mapLabel}>{venueName}</div>
    </div>
  );
}
