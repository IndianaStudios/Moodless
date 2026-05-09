import React, { useState, useEffect } from 'react';
import { Calendar, BarChart2, Plus, User as UserIcon, Compass, Loader2, Sparkles, Heart } from 'lucide-react';
import { MoodEntry } from './types';
import MoodCanvas from './components/MoodCanvas';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';
import ExploreView from './components/ExploreView';
import AuthView from './components/AuthView';
import LandingView from './components/LandingView';
import AccountView from './components/AccountView';
import ProfileEditView from './components/ProfileEditView';
import InsightsView from './components/InsightsView';
import SupportView from './components/SupportView';
import MoodBuddyHomeView from './components/MoodBuddyHomeView';
import { authService, User } from './services/authService';
import { generateMoodReport } from './services/geminiService';
import { notificationService } from './services/notificationService';
import AdminView from './components/AdminView';
import InstallPrompt from './components/InstallPrompt';
import ResetPasswordView from './components/ResetPasswordView';
import { db } from './services/firebase';
import { collection, query, getDocs, setDoc, doc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import ChangelogModal from './components/ChangelogModal';
import ContextChat from './components/ContextChat';
import DeepenPromptModal from './components/DeepenPromptModal';
import LegalView from './components/LegalView';

enum Tab {
  LOG = 'LOG',
  HISTORY = 'HISTORY',
  MOODBUDDY = 'MOODBUDDY',
  STATS = 'STATS',
  INSIGHTS = 'INSIGHTS',
  PROFILE = 'PROFILE',
  EXPLORE = 'EXPLORE',
  ACCOUNT = 'ACCOUNT',
  PROFILE_EDIT = 'PROFILE_EDIT',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN'
}

const ADMIN_EMAILS = ['indianasainzpalacios@gmail.com'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LOG);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [resetOobCode, setResetOobCode] = useState<string | null>(null);
  const [latestChangelog, setLatestChangelog] = useState<any | null>(null);
  const [showContextChat, setShowContextChat] = useState(false);
  const [showDeepenPrompt, setShowDeepenPrompt] = useState(false);
  const [contextLogs, setContextLogs] = useState<any[]>([]);
  const [appVersion, setAppVersion] = useState('v2.0.0');
  const [legalViewType, setLegalViewType] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'resetPassword' && oobCode) setResetOobCode(oobCode);
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      if (standalone) setShowAuth(true);
    };
    checkStandalone();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toUpperCase();
      if (Object.values(Tab).includes(hash as Tab)) setActiveTab(hash as Tab);
      else setActiveTab(Tab.LOG);
    };
    window.addEventListener('popstate', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('popstate', handleHashChange);
  }, []);

  const changeTab = (tab: Tab) => {
    if (activeTab === tab) return;
    window.history.pushState(null, '', `#${tab.toLowerCase()}`);
    setActiveTab(tab);
  };

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
          const entriesRef = collection(db, 'users', user.id, 'entries');
          const q = query(entriesRef, orderBy('date', 'asc'));
          const querySnapshot = await getDocs(q);
          const loadedEntries: MoodEntry[] = [];
          querySnapshot.forEach((doc) => { loadedEntries.push(doc.data() as MoodEntry); });
          setEntries(loadedEntries);
        } catch (e) { console.error("Error fetching data", e); }
        finally { setIsFetchingData(false); }
      }
    };
    fetchUserData();
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setContextLogs([]); return; }
    const contextRef = collection(db, 'users', user.id, 'emotional_context_logs');
    const qContext = query(contextRef, orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeContext = onSnapshot(qContext, (snapshot) => {
      const loadedContext: any[] = [];
      snapshot.forEach((doc) => { loadedContext.push({ id: doc.id, ...doc.data() }); });
      setContextLogs(loadedContext);
    });
    return () => unsubscribeContext();
  }, [user?.id]);

  const handleSaveMood = async (newMood: Omit<MoodEntry, 'id' | 'date'>) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const newId = crypto.randomUUID();
    const entry: MoodEntry = { ...newMood, id: newId, date: today };
    setEntries(prev => [...prev.filter(e => e.date !== today), entry]);
    setShowDeepenPrompt(true);
    try {
      await setDoc(doc(db, 'users', user.id, 'entries', newId), entry);
      const latestContext = contextLogs.length > 0 ? contextLogs[0].userInput : '';
      const report = await generateMoodReport(entry, entries, latestContext);
      const updatedEntry = { ...entry, report };
      await setDoc(doc(db, 'users', user.id, 'entries', newId), updatedEntry);
      setEntries(prev => prev.map(e => e.id === newId ? updatedEntry : e));
    } catch (err) { console.error("Failed to sync", err); }
  };

  const handleLogout = async () => {
    await authService.logout();
    changeTab(Tab.LOG);
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="text-white animate-spin" size={40} /></div>;

  if (resetOobCode) {
    return <ResetPasswordView oobCode={resetOobCode} onDone={() => {
      setResetOobCode(null);
      window.history.replaceState({}, '', '/');
      setShowAuth(true);
    }} />;
  }

  if (!user) {
    if (showAuth || isStandalone) return <AuthView onAuthSuccess={setUser} onBack={isStandalone ? undefined : () => setShowAuth(false)} />;
    return <LandingView onStart={() => setShowAuth(true)} />;
  }

  const lastEntry = entries[entries.length - 1];
  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);
  const hideNav = activeTab === Tab.PROFILE_EDIT || activeTab === Tab.SUPPORT || activeTab === Tab.ADMIN;

  return (
    <div className="h-[100dvh] bg-slate-950 text-white flex flex-col selection:bg-purple-500/30 overflow-hidden relative">
      <main className="flex-1 relative overflow-y-auto no-scrollbar scroll-smooth">
        <div className="min-h-full flex flex-col w-full mx-auto">
          {activeTab === Tab.LOG && (
            <MoodCanvas 
              userId={user.id}
              onSave={handleSaveMood} 
              onOpenContextChat={() => setShowContextChat(true)}
              alreadyLogged={entries.some(e => e.date === new Date().toISOString().split('T')[0])} 
            />
          )}
          {activeTab === Tab.HISTORY && (
            <HistoryView entries={entries} onNavigateToLog={() => changeTab(Tab.LOG)} onOpenContextChat={() => setShowContextChat(true)} />
          )}
          {activeTab === Tab.MOODBUDDY && (
            <MoodBuddyHomeView userId={user.id} entries={entries} />
          )}
          {activeTab === Tab.STATS && (
            <StatsView entries={entries} contextLogs={contextLogs} />
          )}
          {activeTab === Tab.INSIGHTS && (
            <InsightsView userId={user.id} />
          )}
          {activeTab === Tab.EXPLORE && (
            <ExploreView lastEntry={lastEntry} />
          )}
          {activeTab === Tab.PROFILE && (
            <AccountView
              user={user}
              entries={entries}
              onLogout={handleLogout}
              onEditProfile={() => changeTab(Tab.PROFILE_EDIT)}
              onSupport={() => changeTab(Tab.SUPPORT)}
              onAdmin={user?.email === ADMIN_EMAILS[0] ? () => changeTab(Tab.ADMIN) : undefined}
              onLegal={(type) => setLegalViewType(type)}
              appVersion={appVersion}
            />
          )}
          {activeTab === Tab.PROFILE_EDIT && (
            <ProfileEditView user={user} onBack={() => changeTab(Tab.PROFILE)} onUserUpdate={setUser} />
          )}
          {activeTab === Tab.SUPPORT && <SupportView user={user} onBack={() => changeTab(Tab.PROFILE)} />}
          {activeTab === Tab.ADMIN && isAdmin && <AdminView onBack={() => changeTab(Tab.PROFILE)} />}
        </div>
      </main>

      {!hideNav && !legalViewType && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
          <nav className="glass w-full max-w-lg h-20 rounded-[2.5rem] flex items-center justify-between px-2 border border-white/10 shadow-2xl backdrop-blur-2xl">
            <div className="flex-1 flex justify-around items-center">
              <button onClick={() => changeTab(Tab.HISTORY)} className={`flex flex-col items-center justify-center transition-all ${activeTab === Tab.HISTORY ? 'text-white' : 'text-slate-500'}`}><Calendar size={18} /><span className="text-[7px] mt-1 font-bold uppercase tracking-widest">Diario</span></button>
              <button onClick={() => changeTab(Tab.MOODBUDDY)} className={`flex flex-col items-center justify-center transition-all ${activeTab === Tab.MOODBUDDY ? 'text-purple-400' : 'text-slate-500'}`}>
                <Heart size={18} fill={activeTab === Tab.MOODBUDDY ? 'currentColor' : 'none'} />
                <span className="text-[7px] mt-1 font-bold uppercase tracking-widest">MoodBuddy</span>
              </button>
              <button onClick={() => changeTab(Tab.EXPLORE)} className={`flex flex-col items-center justify-center transition-all ${activeTab === Tab.EXPLORE ? 'text-white' : 'text-slate-500'}`}><Compass size={18} /><span className="text-[7px] mt-1 font-bold uppercase tracking-widest">Explora</span></button>
            </div>
            
            <button onClick={() => changeTab(Tab.LOG)} className={`flex items-center justify-center w-14 h-14 rounded-full -mt-10 shadow-2xl border-4 border-slate-950 transition-all z-10 ${activeTab === Tab.LOG ? 'bg-white text-slate-950 scale-110' : 'bg-slate-800 text-white'}`}><Plus size={28} /></button>

            <div className="flex-1 flex justify-around items-center">
              <button onClick={() => changeTab(Tab.STATS)} className={`flex flex-col items-center justify-center transition-all ${activeTab === Tab.STATS ? 'text-blue-400' : 'text-slate-500'}`}><BarChart2 size={18} /><span className="text-[7px] mt-1 font-bold uppercase tracking-widest">Estado</span></button>
              <button onClick={() => changeTab(Tab.INSIGHTS)} className={`flex flex-col items-center justify-center transition-all ${activeTab === Tab.INSIGHTS ? 'text-purple-400' : 'text-slate-500'}`}><Sparkles size={18} /><span className="text-[7px] mt-1 font-bold uppercase tracking-widest">Patrones</span></button>
              <button onClick={() => changeTab(Tab.PROFILE)} className={`flex flex-col items-center justify-center transition-all ${activeTab === Tab.PROFILE ? 'text-white' : 'text-slate-500'}`}><UserIcon size={18} /><span className="text-[7px] mt-1 font-bold uppercase tracking-widest">Perfil</span></button>
            </div>
          </nav>
        </div>
      )}

      {showContextChat && user && <ContextChat userId={user.id} onClose={() => setShowContextChat(false)} />}
      {showDeepenPrompt && <DeepenPromptModal onConfirm={() => { setShowDeepenPrompt(false); setShowContextChat(true); }} onSkip={() => { setShowDeepenPrompt(false); changeTab(Tab.STATS); }} />}
      {legalViewType && <LegalView type={legalViewType} onBack={() => setLegalViewType(null)} />}
      <InstallPrompt />
      {latestChangelog && <ChangelogModal changelog={latestChangelog} onClose={handleCloseChangelog} />}
    </div>
  );
};

export default App;
