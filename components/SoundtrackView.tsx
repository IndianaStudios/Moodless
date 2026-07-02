import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { SoundtrackEntry } from '../types';
import { YouTubeTrack } from '../services/youtubeMusicService';
import { X, PlayCircle, Loader2, Calendar, Music, Sparkles } from 'lucide-react';

interface SoundtrackViewProps {
  userId: string;
  onClose: () => void;
  onPlayQueue: (tracks: YouTubeTrack[], moodColor: string, startIndex?: number) => void;
}

const SoundtrackView: React.FC<SoundtrackViewProps> = ({ userId, onClose, onPlayQueue }) => {
  const [entries, setEntries] = useState<SoundtrackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSoundtrack = async () => {
      try {
        const soundtrackRef = collection(db, 'users', userId, 'soundtrack');
        const q = query(soundtrackRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const loadedEntries: SoundtrackEntry[] = [];
        querySnapshot.forEach((doc) => {
          loadedEntries.push({ id: doc.id, ...doc.data() } as SoundtrackEntry);
        });
        setEntries(loadedEntries);
      } catch (err) {
        console.error("Error fetching soundtrack history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSoundtrack();
  }, [userId]);

  const handlePlaySong = (entry: SoundtrackEntry, songIndex: number) => {
    const tracks: YouTubeTrack[] = entry.songs.map((s) => ({
      id: s.youtubeId,
      title: s.title,
      channelTitle: s.artist,
      thumbnail: s.thumbnail,
    }));
    onPlayQueue(tracks, entry.moodColor, songIndex);
  };

  const handlePlayAll = (entry: SoundtrackEntry) => {
    const tracks: YouTubeTrack[] = entry.songs.map((s) => ({
      id: s.youtubeId,
      title: s.title,
      channelTitle: s.artist,
      thumbnail: s.thumbnail,
    }));
    onPlayQueue(tracks, entry.moodColor, 0);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // Evitar problemas de zona horaria
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.1),transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="p-6 shrink-0 flex justify-between items-center z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Music className="text-purple-500" size={22} />
            Mi Banda Sonora
          </h2>
          <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mt-1">
            Diario Musical e Historial de Vibra
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-3 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors active:scale-95"
        >
          <X size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-purple-500 animate-spin" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Cargando tu historial...
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 px-6 max-w-sm mx-auto flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500 border border-white/5">
              <Music size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Tu diario musical está vacío</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Registra tu estado de ánimo cada día y entra en la pestaña <strong>Explora</strong> para que Gemini genere tu sintonía musical diaria. Se guardará aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-6">
            {entries.map((entry) => (
              <div
                key={entry.date}
                className="glass rounded-[2rem] border-white/10 overflow-hidden relative shadow-xl transition-all duration-300"
              >
                {/* Visual accent based on mood color */}
                <div
                  className="absolute inset-x-0 top-0 h-[4px]"
                  style={{ backgroundColor: entry.moodColor }}
                />
                <div
                  className="absolute inset-0 opacity-[0.02] pointer-events-none"
                  style={{ backgroundColor: entry.moodColor, filter: 'blur(40px)' }}
                />

                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={11} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white leading-tight">
                        {entry.vibeName || 'Sintonía del día'}
                      </h4>
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest mt-1 text-slate-950"
                        style={{ backgroundColor: entry.moodColor }}
                      >
                        {entry.moodLabel}
                      </span>
                    </div>

                    <button
                      onClick={() => handlePlayAll(entry)}
                      className="px-3.5 py-2 bg-white text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                    >
                      <PlayCircle size={12} fill="currentColor" />
                      Reproducir
                    </button>
                  </div>

                  {/* Songs List */}
                  <div className="space-y-2.5 pt-2 border-t border-white/5">
                    {entry.songs.map((song, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlaySong(entry, idx)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={song.thumbnail}
                            className="w-9 h-9 object-cover rounded-lg shadow-sm shrink-0 border border-white/10"
                            alt=""
                          />
                          <div className="truncate min-w-0 flex-1">
                            <div className="text-[10px] font-bold text-white truncate leading-tight group-hover:text-purple-300 transition-colors">
                              {song.title}
                            </div>
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest truncate mt-0.5">
                              {song.artist}
                            </div>
                          </div>
                        </div>
                        <PlayCircle
                          size={16}
                          className="text-slate-400 group-hover:text-white transition-colors ml-2 shrink-0"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SoundtrackView;
