import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const COLORS = {
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceVariant: '#f1f5f9',
    primary: '#7c3aed',
    primaryContainer: '#ede9fe',
    onPrimary: '#ffffff',
    onSurface: '#1e293b',
    onSurfaceVariant: '#64748b',
    outline: '#cbd5e1',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceVariant: '#334155',
    primary: '#a78bfa',
    primaryContainer: '#4c1d95',
    onPrimary: '#ffffff',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#94a3b8',
    outline: '#475569',
    error: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
    info: '#60a5fa',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(systemColorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    if (systemColorScheme) {
      setThemeState(systemColorScheme);
    }
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { COLORS };