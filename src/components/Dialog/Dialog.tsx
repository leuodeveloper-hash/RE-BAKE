import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {IconClose} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {SheetHeader} from '@components/BottomSheet/SheetHeader';
import {BlurView} from 'expo-blur';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  /** 좌상단 아이콘 */
  icon?: React.FC<SvgProps>;
  /** 아바타 색상 */
  avatarColor?: AvatarColor;
  /** 상단 중앙 그래픽 (세로 레이아웃) */
  headerGraphic?: React.ReactNode;
  /** 상단 풀폭 이미지 (이미지 헤더 타입) */
  headerImage?: ImageSourcePropType;
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
  /** 배경 블러 (기본: false) */
  blurBackdrop?: boolean;
  /** 헤더 레이아웃 (기본: 'default') */
  headerType?: 'default' | 'center';
}

const ANIMATION_DURATION = 200;

export function Dialog({
  visible,
  onClose,
  icon,
  avatarColor,
  headerGraphic,
  headerImage,
  title,
  description,
  children,
  actions,
  showCloseButton = true,
  enableBackdropDismiss = true,
  surface = 'bright',
  width,
  blurBackdrop = false,
  headerType,
}: DialogProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const {height: windowHeight} = useWindowDimensions();
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

  return (
    <Modal visible={visible || rendered} transparent animationType="none" statusBarTranslucent>
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          blurBackdrop && styles.blurBackdrop,
          {
            opacity: blurBackdrop
              ? backdropOpacity
              : backdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
          },
        ]}>
        {blurBackdrop && (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>

      {/* Dialog Card */}
      <Animated.View style={{alignSelf: 'center'}}>
      <Animated.View
        style={[
          styles.card,
          {maxHeight: windowHeight * 0.85},
          width != null && {width},
          surface === 'dim' && {backgroundColor: colors['surface/dim']},
          {
            opacity: contentOpacity,
            transform: [{scale}],
          },
        ]}>
        {/* Header: image type or default */}
        {headerImage ? (
          <>
            <View style={styles.imageHeader}>
              <Image source={headerImage} style={styles.headerImage} resizeMode="cover" />
              {showCloseButton && (
                <View style={styles.imageCloseButton}>
                  <IconButton icon={IconClose} variant="soft" onImage size="small" onPress={onClose} />
                </View>
              )}
            </View>
            <View style={styles.imageHeaderText}>
              {title && <Text style={styles.imageTitle}>{title}</Text>}
              {description && <Text style={styles.imageDescription}>{typeof description === 'string' ? description : description}</Text>}
            </View>
          </>
        ) : (icon || title || showCloseButton) && (
          <SheetHeader
            title={title ?? ''}
            description={description}
            icon={icon}
            avatarColor={avatarColor}
            headerGraphic={headerGraphic}
            headerType={headerType}
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
      </Animated.View>
    </View>
    </Modal>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors['overlay/strong'],
    },
    blurBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    card: {
      width: 312,
      minHeight: 160,
      backgroundColor: colors['surface/bright'],
      borderRadius: Radius['radius-xl'],
      paddingBottom: Spacing.lg,
    },
    content: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    imageHeader: {
      alignSelf: 'stretch',
      aspectRatio: 2,
      overflow: 'hidden' as const,
      borderTopLeftRadius: Radius['radius-xl'],
      borderTopRightRadius: Radius['radius-xl'],
    },
    headerImage: {
      width: '100%' as any,
      height: '100%' as any,
    },
    imageCloseButton: {
      position: 'absolute' as const,
      top: Spacing.smd,
      right: Spacing.smd,
    },
    imageHeaderText: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center' as const,
    },
    imageTitle: {
      ...Typography.title.large,
      color: colors['foreground/on-surface'],
      marginTop: FONT_BASELINE_OFFSET,
      textAlign: 'center' as const,
    },
    imageDescription: {
      ...Typography.body.medium,
      color: colors['foreground/on-surface-muted'],
      marginTop: Spacing.sm,
      textAlign: 'center' as const,
    },
  });
