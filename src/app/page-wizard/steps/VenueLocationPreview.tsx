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
import locationStyles from './VenueLocationPreview.module.css';

type VenueLocationPreviewProps = {
  venueName: string;
  address: string;
  latitude: number;
  longitude: number;
  markerTitle?: string;
  venueLabel?: string;
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
  venueLabel = '예식장',
}: VenueLocationPreviewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const hasAddress = hasText(address);
  const hasCoordinates = hasValidCoordinates(latitude, longitude);
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>(
    hasCoordinates ? 'loading' : 'idle'
  );
  const resolvedVenueName = venueName.trim() || venueLabel;
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

        const kakao = window.kakao;
        if (cancelled || !mapRef.current || !kakao?.maps) {
          return;
        }

        const container = mapRef.current;
        container.innerHTML = '';

        const coords = new kakao.maps.LatLng(latitude, longitude);
        const map = new kakao.maps.Map(container, {
          center: coords,
          level: 3,
        });

        const marker = new kakao.maps.Marker({
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
    <section className={locationStyles.preview} aria-label="선택 위치 확인">
      <div className={locationStyles.header}>
        <div className={locationStyles.titleRow}>
          <strong className={styles.cardTitle}>선택 위치 확인</strong>
          <span className={locationStyles.status} role="status">
            {mapLoadState === 'ready'
              ? '지도 확인 가능'
              : mapLoadState === 'error'
              ? '지도 연결을 확인해 주세요'
              : hasCoordinates
              ? '지도 불러오는 중'
              : '주소 찾기가 필요합니다'}
          </span>
        </div>
        <p className={styles.fieldHint}>
          지도에 표시된 위치가 실제 장소와 일치하는지 확인해 주세요.
        </p>
      </div>

      <dl className={locationStyles.details}>
        <div>
          <dt>{venueLabel} 이름</dt>
          <dd>{resolvedVenueName}</dd>
        </div>
        <div>
          <dt>주소</dt>
          <dd>{address || '주소를 입력해 주세요.'}</dd>
        </div>
      </dl>

      {hasCoordinates ? (
        <div className={locationStyles.mapFrame}>
          <div ref={mapRef} className={locationStyles.mapCanvas} aria-label={`${resolvedVenueName} 위치 지도`} />
          {mapLoadState !== 'ready' ? (
            <div className={locationStyles.mapOverlay}>
              <span>
                {mapLoadState === 'error'
                  ? '지도를 불러오지 못했습니다. 아래 지도 앱으로 위치를 확인해 주세요.'
                  : '선택된 위치 지도를 불러오는 중입니다.'}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={locationStyles.empty}>
          주소 찾기를 누르면 선택된 위치가 여기 지도에 바로 표시됩니다.
        </div>
      )}

      <div className={locationStyles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => window.open(kakaoMapUrl, '_blank', 'noopener,noreferrer')}
        >
          카카오맵 열기
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() =>
            window.open(buildNaverMapSearchUrl(address), '_blank', 'noopener,noreferrer')
          }
        >
          네이버 지도
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() =>
            window.open(buildGoogleMapSearchUrl(address), '_blank', 'noopener,noreferrer')
          }
        >
          구글 지도
        </button>
      </div>
    </section>
  );
}
