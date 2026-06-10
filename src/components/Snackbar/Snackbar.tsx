import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Card} from '@components/Container/Card';
import {AppIcon} from '@components/Icon/AppIcon';
import {Button} from '@components/Button/Button';
import {IconButton} from '@components/IconButton';
import {IconClose, IconCircleInfoFilled1} from '@components/Icon/IconIndex';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2, useTheme} from '@contexts/ThemeContext';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

const ANIMATION_DURATION = 200;
const AUTO_DISMISS_DELAY = 3000;

export interface SnackbarProps {
  message: string;
  icon?: React.FC<SvgProps>;
  action?: {label: string; onPress: () => void};
  onClose?: () => void;
  visible?: boolean;
  style?: ViewStyle;
}

export function Snackbar({message, icon = IconCircleInfoFilled1, action, onClose, visible = false, style}: SnackbarProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const {elevation} = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const isVisible = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible && !isVisible.current) {
      // 등장 애니메이션
      isVisible.current = true;
      Animated.parallel([
        Animated.timing(opacity, {toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true}),
      ]).start();

      // 자동 닫기
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onClose?.();
      }, AUTO_DISMISS_DELAY);
    } else if (!visible && isVisible.current) {
      // 퇴장 애니메이션
      clearTimeout(timerRef.current);
      Animated.parallel([
        Animated.timing(opacity, {toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: 8, duration: ANIMATION_DURATION, useNativeDriver: true}),
      ]).start(() => {
        isVisible.current = false;
      });
    }

    return () => clearTimeout(timerRef.current);
  }, [visible]);

  return (
    <Animated.View style={{opacity, transform: [{translateY}]}} pointerEvents={visible ? 'auto' : 'none'}>
      <Card style={[styles.container, elevation['4'], style]}>
        <AppIcon icon={icon} size="sm" color={colors['foreground/on-surface-muted']} />
        <Text style={styles.message}>{message}</Text>
        {(action || onClose) && (
          <View style={styles.actions}>
            {action && (
              <Button
                label={action.label}
                onPress={action.onPress}
                variant="ghost"
                accent
                size="small"
              />
            )}
            {onClose && (
              <IconButton
                icon={IconClose}
                variant="ghost-secondary"
                size="small"
                onPress={onClose}
              />
            )}
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    minWidth: 360,
    maxWidth: 400,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.smd,
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  actions: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    marginLeft: 'auto',
    gap: Spacing.xs,
  },
  actionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/accent'],
    marginTop: FONT_BASELINE_OFFSET,
  },
});
