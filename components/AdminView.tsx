
import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
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
    MoreVertical,
    Mail,
    Send,
    Loader2
} from 'lucide-react';

interface Ticket {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    category: 'bug' | 'suggestion' | 'help' | 'other';
    message: string;
    status: 'new' | 'in_progress' | 'resolved';
    createdAt: Timestamp;
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

    // Newsletter states
    const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'newsletter'>('tickets');
    const [newsletterSubject, setNewsletterSubject] = useState('');
    const [newsletterContent, setNewsletterContent] = useState('');
    const [sendingNewsletter, setSendingNewsletter] = useState(false);
    const [newsletterSuccess, setNewsletterSuccess] = useState(false);
    const [newsletterError, setNewsletterError] = useState('');

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
            const q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const fetchedTickets: Ticket[] = [];
            querySnapshot.forEach((doc) => {
                fetchedTickets.push({ id: doc.id, ...doc.data() } as Ticket);
            });
            setTickets(fetchedTickets);
        } catch (error) {
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
            // 1. Actualizar estado en Firestore
            await updateDoc(doc(db, 'support_tickets', ticketId), {
                status: newStatus,
                adminReply: replyMessage.trim(),
            });

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

    const handleSendNewsletter = async () => {
        if (!newsletterSubject.trim() || !newsletterContent.trim()) {
            setNewsletterError('El asunto y el contenido son obligatorios.');
            return;
        }

        if (!window.confirm('¿Estás seguro de que quieres enviar esta newsletter a TODOS los usuarios registrados?')) {
            return;
        }

        setSendingNewsletter(true);
        setNewsletterError('');
        setNewsletterSuccess(false);

        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch('/api/send-newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    subject: newsletterSubject.trim(),
                    content: newsletterContent.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error enviando newsletter');
            }

            setNewsletterSuccess(true);
            setNewsletterSubject('');
            setNewsletterContent('');
        } catch (error: any) {
            console.error("Error sending newsletter:", error);
            setNewsletterError(error.message || 'No se pudo enviar la newsletter.');
        } finally {
            setSendingNewsletter(false);
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
                            onClick={() => setActiveSubTab('newsletter')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${activeSubTab === 'newsletter' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Newsletter
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* List or Newsletter Form */}
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

                            {/* Ticket List */}
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
                                                    {ticket.createdAt?.toDate().toLocaleDateString()}
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
                        /* Newsletter Form */
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-[2rem] p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-purple-500/20 rounded-xl">
                                        <Mail size={20} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white">Enviar Newsletter</h3>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Novedades de Moodless</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Este mensaje se enviará a todos los usuarios registrados en la plataforma. Asegúrate de revisar bien el contenido antes de enviar.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asunto de la Newsletter</label>
                                    <input 
                                        type="text"
                                        value={newsletterSubject}
                                        onChange={(e) => setNewsletterSubject(e.target.value)}
                                        placeholder="Ej: ¡Nuevas funciones de IA disponibles!"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contenido del Mensaje</label>
                                    <textarea 
                                        value={newsletterContent}
                                        onChange={(e) => setNewsletterContent(e.target.value)}
                                        placeholder="Escribe las novedades aquí..."
                                        className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                                    />
                                </div>

                                {newsletterError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
                                        <AlertCircle size={18} className="text-red-400 shrink-0" />
                                        <p className="text-red-400 text-xs font-medium">{newsletterError}</p>
                                    </div>
                                )}

                                {newsletterSuccess && (
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
                                        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                                        <p className="text-green-400 text-xs font-medium">Newsletter enviada con éxito a todos los usuarios.</p>
                                    </div>
                                )}

                                <button 
                                    onClick={handleSendNewsletter}
                                    disabled={sendingNewsletter}
                                    className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {sendingNewsletter ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    {sendingNewsletter ? 'Enviando...' : 'Enviar Newsletter'}
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
                                        <AlertCircle size={14} className="text-red-400 shrink-0" />
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
