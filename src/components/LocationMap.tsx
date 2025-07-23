'use client';

import { useState, useEffect } from 'react';
import styles from './LocationMap.module.css';

interface LocationMapProps {
  mapUrl?: string; // Google Maps embed URL
  address: string;
  venueName: string;
  description?: string;
}

export default function LocationMap({ 
  mapUrl, 
  address, 
  venueName, 
  description
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드에서만 실행되도록 보장
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 주소 복사 함수
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      alert('주소가 복사되었습니다!');
    } catch (err) {
      console.error('주소 복사 실패:', err);
    }
  };

  // 지도 앱으로 열기 함수들
  const openNaverMap = () => {
    window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address + ' ' + venueName)}`);
  };

  const openKakaoMap = () => {
    window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address + ' ' + venueName)}`);
  };

  const openGoogleMaps = () => {
    window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address + ' ' + venueName)}`);
  };

  // 클라이언트 사이드가 아니면 로딩 표시
  if (!isClient) {
    return (
      <div className={styles.wrapper}>
        <div style={{ 
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          margin: '1rem'
        }}>
          <span>지도 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Google Maps iframe */}
      {mapUrl ? (
        <div className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>오시는 길</h2>
          </div>

          <div className={styles.mapContainer}>
            <iframe
              src={mapUrl}
              className={styles.mapFrame}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className={styles.mapBadge}>
              <span className={styles.badgeIcon}>🔵</span>
              <span className={styles.badgeText}>Google Maps</span>
            </div>
          </div>

          <div className={styles.infoContainer}>
            <div className={styles.venueInfo}>
              <h3 className={styles.venueName}>
                <span className={styles.venueIcon}>🏛️</span>
                {venueName}
              </h3>
              
              <div className={styles.addressSection}>
                <p className={styles.address}>
                  <span className={styles.addressIcon}>📍</span>
                  {address}
                </p>
                <button 
                  className={styles.copyButton}
                  onClick={copyAddress}
                >
                  📋 복사
                </button>
              </div>

              {description && (
                <p className={styles.description}>
                  <span className={styles.descriptionIcon}>�</span>
                  {description}
                </p>
              )}
            </div>

            <div className={styles.mapButtons}>
              <h4 className={styles.mapButtonsTitle}>
                <span className={styles.navigationIcon}>🧭</span>
                길찾기
              </h4>
              <div className={styles.buttonGrid}>
                <button 
                  className={styles.mapButton}
                  onClick={openNaverMap}
                >
                  <span className={styles.buttonIcon}>🟢</span>
                  <span className={styles.buttonText}>네이버 지도</span>
                </button>
                <button 
                  className={styles.mapButton}
                  onClick={openKakaoMap}
                >
                  <span className={styles.buttonIcon}>🟡</span>
                  <span className={styles.buttonText}>카카오맵</span>
                </button>
                <button 
                  className={styles.mapButton}
                  onClick={openGoogleMaps}
                >
                  <span className={styles.buttonIcon}>🔵</span>
                  <span className={styles.buttonText}>구글 지도</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 폴백: 지도 URL이 없는 경우
        <div className={styles.fallbackContainer}>
          <div className={styles.fallbackContent}>
            <span className={styles.fallbackIcon}>🗺️</span>
            <h3 className={styles.fallbackTitle}>지도를 준비 중입니다</h3>
            <p className={styles.fallbackMessage}>
              Google Maps URL이 설정되지 않았습니다.
            </p>
            <div className={styles.fallbackInfo}>
              <h4 className={styles.venueName}>
                <span className={styles.venueIcon}>🏛️</span>
                {venueName}
              </h4>
              <p className={styles.address}>
                <span className={styles.addressIcon}>📍</span>
                {address}
              </p>
              {description && (
                <p className={styles.description}>
                  <span className={styles.descriptionIcon}>🚇</span>
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
