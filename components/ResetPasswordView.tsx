import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../services/firebase';

interface ResetPasswordViewProps {
  oobCode: string;
  onDone: () => void;
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ oobCode, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
      } catch {
        setExpired(true);
      } finally {
        setVerifying(false);
      }
    };
    verify();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPwd) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/expired-action-code') {
        setExpired(true);
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil. Prueba con una más segura.');
      } else {
        setError('Ocurrió un error. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] items-center justify-center p-8 bg-[var(--app-bg)] text-white relative overflow-hidden">
      <div className="app-ambient" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 mb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Lock className="text-white/80" size={26} strokeWidth={1.8} />
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">Nueva contraseña</h2>
        </div>

        {verifying ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="animate-spin text-white/55" size={28} />
            <p className="text-white/55 text-sm">Verificando enlace…</p>
          </div>
        ) : expired ? (
          <div className="text-center space-y-6">
            <div className="bg-red-500/[0.08] border border-red-500/20 rounded-2xl p-6">
              <p className="text-red-300 font-semibold text-base mb-2">Enlace caducado</p>
              <p className="text-sm text-white/55 leading-relaxed">
                Este enlace de recuperación ya ha sido usado o ha expirado.
                Solicita uno nuevo desde la pantalla de inicio de sesión.
              </p>
            </div>
            <button
              onClick={onDone}
              className="app-button app-button-primary w-full py-4 text-[15px]"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : success ? (
          <div className="text-center space-y-6">
            <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-2xl p-6">
              <CheckCircle className="text-emerald-300 mx-auto mb-3" size={36} strokeWidth={1.8} />
              <p className="text-emerald-300 font-semibold text-base mb-2">¡Contraseña actualizada!</p>
              <p className="text-sm text-white/55 leading-relaxed">
                Tu nueva contraseña está lista. Ya puedes iniciar sesión con ella.
              </p>
            </div>
            <button
              onClick={onDone}
              className="app-button app-button-primary w-full py-4 text-[15px]"
            >
              Iniciar sesión
              <ArrowRight size={17} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-white/55 text-center mb-6">
              Escribe tu nueva contraseña para <strong className="text-white">{email}</strong>
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                  className="app-input py-4 pl-12 pr-12 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  disabled={loading}
                  className="app-input py-4 pl-12 pr-4 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="app-surface border-red-500/20 rounded-xl p-3 flex items-start gap-3 text-left">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" strokeWidth={1.8} />
                  <p className="text-red-400 text-xs font-medium leading-tight">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="app-button app-button-primary w-full py-4 text-[15px] disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Guardar contraseña'}
                {!loading && <ArrowRight size={17} strokeWidth={2} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordView;
