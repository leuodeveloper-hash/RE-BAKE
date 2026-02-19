import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {IconCaretRight, IconCheckboxFilled, IconCheckboxBlank} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

export interface MenuItemProps {
  id: string;
  label: string;
  icon?: React.FC<SvgProps>;
  /** 아이콘 색상 커스텀 (기본: 상태별 자동) */
  iconColor?: string;
  selected?: boolean;
  /** 체크박스 표시 (undefined이면 체크박스 없음) */
  checked?: boolean;
  /** 하위 메뉴가 있는 경우 arrow 아이콘 표시 */
  hasChildren?: boolean;
  /** 우측 텍스트 (예: 재료 양) */
  trailingText?: string;
  /** 삭제 등 위험한 액션 (빨간색으로 표시) */
  destructive?: boolean;
  /** 비활성 상태 */
  disabled?: boolean;
  /** 하단 구분선 */
  showDivider?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MenuItem({
  label,
  icon: Icon,
  iconColor: iconColorProp,
  selected,
  checked,
  hasChildren,
  trailingText,
  destructive,
  disabled,
  showDivider,
  onPress,
  style,
}: MenuItemProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const iconColor = iconColorProp ?? (disabled
    ? colors['foreground-onsurfacedisabled']
    : destructive
      ? colors['foreground-error']
      : selected
        ? colors['foreground-onsurfacevar']
        : colors['foreground-onsurfacemuted']);

  return (
    <View style={style}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({pressed}) => [
          styles.menuItem,
          (selected || checked) && styles.menuItemSelected,
          pressed && !disabled && styles.menuItemPressed,
        ]}>
        {checked !== undefined ? (
          checked ? (
            <IconCheckboxFilled width={20} height={20} color={colors['custom-brown']} />
          ) : (
            <View style={styles.checkboxBlankIcon}>
              <IconCheckboxBlank width={20} height={20} color={colors['foreground-onsurface']} />
            </View>
          )
        ) : Icon ? (
          <Icon width={20} height={20} color={iconColor} />
        ) : null}
        <Text style={[
          styles.menuItemLabel,
          destructive && styles.destructiveLabel,
          disabled && styles.disabledLabel,
        ]}>
          {label}
        </Text>
        {trailingText !== undefined && (
          <Text style={styles.trailingText}>{trailingText}</Text>
        )}
        {hasChildren && (
          <View style={styles.trailingIcon}>
            <IconCaretRight
              width={20}
              height={20}
              color={colors['foreground-onsurfacemuted']}
            />
          </View>
        )}
      </Pressable>
      {showDivider && (
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
        </View>
      )}
    </View>
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
    checkboxBlankIcon: {
      opacity: 0.56,
    },
    trailingText: {
      fontFamily: Typography.body.large.fontFamily,
      fontSize: Typography.body.large.fontSize,
      fontWeight: Typography.body.large.fontWeight as '500',
      lineHeight: Typography.body.large.lineHeight,
      letterSpacing: -0.25,
      color: colors['foreground-onsurfacemuted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    dividerContainer: {
      paddingLeft: 44,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors['border-borderlight'],
    },
  });
