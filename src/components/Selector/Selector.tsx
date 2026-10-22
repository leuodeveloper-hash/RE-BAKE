import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconChevronUpDown} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';

export type SelectorVariant = 'ghost' | 'filled' | 'outlined' | 'tonal' | 'circle';
/** large = 한 단계 큰 둥근 필(44) — big 탭과 나란히 */
export type SelectorSize = 'medium' | 'small' | 'large';

export interface SelectorProps {
  /** 이름 — 없으면 앞 아이콘(예: 색 점)과 ⌃⌄만 */
  label?: string;
  showDropdown?: boolean;
  onPress?: () => void;
  variant?: SelectorVariant;
  /** 크기 (기본: medium). small = 보조 컨트롤용 축소 */
  size?: SelectorSize;
  disabled?: boolean;
  forcePressed?: boolean;
  /** 텍스트 색상 muted 적용 (disabled와 독립) */
  muted?: boolean;
  /** 드롭다운 아이콘 override (기본: chevron-up-down 위/아래). 예: 소팅(IconSorting) */
  dropdownIcon?: React.FC<SvgProps>;
  /** 라벨 앞 leading 아이콘 (선택된 축/항목 아이콘 — 메뉴와 동일하게 표시) */
  leadingIcon?: React.FC<SvgProps>;
  /** leading 아이콘 색상 (기본: 아이콘 기본색) */
  leadingIconColor?: string;
  /** 앞에 색 칩(색 피커) — 아이콘 대신 이 색 동그라미 */
  leadingColor?: string;
  style?: import('react-native').ViewStyle;
}

export function Selector({
  label,
  showDropdown = false,
  onPress,
  variant = 'ghost',
  size = 'medium',
  disabled = false,
  forcePressed = false,
  muted = false,
  dropdownIcon,
  leadingIcon,
  leadingIconColor,
  leadingColor,
  style,
}: SelectorProps) {
  const colors = useColors();
  const isSmall = size === 'small';

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: Spacing.md, // 16px
      paddingVertical: Spacing.xs, // 4px
      gap: Spacing.xs, // 4px — 레이블-아이콘 밀착
      borderRadius: Radius['radius-full'],
    };

    // Background color by variant
    switch (variant) {
      case 'filled':
        baseStyle.backgroundColor = disabled
          ? colors['fill/strong']
          : colors['surface/inverse'];
        break;
      case 'outlined':
        baseStyle.backgroundColor =
          colors['surface/container'];
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = disabled
          ? colors['border/muted']
          : colors['border/normal'];
        break;
      case 'tonal':
        baseStyle.backgroundColor = colors['fill/subtle'];
        baseStyle.borderRadius = Radius['radius-md'];
        baseStyle.paddingHorizontal = Spacing.smd;
        // large = 입력칸(TextInput 48)과 나란히 놓을 때 같은 높이
        baseStyle.minHeight = size === 'large' ? 48 : 40;
        break;
      case 'circle':
        // 완전 둥근 필(버튼형) — tonal과 동일 톤, radius만 full.
        // 높이는 채운 탭(Tabs: 32 + 위아래 2)과 같은 36 — 탭 옆에 나란히 놓으면 높이가 맞는다
        baseStyle.backgroundColor = colors['fill/subtle'];
        baseStyle.borderRadius = Radius['radius-full'];
        baseStyle.paddingHorizontal = Spacing.md;
        baseStyle.height = size === 'large' ? 44 : 36;
        baseStyle.paddingVertical = 0;
        break;
      case 'ghost':
      default:
        baseStyle.backgroundColor = 'transparent';
        baseStyle.height = isSmall ? 32 : 40;
        baseStyle.paddingHorizontal = isSmall ? Spacing.sm : Spacing.smd; // 8 : 12px
        break;
    }

    // 드롭다운 아이콘은 뷰박스 내부 여백이 있어 우측이 넓어 보임 → 우측 패딩 살짝 보정
    if (showDropdown) {
      baseStyle.paddingRight = (baseStyle.paddingHorizontal as number) - Spacing.xs;
    }

    // Pressed state
    if ((pressed || forcePressed) && !disabled) {
      if (variant === 'filled') {
        baseStyle.backgroundColor =
          colors['state/pressed'];
      } else {
        baseStyle.backgroundColor =
          colors['state/pressed'];
      }
    }

    return baseStyle;
  };

  const getTextColor = (): string => {
    if (muted) {
      return colors['foreground/on-surface-muted'];
    }
    if (disabled) {
      return colors['foreground/on-surface-disabled'];
    }
    if (variant === 'filled') {
      return colors['foreground/on-surface-inverse'];
    }
    return colors['foreground/on-surface'];
  };

  const getIconColor = (): string => {
    if (disabled) {
      return colors['foreground/on-surface-disabled'];
    }
    if (variant === 'filled') {
      return colors['foreground/on-surface-inverse'];
    }
    return colors['foreground/on-surface-muted'];
  };

  return (
    <Pressable onPress={onPress} disabled={disabled} style={style}>
      {({pressed, focused}: {pressed: boolean; focused: boolean}) => (
        // 누르는 동안만 바탕 — 웹은 클릭 뒤 포커스가 남아 회색 알약이 계속 보였다
        <View style={getContainerStyle(pressed)}>
          {leadingColor ? (
            // 색 칩 — 앞 아이콘 대신 그 색으로 채운 동그라미(메뉴의 색 점과 같은 20)
            <View style={[styles.colorChip, {backgroundColor: leadingColor}, label ? {marginRight: Spacing.xs} : null]} />
          ) : leadingIcon && (
            // 앞 아이콘과 이름 사이 8 — 셀렉터 기본 간격(4, 이름·⌃⌄ 밀착)에 4를 더한다(이름이 없으면 기본 간격만)
            <View style={label ? {marginRight: Spacing.xs} : undefined}>
              <AppIcon
                icon={leadingIcon}
                size="sm"
                color={leadingIconColor ?? getIconColor()}
              />
            </View>
          )}
          {label ? <Text style={[styles.label, variant === 'circle' && styles.labelCircle, isSmall && styles.labelSmall, {color: getTextColor()}]} numberOfLines={1}>{label}</Text> : null}
          {showDropdown && (
            <AppIcon
              icon={dropdownIcon ?? IconChevronUpDown}
              size="sm"
              color={getIconColor()}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    marginTop: FONT_BASELINE_OFFSET,
  },
  // 둥근 필(circle)은 채운 탭과 나란히 쓰는 일이 많다 — 탭 글씨(title.small)와 같게
  colorChip: {width: 20, height: 20, borderRadius: 10},
  labelCircle: {
    fontFamily: Typography.title.small.fontFamily,
    fontSize: Typography.title.small.fontSize,
    fontWeight: Typography.title.small.fontWeight as '600',
    lineHeight: Typography.title.small.lineHeight,
  },
  labelSmall: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    marginTop: 0,
  },
});
