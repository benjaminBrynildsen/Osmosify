import type { ThemeOption } from '../types';

export interface GameTheme {
  name: string;
  description: string;
  icon: string;
  background: string;
  creatureGradient: string;
  creatureSavedColor: string;
  dangerZoneColor: string;
  accentColor: string;
  textColor: string;
  cardBg: string;
  cardBorder: string;
}

export const GAME_THEMES: Record<ThemeOption, GameTheme> = {
  default: {
    name: 'Lava',
    description: 'Classic fire and lava theme',
    icon: '🔥',
    background: '#1a1a2e',
    creatureGradient: '#9333ea',
    creatureSavedColor: '#22c55e',
    dangerZoneColor: '#dc2626',
    accentColor: '#f97316',
    textColor: '#ffffff',
    cardBg: 'rgba(30, 41, 59, 0.8)',
    cardBorder: 'rgba(249, 115, 22, 0.5)',
  },
  space: {
    name: 'Space',
    description: 'Cosmic adventure in the stars',
    icon: '🚀',
    background: '#0f172a',
    creatureGradient: '#0891b2',
    creatureSavedColor: '#34d399',
    dangerZoneColor: '#9333ea',
    accentColor: '#22d3ee',
    textColor: '#ffffff',
    cardBg: 'rgba(30, 27, 75, 0.8)',
    cardBorder: 'rgba(34, 211, 238, 0.5)',
  },
  jungle: {
    name: 'Jungle',
    description: 'Wild safari adventure',
    icon: '🌴',
    background: '#064e3b',
    creatureGradient: '#f59e0b',
    creatureSavedColor: '#a3e635',
    dangerZoneColor: '#15803d',
    accentColor: '#a3e635',
    textColor: '#ffffff',
    cardBg: 'rgba(20, 83, 45, 0.8)',
    cardBorder: 'rgba(163, 230, 53, 0.5)',
  },
  ocean: {
    name: 'Ocean',
    description: 'Deep sea underwater world',
    icon: '🐠',
    background: '#0c4a6e',
    creatureGradient: '#ec4899',
    creatureSavedColor: '#2dd4bf',
    dangerZoneColor: '#0284c7',
    accentColor: '#2dd4bf',
    textColor: '#ffffff',
    cardBg: 'rgba(30, 58, 138, 0.8)',
    cardBorder: 'rgba(45, 212, 191, 0.5)',
  },
  candy: {
    name: 'Candy',
    description: 'Sweet and colorful fun',
    icon: '🍬',
    background: '#c026d3',
    creatureGradient: '#fde047',
    creatureSavedColor: '#4ade80',
    dangerZoneColor: '#f472b6',
    accentColor: '#fde047',
    textColor: '#ffffff',
    cardBg: 'rgba(192, 38, 211, 0.8)',
    cardBorder: 'rgba(253, 224, 71, 0.5)',
  },
};

export const THEME_OPTIONS: { value: ThemeOption; label: string; description: string }[] = [
  { value: 'default', label: 'Lava', description: 'Classic fire and lava' },
  { value: 'space', label: 'Space', description: 'Cosmic adventure' },
  { value: 'jungle', label: 'Jungle', description: 'Wild safari' },
  { value: 'ocean', label: 'Ocean', description: 'Underwater world' },
  { value: 'candy', label: 'Candy', description: 'Sweet and colorful' },
];

export function getTheme(themeOption: ThemeOption | undefined): GameTheme {
  return GAME_THEMES[themeOption || 'default'] || GAME_THEMES.default;
}