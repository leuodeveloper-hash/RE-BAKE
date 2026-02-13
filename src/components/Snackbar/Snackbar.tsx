import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Card} from '@components/Layout/Card';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconButton} from '@components/Layout/IconButton';
import {IconClose, IconCircleInfoFilled} from '@components/Icon/IconIndex';
import {SemanticColorsLight} from '@constants/tokens';
import {ElevationLight} from '@constants/elevation';
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

export function Snackbar({message, icon = IconCircleInfoFilled, action, onClose, visible = false, style}: SnackbarProps) {
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
      <Card style={[styles.container, style]}>
        <AppIcon icon={icon} size="sm" color={SemanticColorsLight['foreground-onsurfacemuted']} />
        <Text style={styles.message}>{message}</Text>
        {(action || onClose) && (
          <View style={styles.actions}>
            {action && (
              <Pressable style={styles.actionButton} onPress={action.onPress}>
                <Text style={styles.actionText}>{action.label}</Text>
              </Pressable>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    minWidth: 360,
    maxWidth: 400,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.smd,
    gap: Spacing.sm,
    ...ElevationLight['4'],
  },
  message: {
    flex: 1,
    minWidth: '60%',
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: Spacing.xs,
  },
  actionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: SemanticColorsLight['foreground-accent'],
    marginTop: FONT_BASELINE_OFFSET,
  },
});
