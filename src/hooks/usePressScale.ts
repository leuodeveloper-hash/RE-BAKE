import {useCallback, useRef} from 'react';
import {Animated} from 'react-native';

/**
 * 누를 때 살짝 줄어드는 반응 — iOS 시스템 버튼의 "넛징"을 흉내낸다.
 *
 * 색만 바뀌는 피드백은 눌린 느낌이 약해 햅틱이 실제보다 약하게 느껴진다.
 * 시각 반응과 촉각이 함께 와야 "눌렸다"고 인지된다.
 *
 * @param to 눌렀을 때 배율 (기본 0.96 — 너무 작으면 튀어 보인다)
 */
export function usePressScale(to = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = useCallback((toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      // 누를 땐 즉각, 뗄 땐 살짝 튕기게
      speed: toValue < 1 ? 50 : 20,
      bounciness: toValue < 1 ? 0 : 6,
    }).start();
  }, [scale]);

  const onPressIn = useCallback(() => animate(to), [animate, to]);
  const onPressOut = useCallback(() => animate(1), [animate]);

  return {
    scale,
    pressHandlers: {onPressIn, onPressOut},
    /** Animated.View에 그대로 넘길 수 있는 style */
    animatedStyle: {transform: [{scale}]},
  };
}
