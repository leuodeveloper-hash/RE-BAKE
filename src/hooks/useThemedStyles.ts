import {useMemo} from 'react';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';

export function useThemedStyles<T>(factory: (colors: SemanticColors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
