
import React from 'react';
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

export const EMOTIONAL_PALETTE: ColorDefinition[] = [
  { category: MoodCategory.JOY, hex: '#FACC15', secondary: '#FEF08A', label: 'Alegría', mascot: '/mascot_joy.png' },
  { category: MoodCategory.CALM, hex: '#2DD4BF', secondary: '#99F6E4', label: 'Calma', mascot: '/mascot_calm.png' },
  { category: MoodCategory.ANGER, hex: '#EF4444', secondary: '#FECACA', label: 'Enojo', mascot: '/mascot_anger.png' },
  { category: MoodCategory.SADNESS, hex: '#3B82F6', secondary: '#BFDBFE', label: 'Tristeza', mascot: '/mascot_sadness.png' },
  { category: MoodCategory.ANXIETY, hex: '#8B5CF6', secondary: '#DDD6FE', label: 'Ansiedad', mascot: '/mascot_anxiety.png' },
  { category: MoodCategory.ENERGY, hex: '#FB923C', secondary: '#FFEDD5', label: 'Energía', mascot: '/mascot_joy.png' }, // Fallback
  { category: MoodCategory.NEUTRAL, hex: '#94A3B8', secondary: '#E2E8F0', label: 'Neutral', mascot: '/mascot_calm.png' }, // Fallback
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
