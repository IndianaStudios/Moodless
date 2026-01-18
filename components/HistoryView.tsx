
import React from 'react';
import { MoodEntry } from '../types';
import { MOOD_ICONS, EMOTIONAL_PALETTE } from '../constants';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle } from 'lucide-react';

interface HistoryViewProps {
  entries: MoodEntry[];
  onNavigateToLog: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ entries, onNavigateToLog }) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="px-6 pt-20 pb-6 h-full flex flex-col">
      <header className="mb-6">
        <h2 className="text-2xl font-bold capitalize">{format(today, 'MMMM yyyy', { locale: es })}</h2>
        <p className="text-slate-400 text-sm">Tu mapa visual de emociones</p>
      </header>

      <div className="grid grid-cols-7 gap-2 mb-8">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
          <div key={d} className="text-center text-xs text-slate-500 font-bold mb-1">{d}</div>
        ))}
        {days.map(day => {
          const entry = entries.find(e => isSameDay(new Date(e.date + 'T12:00:00'), day));
          const Icon = entry ? MOOD_ICONS.find(i => i.name === entry.iconName)?.Icon : null;
          
          return (
            <div
              key={day.toISOString()}
              className="aspect-square rounded-xl flex items-center justify-center relative overflow-hidden glass transition-all"
              style={entry ? { backgroundColor: entry.color, opacity: 0.3 + (entry.intensity * 0.7) } : {}}
            >
              {entry && Icon && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon size={16} className="text-white opacity-80" />
                </div>
              )}
              {!entry && <span className="text-[10px] text-slate-600">{format(day, 'd')}</span>}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
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
            const Icon = MOOD_ICONS.find(i => i.name === entry.iconName)?.Icon;
            const moodLabel = EMOTIONAL_PALETTE.find(p => p.category === entry.category)?.label || 'Estado';
            
            return (
              <div key={entry.id} className="glass p-4 rounded-2xl flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: entry.color, opacity: 0.4 + (entry.intensity * 0.6) }}
                >
                  {Icon && <Icon className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold capitalize">
                    {format(new Date(entry.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: es })}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">{moodLabel}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryView;
