import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, BarChart2, User as UserIcon, Compass, Heart, Activity } from 'lucide-react';
import { MoodEntry } from './types';
import { triggerHaptic } from './constants';
import { authService, User } from './services/authService';
import { generateMoodReport, purgeStaleAuraCaches } from './services/geminiService';
import { notificationService } from './services/notificationService';
import { db } from './services/firebase';
import { collection, query, getDocs, setDoc, doc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { YouTubeTrack } from './services/youtubeMusicService';
import { ToastProvider } from './components/ToastProvider';

const MoodCanvas = lazy(() => import('./components/MoodCanvas'));
const HistoryView = lazy(() => import('./components/HistoryView'));
const StatsView = lazy(() => import('./components/StatsView'));
const ExploreView = lazy(() => import('./components/ExploreView'));
const AuthView = lazy(() => import('./components/AuthView'));
const LandingView = lazy(() => import('./components/CinematicLanding'));
const AccountView = lazy(() => import('./components/AccountView'));
const ProfileEditView = lazy(() => import('./components/ProfileEditView'));
const SupportView = lazy(() => import('./components/SupportView'));
const MoodBuddyHomeView = lazy(() => import('./components/MoodBuddyHomeView'));
const AdminView = lazy(() => import('./components/AdminView'));
const InstallPrompt = lazy(() => import('./components/InstallPrompt'));
const ResetPasswordView = lazy(() => import('./components/ResetPasswordView'));
const ChangelogModal = lazy(() => import('./components/ChangelogModal'));
const ContextChat = lazy(() => import('./components/ContextChat'));
const DeepenPromptModal = lazy(() => import('./components/DeepenPromptModal'));
const LegalView = lazy(() => import('./components/LegalView'));
const ContactView = lazy(() => import('./components/ContactView'));
const NotFoundView = lazy(() => import('./components/NotFoundView'));
import MusicPlayer from './components/MusicPlayer';
const SoundtrackView = lazy(() => import('./components/SoundtrackView'));
const OnboardingOverlay = lazy(() => import('./components/OnboardingOverlay'));

const ADMIN_EMAILS = ['indianasainzpalacios@gmail.com'];

const ScreenLoader = () => (
  <div className="app-shell flex h-screen flex-col items-center justify-center" role="status" aria-live="polite" aria-label="Cargando">
    <div className="app-ambient" aria-hidden="true" />
    <div className="relative z-10 flex flex-col items-center gap-6">
      <motion.div
        className="relative h-28 w-28"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-[-18px] rounded-full opacity-50 blur-2xl"
          style={{ background: 'radial-gradient(circle, #FACC15 0%, transparent 70%)' }}
        />
        <img
          src="/mascot_joy_nobg.png"
          alt=""
          draggable={false}
          className="relative h-full w-full object-contain drop-shadow-[0_8px_24px_rgba(250,204,21,0.35)]"
        />
      </motion.div>
      <div className="text-center">
        <p className="app-text-eyebrow tracking-[0.32em] text-white/55">Moodless</p>
        <p className="mt-2 text-xs text-white/35">Cargando tu espacio…</p>
      </div>
    </div>
  </div>
);

const TAB_ROUTES: Record<string, string> = {
  '/app': 'LOG',
  '/app/diario': 'HISTORY',
  '/app/moodbuddy': 'MOODBUDDY',
  '/app/estado': 'STATS',
  '/app/explora': 'EXPLORE',
  '/app/perfil': 'PROFILE',
};

const NAV_ITEMS = [
  { id: 'HISTORY', label: 'Diario', Icon: Calendar, route: '/app/diario' },
  { id: 'MOODBUDDY', label: 'Buddy', Icon: Heart, route: '/app/moodbuddy' },
  { id: 'EXPLORE', label: 'Explora', Icon: Compass, route: '/app/explora' },
  { id: 'STATS', label: 'Estado', Icon: BarChart2, route: '/app/estado' },
  { id: 'PROFILE', label: 'Perfil', Icon: UserIcon, route: '/app/perfil' },
] as const;

const CaptureBanner = ({ onCapture }: { onCapture: () => void }) => (
  <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6">
    <div className="app-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="app-list-icon shrink-0 text-violet-200">
          <Activity size={15} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Aún no has registrado tu vibe de hoy</p>
          <p className="app-text-meta truncate">Un minuto basta para empezar tu registro.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCapture}
        className="app-button app-button-primary shrink-0 px-4 py-2 text-[13px]"
      >
        Registrar
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
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
  const [appVersion, setAppVersion] = useState('v3.0.0');
  const [playerQueue, setPlayerQueue] = useState<YouTubeTrack[]>([]);
  const [playerCurrentIndex, setPlayerCurrentIndex] = useState<number>(0);
  const [playerIsPlaying, setPlayerIsPlaying] = useState<boolean>(false);
  const [playerMoodColor, setPlayerMoodColor] = useState<string>('#ffffff');
  const [playerVisible, setPlayerVisible] = useState<boolean>(false);
  const [showSoundtrackModal, setShowSoundtrackModal] = useState<boolean>(false);

  const handlePlayQueue = (tracks: YouTubeTrack[], moodColor: string, startIndex: number = 0) => {
    setPlayerQueue(tracks);
    setPlayerCurrentIndex(startIndex);
    setPlayerMoodColor(moodColor);
    setPlayerIsPlaying(true);
    setPlayerVisible(true);
  };

  const openLegal = (type: 'privacy' | 'terms') => {
    navigate(type === 'privacy' ? '/privacidad' : '/terminos');
  };

  const useHeroEntrance = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('moodless.justAuthed') === '1') {
      sessionStorage.removeItem('moodless.justAuthed');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const auth = params.get('auth');
    if (mode === 'resetPassword' && oobCode) setResetOobCode(oobCode);
    if (auth === 'true') setShowAuth(true);
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
        } catch (e) {
          console.error('Error fetching data', e);
        }
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

  useEffect(() => {
    const fetchLatestChangelog = async () => {
      try {
        const q = query(collection(db, 'changelogs'), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const changelogData = snapshot.docs[0].data();
          const lastSeen = localStorage.getItem('lastSeenVersion');
          if (lastSeen !== changelogData.version) {
            setLatestChangelog(changelogData);
          }
        }
      } catch (err) {
        console.error('Error fetching changelog:', err);
      }
    };
    fetchLatestChangelog();
  }, []);

  const handleSaveMood = async (newMood: Omit<MoodEntry, 'id' | 'date'>) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const newId = crypto.randomUUID();
    const entry: MoodEntry = { ...newMood, id: newId, date: today };
    setEntries(prev => [...prev.filter(e => e.date !== today), entry]);
    purgeStaleAuraCaches(newId);
    setShowDeepenPrompt(true);
    try {
      await setDoc(doc(db, 'users', user.id, 'entries', newId), entry);
      const latestContext = contextLogs.length > 0 ? contextLogs[0].userInput : '';
      const report = await generateMoodReport(entry, entries, latestContext);
      const updatedEntry = { ...entry, report };
      await setDoc(doc(db, 'users', user.id, 'entries', newId), updatedEntry);
      setEntries(prev => prev.map(e => e.id === newId ? updatedEntry : e));
    } catch (err) {
      console.error('Failed to sync', err);
    }
  };

  const handleUpdateMood = async (entryId: string, newMood: Omit<MoodEntry, 'id' | 'date' | 'report'>) => {
    if (!user) return;
    const existing = entries.find(e => e.id === entryId);
    if (!existing) return;
    const updated: MoodEntry = { ...newMood, id: entryId, date: existing.date };
    setEntries(prev => prev.map(e => (e.id === entryId ? updated : e)));
    purgeStaleAuraCaches(entryId);
    try {
      await setDoc(doc(db, 'users', user.id, 'entries', entryId), updated);
      const latestContext = contextLogs.length > 0 ? contextLogs[0].userInput : '';
      const report = await generateMoodReport(updated, entries.filter(e => e.id !== entryId), latestContext);
      const withReport = { ...updated, report };
      await setDoc(doc(db, 'users', user.id, 'entries', entryId), withReport);
      setEntries(prev => prev.map(e => (e.id === entryId ? withReport : e)));
    } catch (err) {
      console.error('Failed to update entry', err);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  const handleCloseChangelog = () => {
    if (latestChangelog) {
      localStorage.setItem('lastSeenVersion', latestChangelog.version);
    }
    setLatestChangelog(null);
  };

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (TAB_ROUTES[path]) return TAB_ROUTES[path];
    for (const [route, tab] of Object.entries(TAB_ROUTES)) {
      if (path.startsWith(route + '/')) return tab;
    }
    return '';
  }, [location.pathname]);

  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);
  const hideNav = ['/app/perfil/editar', '/app/soporte', '/app/admin'].some(p => location.pathname.startsWith(p));

  if (!isLoaded) return <ScreenLoader />;

  if (resetOobCode) {
    return <Suspense fallback={<ScreenLoader />}><ResetPasswordView oobCode={resetOobCode} onDone={() => {
      setResetOobCode(null);
      navigate('/', { replace: true });
      setShowAuth(true);
    }} /></Suspense>;
  }

  const publicPaths = ['/landing', '/privacidad', '/terminos', '/cookies', '/contacto'];
  if (publicPaths.some(p => location.pathname.startsWith(p))) {
    if (isStandalone && location.pathname === '/landing') {
      return <Navigate to={user ? '/app' : '/'} replace />;
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <Routes>
          <Route path="/landing" element={
            <LandingView
              isAuthenticated={!!user}
              onEnterApp={() => navigate(user ? '/app' : '/')}
              onStart={(mode) => { sessionStorage.setItem('moodless.fromLanding', '1'); setShowAuth(true); if (mode === 'login') sessionStorage.setItem('moodless.initialMode', 'login'); }}
            />
          } />
          <Route path="/privacidad" element={<LegalView type="privacy" onBack={() => navigate('/')} />} />
          <Route path="/terminos" element={<LegalView type="terms" onBack={() => navigate('/')} />} />
          <Route path="/cookies" element={<LegalView type="cookies" onBack={() => navigate('/')} />} />
          <Route path="/contacto" element={<ContactView />} />
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </Suspense>
    );
  }

  if (!user) {
    if (location.pathname.startsWith('/app')) {
      return <Navigate to="/" replace />;
    }
    if (showAuth || isStandalone) {
      const fromLanding = sessionStorage.getItem('moodless.fromLanding') === '1';
      if (fromLanding) sessionStorage.removeItem('moodless.fromLanding');
      return (
        <Suspense fallback={<ScreenLoader />}>
          <AuthView
            onAuthSuccess={() => sessionStorage.setItem('moodless.justAuthed', '1')}
            onBack={isStandalone ? undefined : () => setShowAuth(false)}
            heroEntrance={fromLanding}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <LandingView
          isAuthenticated={!!user}
          onEnterApp={() => navigate('/app')}
          onStart={(mode) => { sessionStorage.setItem('moodless.fromLanding', '1'); setShowAuth(true); if (mode === 'login') sessionStorage.setItem('moodless.initialMode', 'login'); }}
        />
      </Suspense>
    );
  }

  const lastEntry = entries[entries.length - 1];
  const loggedToday = entries.some(e => e.date === new Date().toISOString().split('T')[0]);
  const navigateToLog = () => navigate('/app');

  // Auto-redirect to capture flow on first authenticated load of the day when
  // today is missing. Uses localStorage with a daily timestamp so the redirect
  // re-arms at midnight even across multiple PWA launches in the same day, while
  // skipping mid-session navigations to other tabs once armed.
  const todayKey = new Date().toISOString().split('T')[0];
  const bootKey = `moodless.bootRedirected.${todayKey}`;
  const bootShouldRedirect =
    !isFetchingData &&
    loggedToday === false &&
    (location.pathname === '/' || location.pathname === '/app') &&
    localStorage.getItem(bootKey) !== '1';

  if (bootShouldRedirect) {
    localStorage.setItem(bootKey, '1');
    return <Navigate to="/app" replace />;
  }
  // Clean stale daily flags (older than 3 days) to prevent unbounded growth.
  if (loggedToday === true) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('moodless.bootRedirected.') && key !== bootKey) {
          const stampDate = key.replace('moodless.bootRedirected.', '');
          const ageDays = (Date.now() - new Date(stampDate + 'T00:00:00').getTime()) / 86400000;
          if (ageDays > 3) localStorage.removeItem(key);
        }
      }
    } catch {}
  }

  if (location.pathname === '/') {
    return <Navigate to={user ? '/app' : '/landing'} replace />;
  }

  return (
    <ToastProvider>
      <a href="#main" className="skip-link">Saltar al contenido</a>
      <div className="app-shell relative flex h-[100dvh] flex-col overflow-hidden">
        <div className="app-ambient" aria-hidden="true" />
        <Suspense fallback={<ScreenLoader />}>
          <main id="main" className="app-screen relative z-10 flex-1 overflow-y-auto no-scrollbar scroll-smooth">
            <div className={`mx-auto flex min-h-full w-full flex-col transition-all duration-300 ${playerVisible ? 'pb-32' : 'pb-0'}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-1 flex-col"
                >
                  <Routes location={location}>
                    <Route path="/app" element={
                      <MoodCanvas
                        key={`mood-${loggedToday ? 'logged' : 'pending'}-${lastEntry?.id ?? 'none'}`}
                        userId={user.id}
                        onSave={handleSaveMood}
                        onOpenContextChat={() => setShowContextChat(true)}
                        alreadyLogged={loggedToday}
                        lastEntry={loggedToday ? undefined : lastEntry}
                        enterAsHero={useHeroEntrance()}
                      />
                    } />
                    <Route path="/app/diario" element={
                      <HistoryView entries={entries} loggedToday={loggedToday} onEntriesRefresh={setEntries} onNavigateToLog={navigateToLog} onOpenContextChat={() => setShowContextChat(true)} />
                    } />
                    <Route path="/app/moodbuddy" element={
                      <MoodBuddyHomeView userId={user.id} entries={entries} loggedToday={loggedToday} onNavigateToLog={navigateToLog} />
                    } />
                    <Route path="/app/estado" element={
                      <StatsView
                        entries={entries}
                        contextLogs={contextLogs}
                        userId={user.id}
                        loggedToday={loggedToday}
                        onNavigateToLog={navigateToLog}
                        onUpdateMood={handleUpdateMood}
                      />
                    } />
                    <Route path="/app/explora" element={
                      <ExploreView
                        lastEntry={lastEntry}
                        userId={user.id}
                        loggedToday={loggedToday}
                        onNavigateToLog={navigateToLog}
                        onPlayQueue={handlePlayQueue}
                        onOpenSoundtrack={() => setShowSoundtrackModal(true)}
                      />
                    } />
                    <Route path="/app/perfil" element={
                      <AccountView
                        user={user}
                        entries={entries}
                        onLogout={handleLogout}
                        onEditProfile={() => navigate('/app/perfil/editar')}
                        onSupport={() => navigate('/app/soporte')}
                        onAdmin={isAdmin ? () => navigate('/app/admin') : undefined}
                        onLegal={(type) => openLegal(type)}
                        appVersion={appVersion}
                      />
                    } />
                    <Route path="/app/perfil/editar" element={
                      <ProfileEditView user={user} onBack={() => navigate('/app/perfil')} onUserUpdate={setUser} />
                    } />
                    <Route path="/app/soporte" element={
                      <SupportView user={user} onBack={() => navigate('/app/perfil')} />
                    } />
                    <Route path="/app/admin" element={
                      isAdmin ? <AdminView onBack={() => navigate('/app/perfil')} /> : <Navigate to="/app" replace />
                    } />
                    <Route path="/app/patrones" element={<Navigate to="/app/estado" replace />} />
                    <Route path="/app/*" element={<Navigate to="/app" replace />} />
                    <Route path="*" element={<NotFoundView />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {!hideNav && (
            <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4">
              <nav className="app-nav flex h-[4.5rem] w-full max-w-lg items-center justify-around rounded-[1.75rem] px-2" aria-label="Navegación principal">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      type="button"
                      onClick={() => { triggerHaptic(); navigate(item.route); }}
                      className={`app-nav-item ${isActive ? 'is-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className="app-nav-pill"
                          transition={{ type: 'spring', stiffness: 380, damping: 30, ease: [0.16, 1, 0.3, 1] }}
                        />
                      )}
                      <item.Icon size={20} strokeWidth={isActive ? 2 : 1.8} fill={item.id === 'MOODBUDDY' && isActive ? 'currentColor' : 'none'} />
                      <span>{item.label}</span>
                    </motion.button>
                  );
                })}
              </nav>
            </div>
          )}

          {showContextChat && user && <ContextChat userId={user.id} onClose={() => setShowContextChat(false)} />}
          {showDeepenPrompt && <DeepenPromptModal onConfirm={() => { setShowDeepenPrompt(false); setShowContextChat(true); }} onSkip={() => { setShowDeepenPrompt(false); navigate('/app/estado'); }} />}
          <InstallPrompt />
          {latestChangelog && <ChangelogModal changelog={latestChangelog} onClose={handleCloseChangelog} />}

          {playerQueue.length > 0 && (
            <MusicPlayer
              queue={playerQueue}
              currentIndex={playerCurrentIndex}
              isPlaying={playerIsPlaying}
              visible={playerVisible}
              onStateChange={setPlayerIsPlaying}
              onTrackChange={setPlayerCurrentIndex}
              onClose={() => {
                setPlayerVisible(false);
                setPlayerIsPlaying(false);
              }}
              moodColor={playerMoodColor}
            />
          )}

          {showSoundtrackModal && user && (
            <SoundtrackView
              userId={user.id}
              onClose={() => setShowSoundtrackModal(false)}
              onPlayQueue={handlePlayQueue}
            />
          )}

          {user && <OnboardingOverlay userId={user.id} />}
        </Suspense>
      </div>
    </ToastProvider>
  );
};

export default App;
