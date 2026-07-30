
import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detectar si es iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
        const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

        setIsIOS(isIOSDevice && !isStandalone);

        // Capturar el evento de instalación en Android/Chrome
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('Usuario aceptó la instalación');
        }

        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible && !isIOS) return null;

    return (
        <div className="fixed bottom-24 left-0 right-0 z-[1000] animate-in slide-in-from-bottom-10 fade-in duration-700 flex justify-center px-6">
            <div className="app-surface-raised w-full max-w-sm p-5 rounded-[2rem] border-white/20 shadow-2xl relative overflow-hidden">
                <button
                    onClick={() => { setIsVisible(false); setIsIOS(false); }}
                    className="absolute top-4 right-4 p-1 rounded-full bg-white/5 text-white/50"
                >
                    <X size={14} />
                </button>

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0">
                        <img src="/logo.jpg" className="w-10 h-10 rounded-xl" alt="Moodless Logo" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-sm font-black text-white leading-tight">Moodless App</h3>
                        <p className="text-[10px] text-white/50 font-medium leading-tight mt-0.5">
                            {isIOS
                                ? "Añádela a tu inicio para una mejor experiencia."
                                : "Instala la app para acceso rápido y offline."}
                        </p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="mt-4 pt-4 border-t border-white/10 text-[10px] text-white/65 font-medium flex items-center justify-center gap-2">
                        Pulsa <Share size={14} className="text-blue-400" /> y luego <span className="font-black text-white">"Añadir a la pantalla de inicio"</span>
                    </div>
                ) : (
                    <button
                        onClick={handleInstallClick}
                        className="mt-4 w-full app-button app-button-primary py-3 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                        <Download size={14} />
                        Instalar App
                    </button>
                )}
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
