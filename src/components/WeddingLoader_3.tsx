'use client';

import { useEffect, useState } from 'react';
import styles from './WeddingLoader_3.module.css';

interface WeddingLoaderProps {
  groomName?: string;
  brideName?: string;
}

export default function WeddingLoader_3({ groomName, brideName }: WeddingLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={styles.container}>
      {/* 우주 배경 */}
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
        <div className={styles.starsLayer2}></div>
      </div>

      {/* 로딩 콘텐츠 */}
      <div className={`${styles.content} ${mounted ? styles.fadeIn : ''}`}>
        {/* 중앙 행성 */}
        <div className={styles.planetWrapper}>
          <div className={styles.planet}>
            <div className={styles.planetGlow}></div>
            <div className={styles.planetRing}></div>
          </div>
        </div>

        {/* 텍스트 */}
        {(groomName || brideName) && (
          <div className={styles.textWrapper}>
            <p className={styles.names}>
              {groomName && <span className={styles.name}>{groomName}</span>}
              {groomName && brideName && <span className={styles.separator}>♥</span>}
              {brideName && <span className={styles.name}>{brideName}</span>}
            </p>
            <p className={styles.subText}>결혼식에 초대합니다</p>
          </div>
        )}

        {/* 로딩 인디케이터 */}
        <div className={styles.loadingIndicator}>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
        </div>
      </div>

      {/* 장식 요소 */}
      <div className={styles.decorations}>
        <div className={styles.shootingStar}></div>
        <div className={styles.floatingPlanet1}></div>
        <div className={styles.floatingPlanet2}></div>
      </div>
    </div>
  );
}
