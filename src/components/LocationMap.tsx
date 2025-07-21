'use client';

import styles from './LocationMap.module.css';

interface LocationMapProps {
  mapUrl: string;
  address: string;
  venueName: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export default function LocationMap({ 
  mapUrl, 
  address, 
  venueName, 
  description,
  latitude,
  longitude
}: LocationMapProps) {
  // 지도 앱으로 열기 함수들
  const openNaverMap = () => {
    if (latitude && longitude) {
      window.open(`https://map.naver.com/v5/search/${encodeURIComponent(venueName)}/place?c=${longitude},${latitude},15,0,0,0,dh`);
    } else {
      window.open(`https://map.naver.com/v5/search/${encodeURIComponent(venueName + ' ' + address)}`);
    }
  };

  const openKakaoMap = () => {
    if (latitude && longitude) {
      window.open(`https://map.kakao.com/link/map/${encodeURIComponent(venueName)},${latitude},${longitude}`);
    } else {
      window.open(`https://map.kakao.com/link/search/${encodeURIComponent(venueName + ' ' + address)}`);
    }
  };

  const openGoogleMap = () => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}&z=16`);
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(venueName + ' ' + address)}`);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      alert('주소가 복사되었습니다!');
    } catch (err) {
      // 구형 브라우저 지원
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('주소가 복사되었습니다!');
    }
  };
  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <span className={styles.titleIcon}>📍</span>
        <h2 className={styles.title}>오시는 길</h2>
        <span className={styles.titleIcon}>📍</span>
      </div>
      
      <div className={styles.mapContainer}>
        <iframe
          className={styles.mapFrame}
          src={mapUrl}
          title="Wedding venue location"
          allowFullScreen
        />
        <div className={styles.mapOverlay}>
          <span className={styles.mapIcon}>🗺️</span>
          <span className={styles.mapText}>지도를 드래그하여 확대/축소할 수 있습니다</span>
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
            <button className={styles.copyButton} onClick={copyAddress} title="주소 복사">
              📋
            </button>
          </div>
          {description && (
            <p className={styles.description}>
              <span className={styles.descriptionIcon}>🚇</span>
              {description}
            </p>
          )}
        </div>
        
        <div className={styles.mapButtons}>
          <h4 className={styles.mapButtonsTitle}>
            <span className={styles.navigationIcon}>🧭</span>
            지도 앱으로 길찾기
          </h4>
          <div className={styles.buttonGrid}>
            <button className={styles.mapButton} onClick={openNaverMap}>
              <span className={styles.buttonIcon}>🟢</span>
              <span className={styles.buttonText}>네이버 지도</span>
            </button>
            <button className={styles.mapButton} onClick={openKakaoMap}>
              <span className={styles.buttonIcon}>🟡</span>
              <span className={styles.buttonText}>카카오맵</span>
            </button>
            <button className={styles.mapButton} onClick={openGoogleMap}>
              <span className={styles.buttonIcon}>🔵</span>
              <span className={styles.buttonText}>구글 지도</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
