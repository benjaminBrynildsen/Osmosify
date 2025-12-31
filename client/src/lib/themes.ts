import type { ThemeOption } from "@shared/schema";

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
    name: "Lava",
    description: "Classic fire and lava theme",
    icon: "🔥",
    background: "bg-gradient-to-b from-slate-900 via-slate-800 to-orange-900",
    creatureGradient: "bg-gradient-to-b from-purple-500 to-purple-700",
    creatureSavedColor: "bg-green-500",
    dangerZoneColor: "from-orange-600 via-red-600 to-orange-500",
    accentColor: "text-orange-500",
    textColor: "text-white",
    cardBg: "bg-slate-800/80",
    cardBorder: "border-orange-500/50",
  },
  space: {
    name: "Space",
    description: "Cosmic adventure in the stars",
    icon: "🚀",
    background: "bg-gradient-to-b from-indigo-950 via-purple-950 to-black",
    creatureGradient: "bg-gradient-to-b from-cyan-400 to-blue-600",
    creatureSavedColor: "bg-emerald-400",
    dangerZoneColor: "from-purple-600 via-fuchsia-600 to-purple-500",
    accentColor: "text-cyan-400",
    textColor: "text-white",
    cardBg: "bg-indigo-900/80",
    cardBorder: "border-cyan-500/50",
  },
  jungle: {
    name: "Jungle",
    description: "Wild safari adventure",
    icon: "🌴",
    background: "bg-gradient-to-b from-emerald-950 via-green-900 to-lime-900",
    creatureGradient: "bg-gradient-to-b from-amber-400 to-orange-500",
    creatureSavedColor: "bg-lime-400",
    dangerZoneColor: "from-green-700 via-emerald-600 to-green-500",
    accentColor: "text-lime-400",
    textColor: "text-white",
    cardBg: "bg-green-900/80",
    cardBorder: "border-lime-500/50",
  },
  ocean: {
    name: "Ocean",
    description: "Deep sea underwater world",
    icon: "🐠",
    background: "bg-gradient-to-b from-blue-950 via-cyan-900 to-teal-900",
    creatureGradient: "bg-gradient-to-b from-pink-400 to-rose-500",
    creatureSavedColor: "bg-teal-400",
    dangerZoneColor: "from-blue-600 via-cyan-500 to-blue-400",
    accentColor: "text-teal-400",
    textColor: "text-white",
    cardBg: "bg-blue-900/80",
    cardBorder: "border-teal-500/50",
  },
  candy: {
    name: "Candy",
    description: "Sweet and colorful fun",
    icon: "🍬",
    background: "bg-gradient-to-b from-pink-400 via-fuchsia-500 to-purple-600",
    creatureGradient: "bg-gradient-to-b from-yellow-300 to-amber-400",
    creatureSavedColor: "bg-green-400",
    dangerZoneColor: "from-rose-400 via-pink-400 to-fuchsia-400",
    accentColor: "text-yellow-300",
    textColor: "text-white",
    cardBg: "bg-fuchsia-600/80",
    cardBorder: "border-yellow-400/50",
  },
};

export const THEME_OPTIONS: { value: ThemeOption; label: string; description: string }[] = [
  { value: "default", label: "Lava", description: "Classic fire and lava" },
  { value: "space", label: "Space", description: "Cosmic adventure" },
  { value: "jungle", label: "Jungle", description: "Wild safari" },
  { value: "ocean", label: "Ocean", description: "Underwater world" },
  { value: "candy", label: "Candy", description: "Sweet and colorful" },
];

export function getTheme(themeOption: ThemeOption | undefined): GameTheme {
  return GAME_THEMES[themeOption || "default"] || GAME_THEMES.default;
}
