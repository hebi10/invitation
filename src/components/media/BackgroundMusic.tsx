'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
} from '@/lib/musicLibrary';

import styles from './BackgroundMusic.module.css';

type WeddingMusicState = 'playing' | 'paused' | 'error';

function WeddingMusicGlyph({ state }: { state: WeddingMusicState }) {
  return (
    <svg
      className={styles.weddingMusicGlyph}
      data-wedding-music-icon={state}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {state === 'error' ? (
        <>
          <path d="M20 11a8 8 0 1 0-2.4 5.7" />
          <path d="M20 4v7h-7" />
        </>
      ) : (
        <>
          <path d="M5 9h3.5L13 5v14l-4.5-4H5V9Z" />
          {state === 'playing' ? (
            <>
              <path d="M16 9a5 5 0 0 1 0 6" />
              <path d="M18.5 6.5a8.5 8.5 0 0 1 0 11" />
            </>
          ) : (
            <path d="m16.5 9 4 6m0-6-4 6" />
          )}
        </>
      )}
    </svg>
  );
}

interface BackgroundMusicProps {
  alignToInvitation?: boolean;
  autoPlay?: boolean;
  volume?: number;
  musicIndex?: number;
  musicUrl?: string;
  loadError?: boolean;
  onRetryLoad?: () => void;
  initialControlHintText?: string;
  initialControlHintDurationMs?: number;
}

export default function BackgroundMusic({
  alignToInvitation = false,
  autoPlay = true,
  volume = DEFAULT_INVITATION_MUSIC_VOLUME,
  musicIndex: _musicIndex = 0,
  musicUrl: customMusicUrl,
  loadError = false,
  onRetryLoad,
  initialControlHintText,
  initialControlHintDurationMs = 3000,
}: BackgroundMusicProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  const [shouldRenderInitialControlHint, setShouldRenderInitialControlHint] = useState(
    Boolean(initialControlHintText?.trim())
  );
  const [isInitialControlHintFading, setIsInitialControlHintFading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hasAutoPlayedRef = useRef(false);
  const isPlaybackTransitionRef = useRef(false);
  const previousMusicUrlRef = useRef('');
  const normalizedMusicUrl = customMusicUrl?.trim() ?? '';
  const normalizedInitialControlHintText = initialControlHintText?.trim() ?? '';
  const errorMessage = loadError
    ? '음악을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.'
    : playbackError;
  const musicControlState: WeddingMusicState = errorMessage
    ? 'error'
    : isPlaying
      ? 'playing'
      : 'paused';

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
    setPlaybackError('');

    try {
      await audio.play();
      setIsPlaying(!audio.paused);
      return !audio.paused;
    } catch (error) {
      console.error('재생 오류:', error);
      setIsPlaying(false);
      setPlaybackError(error instanceof Error && error.name === 'NotAllowedError'
        ? '음악을 켜려면 아래 버튼을 눌러 주세요.'
        : '음악을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.');
      return false;
    } finally {
      isPlaybackTransitionRef.current = false;
    }
  }, [normalizedMusicUrl]);

  useEffect(() => {
    setIsErrorDismissed(false);
  }, [normalizedMusicUrl, loadError]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = clampInvitationMusicVolume(
      volume,
      DEFAULT_INVITATION_MUSIC_VOLUME
    );
  }, [volume, normalizedMusicUrl]);

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
    setPlaybackError('');
    pauseAudio();
    audio.load();
  }, [normalizedMusicUrl, pauseAudio]);

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

    const handleFirstInteraction = async (event: Event) => {
      // Music controls and notice dismissal handle their own gestures.
      if (event.target && (
        playerRef.current?.contains(event.target as Node)
        || controlRef.current?.contains(event.target as Node)
      )) {
        return;
      }
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
      document.addEventListener(eventName, handleFirstInteraction);
    });

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, handleFirstInteraction);
      });
    };
  }, [autoPlay, normalizedMusicUrl, playAudio]);

  const togglePlay = async () => {
    setIsErrorDismissed(false);
    if (!normalizedMusicUrl) {
      onRetryLoad?.();
      return;
    }

    // A manual choice takes precedence over subsequent page interactions.
    hasAutoPlayedRef.current = true;

    if (audioRef.current && !audioRef.current.paused) {
      pauseAudio();
      return;
    }

    if (audioRef.current?.error) audioRef.current.load();
    const played = await playAudio();
    if (played) {
      hasAutoPlayedRef.current = true;
    }
  };

  if (!normalizedMusicUrl && !loadError) {
    return null;
  }

  return (
    <div ref={playerRef} className={`${styles.musicPlayer} ${alignToInvitation ? styles.invitationAligned : ''}`.trim()}>
      {normalizedMusicUrl ? <audio
        ref={audioRef}
        src={normalizedMusicUrl}
        loop
        preload="auto"
        onPause={() => setIsPlaying(false)}
        onPlay={() => { setIsPlaying(true); setPlaybackError(''); }}
        onError={() => {
          setIsPlaying(false);
          setPlaybackError('음악을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.');
        }}
      /> : null}

      <button
        ref={controlRef}
        type="button"
        onClick={togglePlay}
        className={`${styles.toggleButton} ${isPlaying ? styles.on : styles.off}`}
        aria-label={isPlaying ? '음악 끄기' : errorMessage ? '음악 다시 시도' : '음악 켜기'}
        title={isPlaying ? '음악 끄기' : errorMessage ? '음악 다시 시도' : '음악 켜기'}
        aria-pressed={isPlaying}
        data-wedding-music-state={alignToInvitation ? musicControlState : undefined}
      >
        {alignToInvitation ? (
          <WeddingMusicGlyph state={musicControlState} />
        ) : (
          <span className={styles.controlIcon} aria-hidden="true">{isPlaying ? 'Ⅱ' : '♪'}</span>
        )}
        <span className={styles.controlLabel}>
          {isPlaying ? '음악 끄기' : errorMessage ? '음악 다시 시도' : '음악 켜기'}
        </span>
      </button>

      {errorMessage && !isErrorDismissed ? (
        <div className={styles.errorNotice}>
          <p className={styles.errorMessage} role="status">{errorMessage}</p>
          <button
            type="button"
            className={styles.dismissButton}
            aria-label="음악 안내 닫기"
            onClick={() => {
              setIsErrorDismissed(true);
              controlRef.current?.focus();
            }}
          >
            닫기
          </button>
        </div>
      ) : null}

      {!errorMessage && shouldRenderInitialControlHint ? (
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

    </div>
  );
}
