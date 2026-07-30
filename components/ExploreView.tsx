import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodEntry, MoodCategory, SoundtrackEntry } from '../types';
import { EMOTIONAL_PALETTE, triggerHaptic } from '../constants';
import { youtubeMusicService, YouTubeTrack } from '../services/youtubeMusicService';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  getVibeRecommendation,
  getMoodGameConfig,
  getMoodMusicRecommendation,
  GameConfig,
  MusicRecommendation,
} from '../services/geminiService';
import {
  X,
  Loader2,
  RotateCcw,
  Globe,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  Link2,
  PlayCircle,
  Music,
  Hand,
  Lock,
} from 'lucide-react';

const YoutubeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

import MoodCanvasGame from './MoodCanvasGame';
import EmptyState from './EmptyState';

interface ExploreViewProps {
  lastEntry?: MoodEntry;
  userId: string;
  onPlayQueue: (tracks: YouTubeTrack[], moodColor: string, startIndex?: number) => void;
  onOpenSoundtrack: () => void;
  loggedToday?: boolean;
  onNavigateToLog?: () => void;
}

const ExploreView: React.FC<ExploreViewProps> = ({ lastEntry, userId, onPlayQueue, onOpenSoundtrack, loggedToday = true, onNavigateToLog }) => {
  const [recommendation, setRecommendation] = useState<string>('');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [music, setMusic] = useState<MusicRecommendation | null>(null);
  const [youtubeTracks, setYoutubeTracks] = useState<YouTubeTrack[]>([]);

  const [loadingGame, setLoadingGame] = useState(false);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [activeGame, setActiveGame] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [vibeBursts, setVibeBursts] = useState<{ id: number; count: number }[]>([]);
  const burstIdRef = useRef(0);

  const currentMood = lastEntry?.category || MoodCategory.NEUTRAL;
  const moodColor = EMOTIONAL_PALETTE.find(p => p.category === currentMood)?.hex || '#ffffff';

  const spawnGoodVibes = () => {
    triggerHaptic();
    burstIdRef.current += 1;
    const count = 10 + Math.floor(Math.random() * 6); // 10–15 emojis
    setVibeBursts(prev => [...prev, { id: burstIdRef.current, count }]);
    // Cleanup burst after animation completes
    setTimeout(() => {
      setVibeBursts(prev => prev.filter(b => b.id !== burstIdRef.current));
    }, 2500);
  };

  const loadData = useCallback(async (force: boolean = false) => {
    if (!lastEntry) return;
    if (!loggedToday) return;
    setLoadingMusic(true);
    setLoadingGame(true);

    if (force) {
      localStorage.removeItem(`music_config_${lastEntry.id}`);
      localStorage.removeItem(`game_config_${lastEntry.id}`);
    }

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    let reusedFromSoundtrack = false;

    const today = new Date().toISOString().split('T')[0];
    const isToday = lastEntry.date === today;

    if (!force && isToday) {
      try {
        const soundtrackRef = doc(db, 'users', userId, 'soundtrack', lastEntry.date);
        const snap = await getDoc(soundtrackRef);
        if (snap.exists()) {
          const data = snap.data() as SoundtrackEntry;
          if (data.songs && data.songs.length > 0) {
            const cachedMusic = {
              vibe: data.vibeName || 'Sintonía del día',
              playlistName: data.moodLabel || 'Tu vibe',
              searchQueries: data.songs.map(s => `${s.artist} ${s.title}`),
              groundingSources: [],
            };
            setMusic(cachedMusic);
            setYoutubeTracks(
              data.songs.map(s => ({
                id: s.youtubeId,
                title: s.title,
                channelTitle: s.artist,
                thumbnail: s.thumbnail,
              }))
            );
            reusedFromSoundtrack = true;
          }
        }
      } catch (e) {
        console.warn('Soundtrack read failed, will regenerate:', e);
      }
    }

    if (reusedFromSoundtrack) {
      setLoadingMusic(false);
    } else {
      try {
        const musicRec = await getMoodMusicRecommendation(currentMood, lastEntry.valence, lastEntry.arousal, lastEntry.id);
        setMusic(musicRec);

        if (youtubeMusicService.isConfigured() && (musicRec.searchQueries || musicRec.searchQuery)) {
          const queries = musicRec.searchQueries || (musicRec.searchQuery ? [musicRec.searchQuery] : []);
          const tracks = await youtubeMusicService.searchTracks(queries);
          setYoutubeTracks(tracks);

          if (tracks.length > 0) {
            const moodPalette = EMOTIONAL_PALETTE.find(p => p.category === currentMood);
            const soundtrackRef = doc(db, 'users', userId, 'soundtrack', lastEntry.date);
            const entryData: SoundtrackEntry = {
              date: lastEntry.date,
              moodCategory: currentMood,
              moodColor: moodColor,
              moodLabel: moodPalette?.label || 'Neutral',
              vibeName: musicRec.vibe || 'Sintonía del día',
              songs: tracks.map(t => ({
                title: t.title,
                artist: t.channelTitle,
                youtubeId: t.id,
                thumbnail: t.thumbnail,
              })),
              savedAt: new Date().toISOString(),
            };
            await setDoc(soundtrackRef, entryData);
          }
        }
      } catch (e) { console.error(e); } finally { setLoadingMusic(false); }
    }

    await delay(1500);

    try {
      const config = await getMoodGameConfig(currentMood, lastEntry.valence, lastEntry.arousal, lastEntry.dominance, lastEntry.id);
      setGameConfig({ ...config, themeColor: moodColor });
    } catch (e) { console.error(e); } finally { setLoadingGame(false); }

    await delay(1500);

    getVibeRecommendation(currentMood).then(setRecommendation).catch(console.error);
  }, [lastEntry, currentMood, moodColor, userId, loggedToday]);

  useEffect(() => {
    if (!loggedToday) {
      setMusic(null);
      setYoutubeTracks([]);
      setGameConfig(null);
      setRecommendation('');
      setLoadingMusic(false);
      setLoadingGame(false);
      return;
    }
    loadData();
  }, [loadData, loggedToday]);

  const reportData = lastEntry?.report ? (() => {
    try { return JSON.parse(lastEntry.report); } catch { return { title: 'Tu Aura', explanation: lastEntry.report }; }
  })() : null;

  const youtubeReady = youtubeMusicService.isConfigured();

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col space-y-5 px-5 pb-36 pt-[max(2.25rem,env(safe-area-inset-top),2.5rem)]">
      <header className="flex shrink-0 items-end justify-between">
        <div>
          <p className="app-eyebrow mb-2">Sintonía</p>
          <h2 className="app-title text-[clamp(1.75rem,5vw,2.25rem)] text-white">Explora</h2>
          <p className="mt-1 text-sm text-white/45">Sintonización vibracional</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.88, rotate: -90 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          type="button"
          onClick={() => { triggerHaptic(); loadData(true); }}
          className="app-icon-button"
          aria-label="Recargar recomendaciones"
        >
          <RotateCcw size={15} strokeWidth={1.8} />
        </motion.button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, ease: [0.16, 1, 0.3, 1] }}
        className="app-surface-raised relative p-6 rounded-3xl shrink-0"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} className="text-blue-400" strokeWidth={1.8} />
          <span className="app-text-eyebrow">Resonancia Gemini</span>
        </div>
        {reportData && (
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-white leading-tight tracking-[-0.02em]">{reportData.title}</h4>
            <p className="text-[11px] leading-relaxed text-white/55 font-medium italic">{reportData.explanation}</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className={`app-surface-raised relative p-6 rounded-3xl overflow-hidden shrink-0 ${!loggedToday ? 'min-h-[20rem] sm:min-h-[24rem]' : ''}`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${youtubeReady ? 'bg-red-500/10 text-red-500' : 'bg-white/[0.04] text-white/45'}`}>
              <YoutubeIcon size={14} />
            </div>
            <div>
              <span className="app-text-eyebrow block">Sintonía YouTube</span>
              <h5 className="text-xs font-semibold text-white tracking-[-0.005em]">
                {loggedToday ? (music?.vibe || 'Cargando vibra...') : 'Sintonía bloqueada'}
              </h5>
            </div>
          </div>
          {loggedToday && youtubeReady && youtubeTracks.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.04] rounded-lg text-white/55">
              <Globe size={10} strokeWidth={1.8} />
              <span className="app-text-eyebrow">Global</span>
            </div>
          )}
        </div>

        {loggedToday && loadingMusic ? (
          <div className="space-y-3 relative z-10" aria-busy="true" aria-label="Cargando sintonía">
            {/* Skeleton del bloque de acciones (Reproducir todo / Mi banda sonora) */}
            <div className="flex items-center gap-2 mb-4">
              <div className="app-skeleton h-[44px] flex-1 rounded-full" />
              <div className="app-skeleton h-[44px] flex-1 rounded-full" />
            </div>
            {/* Skeleton de 5 tracks */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="app-list-row opacity-100">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="app-skeleton w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="app-skeleton h-3 rounded w-3/4" />
                    <div className="app-skeleton h-2 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : loggedToday && youtubeReady && youtubeTracks.length > 0 ? (
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { triggerHaptic(); onPlayQueue(youtubeTracks, moodColor, 0); }}
                className="app-button app-button-primary flex-1 py-3 text-[13px]"
              >
                <PlayCircle size={14} strokeWidth={2} />
                Reproducir todo
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { triggerHaptic(); onOpenSoundtrack(); }}
                className="app-button app-button-secondary flex-1 py-3 text-[13px]"
              >
                <Music size={14} strokeWidth={1.8} className="text-purple-300" />
                Mi Banda Sonora
              </motion.button>
            </div>

            {youtubeTracks.map((track, idx) => (
              <motion.button
                key={track.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => { triggerHaptic(); onPlayQueue(youtubeTracks, moodColor, idx); }}
                className="app-list-row"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden">
                    <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-lg">
                      <PlayCircle size={16} className="text-white opacity-90" strokeWidth={1.8} />
                    </div>
                  </div>
                  <div className="truncate text-left flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-white truncate leading-none mb-1.5 tracking-[-0.005em]">{track.title}</div>
                    <div className="text-[10px] app-text-eyebrow truncate">{track.channelTitle}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        ) : loggedToday && (
          <div className="space-y-4 relative z-10">
            <div className="flex justify-center">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { triggerHaptic(); onOpenSoundtrack(); }}
                className="app-button app-button-secondary w-full py-3 text-[13px]"
              >
                <Music size={14} strokeWidth={1.8} className="text-purple-300" />
                Ver Mi Banda Sonora
              </motion.button>
            </div>
            <EmptyState
              icon={<YoutubeIcon />}
              title={youtubeReady ? 'Sin resultados disponibles ahora' : 'Configura tu clave de YouTube API'}
              description="Cuando generemos tu sintonía diaria, aparecerá aquí con vídeos para cada momento del día."
              size="sm"
            />
          </div>
        )}

        {loggedToday && music?.groundingSources && music.groundingSources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/[0.05] relative z-10">
            <div className="flex items-center gap-2 mb-2 text-white/45">
              <Link2 size={10} strokeWidth={1.8} />
              <span className="app-text-eyebrow">Fuentes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {music.groundingSources.map((source: any, i: number) => (
                source.web?.uri && (
                  <a key={i} href={source.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 app-surface rounded-full text-[10px] text-white/55 hover:text-white transition-colors">
                    {source.web.title || 'Fuente'} <ExternalLink size={9} strokeWidth={1.8} />
                  </a>
                )
              ))}
            </div>
          </div>
        )}

        {!loggedToday && (
          <div className="app-card-overlay" aria-hidden={false}>
            <Lock size={18} className="text-white/55" strokeWidth={1.7} />
            <p className="mt-3 text-sm font-medium text-white leading-tight px-2">Aún no has registrado tu vibe de hoy</p>
            <p className="mt-1 app-text-meta text-center leading-snug px-2">Registra tu vibe para desbloquear tu sintonía.</p>
            {onNavigateToLog && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { triggerHaptic(); onNavigateToLog(); }}
                className="app-button app-button-primary mt-4 px-5 py-2 text-xs"
              >
                Registrar vibe
              </motion.button>
            )}
          </div>
        )}
      </motion.div>

      <div className="app-surface-raised relative p-10 rounded-3xl overflow-hidden flex flex-col items-center text-center shrink-0">
        {loadingGame ? (
          <div className="flex flex-col items-center w-full py-4" aria-busy="true" aria-label="Cargando ritual">
            <div className="app-skeleton h-7 w-3/4 rounded mb-3" />
            <div className="app-skeleton h-4 w-5/6 rounded mb-2" />
            <div className="app-skeleton h-4 w-4/6 rounded mb-7" />
            <div className="app-skeleton h-[52px] w-full rounded-full" />
          </div>
        ) : gameConfig && loggedToday ? (
          <div className="flex flex-col items-center w-full">
            <h3 className="text-2xl font-semibold mb-3 text-white leading-tight tracking-[-0.025em]">{gameConfig.title}</h3>
            <p className="text-sm text-white/55 mb-8 italic px-4 font-medium">"{gameConfig.description}"</p>
            <button onClick={() => { triggerHaptic(); setActiveGame(true); }} className="app-button app-button-primary w-full py-4 text-[13px]">
              Sintonizar ahora
            </button>
          </div>
        ) : gameConfig && !loggedToday ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Lock size={18} className="text-white/55" strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-semibold text-white mb-1.5 tracking-[-0.01em]">
              {gameConfig.title}
            </h3>
            <p className="text-[12px] text-white/55 max-w-[240px] mb-5 leading-snug">
              Registra tu vibe de hoy para desbloquear este ritual.
            </p>
            {onNavigateToLog && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { triggerHaptic(); onNavigateToLog(); }}
                className="app-button app-button-primary px-5 py-2.5 text-xs"
              >
                Registrar vibe
              </motion.button>
            )}
          </div>
        ) : null}
      </div>

      <div className="relative shrink-0">
        <button
          onClick={spawnGoodVibes}
          className="app-surface-raised w-full py-5 rounded-2xl text-white text-[13px] font-semibold flex items-center justify-center gap-3 transition-all hover:bg-white/[0.08]"
        >
          <Hand size={15} strokeWidth={1.8} />
          Good Vibes
        </button>

        <AnimatePresence>
          {vibeBursts.map((burst) => (
            <div key={burst.id} className="absolute inset-0 pointer-events-none overflow-visible">
              {Array.from({ length: burst.count }).map((_, i) => {
                const baseLeft = 6 + (i * (88 / burst.count)) % 88;
                const jitterX = ((i * 13 + burst.id * 7) % 11) - 5;
                const sizeJitter = 1.6 + ((i * 7 + burst.id) % 10) / 10;
                const rot = (i % 2 === 0 ? 14 : -14) + ((i * 5 + burst.id * 3) % 14) - 7;
                const horizontalDrift = ((i * 17 + burst.id * 11) % 60) - 30;
                return (
                  <motion.span
                    key={`${burst.id}-${i}`}
                    initial={{ opacity: 1, y: 0, x: 0, scale: 0.5, rotate: 0 }}
                    animate={{
                      opacity: 0,
                      y: -300 - (i % 4) * 18,
                      x: horizontalDrift,
                      scale: 1.4,
                      rotate: rot,
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                      duration: 2.0 + (i % 3) * 0.15,
                      ease: [0.16, 1, 0.3, 1],
                      delay: i * 0.025,
                    }}
                    className="absolute select-none"
                    style={{
                      left: `calc(${baseLeft}% + ${jitterX}px)`,
                      bottom: '6%',
                      fontSize: `${sizeJitter}rem`,
                      lineHeight: 1,
                    }}
                  >
                    🤙🏻
                  </motion.span>
                );
              })}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {activeGame && (
        <div className="fixed inset-0 z-[300] bg-[var(--app-bg)] flex flex-col">
          <div className="absolute inset-0 opacity-10 blur-[150px]" style={{ backgroundColor: moodColor }} />
          <header className="p-8 flex justify-between items-center z-50">
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-[-0.025em]">{gameConfig?.title}</h2>
              <p className="app-text-eyebrow">{gameConfig?.mantra}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMuted(!isMuted)} className={`p-3.5 rounded-full border border-white/10 ${isMuted ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.04] text-white/55'}`}>
                {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <button onClick={() => setActiveGame(false)} className="p-3.5 bg-white/[0.04] rounded-full text-white/55 border border-white/10">
                <X size={22} />
              </button>
            </div>
          </header>
          <main className="flex-1 w-full h-full relative px-4 pb-4">
            <div className="w-full h-full app-surface-raised rounded-[3.5rem] relative overflow-hidden">
              <MoodCanvasGame config={gameConfig!} themeColor={moodColor} isMuted={isMuted} />

              <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                <p className="text-[12px] font-medium text-white/55 tracking-wider app-surface inline-block px-4 py-2 rounded-full">
                  {gameConfig?.instruction}
                </p>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default ExploreView;
