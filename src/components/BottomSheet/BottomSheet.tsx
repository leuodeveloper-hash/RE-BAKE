import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// iOS 18 HIG 영감 애니메이션 설정
const ANIMATION_CONFIG = {
  // Spring animation - iOS 18 스타일의 자연스러운 바운스
  spring: {
    tension: 100,
    friction: 12,
    useNativeDriver: true,
  },
  // 빠른 닫기용
  springFast: {
    tension: 150,
    friction: 15,
    useNativeDriver: true,
  },
  // Timing animation for backdrop
  timing: {
    duration: 300,
    useNativeDriver: true,
  },
};

// 드래그 임계값 - 이 비율 이상 드래그하면 닫힘
const DISMISS_THRESHOLD = 0.3;
// 속도 임계값 - 빠르게 드래그하면 바로 닫힘
const VELOCITY_THRESHOLD = 800;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** 시트 높이 (기본: auto) */
  height?: number | 'auto';
  /** 드래그로 닫기 가능 여부 (기본: true) */
  enableDragToDismiss?: boolean;
  /** 배경 탭으로 닫기 가능 여부 (기본: true) */
  enableBackdropDismiss?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  height = 'auto',
  enableDragToDismiss = true,
  enableBackdropDismiss = true,
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(0);

  // 열기/닫기 애니메이션
  useEffect(() => {
    if (visible) {
      // 시트 올라오기 + 배경 페이드인
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          ...ANIMATION_CONFIG.spring,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          ...ANIMATION_CONFIG.timing,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  // 닫기 애니메이션
  const animateClose = (velocity?: number) => {
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
      onClose();
      // 다음 열기를 위해 초기화
      translateY.setValue(SCREEN_HEIGHT);
    });
  };

  // 드래그 제스처 핸들러
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableDragToDismiss,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 아래로 드래그할 때만 반응
        return enableDragToDismiss && gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // 위로 드래그는 무시, 아래로만 따라감
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const {dy, vy} = gestureState;
        const sheetHeight = contentHeight.current || 300;

        // 빠른 플릭이거나 임계값 이상 드래그하면 닫기
        if (vy > VELOCITY_THRESHOLD || dy > sheetHeight * DISMISS_THRESHOLD) {
          animateClose(vy);
        } else {
          // 원래 위치로 스프링 백
          Animated.spring(translateY, {
            toValue: 0,
            ...ANIMATION_CONFIG.spring,
          }).start();
        }
      },
    })
  ).current;

  const handleBackdropPress = () => {
    if (enableBackdropDismiss) {
      animateClose();
    }
  };

  const handleLayout = (event: {nativeEvent: {layout: {height: number}}}) => {
    contentHeight.current = event.nativeEvent.layout.height;
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}>
      <View style={styles.container}>
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
            height !== 'auto' && {height},
            {
              transform: [{translateY}],
            },
          ]}
          onLayout={handleLayout}
          {...panResponder.panHandlers}>
          {/* 핸들 바 */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* 콘텐츠 */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SemanticColorsLight.scrim,
  },
  sheetContainer: {
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
    borderTopLeftRadius: Radius['radius-xl'],
    borderTopRightRadius: Radius['radius-xl'],
    // iOS shadow
    shadowColor: SemanticColorsLight.shadow,
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    // Android shadow
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: Radius['radius-full'],
    backgroundColor: SemanticColorsLight['border-border'],
  },
  content: {
    paddingBottom: Spacing.xl,
  },
});
