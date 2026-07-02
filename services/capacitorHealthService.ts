/**
 * Servicio de salud para plataformas nativas (Android/iOS) usando
 * @capgo/capacitor-health (Health Connect en Android, HealthKit en iOS).
 *
 * En web/iOS-PWA este módulo no se usa: el routing cae en
 * googleHealthService.ts (Google Fit REST) hasta que se implemente el flujo
 * nativo de iOS.
 */
import { Capacitor } from '@capacitor/core';
import { Health, type HealthDataType } from '@capgo/capacitor-health';
import { db, auth } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import type { DailyHealthMetrics } from '../types';

const ALL_READ_TYPES: HealthDataType[] = [
  'steps',
  'heartRate',
  'restingHeartRate',
  'heartRateVariability',
  'sleep',
  'oxygenSaturation',
];

const ONE_DAY_MS = 86_400_000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function getPlatformName(): 'health_connect' | 'health_kit' | 'fit_rest' {
  const p = Capacitor.getPlatform();
  if (p === 'android') return 'health_connect';
  if (p === 'ios') return 'health_kit';
  return 'fit_rest';
}

/**
 * Agrupa samples por día local (YYYY-MM-DD) y los resume a DailyHealthMetrics.
 * Para sueño, si la plataforma emite `stages`, los minutos se reparten por fase.
 */
function aggregateByDay(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  samples: any[],
  type: HealthDataType
): Map<string, number> {
  const buckets = new Map<string, number>();
  for (const s of samples) {
    const d = new Date(s.startDate);
    const key = isoDate(d);
    buckets.set(key, (buckets.get(key) || 0) + (s.value || 0));
  }
  return buckets;
}

function aggregateSleepByDay(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  samples: any[]
): {
  total: Map<string, number>;
  deep: Map<string, number>;
  rem: Map<string, number>;
  light: Map<string, number>;
  awake: Map<string, number>;
} {
  const total = new Map<string, number>();
  const deep = new Map<string, number>();
  const rem = new Map<string, number>();
  const light = new Map<string, number>();
  const awake = new Map<string, number>();

  for (const s of samples) {
    const d = new Date(s.startDate);
    const key = isoDate(d);
    const minutes = (s.value || 0) / 60; // value viene en segundos para sleep

    total.set(key, (total.get(key) || 0) + minutes);

    // Si la plataforma emite stages, repartimos por fase
    if (Array.isArray(s.stages) && s.stages.length > 0) {
      for (const st of s.stages) {
        const k = isoDate(new Date(st.startDate));
        const m = st.durationMinutes || 0;
        switch (st.stage) {
          case 'deep': deep.set(k, (deep.get(k) || 0) + m); break;
          case 'rem': rem.set(k, (rem.get(k) || 0) + m); break;
          case 'light': light.set(k, (light.get(k) || 0) + m); break;
          case 'awake':
          case 'inBed': awake.set(k, (awake.get(k) || 0) + m); break;
        }
      }
    } else if (s.sleepState) {
      // Fallback: solo tenemos un estado por sample
      switch (s.sleepState) {
        case 'deep': deep.set(key, (deep.get(key) || 0) + minutes); break;
        case 'rem': rem.set(key, (rem.get(key) || 0) + minutes); break;
        case 'light': light.set(key, (light.get(key) || 0) + minutes); break;
        case 'awake':
        case 'inBed': awake.set(key, (awake.get(key) || 0) + minutes); break;
      }
    }
  }
  return { total, deep, rem, light, awake };
}

function round(v: number | null | undefined, decimals = 1): number | null {
  if (v == null || Number.isNaN(v)) return null;
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

export const capacitorHealthService = {
  /** ¿Hay que usar este servicio (plataforma nativa) o el de Fit REST? */
  isActive(): boolean {
    return isNative();
  },

  /** ¿La plataforma expone un SDK de salud nativo disponible? */
  async isAvailable(): Promise<boolean> {
    if (!isNative()) return false;
    try {
      const r = await Health.isAvailable();
      return !!r.available;
    } catch {
      return false;
    }
  },

  /**
   * Pide permisos al usuario para todos los tipos que necesitamos leer.
   * Devuelve true si el usuario autorizó al menos los tipos principales.
   */
  async requestPermissions(): Promise<boolean> {
    if (!isNative()) return false;
    try {
      const status = await Health.requestAuthorization({ read: ALL_READ_TYPES });
      // Consideramos éxito si al menos steps y heartRate están autorizados
      const must = ['steps', 'heartRate'] as HealthDataType[];
      return must.every((t) => status.readAuthorized.includes(t));
    } catch (err) {
      console.error('[capacitorHealth] requestPermissions failed:', err);
      return false;
    }
  },

  /** ¿Tenemos autorización activa para leer los tipos principales? */
  async hasPermissions(): Promise<boolean> {
    if (!isNative()) return false;
    try {
      const status = await Health.checkAuthorization({ read: ALL_READ_TYPES });
      const must = ['steps', 'heartRate'] as HealthDataType[];
      return must.every((t) => status.readAuthorized.includes(t));
    } catch {
      return false;
    }
  },

  /**
   * Sincroniza los últimos `days` días desde Health Connect/HealthKit a Firestore.
   * Devuelve los DailyHealthMetrics que se guardaron.
   */
  async syncHealthData(days: number = 30): Promise<DailyHealthMetrics[]> {
    if (!isNative()) throw new Error('Capacitor health solo en nativo');

    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const end = new Date();
    const start = new Date(end.getTime() - days * ONE_DAY_MS);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    // Lectura paralela de cada tipo
    const [steps, hr, rhr, hrv, sleep, spo2] = await Promise.all([
      Health.queryAggregated({
        dataType: 'steps',
        startDate: startIso,
        endDate: endIso,
        bucket: 'day',
        aggregation: 'sum',
      }).catch(() => ({ samples: [] })),
      Health.queryAggregated({
        dataType: 'heartRate',
        startDate: startIso,
        endDate: endIso,
        bucket: 'day',
        aggregation: 'average',
      }).catch(() => ({ samples: [] })),
      Health.readSamples({
        dataType: 'restingHeartRate',
        startDate: startIso,
        endDate: endIso,
        limit: 1000,
      }).catch(() => ({ samples: [] })),
      Health.readSamples({
        dataType: 'heartRateVariability',
        startDate: startIso,
        endDate: endIso,
        limit: 1000,
      }).catch(() => ({ samples: [] })),
      Health.readSamples({
        dataType: 'sleep',
        startDate: startIso,
        endDate: endIso,
        limit: 1000,
      }).catch(() => ({ samples: [] })),
      Health.readSamples({
        dataType: 'oxygenSaturation',
        startDate: startIso,
        endDate: endIso,
        limit: 1000,
      }).catch(() => ({ samples: [] })),
    ]);

    // Aggregate por día
    const stepsByDay = new Map<string, number>();
    for (const a of steps.samples) {
      stepsByDay.set(isoDate(new Date(a.startDate)), a.value);
    }
    const hrByDay = new Map<string, number>();
    for (const a of hr.samples) {
      hrByDay.set(isoDate(new Date(a.startDate)), a.value);
    }
    const rhrByDay = aggregateByDay(rhr.samples, 'restingHeartRate');
    const hrvByDay = aggregateByDay(hrv.samples, 'heartRateVariability');
    const spo2ByDay = aggregateByDay(spo2.samples, 'oxygenSaturation');
    const sleepAgg = aggregateSleepByDay(sleep.samples);

    // Unión de todas las fechas que tengan al menos un dato
    const allDates = new Set<string>([
      ...stepsByDay.keys(),
      ...hrByDay.keys(),
      ...rhrByDay.keys(),
      ...hrvByDay.keys(),
      ...spo2ByDay.keys(),
      ...sleepAgg.total.keys(),
    ]);

    const source = getPlatformName();
    const syncedAt = new Date().toISOString();
    const metrics: DailyHealthMetrics[] = [];

    for (const date of allDates) {
      const day: DailyHealthMetrics = {
        date,
        steps: Math.round(stepsByDay.get(date) || 0),
        sleepMinutes: Math.round(sleepAgg.total.get(date) || 0),
        avgHeartRate: round(hrByDay.get(date), 1) || 0,
        sleepDeepMinutes: sleepAgg.deep.has(date)
          ? Math.round(sleepAgg.deep.get(date) || 0)
          : null,
        sleepRemMinutes: sleepAgg.rem.has(date)
          ? Math.round(sleepAgg.rem.get(date) || 0)
          : null,
        sleepLightMinutes: sleepAgg.light.has(date)
          ? Math.round(sleepAgg.light.get(date) || 0)
          : null,
        sleepAwakeMinutes: sleepAgg.awake.has(date)
          ? Math.round(sleepAgg.awake.get(date) || 0)
          : null,
        restingHeartRate: rhrByDay.has(date)
          ? round(rhrByDay.get(date), 1)
          : null,
        hrvMs: hrvByDay.has(date) ? round(hrvByDay.get(date), 1) : null,
        spo2Avg: spo2ByDay.has(date) ? round(spo2ByDay.get(date), 1) : null,
        syncedAt,
        source,
      };

      metrics.push(day);
      await setDoc(
        doc(db, 'users', user.uid, 'health_metrics', date),
        day,
        { merge: true }
      );
    }

    // Actualizar marca de última sincronización
    await setDoc(
      doc(db, 'users', user.uid, 'integrations', source),
      {
        last_sync: syncedAt,
        last_30d_synced_at: syncedAt,
        connected_at: serverTimestamp(),
      },
      { merge: true }
    );

    return metrics;
  },

  /**
   * Lee métricas de Firestore para un rango de días. Independiente de la plataforma:
   * ambos paths (Capacitor y Fit REST) terminan guardando en la misma colección.
   */
  async getHealthMetrics(userId: string, days: number = 30): Promise<DailyHealthMetrics[]> {
    try {
      const start = new Date();
      start.setDate(start.getDate() - days);
      const startStr = isoDate(start);
      const metricsRef = collection(db, 'users', userId, 'health_metrics');
      const q = query(metricsRef, where('date', '>=', startStr), orderBy('date', 'asc'));
      const snap = await getDocs(q);
      const out: DailyHealthMetrics[] = [];
      snap.forEach((d) => out.push(d.data() as DailyHealthMetrics));
      return out;
    } catch (err) {
      console.error('[capacitorHealth] getHealthMetrics error:', err);
      return [];
    }
  },

  /** ¿Hay integración nativa activa en Firestore? */
  async isConnected(): Promise<boolean> {
    if (!isNative()) return false;
    const user = auth.currentUser;
    if (!user) return false;
    try {
      const ref = doc(db, 'users', user.uid, 'integrations', getPlatformName());
      const snap = await getDoc(ref);
      return snap.exists();
    } catch {
      return false;
    }
  },

  async getLastSync(): Promise<string | null> {
    if (!isNative()) return null;
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const ref = doc(db, 'users', user.uid, 'integrations', getPlatformName());
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const data = snap.data();
      return data?.last_sync || data?.connected_at || null;
    } catch {
      return null;
    }
  },

  /**
   * Revoca permisos nativos (no borra datos de Firestore; eso lo hace
   * la UI si quiere "desconectar" realmente).
   */
  async disconnect(): Promise<void> {
    // El plugin Capgo no expone revoke explícito. Lo más cercano es
    // pedir read=[], lo que cierra la sesión de Health Connect / HealthKit
    // a nivel de permisos. Para limpieza completa, el usuario debe ir a
    // los ajustes del sistema; aquí dejamos la marca de Firestore.
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(
      doc(db, 'users', user.uid, 'integrations', getPlatformName()),
      { disconnected_at: new Date().toISOString() },
      { merge: true }
    );
  },

  /** Plataforma efectiva (debug/UI). */
  getPlatformName,
};
