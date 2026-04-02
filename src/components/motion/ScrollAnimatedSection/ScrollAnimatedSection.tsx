import React from 'react';
import { useScrollAnimation } from '@/hooks';
import styles from './ScrollAnimatedSection.module.css';

interface ScrollAnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // 애니메이션 지연 시간 (ms)
  duration?: number; // 애니메이션 지속 시간 (ms)
  distance?: number; // 이동 거리 (px)
  animationType?: 'fadeInUp' | 'fadeInLeft' | 'fadeInRight' | 'fadeInScale'; // 애니메이션 타입
}

export default function ScrollAnimatedSection({
  children,
  className = '',
  delay = 0,
  duration = 800,
  distance = 50,
  animationType = 'fadeInUp'
}: ScrollAnimatedSectionProps) {
  const { elementRef, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1, // 10% 보일 때 애니메이션 시작
    triggerOnce: true
  });

  return (
    <div
      ref={elementRef}
      className={`${styles.animatedSection} ${styles[animationType]} ${isVisible ? styles.visible : ''} ${className}`}
      style={{
        '--animation-delay': `${delay}ms`,
        '--animation-duration': `${duration}ms`,
        '--animation-distance': `${distance}px`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
