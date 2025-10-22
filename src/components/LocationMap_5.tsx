'use client';

import { useEffect, useState } from 'react';
import styles from './LocationMap_5.module.css';

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
    kakao: any;
    kakaoMapInstance?: any;
  }
}

export default function LocationMap_5({ 
  venueName, 
  address, 
  description,
  contact,
  kakaoMapConfig
}: LocationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=234add558ffec30aa714eb4644df46e3&libraries=services&autoload=false`;
    
    script.onload = () => {
      window.kakao.maps.load(() => {
        initializeKakaoMap();
      });
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [isClient]);

  const initializeKakaoMap = () => {
    const container = document.getElementById('kakao-map-5');
    if (!container) return;

    const defaultLat = kakaoMapConfig?.latitude || 37.5665;
    const defaultLng = kakaoMapConfig?.longitude || 126.9780;
    const mapLevel = kakaoMapConfig?.level || 3;

    const options = {
      center: new window.kakao.maps.LatLng(defaultLat, defaultLng), 
      level: mapLevel
    };

    const map = new window.kakao.maps.Map(container, options);

    map.setZoomable(false);
    map.setDraggable(false);

    if (kakaoMapConfig) {
      const coords = new window.kakao.maps.LatLng(kakaoMapConfig.latitude, kakaoMapConfig.longitude);
      
      map.setCenter(coords);

      const marker = new window.kakao.maps.Marker({
        map: map,
        position: coords
      });

      const markerTitle = kakaoMapConfig.markerTitle || venueName || '웨딩홀';
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="width:200px;text-align:center;padding:8px 0;font-size:13px;font-weight:600;color:#C9A14A;">${markerTitle}</div>`
      });

      infowindow.open(map, marker);

      setTimeout(() => {
        map.relayout();
        map.setCenter(coords);
      }, 0);

      window.kakaoMapInstance = map;
      setKakaoMapLoaded(true);
    }
  };

  const toggleControl = () => {
    const map = window.kakaoMapInstance;
    if (!map) return;

    setControlEnabled((prev) => {
      const newState = !prev;
      map.setZoomable(newState);
      map.setDraggable(newState);
      return newState;
    });
  };

  const openInKakaoMap = () => {
    window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`, '_blank');
  };

  const openInNaverMap = () => {
    window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address)}`, '_blank');
  };

  const openInGoogleMap = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address).then(() => {
      alert('주소가 복사되었습니다.');
    });
  };

  return (
    <section className={styles.container}>
      <svg className={styles.topDecoration} viewBox="0 0 100 10">
        <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
      </svg>
      
      <h2 className={styles.title}>位置</h2>
      <p className={styles.subtitle}>Location</p>

      <div className={styles.venueInfo}>
        <h3 className={styles.venueName}>{venueName}</h3>
        <p className={styles.address}>{address}</p>
        {description && <p className={styles.description}>{description}</p>}
      </div>

      <div className={styles.mapContainer}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div id="kakao-map-5" className={styles.map}></div>
          {!kakaoMapLoaded && (
            <div className={styles.mapLoading}>
              <div className={styles.spinner}></div>
              <p>지도 로딩중...</p>
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
                pointerEvents: 'auto'
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
              border: '1px solid var(--accent)',
              padding: '8px 16px',
              borderRadius: '2px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(201, 161, 74, 0.15)',
              color: controlEnabled ? 'var(--accent)' : '#999',
              transition: 'all 0.3s ease',
              pointerEvents: 'auto',
              fontFamily: "'Noto Sans KR', sans-serif"
            }}
          >
            {controlEnabled ? '컨트롤 ON' : '컨트롤 OFF'}
          </button>
        </div>
      </div>

      <div className={styles.buttonGrid}>
        <button className={styles.mapButton} onClick={copyAddress}>
          주소 복사
        </button>
        <button className={styles.mapButton} onClick={openInKakaoMap}>
          카카오맵
        </button>
        <button className={styles.mapButton} onClick={openInNaverMap}>
          네이버지도
        </button>
        <button className={styles.mapButton} onClick={openInGoogleMap}>
          구글지도
        </button>
      </div>

      {contact && (
        <div className={styles.contact}>
          <p className={styles.contactLabel}>문의</p>
          <p className={styles.contactInfo}>{contact}</p>
        </div>
      )}

      <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
        <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
      </svg>
    </section>
  );
}
