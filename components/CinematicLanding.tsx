import React, { useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import RevealFromComponents from './Reveal';
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  Heart,
  LineChart,
  LockKeyhole,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CinematicLandingProps {
  onStart: (mode?: 'login' | 'signup') => void;
  isAuthenticated?: boolean;
  onEnterApp?: () => void;
}

type OrbPhase = 'capture' | 'patterns' | 'timeline' | 'stats' | 'ritual';

type EmotionTone = {
  id: string;
  label: string;
  detail: string;
  color: string;
  softColor: string;
  mascot: string;
};

/** Same core emotions as the product palette: alegría, calma, energía, miedo, tristeza */
const emotionTones: EmotionTone[] = [
  {
    id: 'alegria',
    label: 'Alegría',
    detail: 'Luminosa y abierta',
    color: '#FACC15',
    softColor: '#FEF08A',
    mascot: '/mascot_joy_nobg.png',
  },
  {
    id: 'calma',
    label: 'Calma',
    detail: 'Suave y presente',
    color: '#2DD4BF',
    softColor: '#99F6E4',
    mascot: '/mascot_calm_nobg.png',
  },
  {
    id: 'energia',
    label: 'Energía',
    detail: 'Viva y expansiva',
    color: '#FB923C',
    softColor: '#FFEDD5',
    // FIXME: cuando se cree /mascot_energy_nobg.png, sustituir aquí. Mientras tanto reusa el de alegría.
    mascot: '/mascot_joy_nobg.png',
  },
  {
    id: 'miedo',
    label: 'Miedo',
    detail: 'Alerta e intensa',
    color: '#8B5CF6',
    softColor: '#DDD6FE',
    mascot: '/mascot_anxiety_nobg.png',
  },
  {
    id: 'tristeza',
    label: 'Tristeza',
    detail: 'Profunda y quieta',
    color: '#3B82F6',
    softColor: '#BFDBFE',
    mascot: '/mascot_sadness_nobg.png',
  },
];

const journeyChapters: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  phase: OrbPhase;
}[] = [
  {
    id: 'capture',
    eyebrow: 'Captura',
    title: 'Empieza por lo que no necesita explicación.',
    body: 'Un color. Una forma. Un instante. Registra tu mundo interior de la forma más natural: visualmente.',
    phase: 'capture',
  },
  {
    id: 'patterns',
    eyebrow: 'Patrones',
    title: 'La historia está en lo que se repite.',
    body: 'La IA une los puntos con cuidado y convierte momentos sueltos en señales que sí puedes usar.',
    phase: 'patterns',
  },
  {
    id: 'timeline',
    eyebrow: 'Línea temporal',
    title: 'Mira tu vida emocional en movimiento.',
    body: 'Cada registro forma una línea continua. No para medirte: para ver hacia dónde vas.',
    phase: 'timeline',
  },
  {
    id: 'stats',
    eyebrow: 'Perspectiva',
    title: 'Los números también pueden ser humanos.',
    body: 'Estadísticas sin juicio. Una ventana amable para entender cambios y cuidarte mejor.',
    phase: 'stats',
  },
  {
    id: 'ritual',
    eyebrow: 'Respuesta',
    title: 'No solo entiendes. Sabes por dónde empezar.',
    body: 'Pausas, ejercicios y bandas sonoras que responden a cómo estás ahora mismo.',
    phase: 'ritual',
  },
];

const patternNodes = [
  { x: 18, y: 28, r: 7, color: '#8B5CF6' },
  { x: 42, y: 18, r: 5, color: '#EC4899' },
  { x: 72, y: 26, r: 8, color: '#2DD4BF' },
  { x: 82, y: 58, r: 5, color: '#3B82F6' },
  { x: 58, y: 72, r: 6, color: '#EC4899' },
  { x: 28, y: 68, r: 5, color: '#2DD4BF' },
  { x: 50, y: 48, r: 10, color: '#A78BFA' },
] as const;

const faqs = [
  ['¿Necesito escribir cada día?', 'No. Puedes guardar un momento con un gesto visual cuando lo necesites.'],
  ['¿Sustituye a la terapia?', 'No. Moodless es una herramienta de autoconocimiento y bienestar, no reemplaza la atención profesional.'],
  ['¿Puedo borrar mis registros?', 'Sí. Tú mantienes el control de tu diario y de la información que compartes.'],
];

const navLinks = [
  { id: 'experiencia', label: 'Experiencia' },
  { id: 'siente', label: 'Siente' },
  { id: 'privacidad', label: 'Privacidad' },
] as const;

/* ─── Primitives ─────────────────────────────────────────────── */

const APP_LOGO = '/logo.jpg';

const BrandMark = ({
  compact = false,
  showWordmark = true,
  className = '',
}: {
  compact?: boolean;
  showWordmark?: boolean;
  className?: string;
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <img
      src={APP_LOGO}
      alt="Moodless"
      width={compact ? 28 : 36}
      height={compact ? 28 : 36}
      className={`${compact ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl'} object-cover shadow-[0_0_24px_rgba(168,85,247,.4)]`}
      draggable={false}
    />
    {showWordmark && (
      <span className={`${compact ? 'text-base' : 'text-xl'} font-semibold tracking-[-0.06em] text-white`}>
        Moodless
      </span>
    )}
  </span>
);

const Reveal = RevealFromComponents;

/* ─── Emotional orb ──────────────────────────────────────────── */

const phaseLabel: Record<OrbPhase, string> = {
  capture: 'Un instante',
  patterns: 'Patrones',
  timeline: 'Tu línea',
  stats: '67% calma',
  ritual: 'Respirar',
};

const EmotionOrb = ({
  phase = 'capture',
  tone = emotionTones[0],
  className = '',
  size = 'md',
}: {
  phase?: OrbPhase;
  tone?: EmotionTone;
  className?: string;
  size?: 'md' | 'lg';
}) => {
  const reduceMotion = useReducedMotion();
  const uid = React.useId().replace(/:/g, '');
  const isCapture = phase === 'capture';
  const isPatterns = phase === 'patterns';
  const isTimeline = phase === 'timeline';
  const isStats = phase === 'stats';
  const isRitual = phase === 'ritual';

  const dim = size === 'lg' ? 'w-[min(72vw,340px)]' : 'w-[min(68vw,300px)]';

  return (
    <div
      className={`emotion-orb relative aspect-square ${dim} ${className}`}
      data-testid="emotion-orb"
      data-phase={phase}
      aria-hidden="true"
    >
      {/* Ambient bloom */}
      <motion.div
        className="emotion-orb-bloom absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        animate={{
          scale: isRitual ? 1.35 : isStats ? 1.05 : isPatterns ? 1.15 : 1,
          opacity: isRitual ? 0.9 : 0.55,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '78%',
          height: '78%',
          background: `radial-gradient(circle, ${tone.color}55 0%, ${tone.color}18 42%, transparent 70%)`,
          filter: 'blur(18px)',
        }}
      />

      {/* Outer orbital ring (patterns / ritual) */}
      <motion.div
        className="emotion-orb-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        animate={{
          opacity: isPatterns || isRitual ? 0.85 : 0,
          scale: isPatterns || isRitual ? 1 : 0.7,
          rotate: reduceMotion ? 0 : isPatterns ? 360 : 0,
        }}
        transition={{
          opacity: { duration: 0.7 },
          scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
          rotate: { duration: 28, repeat: Infinity, ease: 'linear' },
        }}
        style={{ width: '92%', height: '92%' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]"
        animate={{ opacity: isPatterns ? 0.5 : 0, scale: isPatterns ? 1 : 0.75 }}
        transition={{ duration: 0.7 }}
        style={{ width: '72%', height: '72%' }}
      />

      {/* Pattern constellation nodes */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isPatterns ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.65 }}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" fill="none">
          <motion.path
            d="M18 28 L42 18 L50 48 L72 26 L82 58 L58 72 L28 68 L50 48"
            stroke={`url(#orb-constellation-${uid})`}
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: isPatterns ? 1 : 0, opacity: isPatterns ? 0.75 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          <defs>
            <linearGradient id={`orb-constellation-${uid}`} x1="18" y1="18" x2="82" y2="72" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8B5CF6" />
              <stop offset="0.5" stopColor="#EC4899" />
              <stop offset="1" stopColor="#2DD4BF" />
            </linearGradient>
          </defs>
        </svg>
        {patternNodes.map((node, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: node.r * 2,
              height: node.r * 2,
              marginLeft: -node.r,
              marginTop: -node.r,
              backgroundColor: node.color,
              boxShadow: `0 0 16px ${node.color}`,
            }}
            animate={{
              scale: isPatterns ? [0.85, 1.1, 0.95] : 0.4,
              opacity: isPatterns ? 1 : 0,
            }}
            transition={{
              scale: { duration: 3.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' },
              opacity: { duration: 0.5, delay: reduceMotion ? 0 : i * 0.04 },
            }}
          />
        ))}
      </motion.div>

      {/* Timeline wave ribbon */}
      <motion.div
        className="absolute inset-[8%]"
        animate={{ opacity: isTimeline ? 1 : 0, scale: isTimeline ? 1 : 0.9 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg className="h-full w-full overflow-visible" viewBox="0 0 200 200" fill="none">
          <motion.path
            d="M12 118 C 38 70, 52 150, 78 104 C 102 62, 118 148, 142 96 C 162 58, 178 112, 188 86"
            stroke={`url(#orb-wave-${uid})`}
            strokeWidth="4"
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: isTimeline ? 1 : 0, opacity: isTimeline ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.circle
            cx="142"
            cy="96"
            r="7"
            fill="#2DD4BF"
            stroke="#D9FFFA"
            strokeWidth="2"
            animate={{ opacity: isTimeline ? 1 : 0, scale: isTimeline ? 1 : 0.4 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.45 }}
          />
          <defs>
            <linearGradient id={`orb-wave-${uid}`} x1="12" x2="188" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8B5CF6" />
              <stop offset="0.5" stopColor="#2DD4BF" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Stats ring */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ width: '78%', height: '78%' }}
        animate={{ opacity: isStats ? 1 : 0, scale: isStats ? 1 : 0.82 }}
        transition={{ duration: reduceMotion ? 0 : 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="relative h-full w-full rounded-full"
          style={{
            background: 'conic-gradient(#2DD4BF 0deg 241deg, #8B5CF6 241deg 301deg, #EC4899 301deg 333deg, rgba(255,255,255,.08) 333deg 360deg)',
            boxShadow: '0 0 40px rgba(45,212,191,.25)',
          }}
        >
          <div className="absolute inset-[14%] flex flex-col items-center justify-center rounded-full bg-[var(--app-bg)]/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]">
            <span className="text-[clamp(1.4rem,5vw,2rem)] font-semibold tracking-[-0.06em] text-white">67%</span>
            <span className="mt-0.5 text-[10px] text-white/40">en calma</span>
          </div>
        </div>
      </motion.div>

      {/* Ritual rays */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isRitual ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <span
            key={deg}
            className="emotion-orb-ray absolute left-1/2 top-1/2 origin-bottom"
            style={{
              width: 2,
              height: '42%',
              marginLeft: -1,
              marginTop: '-42%',
              transform: `rotate(${deg}deg)`,
              background: `linear-gradient(to top, transparent, ${tone.softColor}88, transparent)`,
            }}
          />
        ))}
      </motion.div>

      {/* Core body — capture / soft presence under other phases */}
      <motion.div
        className="emotion-orb-core absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{
          opacity: isStats ? 0 : isTimeline ? 0.35 : isPatterns ? 0.55 : 1,
          scale: isRitual ? 1.12 : isCapture ? 1 : isPatterns ? 0.72 : isTimeline ? 0.55 : 0.9,
          borderRadius: isCapture || isRitual ? ['42% 58% 63% 37%', '55% 45% 40% 60%', '42% 58% 63% 37%'] : '50%',
          rotate: reduceMotion || isStats ? 0 : isCapture || isRitual ? [0, 8, -5, 0] : 0,
        }}
        transition={{
          opacity: { duration: 0.65 },
          scale: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
          borderRadius: { duration: reduceMotion ? 0 : 8, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: reduceMotion ? 0 : 10, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          width: '52%',
          height: '52%',
          background: `linear-gradient(145deg, ${tone.softColor}, ${tone.color} 55%, ${tone.color}cc)`,
          boxShadow: `0 0 48px ${tone.color}90, 0 0 100px ${tone.color}40, inset 0 1px 0 rgba(255,255,255,.45)`,
          border: '1px solid rgba(255,255,255,.28)',
        }}
      >
        <span className="emotion-orb-sheen absolute inset-0 overflow-hidden rounded-[inherit]" />
        <span
          className="absolute left-[22%] top-[18%] h-[22%] w-[28%] rounded-full bg-white/50 blur-[6px]"
          aria-hidden="true"
        />
      </motion.div>

      {/* Mood Buddy — follows orb color / tone */}
      <motion.div
        className="emotion-orb-mascot-wrap pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[54%]"
        data-testid="emotion-orb-mascot"
        data-tone={tone.id}
        data-mascot={tone.mascot}
        animate={{
          opacity: isStats ? 0 : isTimeline ? 0.15 : isPatterns ? 0.55 : 1,
          scale: isRitual ? 1.08 : isCapture ? 1 : isPatterns ? 0.78 : isTimeline ? 0.5 : 0.92,
          y: reduceMotion ? 0 : isCapture || isRitual ? [0, -6, 0] : 0,
        }}
        transition={{
          opacity: { duration: 0.55 },
          scale: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
          y: { duration: reduceMotion ? 0 : 4.2, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ width: size === 'lg' ? '58%' : '56%', height: size === 'lg' ? '58%' : '56%' }}
      >
        <AnimatePresence mode="sync">
          <motion.img
            key={tone.id}
            src={tone.mascot}
            alt=""
            className="emotion-orb-mascot absolute inset-0 h-full w-full object-contain select-none"
            style={{
              filter: `drop-shadow(0 12px 28px ${tone.color}66) drop-shadow(0 0 20px ${tone.color}44)`,
            }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.82, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.88, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            draggable={false}
          />
        </AnimatePresence>
      </motion.div>

      {/* Floating phase label */}
      <motion.p
        className="absolute bottom-[2%] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase"
        key={phase}
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {phaseLabel[phase]}
      </motion.p>
    </div>
  );
};

/* ─── Scroll chapter text ────────────────────────────────────── */

const JourneyCopy = ({
  progress,
  reduceMotion,
}: {
  progress: MotionValue<number>;
  reduceMotion: boolean | null;
}) => {
  const n = journeyChapters.length;
  const fade = 0.08;
  const chapterRange = (i: number) => {
    const start = i / n;
    const end = (i + 1) / n;
    return [
      Math.max(0, start - fade * 0.2),
      start + fade,
      end - fade,
      Math.min(1, end + fade * 0.2),
    ] as const;
  };

  const op0 = useTransform(progress, [...chapterRange(0)], [1, 1, 1, 0]);
  const op1 = useTransform(progress, [...chapterRange(1)], [0, 1, 1, 0]);
  const op2 = useTransform(progress, [...chapterRange(2)], [0, 1, 1, 0]);
  const op3 = useTransform(progress, [...chapterRange(3)], [0, 1, 1, 0]);
  const op4 = useTransform(progress, [...chapterRange(4)], [0, 1, 1, 1]);
  const opacities = [op0, op1, op2, op3, op4];

  return (
    <div className="relative min-h-[220px] w-full max-w-md lg:min-h-[280px]">
      {journeyChapters.map((chapter, i) => (
        <motion.div
          key={chapter.id}
          className="absolute inset-0 flex flex-col justify-center"
          style={{ opacity: reduceMotion ? (i === 0 ? 1 : 0) : opacities[i] }}
          aria-hidden={reduceMotion ? i !== 0 : undefined}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
            {String(i + 1).padStart(2, '0')} · {chapter.eyebrow}
          </p>
          <h2 className="mt-4 text-[clamp(1.75rem,3.6vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
            {chapter.title}
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/55">{chapter.body}</p>
        </motion.div>
      ))}
    </div>
  );
};

/* ─── Main landing ───────────────────────────────────────────── */

const CinematicLanding: React.FC<CinematicLandingProps> = ({ onStart, isAuthenticated = false, onEnterApp }) => {
  const heroRef = React.useRef<HTMLElement>(null);
  const journeyRef = React.useRef<HTMLElement>(null);
  const manifestoRef = React.useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Moodless — Diario Emocional Visual con IA';
    return () => { document.title = originalTitle; };
  }, []);

  const scrollToSection = React.useCallback((id: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const target = document.getElementById(id);
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const pendingScroll = sessionStorage.getItem('moodless.landingScrollTarget');
    if (pendingScroll) {
      sessionStorage.removeItem('moodless.landingScrollTarget');
      setTimeout(() => {
        const target = document.getElementById(pendingScroll);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, []);
  const [activeToneId, setActiveToneId] = useState('calma');
  const [hasScrolled, setHasScrolled] = useState(false);
  const [journeyPhase, setJourneyPhase] = useState<OrbPhase>('capture');
  const headerVisibility = React.useRef(false);
  const activeTone = emotionTones.find((t) => t.id === activeToneId) ?? emotionTones[0];

  const { scrollY, scrollYProgress: pageProgress } = useScroll();
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  });
  const { scrollYProgress: journeyProgress } = useScroll({
    target: journeyRef,
    offset: ['start start', 'end end'],
  });
  const { scrollYProgress: manifestoProgress } = useScroll({
    target: manifestoRef,
    offset: ['start end', 'end start'],
  });

  const softHero = useSpring(heroProgress, { stiffness: 80, damping: 28, mass: 0.35 });
  const softJourney = useSpring(journeyProgress, { stiffness: 70, damping: 26, mass: 0.4 });
  const softManifesto = useSpring(manifestoProgress, { stiffness: 60, damping: 24, mass: 0.45 });

  useMotionValueEvent(scrollY, 'change', (value) => {
    const next = value > 24;
    if (next !== headerVisibility.current) {
      headerVisibility.current = next;
      setHasScrolled(next);
    }
  });

  useMotionValueEvent(softJourney, 'change', (v) => {
    const idx = Math.min(journeyChapters.length - 1, Math.floor(v * journeyChapters.length));
    const next = journeyChapters[idx].phase;
    setJourneyPhase((prev) => (prev === next ? prev : next));
  });

  // ── Hero transforms ──
  const heroTitleOpacity = useTransform(softHero, [0, 0.22, 0.42], [1, 1, 0]);
  const heroTitleY = useTransform(softHero, [0, 0.42], [0, -80]);
  const heroTitleScale = useTransform(softHero, [0, 0.42], [1, 0.88]);
  const heroSubOpacity = useTransform(softHero, [0, 0.12, 0.32], [1, 0.85, 0]);
  const heroOrbOpacity = useTransform(softHero, [0.18, 0.38, 0.95], [0, 1, 1]);
  const heroOrbScale = useTransform(softHero, [0.18, 0.55, 1], [0.45, 1.05, 1.12]);
  const heroOrbY = useTransform(softHero, [0.18, 0.55, 1], [100, 0, -16]);
  const heroCaptionOpacity = useTransform(softHero, [0.55, 0.72, 0.92], [0, 1, 0.85]);
  const heroCueOpacity = useTransform(softHero, [0, 0.15, 0.28], [1, 0.6, 0]);
  const heroGlowOpacity = useTransform(softHero, [0.2, 0.5, 1], [0, 0.75, 0.4]);
  const heroGlowScale = useTransform(softHero, [0.2, 0.7], [0.55, 1.2]);

  // ── Journey ──
  const journeyOrbScale = useTransform(softJourney, [0, 0.15, 0.85, 1], [0.94, 1, 1, 0.97]);
  const journeyOrbY = useTransform(softJourney, [0, 0.5, 1], [6, 0, -6]);

  // ── Manifesto lines ──
  const line1 = useTransform(softManifesto, [0.15, 0.32], [0.15, 1]);
  const line2 = useTransform(softManifesto, [0.28, 0.45], [0.15, 1]);
  const line3 = useTransform(softManifesto, [0.42, 0.58], [0.15, 1]);
  const line4 = useTransform(softManifesto, [0.55, 0.72], [0.15, 1]);

  return (
    <main className="apple-landing relative overflow-x-clip bg-[var(--app-bg)] text-white">
      <p className="sr-only" role="status" aria-live="polite">
        Estado emocional seleccionado: {activeTone.label}
      </p>

      {/* ── Header — always interactive; glass only after scroll ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[padding,background-color,border-color,backdrop-filter] duration-500 ${
          hasScrolled
            ? 'border-b border-white/[0.06] bg-[var(--app-bg)]/70 py-3 backdrop-blur-2xl'
            : 'border-b border-transparent bg-transparent py-5'
        }`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8" aria-label="Navegación principal">
          <button
            type="button"
            onClick={() => scrollToSection('inicio')}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Moodless, ir al inicio"
          >
            <BrandMark compact />
          </button>
          <div className="hidden items-center gap-8 text-[13px] text-white/55 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-5 md:flex">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => onEnterApp?.()}
                className="apple-cta rounded-full px-5 py-2 text-[13px] font-semibold text-black"
              >
                Ir a la app
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onStart('login')}
                  className="text-[13px] text-white/55 transition-colors hover:text-white"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => onStart('signup')}
                  className="apple-cta rounded-full px-5 py-2 text-[13px] font-semibold text-black"
                >
                  Empezar gratis
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white md:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
        {menuOpen && (
          <div className="mx-4 mt-3 rounded-2xl border border-white/10 bg-[var(--app-surface)]/95 p-2 backdrop-blur-2xl md:hidden">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => { setMenuOpen(false); scrollToSection(link.id); }}
                className="block rounded-xl px-4 py-3 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setMenuOpen(false); if (isAuthenticated) onEnterApp?.(); else onStart('signup'); }}
              className="apple-cta mt-2 flex w-full justify-center rounded-xl px-4 py-3 text-sm font-semibold text-black"
            >
              {isAuthenticated ? 'Ir a la app' : 'Empezar gratis'}
            </button>
          </div>
        )}
        <motion.span
          className="apple-progress absolute bottom-0 left-0 h-px w-full origin-left"
          style={{ scaleX: pageProgress }}
          aria-hidden="true"
        />
      </header>

      {/* ═══════════════════════════════════════════════════════════
          HERO — title dissolves → emotional orb rises
          ═══════════════════════════════════════════════════════════ */}
      <section id="inicio" ref={heroRef} className="relative h-[280svh]" aria-labelledby="landing-title">
        <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden">
          <div className="apple-hero-grain pointer-events-none absolute inset-0" aria-hidden="true" />
          <motion.div
            className="apple-hero-glow pointer-events-none absolute left-1/2 top-[48%] h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2"
            style={{
              opacity: reduceMotion ? 0.35 : heroGlowOpacity,
              scale: reduceMotion ? 1 : heroGlowScale,
            }}
            aria-hidden="true"
          />

          <motion.div
            className="relative z-10 flex flex-col items-center px-6 text-center"
            style={{
              opacity: reduceMotion ? 1 : heroTitleOpacity,
              y: reduceMotion ? 0 : heroTitleY,
              scale: reduceMotion ? 1 : heroTitleScale,
            }}
          >
            <div className="relative mb-7" data-testid="app-logo">
              <div
                className="absolute inset-0 scale-110 rounded-[1.75rem] bg-violet-500/30 blur-2xl"
                aria-hidden="true"
              />
              <img
                src={APP_LOGO}
                alt="Moodless"
                width={96}
                height={96}
                className="relative h-20 w-20 rounded-[1.35rem] object-cover ring-1 ring-white/15 shadow-[0_0_48px_rgba(168,85,247,.5)] sm:h-24 sm:w-24 sm:rounded-[1.5rem]"
                draggable={false}
              />
            </div>
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.32em] text-white/40">
              Diario emocional visual
            </p>
            <h1
              id="landing-title"
              className="max-w-5xl text-[clamp(2.75rem,9vw,7.5rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-white"
            >
              Moodless,
              <br />
              <span className="apple-gradient-text">diario emocional visual con inteligencia artificial</span>
            </h1>
            <motion.p
              className="mt-8 max-w-md text-[17px] leading-7 text-white/50 tracking-[-0.005em]"
              style={{ opacity: reduceMotion ? 1 : heroSubOpacity }}
            >
              Haz visible lo que llevas dentro.
            </motion.p>
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            style={{
              opacity: reduceMotion ? 1 : heroOrbOpacity,
              scale: reduceMotion ? 1 : heroOrbScale,
              y: reduceMotion ? 0 : heroOrbY,
            }}
          >
            <EmotionOrb tone={activeTone} phase="capture" size="lg" />
          </motion.div>

          <motion.p
            className="pointer-events-none absolute bottom-[14%] z-30 max-w-xs px-6 text-center text-[15px] leading-6 text-white/70"
            style={{ opacity: reduceMotion ? 0 : heroCaptionOpacity }}
          >
            Lo que sientes se convierte en una imagen.
            <br />
            Lo que se repite, en claridad.
          </motion.p>

          <motion.button
            type="button"
            onClick={() => scrollToSection('experiencia')}
            className="absolute bottom-8 z-30 flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40 outline-none transition-colors hover:text-white/70"
            style={{ opacity: reduceMotion ? 1 : heroCueOpacity }}
          >
            <span>Desliza para sentir</span>
            <ChevronDown size={16} className={reduceMotion ? '' : 'animate-bounce'} />
          </motion.button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          JOURNEY — pinned orb morphs through chapters
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="experiencia"
        ref={journeyRef}
        className="relative h-[480svh]"
        aria-label="Cómo funciona Moodless"
      >
        <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-5 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-12">
            <div className="order-2 w-full max-w-md text-center lg:order-1 lg:text-left">
              <JourneyCopy progress={softJourney} reduceMotion={reduceMotion} />
            </div>

            <motion.div
              className="relative order-1 flex flex-col items-center lg:order-2"
              style={{
                scale: reduceMotion ? 1 : journeyOrbScale,
                y: reduceMotion ? 0 : journeyOrbY,
              }}
            >
              <EmotionOrb
                tone={activeTone}
                phase={reduceMotion ? 'capture' : journeyPhase}
                size="lg"
              />
              <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
                {journeyChapters.map((ch) => {
                  const active = journeyPhase === ch.phase;
                  return (
                    <span
                      key={ch.id}
                      className={`h-1 rounded-full transition-all duration-500 ${active ? 'w-6 bg-white' : 'w-1.5 bg-white/25'}`}
                    />
                  );
                })}
              </div>
            </motion.div>

            <ul className="order-3 hidden space-y-3 lg:block lg:pl-4" aria-hidden="true">
              {journeyChapters.map((ch) => {
                const active = journeyPhase === ch.phase;
                return (
                  <li
                    key={ch.id}
                    className={`text-[13px] font-medium tracking-[-0.01em] transition-colors duration-500 ${
                      active ? 'text-white' : 'text-white/25'
                    }`}
                  >
                    {ch.eyebrow}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          MANIFESTO
          ═══════════════════════════════════════════════════════════ */}
      <section
        ref={manifestoRef}
        className="relative flex min-h-[160svh] items-center justify-center px-5 py-32 sm:px-8"
        aria-label="Manifiesto"
      >
        <div className="sticky top-[28svh] mx-auto max-w-4xl text-center">
          <p className="mb-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">
            Por qué existe
          </p>
          <div className="space-y-3 text-[clamp(1.85rem,5.5vw,4rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
            <motion.p style={{ opacity: reduceMotion ? 1 : line1 }} className="text-white">
              Tu mundo interior
            </motion.p>
            <motion.p style={{ opacity: reduceMotion ? 1 : line2 }} className="text-white">
              no es un producto.
            </motion.p>
            <motion.p style={{ opacity: reduceMotion ? 1 : line3 }} className="apple-gradient-text">
              Es un lugar al que
            </motion.p>
            <motion.p style={{ opacity: reduceMotion ? 1 : line4 }} className="apple-gradient-text">
              mereces volver.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SIENTE — emotion picker (orb mirrors selection)
          ═══════════════════════════════════════════════════════════ */}
      <section id="siente" className="relative mx-auto max-w-6xl px-5 py-28 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">Siente</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
                La emoción es la interfaz.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-md text-[16px] leading-7 text-white/50">
                Sin rachas ni presión. Solo un lugar para volver a ti — incluso cuando no hay palabras.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <div className="apple-panel relative overflow-hidden rounded-[2rem] border border-white/[0.08] p-6 sm:p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-[70px]" aria-hidden="true" />
              <div className="relative flex items-center justify-between">
                <span className="text-xs font-medium text-white/45">Ahora mismo</span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_10px_#2DD4BF]" />
                  Presente
                </span>
              </div>
              <div className="relative mt-6 grid gap-6 sm:grid-cols-[1fr_.9fr] sm:items-center">
                <div className="mx-auto w-full max-w-[220px]">
                  <EmotionOrb tone={activeTone} phase="capture" size="md" className="!w-full" />
                </div>
                <div className="space-y-2">
                  {emotionTones.map((tone) => (
                    <button
                      type="button"
                      key={tone.id}
                      aria-pressed={tone.id === activeToneId}
                      onClick={() => setActiveToneId(tone.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-white/30 ${
                        tone.id === activeToneId
                          ? 'border-white/20 bg-white/[0.09]'
                          : 'border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: tone.color,
                          boxShadow: tone.id === activeToneId ? `0 0 14px ${tone.color}` : undefined,
                        }}
                      />
                      <span>
                        <span className="block text-xs font-semibold text-white">{tone.label}</span>
                        <span className="mt-0.5 block text-[10px] text-white/40">{tone.detail}</span>
                      </span>
                      {tone.id === activeToneId && <Check size={14} className="ml-auto text-white/70" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          THREE PILLARS
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <Reveal>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Todo en un solo gesto
          </p>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Heart,
              title: 'Siente sin explicarte',
              text: 'Una interfaz visual para capturar lo que pasa dentro, incluso cuando no hay palabras.',
            },
            {
              icon: BrainCircuit,
              title: 'Descubre tus patrones',
              text: 'La IA convierte tus registros en pequeñas verdades que puedes usar cada día.',
            },
            {
              icon: LineChart,
              title: 'Vuelve a tu centro',
              text: 'Rituales guiados, música adaptativa y ejercicios creados para tu momento.',
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <article className="apple-panel group h-full rounded-[1.75rem] border border-white/[0.07] p-7 transition-colors hover:border-white/[0.12]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/80">
                  <item.icon size={20} />
                </span>
                <h3 className="mt-8 text-lg font-semibold tracking-[-0.025em] text-white">{item.title}</h3>
                <p className="mt-3 text-[14px] leading-6 text-white/45">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PRIVACY
          ═══════════════════════════════════════════════════════════ */}
      <section id="privacidad" className="relative mx-auto max-w-6xl px-5 py-28 sm:px-8">
        <Reveal>
          <div className="apple-panel relative overflow-hidden rounded-[2.25rem] border border-white/[0.08] px-6 py-16 text-center sm:px-14 sm:py-24">
            <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-[100px]" aria-hidden="true" />
            <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]" aria-hidden="true" />
            <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-100/10 bg-cyan-300/10 text-cyan-100">
              <LockKeyhole size={22} />
            </span>
            <h2 className="relative mx-auto mt-8 max-w-2xl text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
              Tu mundo interior no es un producto.
            </h2>
            <p className="relative mx-auto mt-6 max-w-lg text-[16px] leading-7 text-white/50">
              Moodless está diseñado para proteger lo que compartes. Tus registros son tuyos. Nunca vendemos tu
              información emocional.
            </p>
            <div className="relative mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                [ShieldCheck, 'Tú decides', 'Control sobre tus datos.'],
                [LockKeyhole, 'Protegido', 'Privacidad desde el diseño.'],
                [Heart, 'Sin publicidad', 'Tu atención te pertenece.'],
              ].map(([Icon, title, copy]) => {
                const ItemIcon = Icon as typeof ShieldCheck;
                return (
                  <div
                    key={title as string}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 text-left"
                  >
                    <ItemIcon size={18} className="text-cyan-200/90" />
                    <p className="mt-4 text-sm font-semibold text-white">{title as string}</p>
                    <p className="mt-1 text-xs leading-5 text-white/40">{copy as string}</p>
                  </div>
                );
              })}
            </div>
            <div className="relative mt-10">
              <Link
                to="/privacidad"
                className="inline-flex items-center gap-2 text-sm font-medium text-white/60 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
              >
                Conoce nuestra privacidad <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="finale-title"
        className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pb-24"
      >
        <div className="apple-finale relative overflow-hidden rounded-[2.25rem] border border-white/[0.1] px-6 py-20 text-center sm:px-12 sm:py-28">
          <div
            className="apple-finale-orb absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
            aria-hidden="true"
          />
          <div className="relative mx-auto mb-8 inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-violet-500/25 blur-xl" aria-hidden="true" />
            <img
              src={APP_LOGO}
              alt=""
              width={56}
              height={56}
              className="relative h-14 w-14 rounded-2xl object-cover ring-1 ring-white/15 shadow-[0_0_32px_rgba(168,85,247,.4)]"
              draggable={false}
            />
          </div>
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Empieza contigo
          </p>
          <h2
            id="finale-title"
            className="relative mx-auto mt-6 max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.045em]"
          >
            Haz visible lo que llevas dentro.
          </h2>
          <p className="relative mx-auto mt-6 max-w-md text-[16px] leading-7 text-white/50">
            Un momento basta para empezar a comprenderte mejor.
          </p>
          <button
            type="button"
            onClick={() => { if (isAuthenticated) onEnterApp?.(); else onStart('signup'); }}
            className="apple-cta relative mt-10 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold text-black"
          >
            {isAuthenticated ? <>Ir a la app <ArrowRight size={17} /></> : <>Crear mi espacio emocional <ArrowRight size={17} /></>}
          </button>
          <p className="relative mt-5 text-xs text-white/35">
            {isAuthenticated ? 'Tu aura te espera donde lo dejaste.' : 'Gratis para empezar. Sin tarjeta.'}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="preguntas-frecuentes" className="relative mx-auto max-w-2xl px-5 pb-24 pt-8 sm:px-8">
        <Reveal>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Preguntas frecuentes
          </p>
        </Reveal>
        <div className="mt-10 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-[15px] font-medium text-white outline-none focus-visible:text-white/80">
                {question}
                <span className="text-xl font-light text-white/35 transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="max-w-xl pt-3 pr-8 text-sm leading-7 text-white/45">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-xs text-white/40 sm:flex-row">
          <button
            type="button"
            onClick={() => scrollToSection('inicio')}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label="Volver al inicio"
          >
            <BrandMark compact />
          </button>
          <div className="flex items-center gap-6">
            <Link to="/privacidad" className="transition-colors hover:text-white">
              Privacidad
            </Link>
            <Link to="/terminos" className="transition-colors hover:text-white">
              Términos
            </Link>
            <Link to="/contacto" className="transition-colors hover:text-white">
              Contacto
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Moodless</p>
        </div>
      </footer>
    </main>
  );
};

export default CinematicLanding;
