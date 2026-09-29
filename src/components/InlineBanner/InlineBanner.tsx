import React from 'react';
import {Pressable, StyleSheet, Text, View, StyleProp, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconClose} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export type InlineBannerColor = 'default' | 'accent' | 'negative' | 'warning';
export type InlineBannerSize = 'small' | 'medium';

export interface InlineBannerProps {
  label: string;
  /** 좌측 leading 아이콘 */
  icon?: React.FC<SvgProps>;
  /** 색상 변형 (기본: accent) */
  color?: InlineBannerColor;
  /** 사이즈 (기본: medium) */
  size?: InlineBannerSize;
  /** 우측 액션 (tonal 버튼) */
  action?: {
    label: string;
    onPress: () => void;
  };
  /** 우측 닫기 버튼 핸들러. 제공 시 X 버튼 표시 */
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

interface ColorScheme {
  bg: keyof ReturnType<typeof useColors>;
  border: keyof ReturnType<typeof useColors>;
  text: keyof ReturnType<typeof useColors>;
  iconColor: keyof ReturnType<typeof useColors>;
  actionBg: keyof ReturnType<typeof useColors>;
  actionText: keyof ReturnType<typeof useColors>;
}

const COLOR_SCHEMES: Record<InlineBannerColor, ColorScheme> = {
  accent: {
    bg: 'fill/accent',
    border: 'border/accent-subtle',
    text: 'foreground/on-accent-container',
    iconColor: 'foreground/accent',
    actionBg: 'fill/accent',
    actionText: 'foreground/on-accent-container',
  },
  default: {
    bg: 'fill/faint',
    border: 'border/subtle',
    text: 'foreground/on-surface-var',
    iconColor: 'foreground/on-surface-muted',
    actionBg: 'fill/accent',
    actionText: 'foreground/on-accent-container',
  },
  negative: {
    bg: 'fill/negative',
    border: 'border/negative-subtle',
    text: 'foreground/negative',
    iconColor: 'foreground/negative',
    actionBg: 'fill/negative',
    actionText: 'foreground/negative',
  },
  warning: {
    bg: 'custom/yellow-subtle',
    border: 'custom/yellow-border',
    text: 'custom/yellow',
    iconColor: 'custom/yellow',
    actionBg: 'custom/yellow-subtle',
    actionText: 'custom/yellow',
  },
};

export function InlineBanner({
  label,
  icon,
  color = 'accent',
  size = 'medium',
  action,
  onClose,
  style,
}: InlineBannerProps) {
  const colors = useColors();
  const scheme = COLOR_SCHEMES[color];

  const isMedium = size === 'medium';
  const iconSize = isMedium ? 20 : 16;
  const textStyle = isMedium ? styles.textMedium : styles.textSmall;

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: colors[scheme.bg]},
        style,
      ]}>
      <View style={[styles.content, isMedium ? styles.contentMedium : styles.contentSmall]}>
        {icon && (
          <AppIcon
            icon={icon}
            size={isMedium ? 'md' : 'sm'}
            color={colors[scheme.iconColor]}
          />
        )}
        <Text style={[textStyle, {color: colors[scheme.text]}]}>{label}</Text>
      </View>

      {(action || onClose) && (
        <View style={[styles.actions, isMedium ? styles.actionsMedium : styles.actionsSmall]}>
          {action && (
            <Pressable
              onPress={action.onPress}
              style={({pressed}) => [
                isMedium ? styles.actionBtnMedium : styles.actionBtnSmall,
                {backgroundColor: colors[scheme.actionBg]},
                pressed && {opacity: 0.7},
              ]}>
              <Text
                style={[
                  isMedium ? styles.actionTextMedium : styles.actionTextSmall,
                  {color: colors[scheme.actionText]},
                ]}>
                {action.label}
              </Text>
            </Pressable>
          )}
          {onClose && (
            <Pressable
              onPress={onClose}
              hitSlop={4}
              style={({pressed}) => [
                styles.closeBtn,
                isMedium ? styles.closeBtnMedium : styles.closeBtnSmall,
                pressed && {opacity: 0.7},
              ]}>
              <IconClose
                width={iconSize}
                height={iconSize}
                color={colors['foreground/on-surface-muted']}
              />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    minHeight: 40,
  },
  contentMedium: {
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 12,
  },
  contentSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textMedium: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: '600',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: 0.2,
    marginTop: FONT_BASELINE_OFFSET,
  },
  textSmall: {
    flex: 1,
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: '500',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: 0.2,
    marginTop: FONT_BASELINE_OFFSET,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  actionsMedium: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionsSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnMedium: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSmall: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextMedium: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: '600',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: 0.2,
    marginTop: FONT_BASELINE_OFFSET,
  },
  actionTextSmall: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: 0.2,
    marginTop: FONT_BASELINE_OFFSET,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  closeBtnMedium: {
    width: 32,
    height: 32,
  },
  closeBtnSmall: {
    width: 24,
    height: 24,
  },
});
