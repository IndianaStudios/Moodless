import React from 'react';
import { MoodEntry } from '../types';
import { MOOD_ICONS, EMOTIONAL_PALETTE } from '../constants';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, X, Sparkles } from 'lucide-react';

interface HistoryViewProps {
  entries: MoodEntry[];
  onNavigateToLog: () => void;
  onOpenContextChat: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ entries, onNavigateToLog, onOpenContextChat }) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const [zoomedMoodBuddy, setZoomedMoodBuddy] = React.useState<string | null>(null);
  const [zoomedColor, setZoomedColor] = React.useState('#fff');

  return (
    <div className="px-6 pt-20 pb-40 flex-1 flex flex-col overflow-y-auto no-scrollbar">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold capitalize">{format(today, 'MMMM yyyy', { locale: es })}</h2>
          <p className="text-slate-400 text-sm">Tu mapa visual de emociones</p>
        </div>
        <button 
          onClick={onOpenContextChat}
          className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-purple-300 hover:bg-purple-600/30 transition-all active:scale-95"
        >
          <Sparkles size={20} />
        </button>
      </header>

      <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-8 shrink-0 max-w-2xl mx-auto w-full">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
          <div key={d} className="text-center text-xs text-slate-500 font-bold mb-1">{d}</div>
        ))}
        {Array.from({ length: monthStart.getDay() }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const entry = entries.find(e => isSameDay(new Date(e.date + 'T12:00:00'), day));
          const paletteEntry = entry ? EMOTIONAL_PALETTE.find(p => p.category === entry.category) : null;
          const moodBuddy = paletteEntry?.moodBuddy || '/mascot_calm_nobg.png';

          return (
            <div
              key={day.toISOString()}
              className="aspect-square rounded-xl flex items-center justify-center relative overflow-hidden glass transition-all"
              style={entry ? { backgroundColor: entry.color, opacity: 0.25 + (entry.intensity * 0.5) } : {}}
            >
              {entry && (
                <button
                  onClick={() => {
                    setZoomedMoodBuddy(moodBuddy);
                    setZoomedColor(entry.color);
                  }}
                  className="absolute inset-0 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <img src={moodBuddy} alt="MoodBuddy" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  <span className="absolute bottom-1 right-2 text-[10px] font-black text-white drop-shadow-lg">{format(day, 'd')}</span>
                </button>
              )}
              {!entry && <span className="text-[10px] text-slate-600 font-bold">{format(day, 'd')}</span>}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Recientes</h3>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-500 text-sm mb-6">Tu diario está vacío todavía.</p>
            <button
              onClick={onNavigateToLog}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-lg active:scale-95 transition-all"
            >
              <PlusCircle size={18} />
              Registrar mi primera emoción
            </button>
          </div>
        ) : (
          [...entries].reverse().slice(0, 10).map(entry => {
            const paletteEntry = EMOTIONAL_PALETTE.find(p => p.category === entry.category);
            const moodLabel = paletteEntry?.label || 'Estado';
            const moodBuddy = paletteEntry?.moodBuddy || '/mascot_calm_nobg.png';
          
            return (
              <div key={entry.id} className="group relative">
                <div 
                  className="absolute inset-0 bg-white/5 rounded-[2.5rem] -z-10 group-hover:bg-white/10 transition-all duration-500"
                  style={{ backgroundColor: `${entry.color}05` }}
                />
                <div className="p-5 flex items-center justify-between gap-4">
                  <div 
                    className="w-16 h-16 rounded-[1.8rem] flex items-center justify-center relative overflow-hidden group/moodbuddy cursor-zoom-in active:scale-95 transition-all shadow-inner"
                    style={{ backgroundColor: `${entry.color}15` }}
                    onClick={() => {
                      setZoomedMoodBuddy(moodBuddy);
                      setZoomedColor(entry.color);
                    }}
                  >
                    <div 
                      className="absolute inset-0 opacity-20 blur-xl animate-pulse"
                      style={{ backgroundColor: entry.color }}
                    />
                    <img src={moodBuddy} alt="MoodBuddy" className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold capitalize">
                      {format(new Date(entry.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">{moodLabel}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomedMoodBuddy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setZoomedMoodBuddy(null)}
        >
          <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
            <X size={32} />
          </button>
          <div className="relative max-w-sm w-full aspect-square animate-in zoom-in-95 duration-300">
            <div
              className="absolute inset-0 rounded-full blur-[100px] opacity-20"
              style={{ backgroundColor: zoomedColor }}
            />
            <img
              src={zoomedMoodBuddy}
              alt="MoodBuddy"
              className="w-full h-full object-contain relative z-10 rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
