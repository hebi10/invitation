'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './BackgroundMusic.module.css';

interface BackgroundMusicProps {
  autoPlay?: boolean;
  volume?: number;
  musicIndex?: number;
  musicUrl?: string;
}

export default function BackgroundMusic({
  autoPlay = true,
  volume = 0.3,
  musicIndex: _musicIndex = 0,
  musicUrl: customMusicUrl,
}: BackgroundMusicProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAutoPlayedRef = useRef(false);

  if (!customMusicUrl) {
    console.warn(
      'BackgroundMusic: musicUrl prop이 필요합니다. Firebase Storage에 음악을 업로드하고 URL을 전달해주세요.'
    );
    return null;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume;

    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
    };

    const handleFirstInteraction = async () => {
      if (!hasAutoPlayedRef.current && autoPlay && !isPlaying) {
        hasAutoPlayedRef.current = true;

        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    const events = ['click', 'touchstart', 'scroll', 'keydown'];
    events.forEach((eventName) => {
      document.addEventListener(eventName, handleFirstInteraction, { once: true });
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      events.forEach((eventName) => {
        document.removeEventListener(eventName, handleFirstInteraction);
      });
    };
  }, [autoPlay, isPlaying, volume]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      await audio.play();
      setIsPlaying(true);
      hasAutoPlayedRef.current = true;
    } catch (error) {
      console.error('재생 오류:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.musicPlayer}>
      <audio
        ref={audioRef}
        src={customMusicUrl}
        loop
        preload="auto"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => {
          console.error('음악 로드 실패:', customMusicUrl);
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

      {!hasAutoPlayedRef.current && !isPlaying && isAtTop ? (
        <div className={styles.autoPlayHint}>
          <span style={{ fontSize: '0.7rem', color: '#999' }}>
            클릭해서 음악 재생
          </span>
        </div>
      ) : null}
    </div>
  );
}
