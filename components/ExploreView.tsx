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

  const audioCtxRef = useRef<AudioContext | null>(null);
  const breathNodeRef = useRef<GainNode | null>(null);

  const [painterDots, setPainterDots] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  const [bubbles, setBubbles] = useState<{ id: number, x: number, y: number, size: number, opacity: number }[]>([]);
  const gameIntervalRef = useRef<number | null>(null);

  const currentMood = lastEntry?.category || MoodCategory.NEUTRAL;
  const moodColor = EMOTIONAL_PALETTE.find(p => p.category === currentMood)?.hex || '#ffffff';

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playPopSound = () => {
    if (isMuted) return;
    const ctx = initAudio();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.1);
  };

  const playPaintSound = () => {
    if (isMuted) return;
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const freq = 180 + Math.random() * 200;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  };

  const startBreathAudio = () => {
    if (isMuted) return;
    const ctx = initAudio();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    filter.type = 'lowpass';
    gain.gain.value = 0;
    breathNodeRef.current = gain;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    const animate = () => {
      if (!breathNodeRef.current) return;
      const t = ctx.currentTime;
      const v = (Math.sin(t * 1.5) + 1) / 2;
      gain.gain.setTargetAtTime(0.05 + v * 0.1, t, 0.1);
      filter.frequency.setTargetAtTime(300 + v * 800, t, 0.1);
      requestAnimationFrame(animate);
    };
    animate();
  };

  const stopBreathAudio = () => {
    if (breathNodeRef.current) {
      breathNodeRef.current.gain.setTargetAtTime(0, initAudio().currentTime, 0.2);
      setTimeout(() => { breathNodeRef.current = null; }, 300);
    }
  };

  const handlePainterClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameConfig?.type !== 'PAINTER') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    playPaintSound();
    setPainterDots(prev => [...prev.slice(-15), { id: Date.now(), x, y, color: moodColor }]);
  };

  const loadData = useCallback(async (force: boolean = false) => {
    if (!lastEntry) return;
    setLoadingMusic(true);
    setLoadingGame(true);

    if (force) {
      localStorage.removeItem(`music_config_${lastEntry.id}`);
      localStorage.removeItem(`game_config_${lastEntry.id}`);
    }

    try {
      const musicRec = await getMoodMusicRecommendation(currentMood, lastEntry.valence, lastEntry.arousal, lastEntry.id);
      setMusic(musicRec);

      if (youtubeMusicService.isConfigured() && musicRec.searchQuery) {
        const tracks = await youtubeMusicService.searchTracks(musicRec.searchQuery);
        setYoutubeTracks(tracks);
      }
    } catch (e) { console.error(e); } finally { setLoadingMusic(false); }

    getMoodGameConfig(currentMood, lastEntry.valence, lastEntry.arousal, lastEntry.dominance, lastEntry.id)
      .then(config => setGameConfig({ ...config, themeColor: moodColor }))
      .catch(console.error)
      .finally(() => setLoadingGame(false));

    getVibeRecommendation(currentMood).then(setRecommendation).catch(console.error);
  }, [lastEntry, currentMood, moodColor]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeGame) {
      initAudio();
      if (gameConfig?.type === 'POP') {
        gameIntervalRef.current = window.setInterval(() => {
          setBubbles(prev => [...prev.slice(-10), { id: Date.now(), x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, size: Math.random() * 50 + 50, opacity: 0.3 }]);
        }, 1200);
      } else if (gameConfig?.type === 'BREATH') {
        startBreathAudio();
      }
    } else {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      setBubbles([]);
      stopBreathAudio();
    }
    return () => { if (gameIntervalRef.current) clearInterval(gameIntervalRef.current); stopBreathAudio(); };
  }, [activeGame, gameConfig?.type, isMuted]);

  const popBubble = (id: number) => {
    playPopSound();
    setBubbles(prev => prev.filter(b => b.id !== id));
  };

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
    <div className="px-5 pt-16 pb-36 flex-1 flex flex-col space-y-5 relative">
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
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 shrink-0">
                    <img src={track.thumbnail} className="w-full h-full object-cover rounded-lg shadow-md" alt="" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <PlayCircle size={16} className="text-white opacity-80" />
                    </div>
                  </div>
                  <div className="truncate text-left">
                    <div className="text-[11px] font-bold text-white truncate max-w-[140px] leading-none mb-1">{track.title}</div>
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
            <button onClick={() => { setActiveGame(true); initAudio(); }} className="w-full py-4 rounded-full bg-white text-slate-950 font-black shadow-xl active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]">
              Sintonizar Ahora
            </button>
          </div>
        ) : null}
      </div>

      {/* YouTube Player Overlay */}
      {activeVideoId && (
        <div className="fixed inset-x-4 bottom-24 z-[250] animate-in slide-in-from-bottom-8 duration-700">
          <div className="glass p-3 rounded-[2.2rem] border-white/10 shadow-2xl relative overflow-hidden bg-black/80">
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

          <main className="flex-1 flex items-center justify-center p-10 relative overflow-hidden"
            onMouseDown={handlePainterClick} onTouchStart={handlePainterClick}>
            {gameConfig?.type === 'PAINTER' && (
              <div className="w-full h-full glass rounded-[3.5rem] relative overflow-hidden">
                {painterDots.map(dot => (
                  <div key={dot.id} className="absolute rounded-full blur-3xl animate-pulse"
                    style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: '150px', height: '150px', backgroundColor: dot.color, transform: 'translate(-50%, -50%)', opacity: 0.5 }} />
                ))}
                <p className="absolute bottom-10 left-0 right-0 text-center text-[10px] font-black uppercase text-slate-700 tracking-widest">Toca el vacío</p>
              </div>
            )}
            {gameConfig?.type === 'POP' && (
              <div className="w-full h-full glass rounded-[3.5rem] relative overflow-hidden bg-white/[0.01]">
                {bubbles.map(bubble => (
                  <button key={bubble.id} onClick={(e) => { e.stopPropagation(); popBubble(bubble.id); }}
                    className="absolute rounded-full border border-white/20 active:scale-150 active:opacity-0 transition-all duration-700"
                    style={{ left: `${bubble.x}%`, top: `${bubble.y}%`, width: bubble.size, height: bubble.size, backgroundColor: `${moodColor}11`, boxShadow: `inset 0 0 30px ${moodColor}22` }} />
                ))}
              </div>
            )}
            {gameConfig?.type === 'BREATH' && (
              <div className="flex flex-col items-center gap-16">
                <div className="w-64 h-64 rounded-full border-[10px] flex items-center justify-center animate-ping duration-[6000ms]" style={{ borderColor: `${moodColor}33` }}>
                  <div className="w-40 h-40 rounded-full shadow-[0_0_100px_rgba(255,255,255,0.1)] transition-all duration-[4000ms] animate-pulse"
                    style={{ backgroundColor: moodColor, boxShadow: `0 0 80px ${moodColor}66` }} />
                </div>
                <p className="text-white text-xl font-black tracking-[0.3em] animate-pulse uppercase">Fluye con la calma</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

export default ExploreView;