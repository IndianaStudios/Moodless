import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for Moodless.
 *
 * La PWA web sigue funcionando idéntica desde Vercel.
 * Este archivo añade la capa nativa Android (y opcionalmente iOS) sin
 * modificar nada del frontend web. Ver services/healthService.ts para
 * el routing Health Connect (Android) vs Google Fit REST (web/iOS).
 *
 * Documentación: https://capacitorjs.com/docs/config
 */
const config: CapacitorConfig = {
  appId: 'com.indiana.moodless',
  appName: 'Moodless',
  webDir: 'dist',

  // En Android usa scheme https://localhost para que las URLs relativas y
  // service workers funcionen como en una webapp normal.
  server: {
    androidScheme: 'https',
  },

  // No activamos cleartext (HTTP) — todas las llamadas son HTTPS.
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    // Configuración por defecto del plugin de salud.
    // Los permisos concretos se pedirán en runtime desde healthService.ts
    // según la plataforma (Health Connect en Android, HealthKit en iOS).
    Health: {
      // No declaramos permisos aquí: el plugin los gestiona dinámicamente
      // según las llamadas a requestPermissions().
    },
  },
};

export default config;