import {useMemo} from 'react';
import {useColors, useColorsV2} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import type {SemanticColorsV2} from '@constants/tokens';

export function useThemedStyles<T>(factory: (colors: SemanticColors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}

export function useThemedStylesV2<T>(factory: (colors: SemanticColorsV2) => T): T {
  const colors = useColorsV2();
  return useMemo(() => factory(colors), [colors, factory]);
}
