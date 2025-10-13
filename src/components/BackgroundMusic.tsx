'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './BackgroundMusic.module.css';

interface BackgroundMusicProps {
  autoPlay?: boolean;
  volume?: number; // 0.0 ~ 1.0
  musicIndex?: number; // 0-4: 음악 선택 인덱스
}

export default function BackgroundMusic({ 
  autoPlay = true, 
  volume = 0.3,
  musicIndex = 0
}: BackgroundMusicProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 저작권 없는 청첩장 음악 목록 (Public Domain & Creative Commons)
  const musicList = [
    {
      name: 'Canon in D - Pachelbel',
      url: 'https://www.mfiles.co.uk/mp3-downloads/canon-in-d-major-pachelbel.mp3'
    },
    {
      name: 'Air on the G String - Bach',
      url: 'https://www.mfiles.co.uk/mp3-downloads/air-on-the-g-string-bach.mp3'
    },
    {
      name: 'Wedding March - Wagner',
      url: 'https://www.mfiles.co.uk/mp3-downloads/bridal-chorus-wedding-march-wagner.mp3'
    },
    {
      name: 'Clair de Lune - Debussy',
      url: 'https://www.mfiles.co.uk/mp3-downloads/clair-de-lune-debussy.mp3'
    },
    {
      name: 'Spring - Vivaldi',
      url: 'https://www.mfiles.co.uk/mp3-downloads/spring-vivaldi.mp3'
    }
  ];

  const musicUrl = musicList[musicIndex] ? musicList[musicIndex].url : musicList[0].url;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    // 사용자 인터랙션 후 자동 재생 시도
    const handleFirstInteraction = async () => {
      if (!hasInteracted && autoPlay) {
        setHasInteracted(true);
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          console.log('자동 재생 실패:', error);
          // 자동 재생 실패 시 사용자가 직접 재생할 수 있도록 UI 표시
        }
      }
    };

    // 다양한 사용자 인터랙션 이벤트 리스너
    const events = ['click', 'touchstart', 'scroll', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };
  }, [autoPlay, volume, hasInteracted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
        setHasInteracted(true);
      }
    } catch (error) {
      console.error('재생 오류:', error);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
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
      />
      
      <div className={styles.controls}>
        <button
          onClick={togglePlay}
          className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
          aria-label={isPlaying ? '음악 일시정지' : '음악 재생'}
          title={isPlaying ? '음악 일시정지' : '음악 재생'}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleMute}
          className={`${styles.muteButton} ${isMuted ? styles.muted : ''}`}
          aria-label={isMuted ? '음소거 해제' : '음소거'}
          title={isMuted ? '음소거 해제' : '음소거'}
        >
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
            </svg>
          )}
        </button>
      </div>

      {!hasInteracted && !isPlaying && (
        <div className={styles.musicHint}>
          <span className={styles.musicIcon}>🎵</span>
          <p className={styles.hintText}>화면을 터치하시면 음악이 재생됩니다</p>
        </div>
      )}
    </div>
  );
}