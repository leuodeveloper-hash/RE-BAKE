import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {
  IconCheckboxFilled,
  IconCheckboxBlank,
  IconCheckboxIndeterminateFilled,
} from '@components/Icon/IconIndex';

export type CheckboxColor = 'default' | 'red' | 'gray';

export interface CheckboxProps {
  /** 선택 상태 */
  checked?: boolean;
  /** 부분 선택 상태 (checked보다 우선) */
  indeterminate?: boolean;
  /** 비활성화 */
  disabled?: boolean;
  /** 색상 테마 (default: brown, red: error, gray) */
  color?: CheckboxColor;
  /** 터치 핸들러 */
  onPress?: () => void;
}

export function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  color = 'default',
  onPress,
}: CheckboxProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const isSelected = checked || indeterminate;

  // 아이콘 색상: 선택 상태에 따라 다름
  const iconColor = (() => {
    if (!isSelected) {
      // Unselected: red는 error 색상, 나머지는 onsurface
      return color === 'red'
        ? colors['foreground-error']
        : colors['foreground-onsurface'];
    }
    switch (color) {
      case 'red':
        return colors['foreground-error'];
      case 'gray':
        return colors['custom-grey'];
      default:
        return colors['custom-brown'];
    }
  })();

  const Icon = indeterminate
    ? IconCheckboxIndeterminateFilled
    : checked
      ? IconCheckboxFilled
      : IconCheckboxBlank;

  const pressedStyle =
    color === 'red' ? styles.stateLayerError : styles.stateLayer;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.container,
        pressed && pressedStyle,
        disabled && styles.disabled,
      ]}>
      <View
        style={
          !isSelected && color !== 'red' ? styles.unselectedIcon : undefined
        }>
        <Icon width={20} height={20} color={iconColor} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      width: 40,
      height: 40,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateLayer: {
      backgroundColor: colors['background-statelayers-surfacefocus_press'],
    },
    stateLayerError: {
      backgroundColor: colors['background-statelayers-errorfocused_pressed'],
    },
    disabled: {
      opacity: 0.38,
    },
    unselectedIcon: {
      opacity: 0.56,
    },
  });
