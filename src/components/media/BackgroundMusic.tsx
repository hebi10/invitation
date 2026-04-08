'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
} from '@/lib/musicLibrary';

import styles from './BackgroundMusic.module.css';

interface BackgroundMusicProps {
  autoPlay?: boolean;
  volume?: number;
  musicIndex?: number;
  musicUrl?: string;
  initialControlHintText?: string;
  initialControlHintDurationMs?: number;
}

export default function BackgroundMusic({
  autoPlay = true,
  volume = DEFAULT_INVITATION_MUSIC_VOLUME,
  musicIndex: _musicIndex = 0,
  musicUrl: customMusicUrl,
  initialControlHintText,
  initialControlHintDurationMs = 3000,
}: BackgroundMusicProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [shouldRenderInitialControlHint, setShouldRenderInitialControlHint] = useState(
    Boolean(initialControlHintText?.trim())
  );
  const [isInitialControlHintFading, setIsInitialControlHintFading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAutoPlayedRef = useRef(false);
  const isPlaybackTransitionRef = useRef(false);
  const previousMusicUrlRef = useRef('');
  const normalizedMusicUrl = customMusicUrl?.trim() ?? '';
  const normalizedInitialControlHintText = initialControlHintText?.trim() ?? '';

  const pauseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }, []);

  const playAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !normalizedMusicUrl) {
      return false;
    }

    if (isPlaybackTransitionRef.current) {
      return false;
    }

    isPlaybackTransitionRef.current = true;

    try {
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch (error) {
      console.error('재생 오류:', error);
      setIsPlaying(false);
      return false;
    } finally {
      isPlaybackTransitionRef.current = false;
    }
  }, [normalizedMusicUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = clampInvitationMusicVolume(
      volume,
      DEFAULT_INVITATION_MUSIC_VOLUME
    );
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!normalizedMusicUrl) {
      previousMusicUrlRef.current = '';
      hasAutoPlayedRef.current = false;
      pauseAudio();
      return;
    }

    if (previousMusicUrlRef.current === normalizedMusicUrl) {
      return;
    }

    previousMusicUrlRef.current = normalizedMusicUrl;
    hasAutoPlayedRef.current = false;
    pauseAudio();
    audio.load();
  }, [normalizedMusicUrl, pauseAudio]);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!normalizedInitialControlHintText || !normalizedMusicUrl) {
      setShouldRenderInitialControlHint(false);
      setIsInitialControlHintFading(false);
      return;
    }

    setShouldRenderInitialControlHint(true);
    setIsInitialControlHintFading(false);

    const fadeTimer = window.setTimeout(() => {
      setIsInitialControlHintFading(true);
    }, initialControlHintDurationMs);

    const removeTimer = window.setTimeout(() => {
      setShouldRenderInitialControlHint(false);
    }, initialControlHintDurationMs + 400);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [initialControlHintDurationMs, normalizedInitialControlHintText, normalizedMusicUrl]);

  useEffect(() => {
    if (!autoPlay || !normalizedMusicUrl) {
      return;
    }

    const handleFirstInteraction = async () => {
      if (hasAutoPlayedRef.current) {
        return;
      }

      hasAutoPlayedRef.current = true;

      const played = await playAudio();
      if (!played) {
        hasAutoPlayedRef.current = false;
      }
    };

    const events: Array<keyof DocumentEventMap> = [
      'click',
      'touchstart',
      'scroll',
      'keydown',
    ];

    events.forEach((eventName) => {
      document.addEventListener(eventName, handleFirstInteraction, { once: true });
    });

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, handleFirstInteraction);
      });
    };
  }, [autoPlay, normalizedMusicUrl, playAudio]);

  const togglePlay = async () => {
    if (!normalizedMusicUrl) {
      return;
    }

    if (isPlaying) {
      pauseAudio();
      return;
    }

    const played = await playAudio();
    if (played) {
      hasAutoPlayedRef.current = true;
    }
  };

  if (!normalizedMusicUrl) {
    return null;
  }

  return (
    <div className={styles.musicPlayer}>
      <audio
        ref={audioRef}
        src={normalizedMusicUrl}
        loop
        preload="auto"
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => {
          console.error('음악 로드 실패:', normalizedMusicUrl);
          setIsPlaying(false);
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        className={`${styles.toggleButton} ${isPlaying ? styles.on : styles.off}`}
        aria-label={isPlaying ? 'BGM OFF' : 'BGM ON'}
        title={isPlaying ? 'BGM OFF' : 'BGM ON'}
      >
        {isPlaying ? 'OFF' : 'ON'}
      </button>

      {shouldRenderInitialControlHint ? (
        <div
          className={`${styles.autoPlayHint} ${styles.initialControlHint} ${
            isInitialControlHintFading ? styles.initialControlHintFading : ''
          }`}
          aria-hidden
        >
          <span className={styles.initialControlHintText}>
            {normalizedInitialControlHintText}
          </span>
        </div>
      ) : null}

      {!shouldRenderInitialControlHint && !hasAutoPlayedRef.current && !isPlaying && isAtTop ? (
        <div className={styles.autoPlayHint}>
          <span style={{ fontSize: '0.7rem', color: '#838383' }}>
            음악 ON/OFF
          </span>
        </div>
      ) : null}
    </div>
  );
}
