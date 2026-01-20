
import React, { useState, useEffect } from 'react';
import { User } from '../services/authService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import {
  ChevronLeft,
  Send,
  Loader2,
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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

  useEffect(() => {
    if (viewMode === 'list') {
      const q = query(collection(db, 'support_tickets'), where('userId', '==', user.id), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [viewMode, user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError('Por favor, cuéntanos un poco más (mínimo 10 caracteres).');
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
        status: 'new'
      });

      // Enviar notificación por email al admin
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            message: message.trim(),
            userEmail: user.email,
            userName: user.name,
            ticketId: docRef.id
          })
        });
      } catch (emailError) {
        // Si falla el email, no bloqueamos al usuario (el ticket ya está guardado)
        console.error('Email notification failed:', emailError);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Error sending support ticket", err);
      // Mostrar el mensaje real de error para depuración
      setError(`Error: ${err.message || 'Hubo un error al enviar tu mensaje.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="px-6 flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-[2.5rem] bg-green-500/10 flex items-center justify-center mb-6 shadow-2xl">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black mb-2 text-white">¡Mensaje Recibido!</h2>
        <p className="text-slate-400 text-sm mb-10 px-6">
          Gracias por ayudarnos a mejorar Moodless. Revisaremos tu {category === 'suggestion' ? 'sugerencia' : 'reporte'} lo antes posible.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[200px]">
          <button
            onClick={() => { setSuccess(false); setViewMode('list'); setMessage(''); }}
            className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Ver Mis Tickets
          </button>
          <button
            onClick={onBack}
            className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-20 pb-40 flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-white">Ayuda & Soporte</h2>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Historial y Contacto</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
        <button
          onClick={() => setViewMode('form')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'form' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
        >
          Nuevo Mensaje
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
        >
          Mis Tickets
        </button>
      </div>

      {viewMode === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'bug', label: 'Bug/Error', icon: Bug, color: 'text-red-400', bg: 'bg-red-400/10' },
                { id: 'suggestion', label: 'Sugerencia', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                { id: 'help', label: 'Duda/Ayuda', icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { id: 'other', label: 'Otro', icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as SupportCategory)}
                    className={`p-4 rounded-[1.5rem] border transition-all flex flex-col items-center gap-2 ${isActive
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/5 border-white/5 opacity-50'
                      }`}
                  >
                    <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tu Mensaje</label>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos con detalle..."
                className="w-full h-40 bg-white/5 border border-white/10 rounded-[1.5rem] p-5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium resize-none placeholder:text-slate-600"
              />
            </div>
          </section>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-shake">
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-white text-slate-950 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
            ENVIAR MENSAJE
          </button>
        </form>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {tickets.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold">No tienes tickets aún</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="p-5 rounded-[1.5rem] bg-white/5 border border-white/5">
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${ticket.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                    ticket.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                    {ticket.status === 'new' ? 'Recibido' : ticket.status === 'in_progress' ? 'Revisando' : 'Resuelto'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {ticket.createdAt?.toDate().toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-300 line-clamp-2">{ticket.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      <footer className="mt-12 text-center px-4">
        {viewMode === 'form' && (
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black leading-relaxed">
            Tu mensaje será procesado por nuestro equipo de desarrollo. Responderemos a tu correo <span className="text-slate-400 italic">{user.email}</span> si es necesario.
          </p>
        )}
      </footer>
    </div>
  );
};

export default SupportView;
