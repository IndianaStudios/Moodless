
import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { Timestamp } from 'firebase/firestore';
import {
    ChevronLeft,
    Search,
    Filter,
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
    Rocket
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
    
    // Changelog state
    const [changelogVersion, setChangelogVersion] = useState('');
    const [changelogTitle, setChangelogTitle] = useState('');
    const [changelogContent, setChangelogContent] = useState('');
    const [sendingChangelog, setSendingChangelog] = useState(false);
    const [changelogSuccess, setChangelogSuccess] = useState(false);
    const [changelogError, setChangelogError] = useState('');

    useEffect(() => {
        fetchTickets();
    }, []);

    // Reset reply state when selecting a new ticket
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
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error fetching tickets');
            }

            const fetchedTickets = await response.json();
            setTickets(fetchedTickets);
        } catch (error: any) {
            console.error("Error fetching tickets:", error);
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
            // 1. Actualizar estado en Firestore mediante API segura
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
                const errorData = await updateResponse.json();
                throw new Error(errorData.error || 'Error actualizando ticket');
            }

            // 2. Enviar email al usuario
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

            // 3. Actualizar UI
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
            }
            setReplySuccess(true);
            setReplyMessage('');
        } catch (error) {
            console.error("Error updating status:", error);
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error publicando changelog');
            }

            setChangelogSuccess(true);
            setChangelogVersion('');
            setChangelogTitle('');
            setChangelogContent('');
        } catch (error: any) {
            console.error("Error sending changelog:", error);
            setChangelogError(error.message || 'No se pudo publicar la actualización.');
        } finally {
            setSendingChangelog(false);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'bug': return <Bug size={14} className="text-red-400" />;
            case 'suggestion': return <Lightbulb size={14} className="text-yellow-400" />;
            case 'help': return <HelpCircle size={14} className="text-blue-400" />;
            default: return <MessageSquare size={14} className="text-purple-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const filteredTickets = tickets.filter(t => {
        if (filter === 'all') return true;
        return t.status === filter;
    });

    return (
        <div className="flex flex-col h-full bg-slate-950 absolute inset-0 z-50 overflow-hidden">
            {/* Header */}
            <header className="px-6 pt-6 pb-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 flex items-center gap-4 sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="w-full">
                    <h2 className="text-xl font-black text-white">Admin Dashboard</h2>
                    <div className="bg-slate-900/80 p-1 rounded-2xl flex gap-1 mt-3 w-full">
                        <button 
                            onClick={() => setActiveSubTab('tickets')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${activeSubTab === 'tickets' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Soporte
                        </button>
                        <button 
                            onClick={() => setActiveSubTab('changelog')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${activeSubTab === 'changelog' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Changelog
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden flex flex-col">
                    {activeSubTab === 'tickets' ? (
                        <>
                            {/* Filters */}
                            <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'new', label: 'Nuevos' },
                                    { id: 'resolved', label: 'Resueltos' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFilter(f.id as any)}
                                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filter === f.id
                                            ? 'bg-purple-500 text-white border-purple-500'
                                            : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Ticket List Area */}
                            <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-20">
                                {loading ? (
                                    <div className="text-center py-10 text-slate-500 text-xs">Cargando tickets...</div>
                                ) : filteredTickets.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 text-xs">No hay tickets en esta vista.</div>
                                ) : (
                                    filteredTickets.map(ticket => (
                                        <div
                                            key={ticket.id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="bg-white/5 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-white/10"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${getStatusColor(ticket.status)}`}>
                                                        {ticket.status}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                                                        {getCategoryIcon(ticket.category)}
                                                        <span className="capitalize">{ticket.category}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-slate-600 font-mono">
                                                    {typeof ticket.createdAt === 'string' 
                                                        ? new Date(ticket.createdAt).toLocaleDateString()
                                                        : ticket.createdAt?.toDate().toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-3">
                                                {ticket.message}
                                            </p>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs border-t border-white/5 pt-3">
                                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">
                                                    {ticket.userName.charAt(0)}
                                                </div>
                                                <span className="truncate">{ticket.userEmail}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        /* Changelog Form */
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-[2rem] p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-500/20 rounded-xl">
                                        <Rocket size={20} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white">Publicar Novedades</h3>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Changelog & Push</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    Publica un nuevo changelog. Se guardará en la base de datos para mostrarse a los usuarios en la app, y se enviará una notificación Push a todos los usuarios con la app instalada.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="space-y-2 w-1/3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Versión</label>
                                        <input 
                                            type="text"
                                            value={changelogVersion}
                                            onChange={(e) => setChangelogVersion(e.target.value)}
                                            placeholder="v1.2.0"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2 w-2/3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título corto</label>
                                        <input 
                                            type="text"
                                            value={changelogTitle}
                                            onChange={(e) => setChangelogTitle(e.target.value)}
                                            placeholder="¡Nuevos minijuegos!"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Novedades (Texto simple)</label>
                                    <textarea 
                                        value={changelogContent}
                                        onChange={(e) => setChangelogContent(e.target.value)}
                                        placeholder="Escribe las novedades de esta versión..."
                                        className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                                    />
                                </div>

                                {changelogError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
                                        <AlertCircle size={18} className="text-red-400 shrink-0" />
                                        <p className="text-red-400 text-xs font-medium">{changelogError}</p>
                                    </div>
                                )}

                                {changelogSuccess && (
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
                                        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                                        <p className="text-green-400 text-xs font-medium">Changelog publicado y notificaciones enviadas correctamente.</p>
                                    </div>
                                )}

                                <button 
                                    onClick={handleSendChangelog}
                                    disabled={sendingChangelog}
                                    className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {sendingChangelog ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    {sendingChangelog ? 'Publicando...' : 'Publicar y Notificar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-slate-950">
                        <button
                            onClick={() => setSelectedTicket(null)}
                            className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Detalle del Ticket</span>
                        <div className="w-10" />
                    </header>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex gap-2 mb-6">
                            <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getStatusColor(selectedTicket.status)}`}>
                                {selectedTicket.status}
                            </div>
                            <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                {getCategoryIcon(selectedTicket.category)}
                                {selectedTicket.category}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Mensaje</h3>
                            <div className="text-base text-white leading-relaxed whitespace-pre-wrap font-medium">
                                {selectedTicket.message}
                            </div>
                        </div>

                        <div className="mb-8 pb-8 border-b border-white/10">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Usuario</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                    {selectedTicket.userName.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-white font-bold">{selectedTicket.userName}</div>
                                    <div className="text-slate-400 text-xs flex items-center gap-1">
                                        <Mail size={12} />
                                        {selectedTicket.userEmail}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reply Section */}
                        {selectedTicket.status !== 'resolved' && (
                            <div className="mb-8 pb-8 border-b border-white/10">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                    Responder al Usuario
                                </h3>
                                <textarea
                                    value={replyMessage}
                                    onChange={(e) => { setReplyMessage(e.target.value); setReplyError(''); setReplySuccess(false); }}
                                    placeholder="Escribe tu respuesta para el usuario..."
                                    disabled={sendingReply}
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium resize-none placeholder:text-slate-600 disabled:opacity-50"
                                />

                                {replyError && (
                                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                                        <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-red-400 text-xs font-medium">{replyError}</p>
                                    </div>
                                )}

                                {replySuccess && (
                                    <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2 animate-in fade-in duration-300">
                                        <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                                        <p className="text-green-400 text-xs font-medium">Mensaje enviado al usuario correctamente.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Acciones</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedTicket.status !== 'resolved' && (
                                    <button
                                        onClick={() => updateStatusAndReply(selectedTicket.id, 'resolved')}
                                        disabled={sendingReply}
                                        className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 font-bold text-xs flex flex-col items-center gap-2 hover:bg-green-500/20 transition-all disabled:opacity-50"
                                    >
                                        {sendingReply ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                        Marcar Resuelto
                                    </button>
                                )}
                                {selectedTicket.status === 'new' && (
                                    <button
                                        onClick={() => updateStatusAndReply(selectedTicket.id, 'in_progress')}
                                        disabled={sendingReply}
                                        className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 font-bold text-xs flex flex-col items-center gap-2 hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                                    >
                                        {sendingReply ? <Loader2 size={20} className="animate-spin" /> : <Clock size={20} />}
                                        En Progreso
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
