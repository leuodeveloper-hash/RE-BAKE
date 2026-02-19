import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {SheetHeader} from '@components/BottomSheet/SheetHeader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  /** 좌상단 아이콘 */
  icon?: React.FC<SvgProps>;
  /** 아바타 색상 */
  avatarColor?: AvatarColor;
  /** 상단 중앙 그래픽 (세로 레이아웃) */
  headerGraphic?: React.ReactNode;
  /** 타이틀 텍스트 */
  title?: string;
  /** 타이틀 아래 설명 텍스트 (문자열 또는 인라인 Text 노드) */
  description?: React.ReactNode;
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
  headerGraphic,
  title,
  description,
  children,
  actions,
  showCloseButton = true,
  enableBackdropDismiss = true,
  surface = 'bright',
  width,
}: DialogProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
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
          surface === 'dim' && {backgroundColor: colors['surface-surfacedim']},
          {
            opacity: contentOpacity,
            transform: [{scale}],
          },
        ]}>
        {/* Header: icon + title + close */}
        {(icon || title || showCloseButton) && (
          <SheetHeader
            title={title ?? ''}
            description={description}
            icon={icon}
            avatarColor={avatarColor}
            headerGraphic={headerGraphic}
            onClose={showCloseButton ? onClose : undefined}
          />
        )}

        {/* Content */}
        {children && <View style={styles.content}>{children}</View>}

        {/* Actions */}
        {actions && (
          <View style={styles.actions}>
            {React.Children.map(
              (actions as any)?.type === React.Fragment
                ? (actions as any).props.children
                : actions,
              child => child ? <View style={{flex: 1}}>{child}</View> : null,
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scrim,
    },
    card: {
      width: 312,
      backgroundColor: colors['surface-surfacebright'],
      borderRadius: Radius['radius-xl'],
      paddingBottom: Spacing.lg,
    },
    content: {
      paddingHorizontal: Spacing.lg,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.lg,
      paddingTop: Spacing.xs,
      paddingHorizontal: Spacing.lg,
    },
  });
