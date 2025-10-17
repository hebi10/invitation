'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './LocationMap_2.module.css';

declare global {
  interface Window {
    kakao: any;
    kakaoMapInstance_2?: any; // LocationMap_2용 지도 인스턴스
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
  roadAddress 
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(false); // 기본값 OFF

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let mapInstance: any = null;

    const initializeKakaoMap = () => {
      try {
        const container = mapRef.current;
        if (!container) {
          console.error('지도 컨테이너를 찾을 수 없습니다');
          return;
        }

        const options = {
          center: new window.kakao.maps.LatLng(latitude, longitude),
          level: 3
        };

        mapInstance = new window.kakao.maps.Map(container, options);
        
        const markerPosition = new window.kakao.maps.LatLng(latitude, longitude);
        const marker = new window.kakao.maps.Marker({
          position: markerPosition
        });
        marker.setMap(mapInstance);

        const iwContent = `<div style="padding:15px;font-size:14px;text-align:center;"><strong>${placeName}</strong></div>`;
        const infowindow = new window.kakao.maps.InfoWindow({
          content: iwContent,
          removable: false
        });
        infowindow.open(mapInstance, marker);

        // 지도 인스턴스를 전역에 저장
        window.kakaoMapInstance_2 = mapInstance;
        
        // 기본적으로 줌/드래그 비활성화
        mapInstance.setZoomable(false);
        mapInstance.setDraggable(false);

        console.log('LocationMap_2: 카카오맵 로딩 완료');
      } catch (error) {
        console.error('LocationMap_2: 카카오맵 로딩 실패:', error);
        setMapError(true);
      }
    };

    // 카카오맵 SDK가 이미 로드되어 있는지 확인
    if (window.kakao && window.kakao.maps) {
      console.log('LocationMap_2: 카카오맵 SDK 이미 로드됨');
      window.kakao.maps.load(() => {
        initializeKakaoMap();
      });
    } else {
      // 스크립트 새로 추가
      console.log('LocationMap_2: 카카오맵 SDK 로딩 시작');
      script = document.createElement('script');
      script.async = true;
      script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=234add558ffec30aa714eb4644df46e3&autoload=false';
      
      script.onload = () => {
        console.log('LocationMap_2: 카카오맵 스크립트 로드 완료');
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            initializeKakaoMap();
          });
        } else {
          console.error('LocationMap_2: window.kakao.maps를 찾을 수 없음');
          setMapError(true);
        }
      };
      
      script.onerror = () => {
        console.error('LocationMap_2: 카카오맵 스크립트 로딩 실패');
        setMapError(true);
      };
      
      document.head.appendChild(script);
    }

    // Cleanup
    return () => {
      console.log('LocationMap_2: cleanup 실행');
      if (mapInstance) {
        // 지도 인스턴스 정리 (필요시)
        mapInstance = null;
      }
      // 스크립트는 제거하지 않음 (다른 컴포넌트가 사용할 수 있음)
    };
  }, [latitude, longitude, placeName]);

  // 컨트롤 토글 함수
  const toggleControl = () => {
    const map = window.kakaoMapInstance_2;
    if (!map) return;

    setControlEnabled((prev) => {
      const newState = !prev;
      map.setZoomable(newState);
      map.setDraggable(newState);
      return newState;
    });
  };

  const openKakaoMap = () => {
    const url = `https://map.kakao.com/link/map/${placeName},${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const openKakaoNavi = () => {
    const url = `https://map.kakao.com/link/to/${placeName},${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const copyAddress = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('주소가 복사되었습니다.');
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('주소가 복사되었습니다.');
    }
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>오시는 길</h2>
      
      <div className={styles.addressSection}>
        <div className={styles.addressItem}>
          <span className={styles.addressLabel}>지번</span>
          <div className={styles.addressContent}>
            <span className={styles.addressText}>{address}</span>
            <button 
              onClick={() => copyAddress(address)}
              className={styles.copyButton}
              aria-label="주소 복사"
            >
              복사
            </button>
          </div>
        </div>
        {roadAddress && (
          <div className={styles.addressItem}>
            <span className={styles.addressLabel}>도로명</span>
            <div className={styles.addressContent}>
              <span className={styles.addressText}>{roadAddress}</span>
              <button 
                onClick={() => copyAddress(roadAddress)}
                className={styles.copyButton}
                aria-label="도로명 주소 복사"
              >
                복사
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.mapWrapper}>
        {mapError ? (
          <div className={styles.mapError}>
            지도를 불러올 수 없습니다.
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapRef} className={styles.map}></div>
            
            {/* 컨트롤 OFF일 때 터치 차단 오버레이 */}
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
                  pointerEvents: 'auto'
                }}
              />
            )}
            
            {/* 컨트롤 ON/OFF 버튼 */}
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
                pointerEvents: 'auto'
              }}
            >
              {controlEnabled ? '컨트롤 ON' : '컨트롤 OFF'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.buttonGroup}>
        <button 
          onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address)}`, '_blank')}
          className={styles.button}
        >
          네이버 지도
        </button>
        <button onClick={openKakaoMap} className={styles.button}>
          카카오맵
        </button>
        <button 
          onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank')}
          className={styles.button}
        >
          구글 지도
        </button>
      </div>
    </section>
  );
}
