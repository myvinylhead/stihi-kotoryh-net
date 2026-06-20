"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export type AudioTrackType = "music" | "voice" | "album";

export type AudioTrack = {
  id: string;
  title: string;
  audioSrc: string;
  type: AudioTrackType;
  lyrics?: string;
};

type AudioQueueMap = Partial<Record<AudioTrackType, AudioTrack[]>>;

type AudioPlayerContextValue = {
  currentTrack: AudioTrack | null;
  lyricsOpen: boolean;
  closePlayer: () => void;
  playNextTrack: () => void;
  playPreviousTrack: () => void;
  playTrack: (track: AudioTrack) => void;
  setLyricsOpen: (open: boolean) => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children, queues }: { children: React.ReactNode; queues: AudioQueueMap }) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.audioPlayer = currentTrack ? "active" : "inactive";

    return () => {
      delete document.documentElement.dataset.audioPlayer;
    };
  }, [currentTrack]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      currentTrack,
      lyricsOpen,
      closePlayer: () => {
        setCurrentTrack(null);
        setLyricsOpen(false);
      },
      playNextTrack: () => {
        const nextTrack = getAdjacentTrack(getTrackQueue(queues, currentTrack), currentTrack, 1);

        if (nextTrack) {
          setCurrentTrack(nextTrack);
          setLyricsOpen(false);
        }
      },
      playPreviousTrack: () => {
        const previousTrack = getAdjacentTrack(getTrackQueue(queues, currentTrack), currentTrack, -1);

        if (previousTrack) {
          setCurrentTrack(previousTrack);
          setLyricsOpen(false);
        }
      },
      playTrack: (track) => {
        setCurrentTrack(track);
        setLyricsOpen(false);
      },
      setLyricsOpen
    }),
    [currentTrack, lyricsOpen, queues]
  );

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);

  if (!context) {
    throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  }

  return context;
}

export function SidebarAudioDock() {
  const { closePlayer, currentTrack, lyricsOpen, playNextTrack, playPreviousTrack, setLyricsOpen } = useAudioPlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const playNextTrackRef = useRef(playNextTrack);
  const playPreviousTrackRef = useRef(playPreviousTrack);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const playPromise = audio.play();

    if (playPromise) {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const pauseAudio = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    setIsPlaying(false);
  };

  const seekAudio = (nextTime: number) => {
    const audio = audioRef.current;
    const audioDuration = audio && Number.isFinite(audio.duration) ? audio.duration : Number.MAX_SAFE_INTEGER;
    const clampedTime = Math.max(0, Math.min(nextTime, audioDuration));

    setCurrentTime(clampedTime);

    if (audio) {
      audio.currentTime = clampedTime;
    }
  };

  useEffect(() => {
    playNextTrackRef.current = playNextTrack;
    playPreviousTrackRef.current = playPreviousTrack;
  }, [playNextTrack, playPreviousTrack]);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) {
      return;
    }

    setCurrentTime(0);
    setDuration(0);
    audioRef.current.load();
    playAudio();
  }, [currentTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return;
    }

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.type === "voice" ? "Стихи, которых нет!" : "Песни, которых нет!",
      album: "Стихи, которых нет!",
      artwork: [
        {
          src: getMediaArtworkSrc(
            currentTrack.type === "voice" ? "figma-assets/poems-cover.png" : "figma-assets/songs-album-cover.png"
          ),
          sizes: "512x512",
          type: "image/png"
        },
        { src: getMediaArtworkSrc("android-chrome-512x512.png"), sizes: "512x512", type: "image/png" },
        { src: getMediaArtworkSrc("apple-touch-icon.png"), sizes: "180x180", type: "image/png" }
      ]
    });

    setMediaSessionActionHandler("play", playAudio);
    setMediaSessionActionHandler("pause", pauseAudio);
    setMediaSessionActionHandler("previoustrack", () => playPreviousTrackRef.current());
    setMediaSessionActionHandler("nexttrack", () => playNextTrackRef.current());
    setMediaSessionActionHandler("seekbackward", null);
    setMediaSessionActionHandler("seekforward", null);
    setMediaSessionActionHandler("seekto", null);

    return () => {
      clearMediaSessionActionHandlers();
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.playbackState = currentTrack ? (isPlaying ? "playing" : "paused") : "none";
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack || duration <= 0) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate || 1,
        position: Math.max(0, Math.min(currentTime, duration))
      });
    } catch {
      // Some iOS/Safari versions expose Media Session without position state support.
    }
  }, [currentTrack, currentTime, duration]);

  if (!currentTrack) {
    return null;
  }

  const hasLyrics = Boolean(currentTrack.lyrics);
  const timelineProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlayback = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      playAudio();
    } else {
      pauseAudio();
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    const nextMuted = !isMuted;

    setIsMuted(nextMuted);

    if (audio) {
      audio.muted = nextMuted;
    }
  };

  return (
    <aside className="sidebar-audio-dock" aria-label="Аудиоплеер">
      {hasLyrics && lyricsOpen ? (
        <section className="sidebar-audio-lyrics-panel" aria-label="Текст песни">
          <span className="panel-header">
            <strong>{currentTrack.title}</strong>
            <button
              className="panel-close"
              type="button"
              aria-label="Закрыть текст песни"
              onClick={() => setLyricsOpen(false)}
            >
              ×
            </button>
          </span>
          <span className="audio-lyrics sidebar-audio-lyrics">{currentTrack.lyrics}</span>
        </section>
      ) : null}

      <div className="sidebar-audio-title-row">
        <strong className="sidebar-audio-title">{currentTrack.title}</strong>
        <span className="sidebar-player-time">
          {formatAudioTime(currentTime)}/{formatAudioTime(duration)}
        </span>
        <button className="panel-close sidebar-audio-close" type="button" aria-label="Закрыть плеер" onClick={closePlayer}>
          ×
        </button>
      </div>
      <div className="sidebar-player-controls">
        <div className="sidebar-player-buttons" aria-label="Управление треком">
          <button className="sidebar-player-button" type="button" aria-label="Предыдущий трек" onClick={playPreviousTrack}>
            <PlayerIcon idle="/figma-assets/player-prev-idle.svg" active="/figma-assets/player-prev-active.svg" />
          </button>
          <button className="sidebar-player-button" type="button" aria-label={isPlaying ? "Пауза" : "Воспроизвести"} onClick={togglePlayback}>
            {isPlaying ? (
              <PlayerIcon idle="/figma-assets/player-pause-idle.svg" active="/figma-assets/player-pause-active.svg" />
            ) : (
              <PlayerIcon idle="/figma-assets/player-play-idle.svg" active="/figma-assets/player-play-active.svg" />
            )}
          </button>
          <button className="sidebar-player-button" type="button" aria-label="Следующий трек" onClick={playNextTrack}>
            <PlayerIcon idle="/figma-assets/player-prev-idle.svg" active="/figma-assets/player-prev-active.svg" className="sidebar-player-icon--next-flip" />
          </button>
        </div>
        <div className="sidebar-player-progress">
          <input
            className="sidebar-player-range"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={duration ? currentTime : 0}
            aria-label="Позиция воспроизведения"
            style={{ "--range-progress": `${timelineProgress}%` } as CSSProperties}
            onChange={(event) => {
              seekAudio(Number(event.currentTarget.value));
            }}
          />
        </div>
        <div className="sidebar-player-buttons sidebar-player-buttons--secondary" aria-label="Звук и текст">
          <button className="sidebar-player-button" type="button" aria-label={isMuted ? "Включить звук" : "Выключить звук"} onClick={toggleMute}>
            <PlayerIcon
              idle="/figma-assets/player-volume-circle.svg"
              active="/figma-assets/player-volume-circle-active.svg"
              overlayIdle="/figma-assets/player-volume-mark.svg"
              overlayActive="/figma-assets/player-volume-mark-active.svg"
              extraOverlayIdle={isMuted ? "/figma-assets/player-volume-muted-mark.svg" : undefined}
              extraOverlayActive={isMuted ? "/figma-assets/player-volume-muted-mark-active.svg" : undefined}
            />
          </button>
          <button
            className="sidebar-player-button"
            type="button"
            aria-label={lyricsOpen ? "Скрыть текст песни" : "Показать текст песни"}
            aria-expanded={lyricsOpen}
            disabled={!hasLyrics}
            onClick={() => setLyricsOpen(!lyricsOpen)}
          >
            <PlayerIcon idle="/figma-assets/player-lyrics.svg" active="/figma-assets/player-lyrics-active.svg" />
          </button>
        </div>
      </div>
      <audio
        ref={audioRef}
        className="sidebar-player-audio"
        preload="metadata"
        src={currentTrack.audioSrc}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onEnded={playNextTrack}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onVolumeChange={(event) => {
          setIsMuted(event.currentTarget.muted);
        }}
      >
        Ваш браузер не поддерживает аудио.
      </audio>
    </aside>
  );
}

function PlayerIcon({
  active,
  extraOverlayActive,
  extraOverlayIdle,
  idle,
  overlayActive,
  overlayIdle,
  className
}: {
  active: string;
  extraOverlayActive?: string;
  extraOverlayIdle?: string;
  idle: string;
  className?: string;
  overlayActive?: string;
  overlayIdle?: string;
}) {
  return (
    <span className={className ? `sidebar-player-icon ${className}` : "sidebar-player-icon"} aria-hidden="true">
      <img className="sidebar-player-icon-img sidebar-player-icon-img--idle" src={idle} width={35} height={35} alt="" />
      <img className="sidebar-player-icon-img sidebar-player-icon-img--active" src={active} width={35} height={35} alt="" />
      {overlayIdle ? (
        <img className="sidebar-player-icon-img sidebar-player-icon-img--overlay sidebar-player-icon-img--idle" src={overlayIdle} width={19} height={17} alt="" />
      ) : null}
      {overlayActive ? (
        <img className="sidebar-player-icon-img sidebar-player-icon-img--overlay sidebar-player-icon-img--active" src={overlayActive} width={19} height={17} alt="" />
      ) : null}
      {extraOverlayIdle ? (
        <img
          className="sidebar-player-icon-img sidebar-player-icon-img--overlay sidebar-player-icon-img--overlay-extra sidebar-player-icon-img--idle"
          src={extraOverlayIdle}
          width={19}
          height={17}
          alt=""
        />
      ) : null}
      {extraOverlayActive ? (
        <img
          className="sidebar-player-icon-img sidebar-player-icon-img--overlay sidebar-player-icon-img--overlay-extra sidebar-player-icon-img--active"
          src={extraOverlayActive}
          width={19}
          height={17}
          alt=""
        />
      ) : null}
    </span>
  );
}

function getTrackQueue(queues: AudioQueueMap, currentTrack: AudioTrack | null) {
  if (!currentTrack) {
    return [];
  }

  return queues[currentTrack.type] ?? [];
}

function getAdjacentTrack(queue: AudioTrack[], currentTrack: AudioTrack | null, direction: 1 | -1) {
  if (queue.length === 0) {
    return null;
  }

  const currentIndex = currentTrack ? queue.findIndex((track) => track.id === currentTrack.id) : -1;

  if (currentIndex === -1) {
    return direction === 1 ? queue[0] : queue[queue.length - 1];
  }

  return queue[(currentIndex + direction + queue.length) % queue.length];
}

function setMediaSessionActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Unsupported Media Session actions should not break the site on older mobile browsers.
  }
}

function clearMediaSessionActionHandlers() {
  const actions: MediaSessionAction[] = ["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward", "seekto"];

  actions.forEach((action) => {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      // Ignore unsupported actions during cleanup too.
    }
  });
}

function getMediaArtworkSrc(path: string) {
  return new URL(path, document.baseURI).toString();
}

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
