import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { SoundtrackEntry } from '../types';
import { YouTubeTrack } from '../services/youtubeMusicService';
import { X, PlayCircle, Loader2, Calendar, Music, Sparkles } from 'lucide-react';
import ModalShell from './ModalShell';
import EmptyState from './EmptyState';

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
        console.error('Error fetching soundtrack history:', err);
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
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ModalShell open ariaLabel="Banda sonora" zClass="z-[300] app-overlay-fullscreen" variant="plain" swipeToClose={false}>
      <div className="relative flex flex-col w-full h-full bg-[var(--app-bg)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.1),transparent_50%)] pointer-events-none" />

        <header className="p-5 shrink-0 flex justify-between items-center z-50 border-b border-white/[0.06] apple-vibrancy">
          <div>
            <h2 id="soundtrack-title" className="text-2xl font-semibold text-white flex items-center gap-2 tracking-[-0.025em]">
              <Music className="text-purple-300" size={20} strokeWidth={1.8} />
              Mi Banda Sonora
            </h2>
            <p className="app-text-meta mt-1">
              Diario musical e historial de vibra
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-icon-button"
            aria-label="Cerrar banda sonora"
          >
            <X size={18} />
          </button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-5 space-y-5 relative z-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4" aria-busy="true" aria-label="Cargando historial">
              <Loader2 size={28} className="text-purple-300 animate-spin" />
              <p className="app-text-eyebrow">
                Cargando tu historial…
              </p>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              mascot="joy"
              title="Aún no hay sintonías"
              description="Registra tu estado de ánimo cada día y entra en la pestaña Explora para que generemos tu sintonía musical diaria. Se guardará aquí automáticamente."
            />
          ) : (
            <div className="max-w-xl mx-auto space-y-5">
              {entries.map((entry) => (
                <div key={entry.id || entry.date} className="app-surface-raised relative rounded-2xl overflow-hidden transition-all duration-300">
                  <div
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ backgroundColor: entry.moodColor }}
                  />
                  <div
                    className="absolute inset-0 opacity-[0.025] pointer-events-none"
                    style={{ backgroundColor: entry.moodColor, filter: 'blur(40px)' }}
                  />

                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-white/45">
                          <Calendar size={11} strokeWidth={1.8} />
                          <span className="app-text-eyebrow">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-white leading-tight tracking-[-0.015em]">
                          {entry.vibeName || 'Sintonía del día'}
                        </h4>
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider mt-1 text-black"
                          style={{ backgroundColor: entry.moodColor, boxShadow: `0 0 12px ${entry.moodColor}55` }}
                        >
                          {entry.moodLabel}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePlayAll(entry)}
                        className="app-button app-button-primary px-3.5 py-2 text-[12px]"
                      >
                        <PlayCircle size={13} strokeWidth={2} />
                        Reproducir
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                      {entry.songs.map((song, idx) => (
                        <button
                          key={song.youtubeId || `${entry.date}-${idx}`}
                          onClick={() => handlePlaySong(entry, idx)}
                          className="app-list-row px-2"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={song.thumbnail}
                              className="w-9 h-9 object-cover rounded-lg shrink-0 app-surface"
                              alt=""
                            />
                            <div className="truncate min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-white truncate leading-tight tracking-[-0.005em]">
                                {song.title}
                              </div>
                              <div className="text-[10px] app-text-eyebrow truncate mt-0.5">
                                {song.artist}
                              </div>
                            </div>
                          </div>
                          <PlayCircle
                            size={15}
                            className="text-white/45 ml-2 shrink-0"
                            strokeWidth={1.8}
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
    </ModalShell>
  );
};

export default SoundtrackView;
