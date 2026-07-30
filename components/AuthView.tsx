import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { authService, User } from '../services/authService';
import { UserCircle, Lock, ArrowRight, Sparkles, Loader2, AlertCircle, Mail } from 'lucide-react';
import LegalView from './LegalView';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
  onBack?: () => void;
  heroEntrance?: boolean;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onBack, heroEntrance = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    const validationErrors: string[] = [];

    if (isLogin) {
      if (!trimmedEmail) validationErrors.push('Introduce tu correo electrónico.');
      if (!password) validationErrors.push('Introduce tu contraseña.');
    } else {
      if (!agreedToTerms) {
        validationErrors.push('Debes consentir la Política de Privacidad para crear tu cuenta.');
      }

      if (trimmedName.length < 3) {
        validationErrors.push('El nombre debe tener al menos 3 letras.');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        validationErrors.push('Introduce un correo electrónico válido (ej. correo@dominio.com).');
      }

      if (password.length < 6) {
        validationErrors.push('La contraseña debe tener al menos 6 caracteres.');
      }
      if (!/[A-Z]/.test(password)) {
        validationErrors.push('La contraseña debe contener al menos una mayúscula.');
      }
      if (!/[a-z]/.test(password)) {
        validationErrors.push('La contraseña debe contener al menos una minúscula.');
      }
      if (!/[0-9]/.test(password)) {
        validationErrors.push('La contraseña debe contener al menos un número.');
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        validationErrors.push('La contraseña debe contener al menos un carácter especial.');
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      setLoading(false);
      return;
    }

    try {
      let user: User | null = null;
      if (isLogin) {
        user = await authService.login(trimmedEmail, password);
      } else {
        user = await authService.signup(trimmedName, trimmedEmail, password);
      }

      if (user) onAuthSuccess(user);
    } catch (err: any) {
      console.warn("Auth process failed:", err.code, err.message);

      switch (err.code) {
        case 'auth/invalid-email':
          setError('El formato del correo no es válido.');
          break;
        case 'auth/email-already-in-use':
          setError('Este correo ya está registrado.');
          break;
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          setError('Los datos de acceso no son válidos. Revisa tu correo o contraseña.');
          break;
        case 'auth/weak-password': {
          const raw = (err.message || '')
            .replace(/^Firebase:\s*/i, '')
            .replace(/\s*\(auth\/[^)]+\)\.?\s*$/i, '')
            .trim();
          setError(raw || 'La contraseña no cumple los requisitos de seguridad.');
          break;
        }
        case 'auth/network-request-failed':
          setError('Error de conexión. Revisa tu internet.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Inténtalo más tarde.');
          break;
        default:
          setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const user = await authService.loginWithGoogle();
      if (user) onAuthSuccess(user);
    } catch (err: any) {
      console.warn("Google login failed:", err);
      setError('No se pudo iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Introduce tu correo electrónico.');
      setLoading(false);
      return;
    }

    try {
      await authService.resetPassword(trimmedEmail);
      setResetSent(true);
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-email':
          setError('No encontramos ninguna cuenta con ese correo.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Espera unos minutos.');
          break;
        default:
          setError('Ocurrió un error. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (legalPage) {
    return <LegalView type={legalPage} onBack={() => setLegalPage(null)} />;
  }

  if (forgotPassword) {
    return (
      <div className="app-shell relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-8 text-white">
        <div className="app-ambient" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md px-4"
        >
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Lock className="text-white/80" size={26} strokeWidth={1.8} />
            </div>
            <p className="app-eyebrow mb-2">Cuenta</p>
            <h2 className="app-title text-2xl tracking-tight">Recuperar contraseña</h2>
            <p className="mt-2 text-sm text-white/55">Te enviaremos un enlace para restablecer tu contraseña.</p>
          </div>

          {resetSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 text-center"
            >
              <div className="app-surface rounded-2xl border-emerald-400/20 p-6">
                <p className="mb-2 text-base font-semibold text-emerald-300">Email enviado</p>
                <p className="text-sm leading-relaxed text-white/55">
                  Hemos enviado un enlace de recuperación a <strong className="text-white">{email.trim()}</strong>.
                  Revisa tu bandeja de entrada (y spam) y sigue las instrucciones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(false);
                  setResetSent(false);
                  setError('');
                }}
                className="app-button app-button-primary w-full py-4 text-[15px]"
              >
                Volver al inicio de sesión
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleResetPassword} className="app-surface-raised space-y-4 rounded-[1.75rem] p-5 sm:p-6">
              <div className="relative">
                <Mail className="absolute top-1/2 left-4 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                  className="app-input disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left backdrop-blur-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-xs font-medium leading-tight text-red-400">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="app-button app-button-primary w-full py-4 text-[15px] disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar enlace'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotPassword(false);
                  setError('');
                }}
                className="w-full py-2 text-center text-sm text-white/45 transition-colors hover:text-white"
              >
                ← Volver al inicio de sesión
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-shell relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-8 text-white">
      <div className="app-ambient" aria-hidden="true" />

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="app-icon-button absolute top-8 left-8 z-50"
          aria-label="Volver"
        >
          <ArrowRight className="rotate-180" />
        </button>
      )}

      <div className="relative z-10 w-full max-w-md px-4">
        <header className="mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="group relative mx-auto mb-7 inline-block"
          >
            <div
              className="absolute inset-0 scale-110 rounded-[1.75rem] bg-violet-500/20 blur-2xl transition-all duration-700 group-hover:bg-violet-500/30"
              aria-hidden="true"
            />
            <img
              src="/logo.jpg"
              alt="Moodless"
              className="relative h-24 w-24 rounded-[1.4rem] object-cover ring-1 ring-white/15 sm:h-28 sm:w-28"
            />
          </motion.div>
          <p className="app-eyebrow mt-2">{isLogin ? 'Bienvenido de nuevo' : 'Crea tu espacio'}</p>
          <h1 className="app-title mt-2 text-3xl text-white sm:text-4xl">{isLogin ? 'Entrar' : 'Empezar'}</h1>
        </header>

        <motion.form
          onSubmit={handleSubmit}
          className="app-surface-raised space-y-3.5 rounded-[1.75rem] p-5 sm:p-6"
          initial={heroEntrance ? { opacity: 0, scale: 0.94, y: 14 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={heroEntrance ? { type: 'spring', stiffness: 360, damping: 28 } : { duration: 0.24 }}
        >
          {!isLogin && (
            <div className="relative">
              <UserCircle className="absolute top-1/2 left-4 -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="app-input disabled:opacity-50"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute top-1/2 left-4 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              className="app-input disabled:opacity-50"
            />
          </div>

          <div className="relative">
            <Lock className="absolute top-1/2 left-4 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="app-input disabled:opacity-50"
            />
          </div>

          {!isLogin && (
            <div className="flex items-start gap-3 px-1 pt-1 text-left group">
              <input
                type="checkbox"
                id="terms"
                disabled={loading}
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 cursor-pointer accent-purple-500 transition-all"
              />
              <label htmlFor="terms" className="text-[11px] text-white/55 leading-relaxed cursor-pointer select-none">
                Consiento explícitamente el tratamiento de mis estados emocionales y acepto la <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalPage('privacy'); }}
                  className="text-white font-medium hover:text-purple-300 underline decoration-white/20 underline-offset-2 transition-colors pointer-events-auto"
                >Política de Privacidad</span> y <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalPage('terms'); }}
                  className="text-white font-medium hover:text-purple-300 underline decoration-white/20 underline-offset-2 transition-colors pointer-events-auto"
                >Términos del Servicio</span> de acuerdo al RGPD.
              </label>
            </div>
          )}

          {error && (
            <div className="app-surface border-red-500/20 rounded-xl p-3 flex items-start gap-3 text-left">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                {error.split('\n').map((line, i) => (
                  <p key={i} className="text-red-400 text-xs font-medium leading-tight">
                    {error.includes('\n') ? `• ${line}` : line}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="app-button app-button-primary w-full py-4 text-[15px] mt-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={20} /> : isLogin ? 'Entrar' : 'Crear cuenta'}
            {!loading && <ArrowRight size={17} />}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={() => { setForgotPassword(true); setError(''); }}
              className="w-full text-center text-xs text-white/45 hover:text-purple-300 transition-colors py-1"
            >
              ¿Has olvidado tu contraseña?
            </button>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/[0.08]"></div>
            <span className="flex-shrink-0 mx-3 text-white/40 text-xs">o continúa con</span>
            <div className="flex-grow border-t border-white/[0.08]"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="app-button app-button-secondary w-full py-4 text-[15px] disabled:opacity-50"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>
        </motion.form>

        <footer className="mt-7 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            disabled={loading}
            className="text-sm text-white/55 hover:text-white transition-colors py-2 px-4"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AuthView;
