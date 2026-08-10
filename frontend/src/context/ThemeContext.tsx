import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Theme, AccentColor, ThemeContextType } from '../types';

const ThemeContext = createContext<ThemeContextType | null>(null);

interface AccentColorConfig {
  light: { primary: string; hover: string; lightBg: string };
  dark: { primary: string; hover: string; lightBg: string };
}

const ACCENT_COLORS: Record<AccentColor, AccentColorConfig> = {
  'royal-blue': {
    light: { primary: '#3B82F6', hover: '#2563EB', lightBg: '#DBEAFE' },
    dark: { primary: '#60A5FA', hover: '#93C5FD', lightBg: 'rgba(96, 165, 250, 0.15)' },
  },
  'ocean-blue': {
    light: { primary: '#2563EB', hover: '#1D4ED8', lightBg: '#DBEAFE' },
    dark: { primary: '#3B82F6', hover: '#60A5FA', lightBg: 'rgba(59, 130, 246, 0.15)' },
  },
  'sapphire': {
    light: { primary: '#1D4ED8', hover: '#1E40AF', lightBg: '#E0E7FF' },
    dark: { primary: '#6366F1', hover: '#818CF8', lightBg: 'rgba(99, 102, 241, 0.15)' },
  },
  'sky-blue': {
    light: { primary: '#0EA5E9', hover: '#0284C7', lightBg: '#E0F2FE' },
    dark: { primary: '#38BDF8', hover: '#7DD3FC', lightBg: 'rgba(56, 189, 248, 0.15)' },
  },
  'emerald-green': {
    light: { primary: '#10B981', hover: '#059669', lightBg: '#D1FAE5' },
    dark: { primary: '#34D399', hover: '#6EE7B7', lightBg: 'rgba(52, 211, 153, 0.15)' },
  },
  'violet': {
    light: { primary: '#7C3AED', hover: '#6D28D9', lightBg: '#EDE9FE' },
    dark: { primary: '#A78BFA', hover: '#C4B5FD', lightBg: 'rgba(167, 139, 250, 0.15)' },
  },
};

function applyAccentColor(theme: Theme, accent: AccentColor): void {
  const config = ACCENT_COLORS[accent][theme];
  const root = document.documentElement;
  root.style.setProperty('--color-primary', config.primary);
  root.style.setProperty('--color-primary-hover', config.hover);
  root.style.setProperty('--color-primary-light', config.lightBg);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light';
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const stored = localStorage.getItem('accentColor');
    if (stored && stored in ACCENT_COLORS) return stored as AccentColor;
    return 'royal-blue';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    applyAccentColor(theme, accentColor);
  }, [theme, accentColor]);

  const setTheme = (newTheme: Theme): void => {
    setThemeState(newTheme);
  };

  const setAccentColor = (color: AccentColor): void => {
    setAccentColorState(color);
    localStorage.setItem('accentColor', color);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
