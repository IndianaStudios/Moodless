import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { haptic } from '../constants';

export type ToastTone = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastTone, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
};

const TONE_COLORS: Record<ToastTone, string> = {
  success: '#10b981',
  error: '#f87171',
  info: '#a78bfa',
};

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 3200;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const hapticForToneRef = useRef<ToastTone | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback((message: string, tone: ToastTone = 'info', duration: number = DEFAULT_DURATION) => {
    const id = ++idRef.current;
    const item: ToastItem = { id, message, tone, duration, createdAt: Date.now() };

    setToasts((prev) => {
      const next = [...prev, item];
      if (next.length > MAX_VISIBLE) {
        const evicted = next.shift();
        if (evicted) {
          const t = timersRef.current.get(evicted.id);
          if (t) clearTimeout(t);
          timersRef.current.delete(evicted.id);
        }
      }
      return next;
    });

    if (hapticForToneRef.current !== tone) {
      hapticForToneRef.current = tone;
      if (tone === 'success') haptic('success');
      else if (tone === 'error') haptic('error');
      else haptic('select');
      setTimeout(() => { hapticForToneRef.current = null; }, 200);
    }

    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    info: (m, d) => show(m, 'info', d),
    dismiss,
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex flex-col items-center gap-2 px-4"
        role="region"
        aria-label="Notificaciones"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            const color = TONE_COLORS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className={`app-toast pointer-events-auto relative overflow-hidden ${t.tone === 'error' ? 'app-toast-error' : ''}`}
                role="status"
                aria-live="polite"
                onClick={() => dismiss(t.id)}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Icon
                    size={14}
                    className={
                      t.tone === 'success' ? 'text-emerald-300' :
                      t.tone === 'error' ? 'text-red-300' :
                      'text-white/65'
                    }
                    strokeWidth={1.8}
                  />
                  <span>{t.message}</span>
                </span>
                <motion.span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[2px]"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: t.duration / 1000, ease: 'linear' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
