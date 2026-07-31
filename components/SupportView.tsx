import React, { useState, useEffect } from 'react';
import { User } from '../services/authService';
import { db, auth } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import {
  ChevronLeft,
  Send,
  Loader2,
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { haptic } from '../constants';
import { useToast } from './ToastProvider';
import EmptyState from './EmptyState';

interface SupportViewProps {
  user: User;
  onBack: () => void;
}

type SupportCategory = 'bug' | 'suggestion' | 'help' | 'other';

const SupportView: React.FC<SupportViewProps> = ({ user, onBack }) => {
  const [category, setCategory] = useState<SupportCategory>('bug');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'form' | 'list'>('form');
  const [tickets, setTickets] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (viewMode === 'list') {
      const q = query(collection(db, 'support_tickets'), where('userId', '==', user.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedTickets.sort((a: any, b: any) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setTickets(fetchedTickets);
      });
      return () => unsubscribe();
    }
  }, [viewMode, user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError('Por favor, cuéntanos un poco más (mínimo 10 caracteres).');
      haptic('error');
      return;
    }

    setLoading(true);
    setError('');

try {
        const docRef = await addDoc(collection(db, 'support_tickets'), {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          category,
          message: message.trim(),
          createdAt: serverTimestamp(),
          status: 'new',
        });

        let emailSent = false;
        let emailError: string | null = null;
        try {
          const token = await auth.currentUser?.getIdToken();
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              category,
              message: message.trim(),
              userEmail: user.email,
              userName: user.name,
              ticketId: docRef.id,
            }),
          });
          if (res.ok) {
            emailSent = true;
          } else {
            const errBody = await res.json().catch(() => ({}));
            emailError = errBody?.error || `HTTP ${res.status}`;
            console.warn('[SupportView] send-email failed:', emailError);
          }
        } catch (emailError: any) {
          console.error('[SupportView] Email notification threw:', emailError);
          emailError = emailError?.message || 'Network error';
        }

        setSuccess(true);
        haptic('success');
        toast.success('Mensaje enviado. ¡Gracias por ayudar a mejorar Moodless!');
        if (!emailSent) {
          console.warn(`[SupportView] Ticket ${docRef.id} guardado en Firestore pero el email falló: ${emailError}`);
        }
      } catch (err: any) {
        console.error('Error sending support ticket', err);
        haptic('error');
        toast.error('No se pudo enviar el mensaje');
        setError(`No se pudo guardar el ticket: ${err.message || 'Error desconocido'}. Revisa tu conexión.`);
      } finally {
        setLoading(false);
      }
    };

  if (success) {
    return (
      <div className="px-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <CheckCircle2 size={40} className="text-emerald-400" strokeWidth={1.8} />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-white tracking-[-0.025em]">¡Mensaje Recibido!</h2>
        <p className="text-white/55 text-sm mb-10 px-6">
          Gracias por ayudarnos a mejorar Moodless. Revisaremos tu {category === 'suggestion' ? 'sugerencia' : 'reporte'} lo antes posible.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[220px]">
          <button
            onClick={() => { setSuccess(false); setViewMode('list'); setMessage(''); }}
            className="app-button app-button-primary w-full"
          >
            Ver mis tickets
          </button>
          <button
            onClick={onBack}
            className="app-button app-button-secondary w-full"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-16 pb-40 flex-1 flex flex-col">
      <header className="flex items-center gap-4 mb-7">
        <button
          type="button"
          onClick={() => { haptic('tap'); onBack(); }}
          className="app-icon-button"
          aria-label="Volver al perfil"
        >
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-white tracking-[-0.025em]">Ayuda y Soporte</h2>
          <p className="app-text-meta">Historial y Contacto</p>
        </div>
      </header>

      <div className="apple-tabs mb-7 w-full">
        <button
          onClick={() => { haptic('select'); setViewMode('form'); }}
          className="apple-tab"
          data-active={viewMode === 'form'}
        >
          Nuevo mensaje
        </button>
        <button
          onClick={() => { haptic('select'); setViewMode('list'); }}
          className="apple-tab"
          data-active={viewMode === 'list'}
        >
          Mis tickets
        </button>
      </div>

      {viewMode === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-7">
          <section className="space-y-4">
            <label className="app-text-eyebrow ml-1">Categoría</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'bug', label: 'Bug/Error', icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10' },
                { id: 'suggestion', label: 'Sugerencia', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                { id: 'help', label: 'Duda/Ayuda', icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { id: 'other', label: 'Otro', icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { haptic('select'); setCategory(item.id as SupportCategory); }}
                    className={`app-surface flex flex-col items-center gap-2 rounded-[1.5rem] p-4 transition-all ${isActive ? 'border-white/20 bg-white/[0.08]' : 'opacity-60 hover:opacity-90'}`}
                  >
                    <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                      <Icon size={17} strokeWidth={1.8} />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <label className="app-text-eyebrow ml-1">Tu mensaje</label>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos con detalle..."
                className="app-input h-40 resize-none p-5 text-sm font-medium pl-5"
              />
            </div>
          </section>

          {error && (
            <div className="app-surface border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-400 shrink-0" strokeWidth={1.8} />
              <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="app-button app-button-primary w-full py-4 text-sm"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} strokeWidth={2} />}
            Enviar mensaje
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <EmptyState
              icon={<MessageSquare />}
              title="No tienes tickets aún"
              description="Cuando contactes con nosotros, tus mensajes aparecerán aquí para que sigas su estado."
              size="sm"
            />
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="app-surface rounded-[1.5rem] p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-300' :
                    ticket.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-blue-500/10 text-blue-300'
                    }`}>
                    {ticket.status === 'new' ? 'Recibido' : ticket.status === 'in_progress' ? 'Revisando' : 'Resuelto'}
                  </div>
                  <span className="text-[10px] text-white/40 font-mono">
                    {ticket.createdAt?.toDate().toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-white/80 line-clamp-2">{ticket.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      <footer className="mt-12 text-center px-4">
        {viewMode === 'form' && (
          <p className="app-text-meta leading-relaxed">
            Tu mensaje será procesado por nuestro equipo de desarrollo. Responderemos a tu correo <span className="text-white/70 italic">{user.email}</span> si es necesario.
          </p>
        )}
      </footer>
    </div>
  );
};

export default SupportView;
