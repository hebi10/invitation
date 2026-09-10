'use client';

import { useEffect, useRef, useState } from 'react';

import type { KakaoMapInstance, KakaoMarkerInstance } from '@/types/kakao';
import { loadKakaoMapsSdk } from '@/utils/kakaoMaps';

import styles from './LocationMap.module.css';

interface LocationMapProps {
  address: string;
  venueName: string;
  kakaoMapConfig?: {
    latitude: number;
    longitude: number;
    level?: number;
    markerTitle?: string;
  };
  mapHref: string;
}

function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    && !(latitude === 0 && longitude === 0);
}

export default function LocationMap({ address, venueName, kakaoMapConfig, mapHref }: LocationMapProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<KakaoMapInstance | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const latitude = kakaoMapConfig?.latitude;
  const longitude = kakaoMapConfig?.longitude;
  const level = kakaoMapConfig?.level;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    let marker: KakaoMarkerInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const container = containerRef.current;
    setStatus('loading');
    setControlsEnabled(false);

    const fail = () => {
      if (cancelled) return;
      cancelled = true;
      marker?.setMap(null);
      resizeObserver?.disconnect();
      instanceRef.current = null;
      container?.replaceChildren();
      setStatus('failed');
    };
    // SDK or address requests can remain pending when blocked by the browser.
    const timeout = window.setTimeout(fail, 12000);

    void (async () => {
      try {
        const kakao = await loadKakaoMapsSdk();
        if (cancelled || !container) return;
        let lat = latitude;
        let lng = longitude;
        if (lat === undefined || lng === undefined || !validCoordinates(lat, lng)) {
          if (!address.trim()) throw new Error('Missing map address');
          const coordinates = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            new kakao.maps.services.Geocoder().addressSearch(address.trim(), (results, resultStatus) => {
              const result = results?.[0];
              if (resultStatus !== kakao.maps.services.Status.OK || !result
                || !validCoordinates(Number(result.y), Number(result.x))) {
                reject(new Error('Address coordinates unavailable'));
                return;
              }
              resolve({ lat: Number(result.y), lng: Number(result.x) });
            });
          });
          lat = coordinates.lat;
          lng = coordinates.lng;
        }
        if (cancelled) return;
        const position = new kakao.maps.LatLng(lat, lng);
        const map = new kakao.maps.Map(container, {
          center: position,
          level: level !== undefined && Number.isFinite(level) ? Math.min(14, Math.max(1, level)) : 3,
        });
        map.setZoomable(false);
        map.setDraggable(false);
        marker = new kakao.maps.Marker({ map, position });
        instanceRef.current = map;
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            if (cancelled) return;
            map.relayout();
            map.setCenter(position);
          });
          resizeObserver.observe(container);
        }
        window.clearTimeout(timeout);
        setStatus('ready');
      } catch {
        window.clearTimeout(timeout);
        fail();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      resizeObserver?.disconnect();
      marker?.setMap(null);
      instanceRef.current = null;
      container?.replaceChildren();
    };
  }, [address, latitude, longitude, level, shouldLoad]);

  const toggleControls = () => {
    const map = instanceRef.current;
    if (!map) return;
    const next = !controlsEnabled;
    map.setZoomable(next);
    map.setDraggable(next);
    setControlsEnabled(next);
  };

  return (
    <div ref={sectionRef} className={styles.locationMap}>
      <div className={styles.viewport}>
        <div
          ref={containerRef}
          className={`${styles.map} ${controlsEnabled ? styles.interactive : ''}`}
          aria-label={`${kakaoMapConfig?.markerTitle || venueName} 위치 지도`}
          aria-hidden={status !== 'ready'}
          style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
        />
        {status !== 'ready' && (
          <div className={styles.message} role="status">
            <p>{status === 'failed' ? '지도에서 위치를 확인해 주세요.' : '지도를 불러오는 중입니다.'}</p>
            <a href={mapHref} target="_blank" rel="noopener noreferrer">지도에서 위치 보기</a>
          </div>
        )}
      </div>
      {status === 'ready' && (
        <div className={styles.actions}>
          <button type="button" onClick={toggleControls} aria-pressed={controlsEnabled}>
            {controlsEnabled ? '지도 이동·확대 끄기' : '지도 이동·확대 켜기'}
          </button>
          <a href={mapHref} target="_blank" rel="noopener noreferrer">큰 지도 보기</a>
        </div>
      )}
    </div>
  );
}
