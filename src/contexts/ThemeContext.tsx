import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {Appearance, useColorScheme} from 'react-native';
import {
  SemanticColorsLight,
  SemanticColorsDark,
  type SemanticColors,
} from '@constants/tokens';
import {ElevationLight, ElevationDark} from '@constants/elevation';

export type AppearanceMode = 'light' | 'auto' | 'dark';
type Elevation = typeof ElevationLight;

interface ThemeContextValue {
  colors: SemanticColors;
  elevation: Elevation;
  isDark: boolean;
  appearanceMode: AppearanceMode;
  setAppearanceMode: (mode: AppearanceMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>('light');
  const systemScheme = useColorScheme();

  const setAppearanceMode = useCallback((mode: AppearanceMode) => {
    setAppearanceModeState(mode);
    if (typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme(mode === 'auto' ? null : mode);
    }
  }, []);

  const isDark = useMemo(() => {
    if (appearanceMode === 'auto') return systemScheme === 'dark';
    return appearanceMode === 'dark';
  }, [appearanceMode, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? (SemanticColorsDark as SemanticColors) : SemanticColorsLight,
      elevation: isDark ? ElevationDark : ElevationLight,
      isDark,
      appearanceMode,
      setAppearanceMode,
    }),
    [isDark, appearanceMode, setAppearanceMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useColors(): SemanticColors {
  return useTheme().colors;
}
