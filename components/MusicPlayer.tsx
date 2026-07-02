import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';
import { YouTubeTrack } from '../services/youtubeMusicService';

interface MusicPlayerProps {
  queue: YouTubeTrack[];
  currentIndex: number;
  isPlaying: boolean;
  onStateChange: (isPlaying: boolean) => void;
  onTrackChange: (index: number) => void;
  onClose: () => void;
  moodColor: string;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  queue,
  currentIndex,
  isPlaying,
  onStateChange,
  onTrackChange,
  onClose,
  moodColor
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const initPlayer = () => {
    const win = window as any;
    if (!win.YT || !win.YT.Player) return;
    if (stateRef.current.queue.length === 0) return;
    const track = stateRef.current.queue[stateRef.current.currentIndex];
    if (!track) return;

    if (playerRef.current) return;

    playerRef.current = new win.YT.Player('yt-player-container', {
      height: '1',
      width: '1',
      videoId: track.id,
      playerVars: {
        autoplay: stateRef.current.isPlaying ? 1 : 0,
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
          if (stateRef.current.isPlaying) {
            event.target.playVideo();
          }
        },
        onStateChange: (event: any) => {
          // 0 = ENDED, 1 = PLAYING, 2 = PAUSED
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
        }
      }
    });
  };

  useEffect(() => {
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
      initPlayer();
    } else {
      const prevCallback = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
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
    if (queue.length === 0) return;
    const track = queue[currentIndex];
    if (!track) return;

    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(track.id);
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } else {
      initPlayer();
    }
  }, [currentIndex, queue]);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

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

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-28 left-0 right-0 flex justify-center px-4 z-40 animate-in slide-in-from-bottom-8 duration-300">
      <div className="glass w-full max-w-lg p-3 rounded-[1.8rem] border border-white/10 shadow-2xl backdrop-blur-2xl bg-slate-900/80 relative overflow-hidden flex flex-col">
        {/* Glow effect based on moodColor */}
        <div 
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-[1.8rem] transition-colors duration-500" 
          style={{ backgroundColor: moodColor }}
        />
        <div 
          className="absolute inset-0 opacity-[0.04] blur-xl pointer-events-none rounded-[1.8rem] transition-colors duration-500" 
          style={{ backgroundColor: moodColor }}
        />

        {/* Hidden YT Player Container */}
        <div 
          id="yt-player-container" 
          className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none" 
        />

        {/* Player Controls & Info */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          {/* Album Art / Thumbnail */}
          <div className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden shadow-md border border-white/10">
            <img 
              src={currentTrack.thumbnail} 
              className="w-full h-full object-cover" 
              alt={currentTrack.title} 
            />
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[11px] font-bold text-white truncate leading-none mb-1">
              {currentTrack.title}
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">
              {currentTrack.channelTitle}
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button 
              onClick={handlePrevTrack} 
              disabled={currentIndex === 0 && currentTime <= 3}
              className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button 
              onClick={() => onStateChange(!isPlaying)} 
              className="p-2.5 bg-white text-slate-950 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <button 
              onClick={handleNextTrack} 
              disabled={currentIndex === queue.length - 1}
              className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <SkipForward size={14} fill="currentColor" />
            </button>
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Progress bar container */}
        <div className="mt-2.5 px-1 relative z-10">
          <div 
            className="w-full h-1 bg-white/10 rounded-full cursor-pointer relative group" 
            onClick={handleSeek}
          >
            <div 
              className="h-full rounded-full transition-all duration-100" 
              style={{ width: `${progressPercent}%`, backgroundColor: moodColor }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
              style={{ left: `calc(${progressPercent}% - 5px)` }}
            />
          </div>
          <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold tracking-wider mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
