import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SemanticColorsLight, Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {IconArrowRight} from '@components/Icon/IconIndex';

export interface MenuItemProps {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  selected?: boolean;
  /** 하위 메뉴가 있는 경우 arrow 아이콘 표시 */
  hasChildren?: boolean;
  /** 삭제 등 위험한 액션 (빨간색으로 표시) */
  destructive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MenuItem({
  label,
  icon: Icon,
  selected,
  hasChildren,
  destructive,
  onPress,
  style,
}: MenuItemProps) {
  const iconColor = destructive
    ? SemanticColorsLight['foreground-error']
    : selected
      ? SemanticColorsLight['foreground-onsurfacevar']
      : SemanticColorsLight['foreground-onsurfacemuted'];

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.menuItem,
        selected && styles.menuItemSelected,
        pressed && styles.menuItemPressed,
        style,
      ]}>
      <Icon width={20} height={20} color={iconColor} />
      <Text style={[styles.menuItemLabel, destructive && styles.destructiveLabel]}>
        {label}
      </Text>
      {hasChildren && (
        <View style={styles.trailingIcon}>
          <IconArrowRight
            width={20}
            height={20}
            color={SemanticColorsLight['foreground-onsurfacemuted']}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    borderRadius: Radius['radius-md'],
  },
  menuItemSelected: {
    backgroundColor: SemanticColorsLight['background-statelayers-surfacefocus_press'],
  },
  menuItemPressed: {
    backgroundColor: SemanticColorsLight['background-statelayers-surfacefocus_press'],
  },
  menuItemLabel: {
    flex: 1,
    fontFamily: Typography.body.large.fontFamily,
    fontSize: Typography.body.large.fontSize,
    fontWeight: Typography.body.large.fontWeight as '500',
    lineHeight: Typography.body.large.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  trailingIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.56,
  },
  destructiveLabel: {
    color: SemanticColorsLight['foreground-error'],
  },
});
