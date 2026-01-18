
import React, { useState } from 'react';
import { User, authService } from '../services/authService';
import { ChevronLeft, User as UserIcon, Mail, Lock, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authService.updateProfileData({
        name: name.trim(),
        email: email.trim(),
        password: password ? password : undefined
      });

      const updatedUser = {
        ...user,
        name: name.trim(),
        email: email.trim()
      };

      onUserUpdate(updatedUser);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
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
    <div className="px-6 pt-20 pb-40 h-full overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white">Editar Perfil</h2>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Personaliza tu identidad</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-bold"
                placeholder="Tu nombre"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-bold"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-bold"
                placeholder="•••••••• (dejar vacío para no cambiar)"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-shake">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
            <CheckCircle2 size={20} className="text-green-400 shrink-0" />
            <p className="text-green-400 text-xs font-bold uppercase tracking-widest">Cambios guardados con éxito</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-white text-slate-950 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
          GUARDAR CAMBIOS
        </button>
      </form>

      <div className="mt-12 p-6 glass rounded-3xl border-white/5 bg-blue-500/5">
        <div className="flex gap-4">
          <AlertCircle size={20} className="text-blue-400 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-widest">
            Nota: Por motivos de seguridad de Firebase, el cambio de email o contraseña puede requerir una autenticación reciente. Si ves un error, intenta cerrar sesión y volver a entrar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditView;
