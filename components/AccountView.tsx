import React, { useState, useEffect } from 'react';
import { User, authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE } from '../constants';
import {
  User as UserIcon,
  Trash2,
  LogOut,
  ChevronRight,
  Award,
  Zap,
  Mail,
  Bell,
  BellOff,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface AccountViewProps {
  user: User;
  entries: MoodEntry[];
  onLogout: () => void;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfile?: () => void;
  onSupport?: () => void;
  onAdmin?: () => void;
  appVersion: string;
}

const AccountView: React.FC<AccountViewProps> = ({ user, entries, onLogout, onEditProfile, onSupport, onAdmin, appVersion }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifsEnabled, setNotifsEnabled] = useState(false);

  useEffect(() => {
    const loadPrefs = async () => {
      const enabled = await notificationService.getPreference(user.id);
      setNotifsEnabled(enabled);
    };
    loadPrefs();
  }, [user.id]);

  const handleToggleNotifs = async () => {
    const previousState = notifsEnabled;
    setIsSyncing(true);

    try {
      if (notifsEnabled) {
        setNotifsEnabled(false);
        await notificationService.savePreference(user.id, false);
      } else {
        const permission = await notificationService.requestPermission();
        if (permission === 'granted') {
          setNotifsEnabled(true);
          await notificationService.savePreference(user.id, true);
          // Inicializar FCM inmediatamente para capturar el token en la PWA
          await notificationService.initFCM(user.id);
        } else {
          alert("Necesitas dar permiso en el navegador para activar los recordatorios.");
        }
      }
    } catch (error: any) {
      console.error("Error saving preference:", error);
      // Revertir estado si falla
      setNotifsEnabled(previousState);
      alert(`No se pudo guardar la preferencia: ${error.message || 'Error desconocido'}. Revisa tu conexión.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await authService.deleteAccount();
      onLogout();
    } catch (error: any) {
      alert("Error al borrar cuenta. Es posible que necesites re-autenticarte.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="px-6 pt-20 pb-40 flex-1 flex flex-col">
      <header className="mb-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-purple-600 to-blue-500 p-1 mb-4 shadow-2xl">
          <div className="w-full h-full rounded-[2.3rem] bg-slate-950 flex items-center justify-center">
            <UserIcon size={40} className="text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-white capitalize">{user.name}</h2>
        <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase tracking-widest mt-1 font-bold">
          <Mail size={10} />
          <span>{user.email}</span>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3 mb-8">
        {/* Racha */}
        {(() => {
          const loggedDates = new Set(entries.map(e => e.date));
          const today = new Date(); today.setHours(0,0,0,0);
          const fmt = (d: Date) => d.toISOString().split('T')[0];
          let streak = 0; let checkDate = new Date(today);
          if (loggedDates.has(fmt(checkDate))) { streak = 1; checkDate.setDate(checkDate.getDate()-1); }
          else { checkDate.setDate(checkDate.getDate()-1); if (!loggedDates.has(fmt(checkDate))) { streak = 0; } else { streak = 1; checkDate.setDate(checkDate.getDate()-1); } }
          if (streak > 0) { while(loggedDates.has(fmt(checkDate))) { streak++; checkDate.setDate(checkDate.getDate()-1); } }
          return (
            <div className="glass p-4 rounded-2xl border-white/5 flex flex-col items-center">
              <Zap className="text-yellow-400 mb-1" size={16} />
              <span className="text-xl font-black">{streak}</span>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Racha</span>
            </div>
          );
        })()}
        {/* Capturas */}
        <div className="glass p-4 rounded-2xl border-white/5 flex flex-col items-center">
          <Calendar className="text-blue-400 mb-1" size={16} />
          <span className="text-xl font-black">{entries.length}</span>
          <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Vibes</span>
        </div>
        {/* Tendencia */}
        {(() => {
          if (entries.length < 3) return (
            <div className="glass p-4 rounded-2xl border-white/5 flex flex-col items-center">
              <TrendingUp className="text-slate-500 mb-1" size={16} />
              <span className="text-xl font-black text-slate-500">—</span>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Pocas</span>
            </div>
          );
          const sorted = [...entries].sort((a,b) => a.date.localeCompare(b.date));
          const recent = sorted.slice(-7); const previous = sorted.slice(-14,-7);
          const avg = (arr: MoodEntry[]) => arr.reduce((s,e) => s + (e.valence||3), 0) / (arr.length||1);
          const diff = avg(recent) - (previous.length > 0 ? avg(previous) : avg(recent));
          const t = diff > 0.3 ? { s: '↑', c: 'text-green-400', l: 'Sube' } : diff < -0.3 ? { s: '↓', c: 'text-red-400', l: 'Baja' } : { s: '→', c: 'text-blue-400', l: 'Estable' };
          return (
            <div className="glass p-4 rounded-2xl border-white/5 flex flex-col items-center">
              <TrendingUp className={`${t.c} mb-1`} size={16} />
              <span className={`text-xl font-black ${t.c}`}>{t.s}</span>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{t.l}</span>
            </div>
          );
        })()}
        {/* Aura */}
        {(() => {
          if (entries.length === 0) return (
            <div className="glass p-4 rounded-2xl border-white/5 flex flex-col items-center">
              <span className="text-base mb-1">🌫️</span>
              <span className="text-xs font-black text-slate-500">---</span>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Aura</span>
            </div>
          );
          const recent = [...entries].sort((a,b) => b.date.localeCompare(a.date)).slice(0,7);
          const counts: Record<string,number> = {};
          recent.forEach(e => { counts[e.category] = (counts[e.category]||0)+1; });
          const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
          const palette = EMOTIONAL_PALETTE.find(p => p.category === dominant);
          const emojiMap: Record<string,string> = { JOY:'☀️', CALM:'🍃', ANGER:'🔥', SADNESS:'🌧️', ANXIETY:'👻', ENERGY:'⚡', NEUTRAL:'☁️' };
          return (
            <div className="glass p-4 rounded-2xl border-white/5 flex flex-col items-center">
              <span className="text-base mb-1">{emojiMap[dominant]||'🌫️'}</span>
              <span className="text-xs font-black" style={{color: palette?.hex||'#94A3B8'}}>{palette?.label||'Neutral'}</span>
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Aura</span>
            </div>
          );
        })()}
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Ajustes de Cuenta</h3>
          <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
            <button
              onClick={handleToggleNotifs}
              disabled={isSyncing}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${notifsEnabled ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {isSyncing ? <Loader2 size={18} className="animate-spin" /> : (notifsEnabled ? <Bell size={18} /> : <BellOff size={18} />)}
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium block">Recordatorios</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {isSyncing ? 'Guardando...' : (notifsEnabled ? 'Activos' : 'Inactivos')}
                  </span>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${notifsEnabled ? 'bg-green-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifsEnabled ? 'right-1' : 'left-1'}`} />
              </div>
            </button>
            <button onClick={onEditProfile} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><UserIcon size={18} /></div>
                <span className="text-sm font-medium">Información Personal</span>
              </div>
              <ChevronRight size={16} className="text-slate-600" />
            </button>
            <button onClick={onSupport} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400"><AlertTriangle size={18} /></div>
                <span className="text-sm font-medium">Ayuda y Soporte</span>
              </div>
              <ChevronRight size={16} className="text-slate-600" />
            </button>
            {onAdmin && (
              <button onClick={onAdmin} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-t border-white/5 bg-red-500/5">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-500/10 rounded-xl text-red-400"><ShieldCheck size={18} /></div>
                  <span className="text-sm font-medium text-red-200">Panel Admin</span>
                </div>
                <ChevronRight size={16} className="text-red-900" />
              </button>
            )}
            <div className="w-full px-6 py-4 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-4 opacity-50">
                <div className="p-2 bg-slate-500/10 rounded-xl text-slate-400"><Zap size={18} /></div>
                <span className="text-sm font-medium">Versión</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{appVersion}</span>
            </div>
          </div>
        </section>

        <button onClick={onLogout} className="w-full py-5 rounded-[2rem] glass border-red-500/10 text-red-400 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
          <LogOut size={16} /> CERRAR SESIÓN
        </button>

        <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-4 mt-4 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
          <Trash2 size={16} /> ELIMINAR CUENTA DEFINITIVAMENTE
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass p-8 rounded-[2.5rem] border-red-500/20 max-w-xs w-full text-center space-y-6">
            <AlertTriangle size={32} className="mx-auto text-red-500 animate-bounce" />
            <h4 className="text-lg font-bold">¿Eliminar cuenta?</h4>
            <div className="flex flex-col gap-3">
              <button onClick={handleDeleteAccount} className="py-4 bg-red-500 text-white rounded-2xl font-bold">Sí, borrar todo</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="py-4 bg-white/5 text-slate-300 rounded-2xl font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountView;