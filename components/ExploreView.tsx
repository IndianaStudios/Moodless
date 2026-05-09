import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MoodEntry, MoodCategory } from '../types';
import { EMOTIONAL_PALETTE } from '../constants';
import { youtubeMusicService, YouTubeTrack } from '../services/youtubeMusicService';
import {
  getVibeRecommendation,
  getMoodGameConfig,
  getMoodMusicRecommendation,
  GameConfig,
  MusicRecommendation
} from '../services/geminiService';
import {
  X,
  ChevronDown,
  Loader2,
  RotateCcw,
  Globe,
  Youtube,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  Link2,
  PlayCircle
} from 'lucide-react';
import MoodCanvasGame from './MoodCanvasGame';

interface ExploreViewProps {
  lastEntry?: MoodEntry;
}

const ExploreView: React.FC<ExploreViewProps> = ({ lastEntry }) => {
  const [recommendation, setRecommendation] = useState<string>("");
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [music, setMusic] = useState<MusicRecommendation | null>(null);
  const [youtubeTracks, setYoutubeTracks] = useState<YouTubeTrack[]>([]);

  const [loadingGame, setLoadingGame] = useState(false);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [activeGame, setActiveGame] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [vibeEmojis, setVibeEmojis] = useState<{ id: number, x: number, delay: number, duration: number }[]>([]);

  const currentMood = lastEntry?.category || MoodCategory.NEUTRAL;
  const moodColor = EMOTIONAL_PALETTE.find(p => p.category === currentMood)?.hex || '#ffffff';

  const spawnGoodVibes = () => {
    const newEmojis = Array.from({ length: 15 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      delay: Math.random() * 0.4,
      duration: 1.2 + Math.random() * 1,
    }));
    setVibeEmojis(prev => [...prev, ...newEmojis]);
    // Limpiar emojis antiguos después de la animación
    setTimeout(() => {
      setVibeEmojis(prev => prev.filter(e => !newEmojis.find(n => n.id === e.id)));
    }, 3000);
  };

  const loadData = useCallback(async (force: boolean = false) => {
    if (!lastEntry) return;
    setLoadingMusic(true);
    setLoadingGame(true);

    if (force) {
      localStorage.removeItem(`music_config_${lastEntry.id}`);
      localStorage.removeItem(`game_config_${lastEntry.id}`);
    }

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // 1. Música (primera llamada)
    try {
      const musicRec = await getMoodMusicRecommendation(currentMood, lastEntry.valence, lastEntry.arousal, lastEntry.id);
      setMusic(musicRec);

      if (youtubeMusicService.isConfigured() && (musicRec.searchQueries || musicRec.searchQuery)) {
        const queries = musicRec.searchQueries || (musicRec.searchQuery ? [musicRec.searchQuery] : []);
        const tracks = await youtubeMusicService.searchTracks(queries);
        setYoutubeTracks(tracks);
      }
    } catch (e) { console.error(e); } finally { setLoadingMusic(false); }

    await delay(1500);

    // 2. Juego (segunda llamada)
    try {
      const config = await getMoodGameConfig(currentMood, lastEntry.valence, lastEntry.arousal, lastEntry.dominance, lastEntry.id);
      setGameConfig({ ...config, themeColor: moodColor });
    } catch (e) { console.error(e); } finally { setLoadingGame(false); }

    await delay(1500);

    // 3. Vibe (tercera llamada)
    getVibeRecommendation(currentMood).then(setRecommendation).catch(console.error);
  }, [lastEntry, currentMood, moodColor]);

  useEffect(() => { loadData(); }, [loadData]);

  const reportData = lastEntry?.report ? (() => {
    try { return JSON.parse(lastEntry.report); } catch { return { title: "Tu Aura", explanation: lastEntry.report }; }
  })() : null;

  const youtubeReady = youtubeMusicService.isConfigured();

  // Función mejorada para construir la URL del reproductor según YouTube Player API Reference
  const getEmbedUrl = (videoId: string) => {
    const origin = window.location.origin;
    // Según la documentación:
    // enablejsapi=1 es fundamental para el control programático.
    // origin es necesario para la seguridad del postMessage.
    // playsinline=1 evita el modo fullscreen forzado en móviles.
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}&playsinline=1&modestbranding=1&rel=0`;
  };

  return (
    <div className="px-5 pt-16 pb-36 flex-1 flex flex-col space-y-5 relative max-w-2xl mx-auto w-full">
      <header className="shrink-0 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-white leading-none">Explora</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Sintonización Vibracional</p>
        </div>
        <button onClick={() => loadData(true)} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
          <RotateCcw size={16} />
        </button>
      </header>

      {/* Mood Insight */}
      <div className="relative glass p-6 rounded-[2rem] border-l-[6px] shadow-2xl shrink-0" style={{ borderLeftColor: moodColor }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} className="text-blue-400" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Resonancia Gemini</span>
        </div>
        {reportData && (
          <div className="space-y-1">
            <h4 className="text-xl font-black text-white leading-tight">{reportData.title}</h4>
            <p className="text-[11px] leading-relaxed text-slate-400 font-medium italic">{reportData.explanation}</p>
          </div>
        )}
      </div>

      {/* YouTube Music Section */}
      <div className="relative glass p-6 rounded-[2.2rem] border-white/10 overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10 blur-[60px] pointer-events-none" style={{ backgroundColor: moodColor }} />
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${youtubeReady ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-slate-500'}`}>
              <Youtube size={14} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Sintonía YouTube</span>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">{music?.vibe || 'Cargando vibra...'}</h5>
            </div>
          </div>
          {youtubeReady && youtubeTracks.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg text-slate-400">
              <Globe size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">Global Catalog</span>
            </div>
          )}
        </div>

        {loadingMusic ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 size={24} className="text-red-500 animate-spin" />
          </div>
        ) : youtubeReady && youtubeTracks.length > 0 ? (
          <div className="space-y-3 relative z-10">
            {youtubeTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => setActiveVideoId(track.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${activeVideoId === track.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-12 h-12 shrink-0">
                    <img src={track.thumbnail} className="w-full h-full object-cover rounded-lg shadow-md" alt="" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <PlayCircle size={16} className="text-white opacity-80" />
                    </div>
                  </div>
                  <div className="truncate text-left flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white truncate leading-none mb-1">{track.title}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">{track.channelTitle}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed px-6">
              {youtubeReady ? "Sin resultados disponibles ahora." : "Configura tu clave de YouTube API."}
            </p>
          </div>
        )}

        {/* Search Grounding Sources */}
        {music?.groundingSources && music.groundingSources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
            <div className="flex items-center gap-2 mb-2 text-slate-600">
              <Link2 size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">Fuentes de Sintonía</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {music.groundingSources.map((source: any, i: number) => (
                source.web?.uri && (
                  <a key={i} href={source.web.uri} target="_blank" className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full text-[8px] text-slate-400 hover:text-white transition-colors">
                    {source.web.title || "Fuente"} <ExternalLink size={8} />
                  </a>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game Launcher */}
      <div className="relative glass p-10 rounded-[2.5rem] border-white/10 overflow-hidden flex flex-col items-center text-center shrink-0">
        <div className="absolute inset-0 opacity-20 blur-[100px] pointer-events-none" style={{ backgroundColor: moodColor }} />
        {loadingGame ? (
          <Loader2 size={32} className="text-purple-400 animate-spin py-10" />
        ) : gameConfig ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000 w-full">
            <h3 className="text-2xl font-black mb-3 text-white leading-tight">{gameConfig.title}</h3>
            <p className="text-sm text-slate-400 mb-8 italic px-4 font-medium">"{gameConfig.description}"</p>
            <button onClick={() => { setActiveGame(true); }} className="w-full py-4 rounded-full bg-white text-slate-950 font-black shadow-xl active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]">
              Sintonizar Ahora
            </button>
          </div>
        ) : null}
      </div>

      {/* Good Vibes Button */}
      <div className="relative shrink-0">
        <button
          onClick={spawnGoodVibes}
          className="w-full py-5 rounded-[2rem] glass border border-white/10 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-white/10"
        >
          🤙🏻 Good Vibes
        </button>

        {/* Floating Emojis */}
        {vibeEmojis.map(emoji => (
          <span
            key={emoji.id}
            className="absolute text-2xl pointer-events-none select-none"
            style={{
              left: `${emoji.x}%`,
              bottom: '0',
              animationName: 'floatUp',
              animationDuration: `${emoji.duration}s`,
              animationDelay: `${emoji.delay}s`,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
              opacity: 0,
            }}
          >
            🤙🏻
          </span>
        ))}

        <style>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            70% { opacity: 1; }
            100% { opacity: 0; transform: translateY(-300px) scale(1.3) rotate(15deg); }
          }
        `}</style>
      </div>

      {/* YouTube Player Overlay */}
      {activeVideoId && (
        <div className="fixed inset-x-0 bottom-24 z-[250] animate-in slide-in-from-bottom-8 duration-700 flex justify-center px-4">
          <div className="glass w-full max-w-2xl p-3 rounded-[2.2rem] border-white/10 shadow-2xl relative overflow-hidden bg-black/80 backdrop-blur-3xl">
            <div className="absolute inset-0 opacity-30 blur-3xl pointer-events-none" style={{ backgroundColor: moodColor }} />
            <div className="relative z-10">
              <header className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-red-600/20 text-red-500"><Youtube size={12} /></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">YouTube Music Aura</span>
                </div>
                <button onClick={() => setActiveVideoId(null)} className="p-1.5 bg-white/10 rounded-full text-slate-400"><ChevronDown size={18} /></button>
              </header>
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                <iframe
                  id="yt-player"
                  width="100%"
                  height="100%"
                  src={getEmbedUrl(activeVideoId)}
                  title="YouTube music player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Experience Modal */}
      {activeGame && (
        <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col animate-in fade-in duration-500">
          <div className="absolute inset-0 opacity-10 blur-[150px]" style={{ backgroundColor: moodColor }} />
          <header className="p-10 flex justify-between items-center z-50">
            <div>
              <h2 className="text-3xl font-black text-white">{gameConfig?.title}</h2>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{gameConfig?.mantra}</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full ${isMuted ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-slate-400'}`}>
                {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
              </button>
              <button onClick={() => setActiveGame(false)} className="p-4 bg-white/5 rounded-full text-slate-400"><X size={28} /></button>
            </div>
          </header>
          <main className="flex-1 w-full h-full relative p-4">
            <div className="w-full h-full glass rounded-[3.5rem] relative overflow-hidden">
              <MoodCanvasGame config={gameConfig!} themeColor={moodColor} isMuted={isMuted} />
              
              <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                <p className="text-[12px] font-black uppercase text-slate-500 tracking-[0.3em] bg-black/30 inline-block px-4 py-2 rounded-full backdrop-blur-md">
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