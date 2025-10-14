'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './BackgroundMusic.module.css';

interface BackgroundMusicProps {
  autoPlay?: boolean;
  volume?: number; // 0.0 ~ 1.0
  musicIndex?: number; // 0-4: 음악 선택 인덱스
  musicUrl?: string; // 커스텀 음악 URL (지정하면 musicIndex 무시)
}

export default function BackgroundMusic({ 
  autoPlay = true, 
  volume = 0.3,
  musicIndex = 0,
  musicUrl: customMusicUrl
}: BackgroundMusicProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [canAutoPlay, setCanAutoPlay] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAutoPlayedRef = useRef(false);

  // 음악 URL이 제공되지 않으면 컴포넌트를 렌더링하지 않음
  if (!customMusicUrl) {
    console.warn('BackgroundMusic: musicUrl prop이 필요합니다. Firebase Storage에 음악을 업로드하고 URL을 전달하세요.');
    return null;
  }

  const musicUrl = customMusicUrl;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    // 스크롤 위치 감지
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
    };

    // 초기 스크롤 위치 확인
    handleScroll();

    // 스크롤 이벤트 리스너 추가
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 사용자 인터랙션 후 자동 재생 시도
    const handleFirstInteraction = async () => {
      if (!hasAutoPlayedRef.current && autoPlay && !isPlaying) {
        hasAutoPlayedRef.current = true;
        try {
          await audio.play();
          setIsPlaying(true);
          console.log('자동 재생 성공');
        } catch (error) {
          console.log('자동 재생 실패 - ON 버튼을 클릭하세요');
        }
      }
    };

    // 다양한 사용자 인터랙션 이벤트 리스너
    const events = ['click', 'touchstart', 'scroll', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };
  }, [autoPlay, volume, isPlaying]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        console.log('음악 정지');
      } else {
        await audio.play();
        setIsPlaying(true);
        hasAutoPlayedRef.current = true;
        console.log('음악 재생');
      }
    } catch (error) {
      console.error('재생 오류:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.musicPlayer}>
      <audio
        ref={audioRef}
        src={musicUrl}
        loop
        preload="auto"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={(e) => {
          console.error('음악 로드 실패:', musicUrl);
          console.error('오류 상세:', e);
          setIsPlaying(false);
        }}
      />
      
      <button
        onClick={togglePlay}
        className={`${styles.toggleButton} ${isPlaying ? styles.on : styles.off}`}
        aria-label={isPlaying ? 'BGM OFF' : 'BGM ON'}
        title={isPlaying ? 'BGM OFF' : 'BGM ON'}
      >
        {isPlaying ? 'OFF' : 'ON'}
      </button>

      {/* 자동 재생 안내 힌트 - 스크롤 최상단일 때만 표시 */}
      {!hasAutoPlayedRef.current && !isPlaying && isAtTop && (
        <div className={styles.autoPlayHint}>
          <span style={{ fontSize: '0.7rem', color: '#999' }}>
            클릭하여 음악 재생
          </span>
        </div>
      )}
    </div>
  );
}