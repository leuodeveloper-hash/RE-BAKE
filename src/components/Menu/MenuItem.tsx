import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {IconArrowRight} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

export interface MenuItemProps {
  id: string;
  label: string;
  icon?: React.FC<SvgProps>;
  selected?: boolean;
  /** 하위 메뉴가 있는 경우 arrow 아이콘 표시 */
  hasChildren?: boolean;
  /** 삭제 등 위험한 액션 (빨간색으로 표시) */
  destructive?: boolean;
  /** 비활성 상태 */
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MenuItem({
  label,
  icon: Icon,
  selected,
  hasChildren,
  destructive,
  disabled,
  onPress,
  style,
}: MenuItemProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const iconColor = disabled
    ? colors['foreground-onsurfacedisabled']
    : destructive
      ? colors['foreground-error']
      : selected
        ? colors['foreground-onsurfacevar']
        : colors['foreground-onsurfacemuted'];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.menuItem,
        selected && styles.menuItemSelected,
        pressed && !disabled && styles.menuItemPressed,
        style,
      ]}>
      {Icon && <Icon width={20} height={20} color={iconColor} />}
      <Text style={[
        styles.menuItemLabel,
        destructive && styles.destructiveLabel,
        disabled && styles.disabledLabel,
      ]}>
        {label}
      </Text>
      {hasChildren && (
        <View style={styles.trailingIcon}>
          <IconArrowRight
            width={20}
            height={20}
            color={colors['foreground-onsurfacemuted']}
          />
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.smd,
      paddingHorizontal: Spacing.smd,
      paddingVertical: Spacing.sm,
      borderRadius: Radius['radius-md'],
    },
    menuItemSelected: {
      backgroundColor: colors['background-statelayers-surfacefocus_press'],
    },
    menuItemPressed: {
      backgroundColor: colors['background-statelayers-surfacefocus_press'],
    },
    menuItemLabel: {
      flex: 1,
      fontFamily: Typography.body.large.fontFamily,
      fontSize: Typography.body.large.fontSize,
      fontWeight: Typography.body.large.fontWeight as '500',
      lineHeight: Typography.body.large.lineHeight,
      letterSpacing: -0.25,
      color: colors['foreground-onsurface'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    trailingIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.56,
    },
    destructiveLabel: {
      color: colors['foreground-error'],
    },
    disabledLabel: {
      color: colors['foreground-onsurfacedisabled'],
    },
  });
