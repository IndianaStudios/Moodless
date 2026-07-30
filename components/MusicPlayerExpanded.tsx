import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, X, ChevronDown, ListMusic, Repeat, Shuffle } from 'lucide-react';
import { YouTubeTrack } from '../services/youtubeMusicService';

interface MusicPlayerExpandedProps {
  queue: YouTubeTrack[];
  currentIndex: number;
  isPlaying: boolean;
  onStateChange: (isPlaying: boolean) => void;
  onTrackChange: (index: number) => void;
  onClose: () => void;
  moodColor: string;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const MusicPlayerExpanded: React.FC<MusicPlayerExpandedProps> = ({
  queue,
  currentIndex,
  isPlaying,
  onStateChange,
  onTrackChange,
  onClose,
  moodColor,
  currentTime = 0,
  duration = 0,
  onSeek,
}) => {
  const [showQueue, setShowQueue] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 200], [1, 0.4]);

  const currentTrack = queue[currentIndex];

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    } else {
      y.set(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < queue.length - 1) {
      onTrackChange(currentIndex + 1);
    } else {
      onStateChange(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) onTrackChange(currentIndex - 1);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    onSeek(percentage * duration);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[200]"
      style={{
        background: `linear-gradient(180deg, ${moodColor}30 0%, ${moodColor}10 40%, #000 100%)`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Reproductor en pantalla completa"
    >
      <motion.div
        className="absolute inset-0"
        style={{ y, opacity }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 320 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
      >
        <header className="flex items-center justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/[0.08] backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            aria-label="Minimizar reproductor"
          >
            <ChevronDown size={20} strokeWidth={2} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Reproduciendo</p>
            <p className="text-[11px] font-medium text-white/85 mt-0.5">Tu sintonía</p>
          </div>
          <button
            type="button"
            onClick={() => setShowQueue(s => !s)}
            className="w-10 h-10 rounded-full bg-white/[0.08] backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white"
            aria-label="Lista de reproducción"
          >
            <ListMusic size={18} strokeWidth={1.8} />
          </button>
        </header>

        <main className="px-6 pt-4 pb-6 flex flex-col items-center max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="relative w-full aspect-square rounded-[2rem] overflow-hidden mb-7 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
          >
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 opacity-30 mix-blend-overlay"
              style={{ background: `linear-gradient(180deg, transparent 40%, ${moodColor})` }}
            />
          </motion.div>

          <div className="w-full text-center mb-5">
            <h2 className="text-xl font-semibold text-white tracking-[-0.022em] truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-white/55 mt-1 truncate">
              {currentTrack.channelTitle}
            </p>
          </div>

          <div className="w-full mb-5">
            <div
              className="h-1 bg-white/[0.08] rounded-full overflow-hidden cursor-pointer"
              onClick={handleSeekClick}
              role="slider"
              aria-label="Progreso"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-[width] duration-100"
                style={{ width: `${progressPercent}%`, backgroundColor: '#fff' }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-medium text-white/45 tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mb-7">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="text-white disabled:opacity-30 transition-opacity"
              aria-label="Anterior"
            >
              <SkipBack size={32} strokeWidth={1.6} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => onStateChange(!isPlaying)}
              className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center shadow-[0_8px_28px_rgba(255,255,255,0.18)] active:scale-95 transition-transform"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <Pause size={28} strokeWidth={2} fill="black" className="text-black" />
              ) : (
                <Play size={28} strokeWidth={2} fill="black" className="text-black ml-1" />
              )}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === queue.length - 1}
              className="text-white disabled:opacity-30 transition-opacity"
              aria-label="Siguiente"
            >
              <SkipForward size={32} strokeWidth={1.6} fill="currentColor" />
            </button>
          </div>

          <div className="flex items-center gap-5 text-white/45">
            <button type="button" className="hover:text-white transition-colors" aria-label="Aleatorio">
              <Shuffle size={18} strokeWidth={1.8} />
            </button>
            <button type="button" className="hover:text-white transition-colors" aria-label="Repetir">
              <Repeat size={18} strokeWidth={1.8} />
            </button>
          </div>

          <AnimatePresence>
            {showQueue && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-0 bottom-0 z-10 bg-black/55 backdrop-blur-3xl border-t border-white/[0.06] rounded-t-[2rem] max-h-[60vh] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                  <p className="text-sm font-semibold text-white tracking-[-0.005em]">Lista de reproducción</p>
                  <button
                    onClick={() => setShowQueue(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center"
                    aria-label="Cerrar lista"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                  {queue.map((track, idx) => {
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => onTrackChange(idx)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                          isCurrent ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <img src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold truncate tracking-[-0.005em] ${isCurrent ? 'text-white' : 'text-white/85'}`}>
                            {track.title}
                          </p>
                          <p className="text-[11px] text-white/45 truncate mt-0.5">{track.channelTitle}</p>
                        </div>
                        {isCurrent && isPlaying && (
                          <span className="flex items-end gap-0.5 h-3.5">
                            <span className="w-0.5 bg-white/85 rounded-full animate-[nowPlayingWave_1s_ease-in-out_infinite]" style={{ height: '100%' }} />
                            <span className="w-0.5 bg-white/85 rounded-full animate-[nowPlayingWave_1.2s_ease-in-out_infinite]" style={{ height: '70%' }} />
                            <span className="w-0.5 bg-white/85 rounded-full animate-[nowPlayingWave_0.8s_ease-in-out_infinite]" style={{ height: '90%' }} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>
    </motion.div>
  );
};

export default MusicPlayerExpanded;
