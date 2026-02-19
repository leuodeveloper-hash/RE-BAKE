import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SheetHeader} from './SheetHeader';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const ANIMATION_CONFIG = {
  spring: {
    tension: 100,
    friction: 12,
    useNativeDriver: true,
  },
  springFast: {
    tension: 150,
    friction: 15,
    useNativeDriver: true,
  },
  timing: {
    duration: 300,
    useNativeDriver: true,
  },
};

const DISMISS_THRESHOLD = 0.3;
const VELOCITY_THRESHOLD = 800;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  headerGraphic?: React.ReactNode;
  headerType?: 'default' | 'center';
  height?: number | 'auto';
  enableDragToDismiss?: boolean;
  enableBackdropDismiss?: boolean;
  fullScreen?: boolean;
  backgroundColor?: string;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  title,
  description,
  headerGraphic,
  headerType,
  height = 'auto',
  enableDragToDismiss = true,
  enableBackdropDismiss = true,
  fullScreen = false,
  backgroundColor,
}: BottomSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {top: safeTop, bottom: safeBottom} = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(0);
  // 내부 마운트 상태: 닫기 애니메이션 완료까지 유지
  const [mounted, setMounted] = useState(false);
  const closingRef = useRef(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 닫기 애니메이션
  const animateClose = useCallback((velocity?: number) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const targetY = contentHeight.current || SCREEN_HEIGHT;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: targetY,
        velocity: velocity,
        ...ANIMATION_CONFIG.springFast,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closingRef.current = false;
      setMounted(false);
      translateY.setValue(SCREEN_HEIGHT);
      onCloseRef.current();
    });
  }, [translateY, backdropOpacity]);

  // visible prop 변화 감지
  useEffect(() => {
    if (visible && !mounted) {
      // 열기
      closingRef.current = false;
      setMounted(true);
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      // 다음 프레임에서 애니메이션 시작 (마운트 후)
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(translateY, {toValue: 0, ...ANIMATION_CONFIG.spring}),
          Animated.timing(backdropOpacity, {toValue: 1, ...ANIMATION_CONFIG.timing}),
        ]).start();
      });
    } else if (!visible && mounted && !closingRef.current) {
      // 외부에서 visible=false로 바뀜 → 애니메이션 후 닫기
      animateClose();
    }
  }, [visible]);

  // ── 드래그 제스처 (직접 Responder — 핸들 영역 전용) ──
  const dragStartY = useRef(0);
  const dragLastY = useRef(0);
  const dragLastTime = useRef(0);
  const dragVelocity = useRef(0);
  const contentTouchStartY = useRef(0);

  const onDragGrant = useCallback((e: GestureResponderEvent) => {
    dragStartY.current = e.nativeEvent.pageY;
    dragLastY.current = e.nativeEvent.pageY;
    dragLastTime.current = Date.now();
    dragVelocity.current = 0;
  }, []);

  const onDragMove = useCallback((e: GestureResponderEvent) => {
    const dy = e.nativeEvent.pageY - dragStartY.current;
    const now = Date.now();
    const dt = (now - dragLastTime.current) / 1000;
    if (dt > 0) {
      dragVelocity.current = (e.nativeEvent.pageY - dragLastY.current) / dt;
    }
    dragLastY.current = e.nativeEvent.pageY;
    dragLastTime.current = now;
    if (dy > 0) translateY.setValue(dy);
  }, [translateY]);

  const onDragRelease = useCallback(() => {
    const dy = dragLastY.current - dragStartY.current;
    const vy = dragVelocity.current;
    const sheetHeight = contentHeight.current || 300;
    if (vy > VELOCITY_THRESHOLD || dy > sheetHeight * DISMISS_THRESHOLD) {
      animateClose(vy);
    } else {
      Animated.spring(translateY, {toValue: 0, ...ANIMATION_CONFIG.spring}).start();
    }
  }, [translateY, animateClose]);

  const onDragTerminate = useCallback(() => {
    Animated.spring(translateY, {toValue: 0, ...ANIMATION_CONFIG.spring}).start();
  }, [translateY]);

  const handleBackdropPress = useCallback(() => {
    if (enableBackdropDismiss) {
      animateClose();
    }
  }, [enableBackdropDismiss, animateClose]);

  const handleLayout = (event: {nativeEvent: {layout: {height: number}}}) => {
    contentHeight.current = event.nativeEvent.layout.height;
  };

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}>
      <View style={[styles.container, !fullScreen && {paddingBottom: Math.max(Spacing.sm, safeBottom)}, fullScreen && styles.containerFullScreen]}>
        {/* 배경 오버레이 */}
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

        {/* 시트 컨테이너 */}
        <Animated.View
          style={[
            styles.sheetContainer,
            fullScreen && styles.sheetFullScreen,
            fullScreen && backgroundColor ? {backgroundColor} : undefined,
            height !== 'auto' && !fullScreen && {height},
            {transform: [{translateY}]},
          ]}
          onLayout={handleLayout}>
          <View style={fullScreen ? styles.wrapperFullScreen : undefined}>
            {/* 핸들: 터치 즉시 드래그 시작 */}
            <View
              onStartShouldSetResponder={() => enableDragToDismiss}
              onResponderGrant={onDragGrant}
              onResponderMove={onDragMove}
              onResponderRelease={onDragRelease}
              onResponderTerminate={onDragTerminate}
              style={[styles.handleContainer, fullScreen && {paddingTop: safeTop}]}
            >
              <View style={styles.handle} />
            </View>

            <View
              style={fullScreen ? {flex: 1} : undefined}
              onStartShouldSetResponderCapture={(e: GestureResponderEvent) => {
                contentTouchStartY.current = e.nativeEvent.pageY;
                return false;
              }}
              onMoveShouldSetResponderCapture={(e: GestureResponderEvent) => {
                if (!enableDragToDismiss) return false;
                const dy = e.nativeEvent.pageY - contentTouchStartY.current;
                return dy > 10;
              }}
              onResponderGrant={(e: GestureResponderEvent) => {
                dragStartY.current = contentTouchStartY.current;
                dragLastY.current = e.nativeEvent.pageY;
                dragLastTime.current = Date.now();
                dragVelocity.current = 0;
                const dy = e.nativeEvent.pageY - contentTouchStartY.current;
                if (dy > 0) translateY.setValue(dy);
              }}
              onResponderMove={onDragMove}
              onResponderRelease={onDragRelease}
              onResponderTerminate={onDragTerminate}
            >
              {title && <SheetHeader title={title} description={description} onClose={() => animateClose()} headerGraphic={headerGraphic} headerType={headerType} />}

              <View style={[styles.content, fullScreen && styles.contentFullScreen]}>{children}</View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: Spacing.sm,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scrim,
    },
    sheetContainer: {
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
      backgroundColor: colors['surface-surfacebright'],
      borderRadius: Radius['radius-xl'],
      shadowColor: colors.shadow,
      shadowOffset: {width: 0, height: -4},
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 20,
    },
    handleContainer: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: Radius['radius-full'],
      backgroundColor: colors['border-border'],
    },
    content: {
      paddingHorizontal: Spacing.xs,
      paddingBottom: Spacing.lg,
    },
    containerFullScreen: {
      padding: 0,
    },
    sheetFullScreen: {
      flex: 1,
      maxWidth: '100%' as any,
      borderRadius: 0,
      borderTopLeftRadius: Radius['radius-xl'],
      borderTopRightRadius: Radius['radius-xl'],
      overflow: 'hidden',
    },
    wrapperFullScreen: {
      flex: 1,
    },
    contentFullScreen: {
      flex: 1,
      paddingBottom: 0,
    },
  });
