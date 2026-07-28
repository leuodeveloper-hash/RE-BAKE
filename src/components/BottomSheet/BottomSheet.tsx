import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  GestureResponderEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BlurView} from 'expo-blur';
import {useColors} from '@contexts/ThemeContext';
import {BottomActionBar} from '@components/BottomActionBar';
import {SheetHeader} from './SheetHeader';

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
  maxWidth?: number;
  /** ScrollView 뒤에 고정되는 배경 요소 (그라디언트 등) */
  backgroundElement?: React.ReactNode;
  /** 배경 오버레이에 블러 적용 (다이얼로그처럼) */
  blurBackdrop?: boolean;
  /** 등장/퇴장 애니메이션. 'slide'(기본, 아래→위) | 'fade'(같은 자리에서 페이드) */
  animationType?: 'slide' | 'fade';
  /** 상단 드래그 핸들 바 숨김 (드래그 비활성 + 전체 팝업 느낌) */
  hideHandle?: boolean;
  /** 하단 고정 액션 영역 (버튼 등). 콘텐츠 스크롤과 무관하게 하단 고정 + 상단 마스크 그라디언트 */
  bottomAction?: React.ReactNode;
  /** fullScreen 시 상단 모서리 라운딩 (기본 true). 완전 전체화면(요리모드 등)은 false로 각지게 */
  fullScreenRounded?: boolean;
  /** 커스텀 고정 헤더 (스크롤 영역 밖에 고정). title 대신 브레드크럼 등 커스텀 헤더가 필요할 때 사용 */
  header?: React.ReactNode;
  /**
   * 네이티브 Modal 대신 절대위치 전체화면 View로 렌더한다(요리모드 전용).
   * iOS 네이티브 Modal은 앱 루트의 일반 오버레이(YouTube PiP 등)를 덮어버려 PiP가 시트 뒤에
   * 깔린다. hostAsView=true면 같은 RN 계층에 있어 루트 PiP가 시트 위에 정상적으로 뜬다.
   * (드래그 없는 fullScreen 시트에만 적합 — 배경 dim은 부모 화면에 얹힘)
   */
  hostAsView?: boolean;
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
  maxWidth,
  backgroundElement,
  blurBackdrop = false,
  animationType = 'slide',
  hideHandle = false,
  bottomAction,
  fullScreenRounded = true,
  header,
  hostAsView = false,
}: BottomSheetProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {height: windowHeight} = useWindowDimensions();
  const {top: safeTop, bottom: safeBottom} = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // fade 모드 전용 시트 투명도 (slide 모드에선 항상 1로 두어 영향 없음)
  const sheetOpacity = useRef(new Animated.Value(1)).current;
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
    const targetY = contentHeight.current || windowHeight;
    const closeAnims = animationType === 'fade'
      ? [
          Animated.timing(sheetOpacity, {toValue: 0, duration: 180, useNativeDriver: true}),
          Animated.timing(backdropOpacity, {toValue: 0, duration: 180, useNativeDriver: true}),
        ]
      : [
          Animated.spring(translateY, {toValue: targetY, velocity, ...ANIMATION_CONFIG.springFast}),
          Animated.timing(backdropOpacity, {toValue: 0, duration: 200, useNativeDriver: true}),
        ];
    Animated.parallel(closeAnims).start((result) => {
      closingRef.current = false;
      setMounted(false);
      translateY.setValue(windowHeight);
      onCloseRef.current();
    });
    // 안전장치: 애니메이션 콜백이 안 타는 경우 대비
    setTimeout(() => {
      if (closingRef.current) {
        closingRef.current = false;
        setMounted(false);
        translateY.setValue(windowHeight);
        onCloseRef.current();
      }
    }, 500);
  }, [translateY, backdropOpacity, sheetOpacity, animationType]);

  // visible prop 변화 감지
  useEffect(() => {
    if (visible && !mounted) {
      // 열기
      closingRef.current = false;
      setMounted(true);
      backdropOpacity.setValue(0);
      if (animationType === 'fade') {
        // 같은 자리에서 페이드인 (슬라이드 없음)
        translateY.setValue(0);
        sheetOpacity.setValue(0);
        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.timing(sheetOpacity, {toValue: 1, duration: 200, useNativeDriver: true}),
            Animated.timing(backdropOpacity, {toValue: 1, ...ANIMATION_CONFIG.timing}),
          ]).start();
        });
      } else {
        translateY.setValue(windowHeight);
        sheetOpacity.setValue(1);
        // 다음 프레임에서 애니메이션 시작 (마운트 후)
        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.spring(translateY, {toValue: 0, ...ANIMATION_CONFIG.spring}),
            Animated.timing(backdropOpacity, {toValue: 1, ...ANIMATION_CONFIG.timing}),
          ]).start();
        });
      }
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
  const contentTouchStartX = useRef(0);
  const scrollOffsetY = useRef(0);

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

  const inner = (
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
          {blurBackdrop && (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        </Animated.View>

        {/* 시트 컨테이너 */}
        <Animated.View
          style={[
            styles.sheetContainer,
            fullScreen && styles.sheetFullScreen,
            fullScreen && !fullScreenRounded && styles.sheetFullScreenSquare,
            fullScreen && backgroundColor ? {backgroundColor} : undefined,
            height !== 'auto' && !fullScreen && {height},
            !fullScreen && {maxHeight: windowHeight - safeTop - safeBottom - Spacing.sm * 2},
            maxWidth != null && {maxWidth},
            {transform: [{translateY}], opacity: sheetOpacity},
          ]}
          onLayout={handleLayout}>
          {backgroundElement}
          <View style={fullScreen ? styles.wrapperFullScreen : bottomAction ? {flexShrink: 1} : undefined}>
            {/* 핸들: 터치 즉시 드래그 시작 */}
            <View
              onStartShouldSetResponder={() => enableDragToDismiss}
              onResponderGrant={onDragGrant}
              onResponderMove={onDragMove}
              onResponderRelease={onDragRelease}
              onResponderTerminate={onDragTerminate}
              style={[styles.handleContainer, fullScreen && !hideHandle && {paddingTop: safeTop}]}
            >
              {!hideHandle && <View style={styles.handle} />}
            </View>

            <View
              style={fullScreen ? {flex: 1} : bottomAction ? {flexShrink: 1} : undefined}
              onStartShouldSetResponderCapture={(e: GestureResponderEvent) => {
                contentTouchStartY.current = e.nativeEvent.pageY;
                contentTouchStartX.current = e.nativeEvent.pageX;
                return false;
              }}
              onMoveShouldSetResponderCapture={(e: GestureResponderEvent) => {
                if (!enableDragToDismiss) return false;
                const dy = e.nativeEvent.pageY - contentTouchStartY.current;
                const dx = e.nativeEvent.pageX - contentTouchStartX.current;
                // 세로가 가로보다 우세한(수직에 가까운) 끌기일 때만 시트가 가로챈다.
                // 좌우 스와이프(요리모드 스텝 넘기기)는 dx가 커서 시트로 새지 않음.
                return dy > 10 && dy > Math.abs(dx) * 1.5 && scrollOffsetY.current <= 0;
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
              {header}

              {fullScreen ? (
                <View style={[styles.content, styles.contentFullScreen]}>{children}</View>
              ) : (
                <ScrollView
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  style={bottomAction ? {flexShrink: 1} : undefined}
                  contentContainerStyle={styles.content}
                  onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
                  scrollEventThrottle={16}
                >
                  {children}
                </ScrollView>
              )}
              {bottomAction ? (
                <BottomActionBar background={backgroundColor ?? colors['surface/bright']}>
                  {bottomAction}
                </BottomActionBar>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>
  );

  // 요리모드 등: 네이티브 Modal 없이 절대위치 전체화면 View로 → 루트 PiP가 시트 위에 뜸
  if (hostAsView) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {inner}
      </View>
    );
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}>
      {inner}
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
      backgroundColor: colors['overlay/strong'],
    },
    sheetContainer: {
      maxWidth: 478,
      width: '100%',
      alignSelf: 'center',
      backgroundColor: colors['surface/bright'],
      borderRadius: Radius['radius-xl'],
      overflow: 'hidden',
      boxShadow: '0px -4px 20px 0px rgba(0, 0, 0, 0.15)',
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 4,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: Radius['radius-full'],
      backgroundColor: colors['border/normal'],
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
    sheetFullScreenSquare: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    wrapperFullScreen: {
      flex: 1,
    },
    contentFullScreen: {
      flex: 1,
      paddingBottom: 0,
    },
  });
