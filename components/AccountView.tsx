import React, { useState, useEffect } from 'react';
import { User, authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE, haptic } from '../constants';
import { useToast } from './ToastProvider';
import Reveal from './Reveal';
import ModalShell from './ModalShell';
import {
  Zap,
  Mail,
  Bell,
  BellOff,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  TrendingUp,
  Calendar,
  FileText,
  ChevronRight,
  LogOut,
  Trash2,
} from 'lucide-react';

interface AccountViewProps {
  user: User;
  entries: MoodEntry[];
  onLogout: () => void;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfile?: () => void;
  onSupport?: () => void;
  onAdmin?: () => void;
  onLegal?: (type: 'privacy' | 'terms') => void;
  appVersion: string;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0).toUpperCase()).join('');
};

const AccountView: React.FC<AccountViewProps> = ({ user, entries, onLogout, onEditProfile, onSupport, onAdmin, onLegal, appVersion }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const toast = useToast();

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
        haptic('success');
        toast.success('Recordatorios desactivados');
      } else {
        const permission = await notificationService.requestPermission();
        if (permission === 'granted') {
          setNotifsEnabled(true);
          await notificationService.savePreference(user.id, true);
          await notificationService.initFCM(user.id);
          haptic('success');
          toast.success('Recordatorios activados');
        } else {
          haptic('error');
          toast.error('Necesitas dar permiso en el navegador para activar los recordatorios.');
        }
      }
    } catch (error: any) {
      console.error('Error saving preference:', error);
      setNotifsEnabled(previousState);
      haptic('error');
      toast.error(`No se pudo guardar la preferencia: ${error.message || 'Error desconocido'}.`);
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
      haptic('error');
      toast.error('Error al borrar cuenta. Es posible que necesites re-autenticarte.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-40 pt-16">
      <Reveal className="mb-8 flex flex-col items-center text-center">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.name}
            className="mb-4 h-24 w-24 rounded-full object-cover ring-1 ring-white/15 shadow-[0_8px_28px_rgba(0,0,0,0.36)]"
          />
        ) : (
          <div className="apple-avatar mb-4 h-24 w-24 text-3xl tracking-[-0.04em]">
            {getInitials(user.name) || 'M'}
          </div>
        )}
        <p className="app-eyebrow mb-2">Perfil</p>
        <h2 className="app-title text-[clamp(1.5rem,4.5vw,1.875rem)] capitalize text-white">{user.name}</h2>
        <div className="mt-2 flex items-center gap-1.5 app-text-meta">
          <Mail size={12} strokeWidth={1.8} />
          <span>{user.email}</span>
        </div>
      </Reveal>

      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {(() => {
          const loggedDates = new Set(entries.map(e => e.date));
          const today = new Date(); today.setHours(0,0,0,0);
          const fmt = (d: Date) => d.toISOString().split('T')[0];
          let streak = 0; let checkDate = new Date(today);
          if (loggedDates.has(fmt(checkDate))) { streak = 1; checkDate.setDate(checkDate.getDate()-1); }
          else { checkDate.setDate(checkDate.getDate()-1); if (!loggedDates.has(fmt(checkDate))) { streak = 0; } else { streak = 1; checkDate.setDate(checkDate.getDate()-1); } }
          if (streak > 0) { while(loggedDates.has(fmt(checkDate))) { streak++; checkDate.setDate(checkDate.getDate()-1); } }
          return (
            <div className="app-surface flex flex-col items-center rounded-2xl p-4">
              <Zap className="text-yellow-400 mb-1.5" size={15} strokeWidth={1.8} />
              <span className="text-xl font-semibold tracking-[-0.025em]">{streak}</span>
              <span className="app-text-eyebrow">Racha</span>
            </div>
          );
        })()}
        <div className="app-surface flex flex-col items-center rounded-2xl p-4">
          <Calendar className="text-blue-400 mb-1.5" size={15} strokeWidth={1.8} />
          <span className="text-xl font-semibold tracking-[-0.025em]">{entries.length}</span>
          <span className="app-text-eyebrow">Vibes</span>
        </div>
        {(() => {
          if (entries.length < 3) return (
            <div className="app-surface flex flex-col items-center rounded-2xl p-4">
              <TrendingUp className="text-white/40 mb-1.5" size={15} strokeWidth={1.8} />
              <span className="text-xl font-semibold tracking-[-0.025em] text-white/40">—</span>
              <span className="app-text-eyebrow">Pocas</span>
            </div>
          );
          const sorted = [...entries].sort((a,b) => a.date.localeCompare(b.date));
          const recent = sorted.slice(-7); const previous = sorted.slice(-14,-7);
          const avg = (arr: MoodEntry[]) => arr.reduce((s,e) => s + (e.valence||3), 0) / (arr.length||1);
          const diff = avg(recent) - (previous.length > 0 ? avg(previous) : avg(recent));
          const t = diff > 0.3 ? { s: '↑', c: 'text-emerald-400', l: 'Sube' } : diff < -0.3 ? { s: '↓', c: 'text-red-400', l: 'Baja' } : { s: '→', c: 'text-blue-400', l: 'Estable' };
          return (
            <div className="app-surface flex flex-col items-center rounded-2xl p-4">
              <TrendingUp className={`${t.c} mb-1.5`} size={15} strokeWidth={1.8} />
              <span className={`text-xl font-semibold tracking-[-0.025em] ${t.c}`}>{t.s}</span>
              <span className="app-text-eyebrow">{t.l}</span>
            </div>
          );
        })()}
        {(() => {
          if (entries.length === 0) return (
            <div className="app-surface flex flex-col items-center rounded-2xl p-4">
              <Bell className="text-white/35 mb-1.5" size={15} strokeWidth={1.8} />
              <span className="text-xs font-semibold tracking-[-0.01em] text-white/40">Sin datos</span>
              <span className="app-text-eyebrow">Aura</span>
            </div>
          );
          const recent = [...entries].sort((a,b) => b.date.localeCompare(a.date)).slice(0,7);
          const counts: Record<string,number> = {};
          recent.forEach(e => { counts[e.category] = (counts[e.category]||0)+1; });
          const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
          const palette = EMOTIONAL_PALETTE.find(p => p.category === dominant);
          const label = palette?.label || 'Neutral';
          const color = palette?.hex || '#94A3B8';
          return (
            <div className="app-surface flex flex-col items-center rounded-2xl p-4">
              <span className="mb-1.5 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}80` }} />
              <span className="text-[13px] font-semibold tracking-[-0.015em]" style={{ color }}>{label}</span>
              <span className="app-text-eyebrow">Aura</span>
            </div>
          );
        })()}
      </Reveal>

      <div className="space-y-6">
        <Reveal>
          <section>
            <h3 className="app-text-eyebrow mb-4 ml-2">Ajustes de Cuenta</h3>
            <div className="app-group">
              <div className="app-list-row">
                <div className="flex items-center gap-4">
                  <div className={`app-list-icon ${notifsEnabled ? 'bg-emerald-500/10 text-emerald-300' : 'text-white/50'}`}>
                    {isSyncing ? <Loader2 size={17} className="animate-spin" /> : (notifsEnabled ? <Bell size={17} strokeWidth={1.8} /> : <BellOff size={17} strokeWidth={1.8} />)}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block">Recordatorios</span>
                    <span className="app-text-eyebrow">
                      {isSyncing ? 'Guardando...' : (notifsEnabled ? 'Activos' : 'Inactivos')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifsEnabled}
                  aria-label="Activar recordatorios"
                  onClick={isSyncing ? undefined : handleToggleNotifs}
                  className="switch"
                  data-on={notifsEnabled}
                  data-disabled={isSyncing}
                />
              </div>
              <button onClick={() => { haptic('select'); onEditProfile?.(); }} className="app-list-row">
                <div className="flex items-center gap-4">
                  <div className="app-list-icon bg-blue-500/10 text-blue-300">
                    <ShieldCheck size={17} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium">Información Personal</span>
                </div>
                <ChevronRight size={16} className="apple-chevron" strokeWidth={1.8} />
              </button>
              <button onClick={() => { haptic('select'); onSupport?.(); }} className="app-list-row">
                <div className="flex items-center gap-4">
                  <div className="app-list-icon bg-purple-500/10 text-purple-300">
                    <AlertTriangle size={17} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium">Ayuda y Soporte</span>
                </div>
                <ChevronRight size={16} className="apple-chevron" strokeWidth={1.8} />
              </button>
              {onAdmin && (
                <button onClick={() => { haptic('select'); onAdmin(); }} className="app-list-row app-list-row-danger">
                  <div className="flex items-center gap-4">
                    <div className="app-list-icon bg-red-500/10 text-red-300">
                      <ShieldCheck size={17} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-medium">Panel Admin</span>
                  </div>
                  <ChevronRight size={16} className="text-red-400/60" strokeWidth={1.8} />
                </button>
              )}
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section>
            <h3 className="app-text-eyebrow mb-4 ml-2">Legal y Transparencia</h3>
            <div className="app-group">
              <button onClick={() => { haptic('select'); onLegal?.('privacy'); }} className="app-list-row">
                <div className="flex items-center gap-4">
                  <div className="app-list-icon bg-purple-500/10 text-purple-300">
                    <ShieldCheck size={17} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium">Política de Privacidad</span>
                </div>
                <ChevronRight size={16} className="apple-chevron" strokeWidth={1.8} />
              </button>
              <button onClick={() => { haptic('select'); onLegal?.('terms'); }} className="app-list-row">
                <div className="flex items-center gap-4">
                  <div className="app-list-icon bg-blue-500/10 text-blue-300">
                    <FileText size={17} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium">Términos y Condiciones</span>
                </div>
                <ChevronRight size={16} className="apple-chevron" strokeWidth={1.8} />
              </button>
              <div className="app-list-row">
                <div className="flex items-center gap-4 opacity-55">
                  <div className="app-list-icon text-white/45">
                    <Zap size={17} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium">Versión</span>
                </div>
                <span className="app-text-eyebrow">{appVersion}</span>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.1}>
          <button
            type="button"
            onClick={onLogout}
            className="app-button app-button-secondary w-full py-4 text-sm"
          >
            <LogOut size={16} strokeWidth={1.8} /> Cerrar sesión
          </button>
        </Reveal>

        <Reveal delay={0.12}>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="app-button app-button-danger mt-4 w-full py-4 text-sm"
          >
            <Trash2 size={16} strokeWidth={1.8} /> Eliminar cuenta definitivamente
          </button>
        </Reveal>
      </div>

      <ModalShell open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} ariaLabel="Eliminar cuenta" zClass="z-[300]">
        <div className="app-sheet max-w-xs border-red-500/20 p-8 text-center">
          <AlertTriangle size={28} className="mx-auto text-red-400" strokeWidth={1.8} />
          <h4 id="delete-account-title" className="mt-5 text-lg font-semibold tracking-[-0.02em]">¿Eliminar cuenta?</h4>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={handleDeleteAccount} className="app-button app-button-danger w-full" disabled={isDeleting}>
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Sí, borrar todo'}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="app-button app-button-secondary w-full">Cancelar</button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default AccountView;
