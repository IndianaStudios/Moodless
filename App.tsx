
import React, { useState, useEffect } from 'react';
import { Calendar, BarChart2, Plus, User as UserIcon, Compass, Loader2 } from 'lucide-react';
import { MoodEntry } from './types';
import MoodCanvas from './components/MoodCanvas';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';
import ExploreView from './components/ExploreView';
import AuthView from './components/AuthView';
import AccountView from './components/AccountView';
import ProfileEditView from './components/ProfileEditView';
import SupportView from './components/SupportView';
import { authService, User } from './services/authService';
import { generateMoodReport } from './services/geminiService';
import { notificationService } from './services/notificationService';
import AdminView from './components/AdminView';
import { db } from './services/firebase';
import { collection, query, getDocs, setDoc, doc, orderBy } from 'firebase/firestore';

enum Tab {
  LOG = 'LOG',
  HISTORY = 'HISTORY',
  STATS = 'STATS',
  EXPLORE = 'EXPLORE',
  ACCOUNT = 'ACCOUNT',
  PROFILE_EDIT = 'PROFILE_EDIT',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN'
}


const ADMIN_EMAILS = ['indianasainzpalacios@gmail.com']; // REEMPLAZAR CON TU EMAIL REAL

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LOG);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((currentUser) => {
      setUser(currentUser);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        setIsFetchingData(true);
        try {
          // Inicializar FCM para este usuario
          notificationService.initFCM(user.id);
          notificationService.listenForForegroundMessages();

          const entriesRef = collection(db, 'users', user.id, 'entries');
          const q = query(entriesRef, orderBy('date', 'asc'));
          const querySnapshot = await getDocs(q);
          const loadedEntries: MoodEntry[] = [];
          querySnapshot.forEach((doc) => {
            loadedEntries.push(doc.data() as MoodEntry);
          });
          setEntries(loadedEntries);

          const alreadyLoggedToday = loadedEntries.some(e => e.date === new Date().toISOString().split('T')[0]);
          await notificationService.scheduleCheck(user.id, user.name, alreadyLoggedToday);

        } catch (e) {
          console.error("Error fetching Firestore data", e);
        } finally {
          setIsFetchingData(false);
        }
      } else {
        setEntries([]);
      }
    };
    fetchUserData();
  }, [user?.id]);

  const handleSaveMood = async (newMood: Omit<MoodEntry, 'id' | 'date'>) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const newId = crypto.randomUUID();
    const entry: MoodEntry = { ...newMood, id: newId, date: today };
    setEntries(prev => [...prev.filter(e => e.date !== today), entry]);
    setActiveTab(Tab.STATS);
    try {
      await setDoc(doc(db, 'users', user.id, 'entries', newId), entry);
      const report = await generateMoodReport(entry, entries);
      const updatedEntry = { ...entry, report };
      await setDoc(doc(db, 'users', user.id, 'entries', newId), updatedEntry);
      setEntries(prev => prev.map(e => e.id === newId ? updatedEntry : e));
    } catch (err) {
      console.error("Failed to sync", err);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setActiveTab(Tab.LOG);
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="text-white animate-spin" size={40} /></div>;
  if (!user) return <AuthView onAuthSuccess={setUser} />;

  const lastEntry = entries[entries.length - 1];
  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);
  const hideNav = activeTab === Tab.PROFILE_EDIT || activeTab === Tab.SUPPORT || activeTab === Tab.ADMIN;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-white shadow-2xl relative overflow-hidden">
      {!hideNav && activeTab !== Tab.ACCOUNT && (
        <div className="absolute top-4 left-6 right-6 flex justify-between items-center z-50 animate-in fade-in">
          <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full border border-white/10">
            <UserIcon size={12} className="text-purple-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">{user.name}</span>
          </div>
        </div>
      )}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === Tab.LOG && <MoodCanvas onSave={handleSaveMood} alreadyLogged={entries.some(e => e.date === new Date().toISOString().split('T')[0])} />}
        {activeTab === Tab.HISTORY && <HistoryView entries={entries} onNavigateToLog={() => setActiveTab(Tab.LOG)} />}
        {activeTab === Tab.STATS && <StatsView entries={entries} />}
        {activeTab === Tab.EXPLORE && <ExploreView lastEntry={lastEntry} />}
        {activeTab === Tab.ACCOUNT && (
          <AccountView
            user={user}
            entries={entries}
            onLogout={handleLogout}
            onEditProfile={() => setActiveTab(Tab.PROFILE_EDIT)}
            onSupport={() => setActiveTab(Tab.SUPPORT)}
            onAdmin={isAdmin ? () => setActiveTab(Tab.ADMIN) : undefined}
          />
        )}
        {activeTab === Tab.PROFILE_EDIT && <ProfileEditView user={user} onBack={() => setActiveTab(Tab.ACCOUNT)} onUserUpdate={setUser} />}
        {activeTab === Tab.SUPPORT && <SupportView user={user} onBack={() => setActiveTab(Tab.ACCOUNT)} />}
        {activeTab === Tab.ADMIN && isAdmin && <AdminView onBack={() => setActiveTab(Tab.ACCOUNT)} />}
      </main>
      {!hideNav && (
        <nav className="glass absolute bottom-6 left-4 right-4 h-20 rounded-[2.5rem] flex items-center justify-between px-2 z-50 border border-white/10 shadow-2xl">
          <button onClick={() => setActiveTab(Tab.HISTORY)} className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === Tab.HISTORY ? 'text-white' : 'text-slate-500'}`}><Calendar size={20} /><span className="text-[8px] mt-1 font-bold uppercase tracking-widest">Diario</span></button>
          <button onClick={() => setActiveTab(Tab.EXPLORE)} className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === Tab.EXPLORE ? 'text-white' : 'text-slate-500'}`}><Compass size={20} /><span className="text-[8px] mt-1 font-bold uppercase tracking-widest">Explora</span></button>
          <button onClick={() => setActiveTab(Tab.LOG)} className={`flex items-center justify-center w-14 h-14 rounded-full -mt-10 shadow-2xl border-4 border-slate-950 ${activeTab === Tab.LOG ? 'bg-white text-slate-950 scale-110' : 'bg-slate-800 text-white'}`}><Plus size={28} /></button>
          <button onClick={() => setActiveTab(Tab.STATS)} className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === Tab.STATS ? 'text-white' : 'text-slate-500'}`}><BarChart2 size={20} /><span className="text-[8px] mt-1 font-bold uppercase tracking-widest">Estado</span></button>
          <button onClick={() => setActiveTab(Tab.ACCOUNT)} className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === Tab.ACCOUNT ? 'text-white' : 'text-slate-500'}`}><UserIcon size={20} /><span className="text-[8px] mt-1 font-bold uppercase tracking-widest">Perfil</span></button>
        </nav>
      )}
    </div>
  );
};

export default App;
