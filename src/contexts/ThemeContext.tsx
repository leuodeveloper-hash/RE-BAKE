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

/**
 * 하위 트리를 항상 다크로 고정한다(앱 테마와 무관).
 * 사진 뷰어처럼 배경이 늘 검정인 화면에서, 라이트 테마 토큰이 배경에 묻히는 걸 방지.
 * appearanceMode/setAppearanceMode는 상위 값을 그대로 전달해 설정 변경 동작은 유지.
 */
export function ForceDarkTheme({children}: {children: React.ReactNode}) {
  const parent = useContext(ThemeContext);
  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: SemanticColorsDark as unknown as SemanticColors,
      elevation: ElevationDark,
      isDark: true,
      appearanceMode: parent?.appearanceMode ?? 'dark',
      setAppearanceMode: parent?.setAppearanceMode ?? (() => {}),
    }),
    [parent?.appearanceMode, parent?.setAppearanceMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useColors(): SemanticColors {
  return useTheme().colors;
}
