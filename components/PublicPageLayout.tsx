import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface PublicPageLayoutProps {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  pageTitle: string;
  onBack?: () => void;
}

const links = [
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/terminos', label: 'Términos' },
  { to: '/cookies', label: 'Cookies' },
  { to: '/contacto', label: 'Contacto' },
];

const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({
  children,
  eyebrow,
  title,
  description,
  icon,
  pageTitle,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.title = `${pageTitle} | Moodless`;
  }, [pageTitle]);

  const scrollOnLanding = (id: string) => () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('moodless.landingScrollTarget', id);
    }
  };

  return (
    <main className="apple-landing relative min-h-screen overflow-x-clip bg-[var(--app-bg)] text-white">
      <div className="app-ambient" aria-hidden="true" />

      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/[0.06] bg-[var(--app-bg)]/70 py-4 backdrop-blur-2xl'
            : 'border-b border-transparent bg-transparent py-6'
        }`}
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Moodless, ir al inicio">
            <img
              src="/logo.jpg"
              alt="Moodless"
              className="h-9 w-9 rounded-xl object-cover shadow-[0_0_24px_rgba(168,85,247,.4)]"
            />
            <span className="text-[16px] font-semibold tracking-[-0.05em]">Moodless</span>
          </Link>
          <div className="hidden items-center gap-7 text-[13px] text-white/55 md:flex">
            <Link to="/landing" onClick={scrollOnLanding('experiencia')} className="transition-colors hover:text-white">
              Experiencia
            </Link>
            <Link to="/landing" onClick={scrollOnLanding('privacidad')} className="transition-colors hover:text-white">
              Privacidad
            </Link>
            <Link to="/landing" onClick={scrollOnLanding('preguntas-frecuentes')} className="transition-colors hover:text-white">
              Preguntas
            </Link>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <Link to="/?auth=true&mode=login" className="text-[13px] text-white/55 transition-colors hover:text-white">
              Entrar
            </Link>
            <Link to="/?auth=true&mode=signup" className="apple-cta rounded-full px-5 py-2 text-[13px] font-semibold text-black">
              Empezar gratis
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white md:hidden"
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[var(--app-surface)]/95 p-2 backdrop-blur-2xl md:hidden"
            >
              <Link
                to="/landing"
                onClick={() => { setIsMenuOpen(false); scrollOnLanding('experiencia')(); }}
                className="block rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                Experiencia
              </Link>
              <Link
                to="/landing"
                onClick={() => { setIsMenuOpen(false); scrollOnLanding('privacidad')(); }}
                className="block rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                Privacidad
              </Link>
              <Link
                to="/landing"
                onClick={() => { setIsMenuOpen(false); scrollOnLanding('preguntas-frecuentes')(); }}
                className="block rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                Preguntas
              </Link>
              <Link
                to="/?auth=true&mode=signup"
                className="apple-cta mt-2 block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-black"
              >
                Empezar gratis
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          {icon && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200/15 bg-violet-400/[0.09] text-violet-200 shadow-[0_0_35px_rgba(139,92,246,.18)]">
              {icon}
            </div>
          )}
          <p className="app-eyebrow mt-6">{eyebrow}</p>
          <h1 className="app-title mt-4 text-4xl text-white sm:text-6xl">{title}</h1>
          {description && (
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">{description}</p>
          )}
        </div>
        <div className="apple-panel mt-14 rounded-[2rem] border border-white/[0.08] p-6 sm:p-10">{children}</div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] px-5 py-9 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-xs text-white/40 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Moodless" className="h-6 w-6 rounded-lg object-cover" />
            <span className="font-semibold tracking-[-0.03em] text-white/70">Moodless</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
          <p>© {new Date().getFullYear()} Moodless</p>
        </div>
      </footer>
    </main>
  );
};

export default PublicPageLayout;
