import React, { useState } from 'react';
import { User, authService } from '../services/authService';
import { ChevronLeft, Mail, Lock, Save, Loader2, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { haptic } from '../constants';
import { useToast } from './ToastProvider';

interface ProfileEditViewProps {
  user: User;
  onBack: () => void;
  onUserUpdate: (updatedUser: User) => void;
}

const ProfileEditView: React.FC<ProfileEditViewProps> = ({ user, onBack, onUserUpdate }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authService.updateProfileData({
        name: name.trim(),
        email: email.trim(),
        password: password ? password : undefined,
      });

      const updatedUser = {
        ...user,
        name: name.trim(),
        email: email.trim(),
      };

      onUserUpdate(updatedUser);
      setSuccess(true);
      haptic('success');
      toast.success('Cambios guardados con éxito');
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      haptic('error');
      toast.error('No se pudieron guardar los cambios');
      if (err.code === 'auth/requires-recent-login') {
        setError('Por seguridad, debes cerrar sesión y volver a entrar para cambiar datos sensibles.');
      } else {
        setError('No se pudieron actualizar los datos. Revisa el formato.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 pt-16 pb-40 flex-1 flex flex-col">
      <header className="flex items-center gap-4 mb-9">
        <button
          type="button"
          onClick={() => { haptic('tap'); onBack(); }}
          className="app-icon-button"
          aria-label="Volver al perfil"
        >
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-[-0.025em]">Editar perfil</h2>
          <p className="app-text-meta">Personaliza tu identidad</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="app-text-eyebrow ml-1">Nombre</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={17} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="app-input py-4 text-sm font-medium"
                placeholder="Tu nombre"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="app-text-eyebrow ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={17} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="app-input py-4 text-sm font-medium"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="app-text-eyebrow ml-1">Nueva contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={17} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="app-input py-4 text-sm font-medium"
                placeholder="•••••••• (dejar vacío para no cambiar)"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0" strokeWidth={1.8} />
            <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" strokeWidth={1.8} />
            <p className="text-sm font-medium text-emerald-300">Cambios guardados con éxito</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="app-button app-button-primary w-full py-4 text-sm"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={17} strokeWidth={1.8} />}
          Guardar cambios
        </button>
      </form>

      <div className="app-surface mt-10 rounded-3xl bg-blue-500/[0.06] p-5 border-blue-500/15">
        <div className="flex gap-4">
          <AlertCircle size={18} className="text-blue-400 shrink-0 mt-0.5" strokeWidth={1.8} />
          <p className="app-text-meta leading-relaxed text-white/65">
            Por motivos de seguridad de Firebase, el cambio de email o contraseña puede requerir una autenticación reciente. Si ves un error, intenta cerrar sesión y volver a entrar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditView;
