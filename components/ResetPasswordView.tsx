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
    // Verificar que el código es válido antes de mostrar el formulario
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
    <div className="flex flex-col min-h-screen items-center justify-center p-8 bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]" />

      <div className="z-10 w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <Lock className="text-purple-400" size={28} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Nueva contraseña</h2>
        </div>

        {verifying ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="animate-spin text-purple-400" size={32} />
            <p className="text-slate-400 text-sm">Verificando enlace...</p>
          </div>
        ) : expired ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
              <p className="text-red-400 font-bold text-lg mb-2">❌ Enlace caducado</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Este enlace de recuperación ya ha sido usado o ha expirado.
                Solicita uno nuevo desde la pantalla de inicio de sesión.
              </p>
            </div>
            <button
              onClick={onDone}
              className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : success ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
              <CheckCircle className="text-emerald-400 mx-auto mb-3" size={40} />
              <p className="text-emerald-400 font-bold text-lg mb-2">¡Contraseña actualizada!</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tu nueva contraseña está lista. Ya puedes iniciar sesión con ella.
              </p>
            </div>
            <button
              onClick={onDone}
              className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95"
            >
              Iniciar sesión
              <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 text-center mb-6">
              Escribe tu nueva contraseña para <strong className="text-white">{email}</strong>
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 animate-shake text-left backdrop-blur-sm">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs font-medium leading-tight">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-white/5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar contraseña'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordView;
