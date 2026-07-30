import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { YouTubeTrack } from '../services/youtubeMusicService';
import MusicPlayerExpanded from './MusicPlayerExpanded';

interface MusicPlayerProps {
  queue: YouTubeTrack[];
  currentIndex: number;
  isPlaying: boolean;
  visible?: boolean;
  onStateChange: (isPlaying: boolean) => void;
  onTrackChange: (index: number) => void;
  onClose: () => void;
  moodColor: string;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  queue,
  currentIndex,
  isPlaying,
  visible = true,
  onStateChange,
  onTrackChange,
  onClose,
  moodColor,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);
  const stateRef = useRef({ queue, currentIndex, isPlaying });

  useEffect(() => {
    stateRef.current = { queue, currentIndex, isPlaying };
  }, [queue, currentIndex, isPlaying]);

  const currentTrack = queue[currentIndex];

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [currentIndex]);

  const handleNextTrack = () => {
    const { queue: q, currentIndex: idx } = stateRef.current;
    if (idx < q.length - 1) {
      onTrackChange(idx + 1);
    } else {
      onStateChange(false);
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    }
  };

  const handlePrevTrack = () => {
    if (currentTime > 3) {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(0, true);
        setCurrentTime(0);
      }
    } else if (currentIndex > 0) {
      onTrackChange(currentIndex - 1);
    }
  };

  const initPlayer = (initialQueue?: YouTubeTrack[], initialIndex?: number, initialPlaying?: boolean) => {
    const win = window as any;
    if (!win.YT || !win.YT.Player) return;
    const q = initialQueue ?? stateRef.current.queue;
    const idx = initialIndex ?? stateRef.current.currentIndex;
    const playing = initialPlaying ?? stateRef.current.isPlaying;
    if (q.length === 0) return;
    const track = q[idx];
    if (!track) return;

    if (playerRef.current) return;

    playerRef.current = new win.YT.Player('yt-player-container', {
      height: '1',
      width: '1',
      videoId: track.id,
      playerVars: {
        autoplay: playing ? 1 : 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          setPlayerReady(true);
          if (playing) {
            event.target.playVideo();
          }
        },
        onStateChange: (event: any) => {
          if (event.data === 0) {
            handleNextTrack();
          } else if (event.data === 1) {
            onStateChange(true);
          } else if (event.data === 2) {
            onStateChange(false);
          }
        },
        onError: () => {
          handleNextTrack();
        },
      },
    });
  };

  useEffect(() => {
    const originalPostMessage = window.postMessage.bind(window);
    window.postMessage = ((message: any, targetOrigin: string, ...rest: any[]) => {
      try {
        if (typeof targetOrigin === 'string' && targetOrigin !== '*' && targetOrigin !== window.location.origin) {
          return undefined;
        }
        return originalPostMessage(message, targetOrigin, ...rest);
      } catch (err) {
        return undefined;
      }
    }) as typeof window.postMessage;

    const originalConsoleError = console.error.bind(console);
    const ytWarningRegex = /target origin provided|player is not attached to the DOM|www-widgetapi\.js/i;
    console.error = ((...args: any[]) => {
      const first = args[0];
      if (typeof first === 'string' && ytWarningRegex.test(first)) return;
      if (first instanceof Error && (first.message?.includes('target origin') || first.message?.includes('not attached to the DOM'))) return;
      return originalConsoleError(...args);
    }) as typeof console.error;

    const win = window as any;
    if (!win.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    if (win.YT && win.YT.Player) {
      initPlayer(queue, currentIndex, isPlaying);
    } else {
      const prevCallback = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer(queue, currentIndex, isPlaying);
      };
    }

    return () => {
      window.postMessage = originalPostMessage;
      console.error = originalConsoleError;
      setPlayerReady(false);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (queue.length === 0 || !playerReady) return;
    const track = queue[currentIndex];
    if (!track) return;

    const p = playerRef.current;
    if (!p || typeof p.loadVideoById !== 'function') return;

    try {
      p.loadVideoById(track.id);
    } catch (e) {
      console.error(e);
    }
    if (isPlaying) {
      const tryPlay = (n = 0) => {
        const pp = playerRef.current;
        if (!pp || typeof pp.playVideo !== 'function') return;
        try {
          pp.playVideo();
        } catch {
          if (n < 5) setTimeout(() => tryPlay(n + 1), 200);
          return;
        }
        try {
          const st = pp.getPlayerState?.();
          if ((st === -1 || st === 3) && n < 5) {
            setTimeout(() => tryPlay(n + 1), 200);
          }
        } catch {
          /* ignore */
        }
      };
      setTimeout(tryPlay, 50);
    } else {
      try { p.pauseVideo(); } catch { /* ignore */ }
    }
  }, [currentIndex, queue, playerReady]);

  useEffect(() => {
    if (!playerReady) return;
    const p = playerRef.current;
    if (!p || typeof p.playVideo !== 'function') return;
    try {
      if (isPlaying) p.playVideo();
      else p.pauseVideo();
    } catch {
      /* ignore */
    }
  }, [isPlaying, playerReady]);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
        if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
          const dur = playerRef.current.getDuration();
          if (dur) setDuration(dur);
        }
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack) return null;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="mini-player"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30, ease: [0.16, 1, 0.3, 1] }}
        className="app-surface-raised fixed bottom-24 inset-x-0 z-40 mx-auto max-w-lg overflow-hidden rounded-2xl bg-[var(--app-bg)]/40 px-4"
      >
          <div
            className="absolute inset-x-4 top-0 h-px opacity-30"
            style={{ backgroundColor: moodColor }}
            aria-hidden="true"
          />

          <div id="yt-player-container" style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} />

          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(true); } }}
            className="w-full flex items-center gap-3 px-3 pt-3 pb-2 text-left cursor-pointer"
            aria-label="Expandir reproductor"
          >
            <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden app-surface">
              <img
                src={currentTrack.thumbnail}
                className="w-full h-full object-cover"
                alt={currentTrack.title}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate leading-tight tracking-[-0.005em]">
                {currentTrack.title}
              </div>
              <div className="app-text-eyebrow truncate mt-0.5">
                {currentTrack.channelTitle}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrevTrack(); }}
                disabled={currentIndex === 0 && currentTime <= 3}
                className="h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] text-white/65 hover:text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                aria-label="Anterior"
              >
                <SkipBack size={14} fill="currentColor" strokeWidth={0} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onStateChange(!isPlaying); }}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-white text-black shadow-[0_4px_18px_rgba(255,255,255,0.18)] hover:scale-105 active:scale-95 transition-transform"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause size={15} fill="currentColor" strokeWidth={0} /> : <Play size={15} fill="currentColor" strokeWidth={0} className="ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleNextTrack(); }}
                disabled={currentIndex === queue.length - 1}
                className="h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] text-white/65 hover:text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                aria-label="Siguiente"
              >
                <SkipForward size={14} fill="currentColor" strokeWidth={0} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] text-white/55 hover:text-white hover:bg-white/[0.1] transition-colors"
                aria-label="Cerrar reproductor"
            >
              <X size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-2 px-3 pb-2.5">
            <span className="text-[9px] font-medium text-white/45 tabular-nums w-8 text-right">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1 bg-white/[0.10] rounded-full cursor-pointer relative"
              onClick={handleSeek}
              role="slider"
              aria-label="Progreso de reproducción"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%`, backgroundColor: moodColor, boxShadow: `0 0 6px ${moodColor}80` }}
              />
            </div>
            <span className="text-[9px] font-medium text-white/45 tabular-nums w-8">{formatTime(duration)}</span>
          </div>
      </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && (
          <MusicPlayerExpanded
            queue={queue}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            onStateChange={onStateChange}
            onTrackChange={onTrackChange}
            onClose={() => setExpanded(false)}
            moodColor={moodColor}
            currentTime={currentTime}
            duration={duration}
            onSeek={(time) => {
              if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                playerRef.current.seekTo(time, true);
                setCurrentTime(time);
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayer;
