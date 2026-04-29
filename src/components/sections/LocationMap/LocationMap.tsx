'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { copyTextToClipboard } from '@/utils';
import {
  buildGoogleMapSearchUrl,
  buildKakaoMapSearchUrl,
  buildNaverMapSearchUrl,
  loadKakaoMapsSdk,
} from '@/utils/kakaoMaps';
import type { KakaoAddressSearchResult } from '@/types/kakao';

import styles from './LocationMap.module.css';

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

const venueInfoIconPaths = {
  header: '/images/001.png',
  venue: '/images/002.png',
  address: '/images/003.png',
  contact: '/images/004.png',
  transit: '/images/005.png',
} as const;

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function hasValidKakaoCoordinates(
  config?: {
    latitude: number;
    longitude: number;
    level?: number;
    markerTitle?: string;
  }
) {
  if (!config) {
    return false;
  }

  return (
    Number.isFinite(config.latitude) &&
    Number.isFinite(config.longitude) &&
    !(config.latitude === 0 && config.longitude === 0)
  );
}
export default function LocationMap({
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
  const hasAddress = hasText(address);
  const hasCoordinates = hasValidKakaoCoordinates(kakaoMapConfig);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const initializeKakaoMap = useCallback(() => {
    const container = mapRef.current;
    const kakao = window.kakao;
    if (!container || !kakao?.maps) {
      return;
    }

    try {
      container.innerHTML = '';

      const mapLevel = kakaoMapConfig?.level || 3;

      const options = {
        center: hasCoordinates
          ? new kakao.maps.LatLng(kakaoMapConfig!.latitude, kakaoMapConfig!.longitude)
          : new kakao.maps.LatLng(37.5665, 126.978),
        level: mapLevel,
      };

      const map = new kakao.maps.Map(container, options);

      if (hasCoordinates && kakaoMapConfig) {
        const coords = new kakao.maps.LatLng(
          kakaoMapConfig.latitude,
          kakaoMapConfig.longitude
        );

        map.setCenter(coords);

        const marker = new kakao.maps.Marker({
          map,
          position: coords,
        });

        const markerTitle = kakaoMapConfig.markerTitle || venueName;
        const infowindow = new kakao.maps.InfoWindow({
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

      const geocoder = new kakao.maps.services.Geocoder();

      geocoder.addressSearch(address.trim(), (result: KakaoAddressSearchResult[], status) => {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);

          map.setCenter(coords);

          const marker = new kakao.maps.Marker({
            map,
            position: coords,
          });

          const infowindow = new kakao.maps.InfoWindow({
            content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${venueName}</div>`,
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

        setKakaoMapLoaded(true);
      });
    } catch {
      setKakaoMapLoaded(true);
    }
  }, [address, hasCoordinates, kakaoMapConfig, venueName]);

  useEffect(() => {
    if (!isClient || (!hasAddress && !hasCoordinates)) {
      return;
    }

    void loadKakaoMapsSdk()
      .then(() => {
        initializeKakaoMap();
      })
      .catch(() => {
        setKakaoMapLoaded(true);
      });
  }, [hasAddress, hasCoordinates, initializeKakaoMap, isClient]);

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
    if (!hasAddress) {
      return;
    }

    const copied = await copyTextToClipboard(address);
    if (!copied) {
      return;
    }

    setIsAddressCopied(true);
    window.setTimeout(() => setIsAddressCopied(false), 2000);
  };

  if (!hasAddress && !hasCoordinates) {
    return null;
  }

  if (!isClient) {
    return (
      <div className={styles.wrapper}>
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '16px',
            margin: '1rem',
          }}
        >
          <span>지도를 불러오는 중입니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>오시는 길</h2>
        </div>

        <div className={styles.mapContainer}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div
              ref={mapRef}
              className={styles.mapFrame}
              style={{ width: '100%', height: '100%', borderRadius: '12px' }}
            />
            <div className={styles.mapBadge}>
              <span className={styles.badgeIcon}>🟡</span>
              <span className={styles.badgeText}>Kakao Map</span>
            </div>
            {!kakaoMapLoaded && (
              <div className={styles.mapLoading}>
                <span>카카오맵을 불러오는 중입니다.</span>
              </div>
            )}

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
              type="button"
            >
              {controlEnabled ? '지도 고정' : '지도 움직이기'}
            </button>
          </div>
        </div>

        <div className={styles.venueInfoSection}>
          <div className={styles.venueInfoHeader}>
            <Image
              src={venueInfoIconPaths.header}
              alt=""
              aria-hidden="true"
              width={42}
              height={42}
              className={styles.venueInfoHeaderIconImage}
            />
            <h3 className={styles.venueInfoTitle}>예식장 정보</h3>
          </div>

          <div className={styles.venueDetails}>
            <div className={styles.venueMainInfo}>
              <div className={styles.venueNameSection}>
                <Image
                  src={venueInfoIconPaths.venue}
                  alt=""
                  aria-hidden="true"
                  width={34}
                  height={34}
                  className={styles.venueInfoItemIconImage}
                />
                <span className={styles.venueName}>{venueName}</span>
              </div>

              {hasAddress && (
                <div className={styles.venueAddressSection}>
                  <Image
                    src={venueInfoIconPaths.address}
                    alt=""
                    aria-hidden="true"
                    width={34}
                    height={34}
                    className={styles.venueInfoItemIconImage}
                  />
                  <span className={styles.venueAddress}>{address}</span>
                </div>
              )}

              {contact && (
                <div className={styles.venueContactSection}>
                  <Image
                    src={venueInfoIconPaths.contact}
                    alt=""
                    aria-hidden="true"
                    width={34}
                    height={34}
                    className={styles.venueInfoItemIconImage}
                  />
                  <a
                    href={`tel:${contact.replace(/-/g, '')}`}
                    className={styles.venueContact}
                  >
                    {contact}
                  </a>
                </div>
              )}

              {description && (
                <div className={styles.venueDescriptionSection}>
                  <Image
                    src={venueInfoIconPaths.transit}
                    alt=""
                    aria-hidden="true"
                    width={34}
                    height={34}
                    className={styles.venueInfoItemIconImage}
                  />
                  <span className={styles.venueDescription}>{description}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasAddress && (
          <div className={styles.navigationSection}>
            <div className={styles.navigationHeader}>
              <span className={styles.navigationIcon}>🧭</span>
              <h3 className={styles.navigationTitle}>길찾기</h3>
            </div>

            <div className={styles.navigationButtons}>
              <button
                className={styles.navButton}
                onClick={handleCopyAddress}
                type="button"
              >
                <span className={styles.navButtonIcon}>⌘</span>
                <span className={styles.navButtonText}>
                  {isAddressCopied ? '복사 완료' : '주소 복사'}
                </span>
              </button>
              <button
                className={styles.navButton}
                onClick={() => window.open(buildNaverMapSearchUrl(address), '_blank')}
                type="button"
              >
                <span className={styles.navButtonIcon}>🟢</span>
                <span className={styles.navButtonText}>네이버 지도</span>
              </button>

              <button
                className={styles.navButton}
                onClick={() => window.open(buildKakaoMapSearchUrl(address), '_blank')}
                type="button"
              >
                <span className={styles.navButtonIcon}>🟡</span>
                <span className={styles.navButtonText}>카카오맵</span>
              </button>

              <button
                className={styles.navButton}
                onClick={() => window.open(buildGoogleMapSearchUrl(address), '_blank')}
                type="button"
              >
                <span className={styles.navButtonIcon}>🔵</span>
                <span className={styles.navButtonText}>구글 지도</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
