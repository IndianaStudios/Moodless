import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Heart, Send, X, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'moodless.onboarded';

interface OnboardingOverlayProps {
  userId: string;
}

const STEPS = [
  {
    id: 'nav',
    icon: Compass,
    accent: 'rgba(196, 181, 253, 0.95)',
    title: 'Tu mundo al alcance de un toque',
    body: 'Diario, Buddy, Explora, Patrones, Estado y Perfil. Todo desde la barra inferior.',
  },
  {
    id: 'sam',
    icon: Heart,
    accent: 'rgba(244, 114, 182, 0.95)',
    title: 'Tres ejes, cinco emociones',
    body: 'Toca los iconos para describir cómo te sientes, cuánta energía tienes y cuánto control sientes.',
  },
  {
    id: 'save',
    icon: Send,
    accent: 'rgba(94, 234, 212, 0.95)',
    title: 'Guarda tu vibe',
    body: 'Cuando termines, pulsa Guardar mi vibe. Tu Buddy te esperará con una misión personalizada.',
  },
] as const;

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!userId) return;
    try {
      const done = localStorage.getItem(`${STORAGE_KEY}.${userId}`) === '1';
      if (!done) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [userId]);

  const dismiss = (persist: boolean) => {
    if (persist && userId) {
      try {
        localStorage.setItem(`${STORAGE_KEY}.${userId}`, '1');
      } catch {}
    }
    setOpen(false);
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      dismiss(true);
      return;
    }
    setStep(step + 1);
  };

  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboarding"
          className="fixed inset-0 z-[200] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Tutorial de bienvenida"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/55 apple-vibrancy-titanium"
            onClick={() => dismiss(true)}
            aria-label="Saltar tutorial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          />

          <div className="relative z-10 flex flex-col flex-1 p-4 sm:p-6 items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-[2rem] border border-white/[0.10] apple-vibrancy-soft shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] overflow-hidden"
              style={{
                backgroundColor: 'rgba(20, 14, 32, 0.78)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                }}
                aria-hidden="true"
              />

              <div className="relative flex items-center justify-between px-6 pt-5 pb-2">
                <span className="app-eyebrow">Tutorial · {step + 1}/{STEPS.length}</span>
                <button
                  type="button"
                  onClick={() => dismiss(true)}
                  className="app-icon-button h-8 w-8"
                  aria-label="Saltar tutorial"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pt-2 pb-6">
                <AnimatePresence mode="wait">
                  {STEPS[step] && (() => {
                    const Step = STEPS[step];
                    return (
                      <motion.div
                        key={Step.id}
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className="flex flex-col items-center text-center"
                      >
                        <motion.div
                          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border border-white/[0.12]"
                          style={{
                            backgroundColor: `${Step.accent}1A`,
                            color: Step.accent,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 32px ${Step.accent}26`,
                          }}
                          animate={{ scale: [0.96, 1.03, 1] }}
                          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <Step.icon size={30} strokeWidth={1.8} />
                        </motion.div>
                        <h2 className="app-title text-2xl text-white leading-tight tracking-[-0.03em]">
                          {Step.title}
                        </h2>
                        <p className="mt-3 app-text-meta leading-relaxed max-w-sm">
                          {Step.body}
                        </p>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-center gap-1.5 pb-5" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/25'
                    }`}
                    style={{ transition: 'all 320ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 px-6 pb-6">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={prev}
                    className="app-button app-button-secondary flex-1"
                  >
                    Atrás
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => dismiss(true)}
                    className="app-button app-button-secondary flex-1"
                  >
                    Saltar
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  className="app-button app-button-primary flex-1"
                >
                  {step === STEPS.length - 1 ? 'Empezar' : 'Siguiente'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingOverlay;
