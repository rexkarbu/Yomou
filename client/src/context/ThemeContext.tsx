import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { ThemeMode, ThemeColors, THEME_COLORS } from '../styles/theme';

export interface ThemeContextValue {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
  isSepia: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  initialTheme?: ThemeMode;
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  initialTheme = 'light',
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  const colors = useMemo(() => THEME_COLORS[theme], [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors,
      setTheme,
      isDark: theme === 'dark',
      isSepia: theme === 'sepia',
    }),
    [theme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
