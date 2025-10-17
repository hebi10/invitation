'use client';

import { useState } from 'react';
import styles from './Greeting_3.module.css';

interface GreetingProps {
  message: string;
  parents: {
    groom: { father: string; mother: string };
    bride: { father: string; mother: string };
  };
  groomName: string;
  brideName: string;
}

export default function Greeting_3({
  message,
  parents,
  groomName,
  brideName
}: GreetingProps) {
  const [expandedParents, setExpandedParents] = useState(false);

  return (
    <section className={styles.container}>
      {/* 우주 배경 효과 */}
      <div className={styles.starsSmall}></div>

      {/* 타이틀 */}
      <div className={styles.titleWrapper}>
        <div className={styles.starIcon}>✦</div>
        <h2 className={styles.title}>초대합니다</h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      {/* 메시지 */}
      <div className={styles.messageBox}>
        <p className={styles.message}>{message}</p>
      </div>

      {/* 신랑신부 이름 */}
      <div className={styles.coupleNames}>
        <div className={styles.nameItem}>
          <span className={styles.roleLabel}>신랑</span>
          <span className={styles.name}>{groomName}</span>
        </div>
        <div className={styles.divider}>
          <div className={styles.heart}>♥</div>
        </div>
        <div className={styles.nameItem}>
          <span className={styles.roleLabel}>신부</span>
          <span className={styles.name}>{brideName}</span>
        </div>
      </div>

      {/* 부모님 정보 */}
      <div className={styles.parentsSection}>
        <button
          onClick={() => setExpandedParents(!expandedParents)}
          className={styles.parentsToggle}
          aria-expanded={expandedParents}
        >
          <span className={styles.toggleText}>
            {expandedParents ? '부모님 정보 접기' : '부모님 정보 보기'}
          </span>
          <span className={`${styles.toggleIcon} ${expandedParents ? styles.rotated : ''}`}>
            ▼
          </span>
        </button>

        <div className={`${styles.parentsContent} ${expandedParents ? styles.expanded : ''}`}>
          <div className={styles.parentInfo}>
            <div className={styles.parentLabel}>신랑측</div>
            <div className={styles.parentNames}>
              <span>{parents.groom.father}</span>
              <span className={styles.dot}>·</span>
              <span>{parents.groom.mother}</span>
              <span className={styles.sonDaughter}>의 아들</span>
            </div>
          </div>

          <div className={styles.parentDivider}></div>

          <div className={styles.parentInfo}>
            <div className={styles.parentLabel}>신부측</div>
            <div className={styles.parentNames}>
              <span>{parents.bride.father}</span>
              <span className={styles.dot}>·</span>
              <span>{parents.bride.mother}</span>
              <span className={styles.sonDaughter}>의 딸</span>
            </div>
          </div>
        </div>
      </div>

      {/* 우주 장식 */}
      <div className={styles.decorations}>
        <div className={styles.orbit1}></div>
        <div className={styles.orbit2}></div>
      </div>
    </section>
  );
}
