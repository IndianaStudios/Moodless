import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE, triggerHaptic, haptic } from '../constants';
import { soundEffects } from '../services/soundEffects';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Share2,
  Sparkles,
  Maximize2,
  Trash2,
  Calendar,
} from 'lucide-react';

interface PeekPopContextMenuProps {
  isOpen: boolean;
  entry: MoodEntry | null;
  onClose: () => void;
  onShare: (entry: MoodEntry) => void;
  onOpenContextChat: (entry: MoodEntry) => void;
  onZoom: (entry: MoodEntry) => void;
  onDelete: (entry: MoodEntry) => void;
}

export const PeekPopContextMenu: React.FC<PeekPopContextMenuProps> = ({
  isOpen,
  entry,
  onClose,
  onShare,
  onOpenContextChat,
  onZoom,
  onDelete,
}) => {
  if (!isOpen || !entry) return null;

  const paletteEntry = EMOTIONAL_PALETTE.find((p) => p.category === entry.category);
  const moodLabel = paletteEntry?.label || 'Emoción';
  const moodBuddy = paletteEntry?.moodBuddy || '/mascot_calm_nobg.png';
  const moodColor = entry.color || paletteEntry?.hex || '#2DD4BF';

  let entryDate: Date;
  try {
    entryDate = new Date(entry.date.includes('T') ? entry.date : `${entry.date}T12:00:00`);
  } catch {
    entryDate = new Date();
  }

  const dateFormatted = format(entryDate, "EEEE, d 'de' MMMM", { locale: es });
  const formattedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  // Parsea reporte limpio sin llaves ni sintaxis JSON
  let cleanReport = '';
  if (entry.report) {
    try {
      const parsed = typeof entry.report === 'string' && entry.report.trim().startsWith('{') ? JSON.parse(entry.report) : null;
      cleanReport = parsed?.explanation || parsed?.report || parsed?.description || parsed?.title || '';
    } catch {}
    if (!cleanReport) {
      const expMatch = entry.report.match(/"explanation"\s*:\s*"([^"]+)"/);
      cleanReport = expMatch ? expMatch[1] : entry.report.replace(/^\{.*\}|["']/g, '').trim();
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5">
        {/* Apple Deep Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/65 backdrop-blur-xl"
          onClick={() => {
            soundEffects.play('pop');
            onClose();
          }}
        />

        {/* Peek Card Preview (elevated & glowing) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="relative z-10 w-full max-w-xs rounded-3xl overflow-hidden p-5 shadow-2xl border border-white/20 select-none"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(20,20,28,0.9) 100%)`,
            boxShadow: `0 20px 50px -10px ${moodColor}33, 0 0 0 1px rgba(255,255,255,0.15)`,
          }}
        >
          {/* Ambient Glow */}
          <div
            className="absolute -top-10 -left-10 w-36 h-36 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ backgroundColor: moodColor }}
          />

          <div className="flex items-center gap-4">
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shrink-0"
              style={{ backgroundColor: `${moodColor}22` }}
            >
              <img
                src={moodBuddy}
                alt="MoodBuddy"
                className="w-14 h-14 object-contain drop-shadow-md"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-white/50 capitalize mb-0.5">
                <Calendar size={12} strokeWidth={1.8} />
                <span>{formattedDate}</span>
              </div>
              <h4 className="text-lg font-bold text-white tracking-tight truncate uppercase">
                {moodLabel}
              </h4>
              <p
                className="text-[11px] font-semibold tracking-wider uppercase mt-0.5"
                style={{ color: moodColor }}
              >
                Intensidad · {Math.round((entry.intensity || 0.5) * 100)}%
              </p>
            </div>
          </div>

          {cleanReport && (
            <div className="mt-3 pt-3 border-t border-white/[0.08]">
              <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                "{cleanReport}"
              </p>
            </div>
          )}
        </motion.div>

        {/* Action Menu (iOS Pop Capsule) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.04 }}
          className="relative z-10 mt-4 w-full max-w-xs rounded-2xl overflow-hidden bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/15 shadow-2xl divide-y divide-white/[0.08]"
        >
          {/* Compartir tarjeta story */}
          <button
            type="button"
            onClick={() => {
              haptic('select');
              soundEffects.play('pop');
              onClose();
              onShare(entry);
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <span className="text-sm font-medium text-white">Compartir tarjeta visual</span>
            <Share2 size={17} className="text-white/70" strokeWidth={1.8} />
          </button>

          {/* Reflexión IA */}
          <button
            type="button"
            onClick={() => {
              haptic('select');
              soundEffects.play('pop');
              onClose();
              onOpenContextChat(entry);
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <span className="text-sm font-medium text-white">Consultar reflexión IA</span>
            <Sparkles size={17} className="text-violet-300" strokeWidth={1.8} />
          </button>

          {/* Ver MoodBuddy */}
          <button
            type="button"
            onClick={() => {
              haptic('select');
              soundEffects.play('pop');
              onClose();
              onZoom(entry);
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <span className="text-sm font-medium text-white">Ampliar MoodBuddy</span>
            <Maximize2 size={17} className="text-white/70" strokeWidth={1.8} />
          </button>

          {/* Eliminar registro (Destructivo en rojo Apple) */}
          <button
            type="button"
            onClick={() => {
              haptic('error');
              soundEffects.play('delete');
              onClose();
              onDelete(entry);
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors text-rose-400"
          >
            <span className="text-sm font-medium">Eliminar de mi diario</span>
            <Trash2 size={17} className="text-rose-400" strokeWidth={1.8} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PeekPopContextMenu;