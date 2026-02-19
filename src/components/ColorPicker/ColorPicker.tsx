import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {BaseColors, withOpacity} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';

const COLORS: AvatarColor[] = [
  'yellow', 'orange', 'red', 'darkred', 'brown',
  'lime', 'green', 'teal', 'lightblue', 'blue',
  'purple', 'lavender', 'greybrown', 'gray',
];

const DOT_SIZE = 28;
const BORDER_WIDTH = 2;
const SELECTION_GAP = 2;

const COLOR_VALUES: Record<AvatarColor, {bg: string; fg: string}> = {
  gray:      {bg: BaseColors['color-base-grey-80'],      fg: BaseColors['color-base-grey-80']},
  greybrown: {bg: BaseColors['color-base-greybrown-80'], fg: BaseColors['color-base-greybrown-80']},
  brown:     {bg: BaseColors['color-base-brown-80'],     fg: BaseColors['color-base-brown-50']},
  darkred:   {bg: BaseColors['color-base-darkred-80'],   fg: BaseColors['color-base-darkred-80']},
  red:       {bg: BaseColors['color-base-red-80'],       fg: BaseColors['color-base-red-80']},
  orange:    {bg: BaseColors['color-base-orange-80'],    fg: BaseColors['color-base-orange-80']},
  yellow:    {bg: BaseColors['color-base-yellow-80'],    fg: BaseColors['color-base-yellow-80']},
  lime:      {bg: BaseColors['color-base-lime-80'],      fg: BaseColors['color-base-lime-80']},
  green:     {bg: BaseColors['color-base-green-80'],     fg: BaseColors['color-base-green-80']},
  teal:      {bg: BaseColors['color-base-teal-80'],      fg: BaseColors['color-base-teal-80']},
  lightblue: {bg: BaseColors['color-base-lightblue-80'], fg: BaseColors['color-base-lightblue-80']},
  blue:      {bg: BaseColors['color-base-blue-80'],      fg: BaseColors['color-base-blue-80']},
  purple:    {bg: BaseColors['color-base-purple-80'],    fg: BaseColors['color-base-purple-80']},
  lavender:  {bg: BaseColors['color-base-lavender-80'],  fg: BaseColors['color-base-lavender-80']},
};

/** AvatarColor → 아이콘에 사용할 0.64 opacity 색상 */
export function getColorValue(color: AvatarColor): string {
  return withOpacity(COLOR_VALUES[color].bg, 0.64);
}

/** AvatarColor → 시맨틱 var 토큰 키 */
const VAR_KEY_MAP: Record<string, string> = {
  gray: 'custom-greyvar',
  lavender: 'custom-lavendarvar',
};

export function getColorVarKey(color: AvatarColor): keyof SemanticColors {
  return (VAR_KEY_MAP[color] || `custom-${color}var`) as keyof SemanticColors;
}

export interface ColorPickerProps {
  selected: AvatarColor;
  onSelect: (color: AvatarColor) => void;
  label?: string;
  /** 표시할 색상 목록 (기본: 전체) */
  colors?: AvatarColor[];
  /** 도트 크기 (기본: 28) */
  dotSize?: number;
}

export function ColorPicker({selected, onSelect, label, colors: colorsProp, dotSize = DOT_SIZE}: ColorPickerProps) {
  const visibleColors = colorsProp ?? COLORS;
  const themedStyles = useThemedStyles(createThemedStyles);
  const colors = useColors();
  const size = dotSize;
  return (
    <View>
      {label && <Text style={themedStyles.label}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {visibleColors.map(color => {
          const isSelected = color === selected;
          const varKey = getColorVarKey(color);
          const outerSize = size + SELECTION_GAP * 2 + BORDER_WIDTH * 2;
          return (
            <Pressable
              key={color}
              onPress={() => onSelect(color)}
              style={{
                width: outerSize,
                height: outerSize,
                borderRadius: outerSize / 2,
                borderWidth: BORDER_WIDTH,
                borderColor: isSelected ? colors['border-borderbold'] : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                padding: SELECTION_GAP,
              }}>
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: colors[varKey],
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createThemedStyles = (colors: SemanticColors) => StyleSheet.create({
  label: {
    ...Typography.label.medium,
    color: colors['foreground-onsurfacemuted'],
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
});
