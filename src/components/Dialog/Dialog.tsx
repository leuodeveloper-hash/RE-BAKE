import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconButton} from '@components/Layout/IconButton';
import {IconClose} from '@components/Icon/IconIndex';
import {Avatar, AvatarColor} from '@components/Avatar/Avatar';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  /** 좌상단 아이콘 */
  icon?: React.FC<SvgProps>;
  /** 아바타 색상 */
  avatarColor?: AvatarColor;
  /** 타이틀 텍스트 */
  title?: string;
  /** 커스텀 콘텐츠 */
  children?: React.ReactNode;
  /** 하단 버튼 영역 */
  actions?: React.ReactNode;
  /** 닫기 버튼 표시 (기본: true) */
  showCloseButton?: boolean;
  /** 배경 탭으로 닫기 (기본: true) */
  enableBackdropDismiss?: boolean;
  /** 카드 배경 (기본: 'bright') */
  surface?: 'bright' | 'dim';
  /** 카드 너비 (기본: 312) */
  width?: number;
}

const ANIMATION_DURATION = 200;

export function Dialog({
  visible,
  onClose,
  icon,
  avatarColor,
  title,
  children,
  actions,
  showCloseButton = true,
  enableBackdropDismiss = true,
  surface = 'bright',
  width,
}: DialogProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      wasVisible.current = true;
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else if (!visible && wasVisible.current) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        wasVisible.current = false;
        setRendered(false);
      });
    }
  }, [visible, backdropOpacity, scale, contentOpacity]);

  const handleBackdropPress = () => {
    if (enableBackdropDismiss) onClose();
  };

  if (!visible && !rendered) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
          },
        ]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>

      {/* Dialog Card */}
      <Animated.View
        style={[
          styles.card,
          width != null && {width},
          surface === 'dim' && {backgroundColor: SemanticColorsLight['surface-surfacedim']},
          {
            opacity: contentOpacity,
            transform: [{scale}],
          },
        ]}>
        {/* Header: icon + close */}
        {(icon || showCloseButton) && (
          <View style={styles.header}>
            {icon && (
              <Avatar
                type="icon"
                icon={icon}
                shape="circle"
                size="medium"
                color={avatarColor}
              />
            )}
            <View style={styles.headerSpacer} />
            {showCloseButton && (
              <IconButton
                icon={IconClose}
                variant="soft"
                size="small"
                onPress={onClose}
              />
            )}
          </View>
        )}

        {/* Title */}
        {title && <Text style={styles.title}>{title}</Text>}

        {/* Content */}
        {children && <View style={styles.content}>{children}</View>}

        {/* Actions */}
        {actions && <View style={styles.actions}>{actions}</View>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SemanticColorsLight.scrim,
  },
  card: {
    width: 312,
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
    borderRadius: Radius['radius-xl'],
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: Spacing.md,
  },
  headerSpacer: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    color: SemanticColorsLight['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  content: {
    marginTop: Spacing.smd,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
