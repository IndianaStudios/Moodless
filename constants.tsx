
import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  Sun,
  CloudRain,
  Zap,
  Wind,
  Moon,
  Ghost,
  Flame,
  Heart,
  Star,
  Coffee,
  Cloud,
  Droplets
} from 'lucide-react';
import { MoodCategory, ColorDefinition } from './types';

export const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
  try {
    Haptics.impact({ style }).catch(() => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(style === ImpactStyle.Heavy ? 25 : 12);
      }
    });
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12);
    }
  }
};

export type HapticKind = 'select' | 'success' | 'error' | 'tap';

const webPatterns: Record<HapticKind, number | number[]> = {
  select: 8,
  tap: 12,
  success: [10, 30, 10],
  error: [25, 50, 25],
};

export const haptic = (kind: HapticKind = 'tap') => {
  try {
    if (kind === 'success') {
      Haptics.notification({ type: 'SUCCESS' as any }).catch(() => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(webPatterns.success);
        }
      });
    } else if (kind === 'error') {
      Haptics.notification({ type: 'ERROR' as any }).catch(() => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(webPatterns.error);
        }
      });
    } else {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(webPatterns[kind]);
        }
      });
    }
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(webPatterns[kind]);
    }
  }
};

export const EMOTIONAL_PALETTE: ColorDefinition[] = [
  { category: MoodCategory.JOY, hex: '#FACC15', secondary: '#FEF08A', label: 'Alegría', moodBuddy: '/mascot_joy_nobg.png' },
  { category: MoodCategory.CALM, hex: '#2DD4BF', secondary: '#99F6E4', label: 'Calma', moodBuddy: '/mascot_calm_nobg.png' },
  { category: MoodCategory.ANGER, hex: '#EF4444', secondary: '#FECACA', label: 'Enojo', moodBuddy: '/mascot_anger_nobg.png' },
  { category: MoodCategory.SADNESS, hex: '#3B82F6', secondary: '#BFDBFE', label: 'Tristeza', moodBuddy: '/mascot_sadness_nobg.png' },
  { category: MoodCategory.ANXIETY, hex: '#8B5CF6', secondary: '#DDD6FE', label: 'Ansiedad', moodBuddy: '/mascot_anxiety_nobg.png' },
  { category: MoodCategory.ENERGY, hex: '#FB923C', secondary: '#FFEDD5', label: 'Energía', moodBuddy: '/mascot_joy_nobg.png' }, // Fallback
  { category: MoodCategory.NEUTRAL, hex: '#94A3B8', secondary: '#E2E8F0', label: 'Neutral', moodBuddy: '/mascot_calm_nobg.png' }, // Fallback
];

export const MOOD_ICONS = [
  { name: 'Sun', Icon: Sun, category: MoodCategory.JOY },
  { name: 'Heart', Icon: Heart, category: MoodCategory.JOY },
  { name: 'Star', Icon: Star, category: MoodCategory.JOY },
  { name: 'Moon', Icon: Moon, category: MoodCategory.CALM },
  { name: 'Wind', Icon: Wind, category: MoodCategory.CALM },
  { name: 'Flame', Icon: Flame, category: MoodCategory.ANGER },
  { name: 'Zap', Icon: Zap, category: MoodCategory.ENERGY },
  { name: 'CloudRain', Icon: CloudRain, category: MoodCategory.SADNESS },
  { name: 'Droplets', Icon: Droplets, category: MoodCategory.SADNESS },
  { name: 'Ghost', Icon: Ghost, category: MoodCategory.ANXIETY },
  { name: 'Coffee', Icon: Coffee, category: MoodCategory.NEUTRAL },
  { name: 'Cloud', Icon: Cloud, category: MoodCategory.NEUTRAL },
];

export const APP_NAME = "Moodless";
export const ALTERNATE_NAMES = ["Aura", "VibeCheck", "Lumina", "Hue"];
