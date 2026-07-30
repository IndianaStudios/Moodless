import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMOTIONAL_PALETTE, haptic } from '../constants';
import { MoodCategory, MoodEntry } from '../types';
import {
  Check,
  Edit2,
  Send,
  Sparkles,
  Clock,
  Frown,
  Meh,
  Smile,
  Laugh,
  Heart,
  Moon,
  Coffee,
  Zap,
  Flame,
  Anchor,
  Cloud,
  Compass,
  ShieldCheck,
  Crown,
  type LucideIcon,
} from 'lucide-react';

interface MoodCanvasProps {
  userId: string;
  onSave: (entry: Omit<MoodEntry, 'id' | 'date'>) => void;
  onUpdate?: (entryId: string, entry: Omit<MoodEntry, 'id' | 'date' | 'report'>) => Promise<void> | void;
  onOpenContextChat: () => void;
  alreadyLogged: boolean;
  lastEntry?: MoodEntry;
  enterAsHero?: boolean;
}

const SAMSlider = ({
  icon: HeaderIcon,
  label,
  value,
  onChange,
  steps,
  stepLabels,
  lowLabel,
  highLabel,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  onChange: (v: number) => void;
  steps: LucideIcon[];
  stepLabels?: string[];
  lowLabel: string;
  highLabel: string;
  accent: string;
}) => {
  const activeStep = steps[value - 1];
  const ActiveIcon = activeStep;
  const HeaderLucide = HeaderIcon;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-white/85">
          <HeaderLucide size={13} strokeWidth={1.8} className="text-white/55" />
          <span className="text-[13px] font-medium tracking-[-0.005em]">{label}</span>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors duration-300"
          style={{
            color: accent,
            backgroundColor: `${accent}14`,
            border: `1px solid ${accent}38`,
          }}
          aria-live="polite"
        >
          {value}/5
        </div>
      </div>

      <div className="app-surface-raised rounded-[1.5rem] px-3 py-4">
        <div className="flex items-center justify-between gap-1 sm:gap-1.5">
          {steps.map((StepIcon, idx) => {
            const v = idx + 1;
            const isActive = v === value;
            const isPast = v < value;
            const opacity = isActive ? 1 : isPast ? 0.85 : 0.32;
            const size = isActive ? 52 : 40;
            return (
              <motion.button
                key={v}
                type="button"
                onClick={() => { haptic('select'); onChange(v); }}
                aria-label={`${label}: ${v}`}
                aria-pressed={isActive}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative flex flex-1 flex-col items-center justify-center py-1"
              >
                {isActive && (
                  <motion.span
                    layoutId={`sam-active-${label}`}
                    className="absolute inset-x-1 inset-y-0 rounded-2xl"
                    style={{
                      backgroundColor: `${accent}20`,
                      border: `1px solid ${accent}55`,
                      boxShadow: `0 8px 24px ${accent}38, inset 0 1px 0 rgba(255,255,255,0.1)`,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30, ease: [0.16, 1, 0.3, 1] }}
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  animate={{ width: size, height: size, opacity }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative z-10 flex items-center justify-center rounded-2xl ${isActive ? '' : 'bg-white/[0.025] border border-white/[0.04]'}`}
                  style={isActive ? {
                    backgroundColor: `${accent}30`,
                    color: accent,
                    border: `1px solid ${accent}55`,
                  } : undefined}
                >
                  <StepIcon size={isActive ? 24 : 18} strokeWidth={isActive ? 2 : 1.7} />
                </motion.span>
                <span className={`relative z-10 mt-1.5 text-[10px] font-medium tabular-nums ${isActive ? 'text-white' : 'text-white/30'}`}>
                  {v}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{lowLabel}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={value}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-1 text-[10px] font-semibold tracking-[-0.005em]"
              style={{ color: accent }}
            >
              <ActiveIcon size={11} strokeWidth={2} />
              {value === 1
                ? lowLabel
                : value === 5
                  ? highLabel
                  : (stepLabels?.[value - 1] ?? '')}
            </motion.span>
          </AnimatePresence>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{highLabel}</span>
        </div>
      </div>
    </section>
  );
};

const MoodCanvas: React.FC<MoodCanvasProps> = ({ userId, onSave, onUpdate, onOpenContextChat, alreadyLogged, lastEntry, enterAsHero = false }) => {
  const hasCarryOver = !alreadyLogged && Boolean(lastEntry);
  const carry = lastEntry;

  const [isEditing, setIsEditing] = useState(false);
  const [valence, setValence] = useState(carry?.valence ?? 3);
  const [arousal, setArousal] = useState(carry?.arousal ?? 3);
  const [dominance, setDominance] = useState(carry?.dominance ?? 3);
  const [color, setColor] = useState(carry?.color ?? '#94A3B8');
  const [detectedLabel, setDetectedLabel] = useState<string>('Neutral');
  const [detectedCategory, setDetectedCategory] = useState<MoodCategory>(MoodCategory.NEUTRAL);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let cat = MoodCategory.NEUTRAL;
    if (valence >= 4) {
      cat = arousal >= 4 ? MoodCategory.JOY : MoodCategory.CALM;
    } else if (valence <= 2) {
      cat = arousal >= 4 ? MoodCategory.ANGER : MoodCategory.SADNESS;
    } else {
      cat = arousal >= 4 ? MoodCategory.ENERGY : MoodCategory.NEUTRAL;
    }
    const def = EMOTIONAL_PALETTE.find((p) => p.category === cat) || EMOTIONAL_PALETTE[6];
    setColor(def.hex);
    setDetectedLabel(def.label);
    setDetectedCategory(cat);
  }, [valence, arousal]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    haptic('success');

    let category = MoodCategory.NEUTRAL;
    if (valence >= 4) category = arousal >= 4 ? MoodCategory.JOY : MoodCategory.CALM;
    else if (valence <= 2) category = arousal >= 4 ? MoodCategory.ANGER : MoodCategory.SADNESS;
    else category = arousal >= 4 ? MoodCategory.ENERGY : MoodCategory.NEUTRAL;

    const payload = {
      color,
      intensity: (arousal - 1) / 4,
      iconName: 'Sparkles',
      category,
      valence,
      arousal,
      dominance,
    };

    if (onUpdate && lastEntry?.id) {
      await onUpdate(lastEntry.id, payload);
    } else {
      await onSave(payload);
    }

    setSavedFlash(true);
    setIsEditing(false);
    setTimeout(() => setSaving(false), 600);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const detectedPalette = EMOTIONAL_PALETTE.find(p => p.category === detectedCategory) || EMOTIONAL_PALETTE[6];
  const previewBuddy = detectedPalette.moodBuddy;

  return (
    <AnimatePresence mode="wait">
      {alreadyLogged && !isEditing ? (
        <motion.div
          key="logged"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-8"
          >
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl opacity-50"
              style={{ backgroundColor: lastEntry?.color || '#34c759' }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            />
            <div className="relative app-surface-raised flex h-24 w-24 items-center justify-center rounded-full border border-emerald-400/30">
              <Check className="h-12 w-12 text-emerald-300" strokeWidth={2.2} />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="app-eyebrow mb-2"
          >
            Hoy
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="app-title mb-3 text-[clamp(1.75rem,5vw,2.25rem)] text-white tracking-[-0.025em]"
          >
            Vibe registrada
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 app-text-meta max-w-[260px]"
          >
            Tu estado de hoy queda guardado en tu diario.
          </motion.p>

          {lastEntry && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 320, damping: 26, ease: [0.16, 1, 0.3, 1] }}
              className="app-surface-raised mb-8 flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <div
                className="h-11 w-11 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10"
                style={{ boxShadow: `0 0 14px ${lastEntry.color}40` }}
              >
                <img
                  src={EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.moodBuddy || '/mascot_calm_nobg.png'}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-white tracking-[-0.005em]">
                  {EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.label || 'Neutral'}
                </p>
                <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold">
                  {new Date(lastEntry.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </motion.div>
          )}

          <motion.button
            type="button"
            onClick={() => { haptic('tap'); setIsEditing(true); }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.4 }}
            className="app-button app-button-secondary px-6 py-3 text-sm"
          >
            <Edit2 size={14} strokeWidth={1.8} />
            Editar registro
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          key="capture"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={enterAsHero ? {
            opacity: 1,
            y: 0,
            scale: [0.985, 1.005, 1],
          } : { opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={enterAsHero ? {
            type: 'spring',
            stiffness: 380,
            damping: 30,
            scale: { duration: 1.6, times: [0, 0.5, 1], ease: [0.16, 1, 0.3, 1] },
          } : { type: 'spring', stiffness: 380, damping: 30, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-1 flex-col overflow-y-auto no-scrollbar"
        >
          <p className="sr-only" role="status" aria-live="polite">
            {detectedLabel ? `Categoría detectada: ${detectedLabel}` : ''}
          </p>

          {/* Ambient color glow */}
          <motion.div
            className="pointer-events-none absolute inset-0 blur-[120px] transition-all duration-1000"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={enterAsHero ? {
              opacity: [0.15, 0.4, 0.25],
              scale: [0.85, 1.1, 1],
            } : { opacity: 0.25, scale: 1 }}
            transition={enterAsHero ? {
              opacity: { duration: 1.6, times: [0, 0.45, 1], ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 1.6, times: [0, 0.5, 1], ease: [0.16, 1, 0.3, 1] },
              backgroundColor: { duration: 1.0 },
            } : { duration: 1.0 }}
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-32 pt-[max(1.75rem,env(safe-area-inset-top),2rem)]">
            {/* ── Status pill ──────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 apple-vibrancy-soft">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: '#fbbf24' }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                </span>
                <span className="text-[11px] font-semibold text-white/85 tracking-[-0.005em]">
                  Pendiente · hoy
                </span>
              </div>
              <span className="app-text-eyebrow">Vibe</span>
            </motion.div>

            {/* ── Header ──────────────────────────────────────────────── */}
            <motion.header
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-7 text-center"
            >
              <p className="app-eyebrow mb-2">Captura</p>
              <h1 className="app-title text-[clamp(1.875rem,5vw,2.25rem)] text-white tracking-[-0.025em]">
                ¿Cómo estás hoy?
              </h1>
              <p className="mt-2 text-[13px] text-white/45 max-w-xs mx-auto tracking-[-0.005em]">
                Ajusta los tres ejes y tu Buddy se adapta en tiempo real.
              </p>
            </motion.header>

            {/* ── Avatar preview (live mood) ─────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 26, ease: [0.16, 1, 0.3, 1] }}
              className="mb-9 flex flex-col items-center"
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-[-22px] rounded-full blur-2xl opacity-30"
                  style={{ backgroundColor: color }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.22, 0.4, 0.22] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
                <AnimatePresence mode="wait">
                  <motion.img
                    key={previewBuddy}
                    src={previewBuddy}
                    alt="MoodBuddy preview"
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -4 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 26, ease: [0.16, 1, 0.3, 1] }}
                    draggable={false}
                    className="relative h-24 w-24 object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.4)]"
                  />
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={detectedLabel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 flex items-center gap-2 rounded-full px-3 py-1"
                  style={{
                    backgroundColor: `${color}14`,
                    border: `1px solid ${color}40`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
                    {detectedLabel}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* ── Sliders ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-5"
            >
              <SAMSlider
                icon={Smile}
                label="¿Cómo te sientes?"
                value={valence}
                onChange={setValence}
                steps={[Frown, Meh, Smile, Laugh, Heart]}
                stepLabels={['Mal', 'Regular', 'Bien', 'Genial', 'En su cima']}
                lowLabel="Mal"
                highLabel="En su cima"
                accent="#F472B6"
              />
              <SAMSlider
                icon={Zap}
                label="¿Cuánta energía tienes?"
                value={arousal}
                onChange={setArousal}
                steps={[Moon, Coffee, Zap, Flame, Sparkles]}
                stepLabels={['Apagado', 'Despierto', 'Activo', 'Energético', 'Imparable']}
                lowLabel="Apagado"
                highLabel="Imparable"
                accent="#FB923C"
              />
              <SAMSlider
                icon={Compass}
                label="¿Cuánto control sientes?"
                value={dominance}
                onChange={setDominance}
                steps={[Anchor, Cloud, Compass, ShieldCheck, Crown]}
                stepLabels={['A la deriva', 'Inestable', 'Estable', 'Seguro', 'Centrado']}
                lowLabel="A la deriva"
                highLabel="Centrado"
                accent="#A78BFA"
              />
            </motion.div>

            {/* ── CTAs ────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 flex flex-col gap-3"
            >
              <motion.button
                type="button"
                onClick={handleSave}
                disabled={saving}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className="app-button app-button-primary w-full py-4 text-[15px] disabled:opacity-80"
              >
                {saving ? (
                  <>
                    <Check size={17} strokeWidth={2.4} />
                    Guardando
                  </>
                ) : (
                  <>
                    <Send size={16} strokeWidth={2} />
                    Guardar mi vibe
                  </>
                )}
              </motion.button>

              <button
                type="button"
                onClick={onOpenContextChat}
                className="app-button app-button-secondary w-full py-3.5 text-sm"
              >
                <Sparkles size={15} strokeWidth={1.8} />
                Cuéntame más sobre tu día
              </button>
            </motion.div>
          </div>

          {/* ── Saved flash overlay (Apple-style confirmation) ──────── */}
          <AnimatePresence>
            {savedFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none fixed inset-0 z-[180] flex items-center justify-center"
                aria-live="polite"
              >
                <div className="absolute inset-0 bg-black/30 apple-vibrancy-titanium" />
                <motion.div
                  initial={{ y: 8 }}
                  animate={{ y: 0 }}
                  exit={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28, ease: [0.16, 1, 0.3, 1] }}
                  className="relative glass-strong rounded-2xl px-6 py-4 flex items-center gap-3"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: '#34c759', boxShadow: '0 0 18px rgba(52,199,89,0.4)' }}
                  >
                    <Check size={18} strokeWidth={2.6} className="text-black" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white tracking-[-0.005em]">Guardado</p>
                    <p className="text-[11px] text-white/55">Tu vibe de hoy se ha registrado</p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MoodCanvas;