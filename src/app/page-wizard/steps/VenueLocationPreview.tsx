'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  buildGoogleMapSearchUrl,
  buildKakaoMapPinUrl,
  buildKakaoMapSearchUrl,
  buildNaverMapSearchUrl,
  loadKakaoMapsSdk,
} from '@/utils/kakaoMaps';

import styles from '../page.module.css';

declare global {
  interface Window {
    kakao?: any;
  }
}

type VenueLocationPreviewProps = {
  venueName: string;
  address: string;
  latitude: number;
  longitude: number;
  markerTitle?: string;
};

type MapLoadState = 'idle' | 'loading' | 'ready' | 'error';

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function hasValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

export default function VenueLocationPreview({
  venueName,
  address,
  latitude,
  longitude,
  markerTitle,
}: VenueLocationPreviewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const hasAddress = hasText(address);
  const hasCoordinates = hasValidCoordinates(latitude, longitude);
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>(
    hasCoordinates ? 'loading' : 'idle'
  );
  const resolvedVenueName = venueName.trim() || '예식장';
  const resolvedMarkerTitle =
    markerTitle?.trim() || resolvedVenueName || address.trim() || '선택한 위치';

  const kakaoMapUrl = useMemo(() => {
    if (hasCoordinates) {
      return buildKakaoMapPinUrl(resolvedMarkerTitle, latitude, longitude);
    }

    return buildKakaoMapSearchUrl(address);
  }, [address, hasCoordinates, latitude, longitude, resolvedMarkerTitle]);

  useEffect(() => {
    if (!hasCoordinates) {
      setMapLoadState('idle');
      return;
    }

    let cancelled = false;
    setMapLoadState('loading');

    const initializeMap = async () => {
      try {
        await loadKakaoMapsSdk();

        if (cancelled || !mapRef.current || !window.kakao?.maps) {
          return;
        }

        const container = mapRef.current;
        container.innerHTML = '';

        const coords = new window.kakao.maps.LatLng(latitude, longitude);
        const map = new window.kakao.maps.Map(container, {
          center: coords,
          level: 3,
        });

        const marker = new window.kakao.maps.Marker({
          map,
          position: coords,
        });

        map.setCenter(coords);
        map.setZoomable(false);
        map.setDraggable(false);
        marker.setMap(map);

        window.setTimeout(() => {
          map.relayout();
          map.setCenter(coords);
        }, 50);

        if (!cancelled) {
          setMapLoadState('ready');
        }
      } catch {
        if (!cancelled) {
          setMapLoadState('error');
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
    };
  }, [hasCoordinates, latitude, longitude]);

  if (!hasAddress && !hasCoordinates) {
    return null;
  }

  return (
    <div className={styles.autoInfoCard}>
      <div className={styles.autoInfoHeader}>
        <div className={styles.autoInfoTitleRow}>
          <strong className={styles.cardTitle}>선택 위치 확인</strong>
          <span className={hasCoordinates ? styles.choiceSectionBadge : styles.autoStatusHint}>
            {hasCoordinates ? '지도 연결 완료' : '주소 찾기 후 지도 확인 가능'}
          </span>
        </div>
        <p className={styles.fieldHint}>
          주소 찾기 결과가 아래 지도와 주소 카드에 바로 반영됩니다.
        </p>
      </div>

      <div className={styles.autoInfoGrid}>
        <div className={`${styles.autoInfoItem} ${styles.autoInfoItemWide}`}>
          <span className={styles.autoInfoLabel}>예식장명</span>
          <span className={styles.autoInfoValue}>{resolvedVenueName}</span>
        </div>
        <div className={`${styles.autoInfoItem} ${styles.autoInfoItemWide}`}>
          <span className={styles.autoInfoLabel}>선택 주소</span>
          <span className={styles.autoInfoValue}>{address}</span>
        </div>
      </div>

      {hasCoordinates ? (
        <div className={styles.venueMapPreviewFrame}>
          <div ref={mapRef} className={styles.venueMapPreviewCanvas} />
          {mapLoadState !== 'ready' ? (
            <div className={styles.venueMapPreviewOverlay}>
              <span>
                {mapLoadState === 'error'
                  ? '지도를 불러오지 못했습니다. 아래 지도 앱으로 위치를 확인해 주세요.'
                  : '선택된 위치 지도를 불러오는 중입니다.'}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.autoInfoEmpty}>
          주소 찾기를 누르면 선택된 위치가 여기 지도에 바로 표시됩니다.
        </div>
      )}

      <div className={styles.venueMapPreviewActions}>
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.venueMapPreviewAction}`}
          onClick={() => window.open(kakaoMapUrl, '_blank', 'noopener,noreferrer')}
        >
          카카오맵 열기
        </button>
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.venueMapPreviewAction}`}
          onClick={() =>
            window.open(buildNaverMapSearchUrl(address), '_blank', 'noopener,noreferrer')
          }
        >
          네이버 지도
        </button>
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.venueMapPreviewAction}`}
          onClick={() =>
            window.open(buildGoogleMapSearchUrl(address), '_blank', 'noopener,noreferrer')
          }
        >
          구글 지도
        </button>
      </div>
    </div>
  );
}
