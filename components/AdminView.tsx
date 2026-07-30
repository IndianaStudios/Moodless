
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, auth } from '../services/firebase';
import { Timestamp } from 'firebase/firestore';
import EmptyState from './EmptyState';
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Mail,
  Loader2,
  Send,
  Rocket,
  Calendar,
} from 'lucide-react';

interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: 'bug' | 'suggestion' | 'help' | 'other';
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  createdAt: string | Timestamp;
}

interface AdminViewProps {
  onBack: () => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0).toUpperCase()).join('');
};

const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError] = useState('');

  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'changelog'>('tickets');

  const [changelogVersion, setChangelogVersion] = useState('');
  const [changelogTitle, setChangelogTitle] = useState('');
  const [changelogContent, setChangelogContent] = useState('');
  const [sendingChangelog, setSendingChangelog] = useState(false);
  const [changelogSuccess, setChangelogSuccess] = useState(false);
  const [changelogError, setChangelogError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    setReplyMessage('');
    setReplySuccess(false);
    setReplyError('');
  }, [selectedTicket?.id]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/get-support-tickets', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        let errorMsg = `Error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          const rawText = await response.text().catch(() => '');
          errorMsg = rawText ? `Servidor (${response.status}): ${rawText.slice(0, 100)}` : `Error de servidor (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      const fetchedTickets = await response.json();
      setTickets(fetchedTickets);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatusAndReply = async (ticketId: string, newStatus: Ticket['status']) => {
    if (!replyMessage.trim()) {
      setReplyError('Escribe un mensaje para el usuario antes de cambiar el estado.');
      return;
    }

    setSendingReply(true);
    setReplyError('');

    try {
      const token = await auth.currentUser?.getIdToken();
      const updateResponse = await fetch('/api/update-ticket-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ticketId,
          status: newStatus,
          adminReply: replyMessage.trim(),
        }),
      });

      if (!updateResponse.ok) {
        let errorMsg = 'Error actualizando ticket';
        try {
          const errorData = await updateResponse.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const ticket = tickets.find(t => t.id === ticketId) || selectedTicket;
      if (ticket?.userEmail) {
        try {
          const token = await auth.currentUser?.getIdToken();
          await fetch('/api/send-reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userEmail: ticket.userEmail,
              userName: ticket.userName,
              ticketId,
              status: newStatus,
              adminMessage: replyMessage.trim(),
              originalMessage: ticket.message,
            }),
          });
        } catch (emailErr) {
          console.error('Email failed but status was updated:', emailErr);
        }
      }

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
      setReplySuccess(true);
      setReplyMessage('');
    } catch (error) {
      console.error('Error updating status:', error);
      setReplyError('No se pudo actualizar el ticket. Inténtalo de nuevo.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendChangelog = async () => {
    if (!changelogVersion.trim() || !changelogTitle.trim() || !changelogContent.trim()) {
      setChangelogError('Todos los campos son obligatorios.');
      return;
    }

    if (!window.confirm('¿Estás seguro de publicar esta actualización y enviar notificación Push a todos los usuarios?')) {
      return;
    }

    setSendingChangelog(true);
    setChangelogError('');
    setChangelogSuccess(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/send-changelog-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          version: changelogVersion.trim(),
          title: changelogTitle.trim(),
          content: changelogContent.trim(),
        }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        const text = await response.text().catch(() => '');
        throw new Error(text ? `Error servidor (${response.status}): ${text.slice(0, 100)}` : `Error publicando changelog (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error publicando changelog');
      }

      setChangelogSuccess(true);
      setChangelogVersion('');
      setChangelogTitle('');
      setChangelogContent('');
    } catch (error: any) {
      console.error('Error sending changelog:', error);
      setChangelogError(error.message || 'No se pudo publicar la actualización.');
    } finally {
      setSendingChangelog(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return <Bug size={13} className="text-red-300" strokeWidth={1.8} />;
      case 'suggestion': return <Lightbulb size={13} className="text-yellow-300" strokeWidth={1.8} />;
      case 'help': return <HelpCircle size={13} className="text-blue-300" strokeWidth={1.8} />;
      default: return <MessageSquare size={13} className="text-purple-300" strokeWidth={1.8} />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/[0.12] text-blue-300 border-blue-500/25';
      case 'in_progress': return 'bg-yellow-500/[0.12] text-yellow-300 border-yellow-500/25';
      case 'resolved': return 'bg-emerald-500/[0.12] text-emerald-300 border-emerald-500/25';
      default: return 'bg-white/[0.04] text-white/55 border-white/15';
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] absolute inset-0 z-50 overflow-hidden">
      <header className="px-6 pt-5 pb-4 bg-[var(--app-bg)]/80 apple-vibrancy border-b border-white/[0.06] flex items-center gap-4 sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="app-icon-button"
          aria-label="Volver"
        >
          <ChevronLeft size={20} strokeWidth={1.8} />
        </button>
        <div className="w-full">
          <h2 className="text-xl font-semibold text-white tracking-[-0.02em]">Admin Dashboard</h2>
          <div className="apple-tabs mt-3 w-full">
            <button
              onClick={() => setActiveSubTab('tickets')}
              className="apple-tab"
              data-active={activeSubTab === 'tickets'}
            >
              Soporte
            </button>
            <button
              onClick={() => setActiveSubTab('changelog')}
              className="apple-tab"
              data-active={activeSubTab === 'changelog'}
            >
              Changelog
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeSubTab === 'tickets' ? (
            <>
              <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'new', label: 'Nuevos' },
                  { id: 'resolved', label: 'Resueltos' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all border ${filter === f.id
                      ? 'bg-purple-500/80 text-white border-purple-500/80'
                      : 'bg-white/[0.04] text-white/55 border-white/[0.06] hover:bg-white/[0.08]'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-20">
                {loading ? (
                  <div className="space-y-3 py-2" aria-busy="true" aria-label="Cargando tickets">
                    <div className="app-skeleton h-20 rounded-2xl" />
                    <div className="app-skeleton h-20 rounded-2xl" />
                    <div className="app-skeleton h-20 rounded-2xl" />
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare />}
                    title="No hay tickets en esta vista"
                    description="Los mensajes de soporte aparecerán aquí cuando los usuarios los envíen."
                    size="sm"
                  />
                ) : (
                  filteredTickets.map(ticket => (
                    <motion.button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicket(ticket)}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="app-surface-raised block w-full rounded-2xl p-4 text-left"
                      aria-label={`Ticket de ${ticket.userName}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${getStatusStyle(ticket.status)}`}>
                            {ticket.status}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] text-white/55 text-[10px] font-semibold uppercase tracking-wider">
                            {getCategoryIcon(ticket.category)}
                            <span className="capitalize">{ticket.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-white/45 font-mono">
                          <Calendar size={10} strokeWidth={1.8} />
                          {typeof ticket.createdAt === 'string'
                            ? new Date(ticket.createdAt).toLocaleDateString()
                            : ticket.createdAt?.toDate().toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm text-white/80 font-medium line-clamp-2 mb-3 leading-snug">
                        {ticket.message}
                      </p>
                      <div className="flex items-center gap-3 border-t border-white/[0.05] pt-3">
                        <div className="apple-avatar w-9 h-9 text-sm">
                          {getInitials(ticket.userName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate tracking-[-0.01em]">{ticket.userName}</p>
                          <p className="text-[11px] text-white/45 truncate">{ticket.userEmail}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="app-surface border-blue-500/20 rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/[0.14] rounded-xl">
                    <Rocket size={18} className="text-blue-300" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">Publicar Novedades</h3>
                    <p className="app-text-meta">Changelog y Push</p>
                  </div>
                </div>
                <p className="text-xs text-white/55 leading-relaxed mb-4">
                  Publica un nuevo changelog. Se guardará en la base de datos para mostrarse a los usuarios en la app, y se enviará una notificación Push a todos los usuarios con la app instalada.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="space-y-2 w-1/3">
                    <label className="app-text-eyebrow ml-1">Versión</label>
                    <input
                      type="text"
                      value={changelogVersion}
                      onChange={(e) => setChangelogVersion(e.target.value)}
                      placeholder="v1.2.0"
                      className="app-input px-4 py-3 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-2 w-2/3">
                    <label className="app-text-eyebrow ml-1">Título corto</label>
                    <input
                      type="text"
                      value={changelogTitle}
                      onChange={(e) => setChangelogTitle(e.target.value)}
                      placeholder="¡Nuevos minijuegos!"
                      className="app-input px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="app-text-eyebrow ml-1">Novedades</label>
                  <textarea
                    value={changelogContent}
                    onChange={(e) => setChangelogContent(e.target.value)}
                    placeholder="Escribe las novedades de esta versión..."
                    className="app-input h-64 p-4 text-sm leading-relaxed resize-none"
                  />
                </div>

                {changelogError && (
                  <div className="app-surface border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle size={17} className="text-red-400 shrink-0" strokeWidth={1.8} />
                    <p className="text-red-400 text-xs font-medium">{changelogError}</p>
                  </div>
                )}

                {changelogSuccess && (
                  <div className="app-surface border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 size={17} className="text-emerald-400 shrink-0" strokeWidth={1.8} />
                    <p className="text-emerald-400 text-xs font-medium">Changelog publicado y notificaciones enviadas correctamente.</p>
                  </div>
                )}

                <button
                  onClick={handleSendChangelog}
                  disabled={sendingChangelog}
                  className="app-button app-button-primary w-full py-4 text-sm disabled:opacity-50"
                >
                  {sendingChangelog ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} strokeWidth={2} />
                  )}
                  {sendingChangelog ? 'Publicando…' : 'Publicar y notificar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTicket && (
        <div className="absolute inset-0 z-50 bg-[var(--app-bg)] flex flex-col">
          <header className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-[var(--app-bg)]">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="app-icon-button"
              aria-label="Cerrar detalle"
            >
              <ChevronLeft size={20} strokeWidth={1.8} />
            </button>
            <span className="app-text-eyebrow">Detalle del ticket</span>
            <div className="w-10" />
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex gap-2 mb-6">
              <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold uppercase tracking-wider ${getStatusStyle(selectedTicket.status)}`}>
                {selectedTicket.status}
              </div>
              <div className="app-surface border-white/10 text-white/65 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2">
                {getCategoryIcon(selectedTicket.category)}
                {selectedTicket.category}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="app-text-eyebrow mb-2">Mensaje</h3>
              <div className="text-base text-white leading-relaxed whitespace-pre-wrap font-medium">
                {selectedTicket.message}
              </div>
            </div>

            <div className="mb-8 pb-8 border-b border-white/[0.08]">
              <h3 className="app-text-eyebrow mb-3">Usuario</h3>
              <div className="flex items-center gap-3">
                <div className="apple-avatar w-10 h-10 text-base">
                  {getInitials(selectedTicket.userName)}
                </div>
                <div>
                  <div className="text-white font-semibold">{selectedTicket.userName}</div>
                  <div className="text-white/55 text-xs flex items-center gap-1.5">
                    <Mail size={12} strokeWidth={1.8} />
                    {selectedTicket.userEmail}
                  </div>
                </div>
              </div>
            </div>

            {selectedTicket.status !== 'resolved' && (
              <div className="mb-8 pb-8 border-b border-white/[0.08]">
                <h3 className="app-text-eyebrow mb-3">
                  Responder al usuario
                </h3>
                <textarea
                  value={replyMessage}
                  onChange={(e) => { setReplyMessage(e.target.value); setReplyError(''); setReplySuccess(false); }}
                  placeholder="Escribe tu respuesta para el usuario..."
                  disabled={sendingReply}
                  className="app-input h-32 p-4 text-sm font-medium resize-none placeholder:text-white/45 disabled:opacity-50"
                />

                {replyError && (
                  <div className="mt-3 app-surface border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" strokeWidth={1.8} />
                    <p className="text-red-400 text-xs font-medium">{replyError}</p>
                  </div>
                )}

                {replySuccess && (
                  <div className="mt-3 app-surface border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" strokeWidth={1.8} />
                    <p className="text-emerald-400 text-xs font-medium">Mensaje enviado al usuario correctamente.</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="app-text-eyebrow mb-3">Acciones</h3>
              <div className="grid grid-cols-2 gap-3">
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatusAndReply(selectedTicket.id, 'resolved')}
                    disabled={sendingReply}
                    className="p-4 app-surface border-emerald-500/25 text-emerald-300 font-semibold text-xs flex flex-col items-center gap-2 disabled:opacity-50"
                  >
                    {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} strokeWidth={1.8} />}
                    Marcar resuelto
                  </button>
                )}
                {selectedTicket.status === 'new' && (
                  <button
                    onClick={() => updateStatusAndReply(selectedTicket.id, 'in_progress')}
                    disabled={sendingReply}
                    className="p-4 app-surface border-yellow-500/25 text-yellow-300 font-semibold text-xs flex flex-col items-center gap-2 disabled:opacity-50"
                  >
                    {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <Clock size={18} strokeWidth={1.8} />}
                    En progreso
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
;
