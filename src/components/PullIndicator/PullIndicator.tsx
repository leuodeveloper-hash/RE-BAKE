import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {useColors} from '@contexts/ThemeContext';
import {APPBAR_CONTENT_BOTTOM} from '@components/Navigation';

const REFRESH_THRESHOLD = 120;
const LOGO_SIZE = 40;
const STRIP_COUNT = 5;
const STRIP_H = LOGO_SIZE / STRIP_COUNT; // 8px
const DIAGONAL_PX = 2;
const REFRESH_GAP = 52;
/** 그리기/지우기 한 방향 소요시간 (스플래시와 비슷한 속도) */
const DRAW_DURATION = 1000;
/** 최소: 지우기→채우기 (phase 0=erase, 1=fill) */
const MIN_REFRESH_DISPLAY_MS = DRAW_DURATION;
const FADE_OUT_DURATION = 500;
const GAP_CLOSE_DURATION = 600;

// 새 로고(꽃 모양 뱃지 B) — assets/images/logo_badge.svg와 같은 모양(스플래시와 같다)
export const LOGO_PATH_D = 'M17.8187 0.5C21.198 0.500008 24.0717 2.61803 25.1371 5.57324C28.2803 4.99994 31.5878 6.38042 33.2777 9.24902C34.9675 12.1184 34.533 15.6178 32.4545 18C34.5327 20.3821 34.9673 23.8798 33.2777 26.749C31.5879 29.6183 28.2806 30.9992 25.1371 30.4258C24.0718 33.3813 21.1983 35.5 17.8187 35.5C14.4392 35.4999 11.5655 33.3813 10.5004 30.4258C7.357 30.9989 4.04844 29.6181 2.35876 26.749C0.669752 23.8802 1.10436 20.3819 3.182 18C1.10394 15.6179 0.669056 12.1181 2.35876 9.24902C4.04829 6.38042 7.35641 5.00064 10.4994 5.57324C11.5646 2.61782 14.4393 0.500143 17.8187 0.5ZM21.0414 9.92188C20.1457 9.10608 18.9203 8.90702 17.7885 9.03613C16.6257 9.16888 15.4088 9.65282 14.3177 10.3848C12.1299 11.8526 10.2377 14.4639 10.2377 17.8408H12.7142C12.7142 15.3444 14.108 13.4033 15.7484 12.3027C16.5714 11.7506 17.4052 11.4457 18.0843 11.3682C18.7735 11.2895 19.1563 11.4514 19.3402 11.626L19.3744 11.6582L19.4105 11.6875C19.6442 11.8774 19.7126 12.0653 19.6967 12.3105C19.6769 12.6132 19.5142 13.0468 19.1273 13.5664C18.3532 14.606 16.9392 15.6385 15.4593 16.1484L15.8822 18.4268C18.1749 18.4268 19.95 18.6515 21.1205 19.2139C21.6782 19.4819 22.066 19.812 22.3226 20.2109C22.58 20.6113 22.7562 21.1611 22.7562 21.9434C22.7562 22.027 22.7506 22.1094 22.7386 22.1904C22.6599 22.1414 22.58 22.0932 22.5004 22.0459C20.9947 21.151 19.2274 20.4957 17.5394 20.125C15.8722 19.7589 14.1604 19.6435 12.7953 19.9385C12.1089 20.0869 11.4186 20.3589 10.8842 20.8408C10.3175 21.3519 10.0004 22.0358 10.0004 22.8242C10.0005 24.5389 11.3504 25.6224 12.7289 26.2041C14.1408 26.7998 15.9328 27.0478 17.6586 26.9922C19.3834 26.9365 21.1894 26.572 22.6097 25.8115C22.7669 25.7274 22.9209 25.6363 23.0707 25.54C23.3537 25.8621 23.5727 26.1908 23.7201 26.5205L26.0004 25.6035C25.706 24.945 25.2768 24.3448 24.7611 23.8037C25.0577 23.2627 25.2327 22.6437 25.2328 21.9434C25.2328 20.8172 24.975 19.8253 24.4369 18.9883C23.8981 18.1502 23.1291 17.5456 22.2396 17.1182C21.5062 16.7658 20.6719 16.5257 19.7748 16.3652C20.3052 15.9148 20.7743 15.4274 21.1508 14.9219C21.6922 14.1946 22.1105 13.3444 22.1683 12.4551C22.2293 11.5157 21.8763 10.6104 21.0414 9.92188ZM13.3461 22.2285C14.2058 22.0428 15.5053 22.0893 16.9799 22.4131C18.3721 22.7188 19.8125 23.2489 21.0258 23.9434C20.0882 24.3564 18.863 24.6039 17.5746 24.6455C16.1119 24.6927 14.7154 24.4709 13.7357 24.0576C12.7228 23.6302 12.4771 23.1648 12.4769 22.8242C12.4769 22.6744 12.5191 22.6071 12.5902 22.543C12.6937 22.4497 12.9202 22.3206 13.3461 22.2285Z';

export const PULL_REFRESH_THRESHOLD = REFRESH_THRESHOLD;

export function usePullProgress(onRefresh?: () => Promise<void> | void) {
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStripProgress, setRefreshStripProgress] = useState(0);
  const [refreshOpacity, setRefreshOpacity] = useState(1);
  const triggeredRef = useRef(false);
  const refreshingRef = useRef(false);
  const fadingRef = useRef(false);
  const fadeStartRef = useRef(0);
  const frameIdRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const refreshGapHeight = useRef(new Animated.Value(0)).current;

  const closeGap = useCallback(() => {
    cancelAnimationFrame(frameIdRef.current);
    refreshingRef.current = false;
    fadingRef.current = false;

    Animated.timing(refreshGapHeight, {
      toValue: 0,
      duration: GAP_CLOSE_DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      triggeredRef.current = false;
      setIsRefreshing(false);
      setRefreshStripProgress(0);
      setRefreshOpacity(1);
      setPullProgress(0);
    });
  }, [refreshGapHeight]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    if (refreshingRef.current) return;

    const progress = Math.min(1, Math.max(0, -y / REFRESH_THRESHOLD));
    setPullProgress(progress);

    if (progress >= 1 && !triggeredRef.current) {
      triggeredRef.current = true;
      refreshingRef.current = true;
      setIsRefreshing(true);

      // 햅틱 피드백 (iOS 네이티브 pull-to-refresh와 동일)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 갭 열기
      Animated.timing(refreshGapHeight, {
        toValue: REFRESH_GAP,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();

      // onRefresh 호출
      const startTime = Date.now();
      const loadingDone = {current: false};
      const result = onRefreshRef.current?.();
      const markDone = () => { loadingDone.current = true; };
      if (result && typeof result.then === 'function') {
        result.then(markDone).catch(markDone);
      } else {
        markDone();
      }

      // 지우기→채우기 → 오퍼시티 페이드아웃
      setRefreshStripProgress(1); // 풀 제스처로 이미 다 그려진 상태에서 시작
      const animate = () => {
        // 페이드아웃 모드
        if (fadingRef.current) {
          const fadeElapsed = Date.now() - fadeStartRef.current;
          const fadeProgress = Math.min(1, fadeElapsed / FADE_OUT_DURATION);
          setRefreshOpacity(1 - fadeProgress);
          if (fadeProgress >= 1) {
            setRefreshOpacity(0);
            closeGap();
            return;
          }
          frameIdRef.current = requestAnimationFrame(animate);
          return;
        }

        const elapsed = Date.now() - startTime;
        // phase 0=지우기, 1=채우기, 2=지우기, 3=채우기, ...
        const phaseIndex = Math.floor(elapsed / DRAW_DURATION);
        const phaseProgress = (elapsed % DRAW_DURATION) / DRAW_DURATION;
        const isErase = phaseIndex % 2 === 0;
        const p = isErase ? 1 - phaseProgress : phaseProgress;

        setRefreshStripProgress(p);

        // 채우기 완료(p≈1) 후 오퍼시티 페이드아웃 전환
        if (loadingDone.current && elapsed >= MIN_REFRESH_DISPLAY_MS && !isErase && phaseProgress > 0.95) {
          setRefreshStripProgress(1);
          fadingRef.current = true;
          fadeStartRef.current = Date.now();
          frameIdRef.current = requestAnimationFrame(animate);
          return;
        }

        frameIdRef.current = requestAnimationFrame(animate);
      };

      frameIdRef.current = requestAnimationFrame(animate);
    }

    if (progress === 0 && !refreshingRef.current) {
      triggeredRef.current = false;
    }
  }, [refreshGapHeight, closeGap]);

  return {pullProgress, isRefreshing, refreshStripProgress, refreshOpacity, refreshGapHeight, handleScroll};
}

/** FlatList ListHeaderComponent로 사용하는 리프레시 갭 */
export function RefreshGap({height}: {height: Animated.Value}) {
  return <Animated.View style={{height}} />;
}

export interface PullIndicatorProps {
  progress: number;
  isRefreshing?: boolean;
  /** 리프레시 중 스트립 진행도 (0=지움, 1=다그림) */
  refreshStripProgress?: number;
  /** 리프레시 종료 시 페이드아웃 오퍼시티 (1→0) */
  refreshOpacity?: number;
}

export function PullIndicator({progress, isRefreshing = false, refreshStripProgress = 0, refreshOpacity = 1}: PullIndicatorProps) {
  const colors = useColors();

  // 당기는 중이거나 리프레시 중이면 표시
  const visible = progress > 0 || isRefreshing;
  if (!visible) return null;

  const displayProgress = isRefreshing ? refreshStripProgress : progress;

  return (
    <View
      pointerEvents="none"
      style={[styles.container, {
        // 리프레시 중에는 리스트 뒤로 (갭 닫힐 때 리스트가 자연스럽게 덮음)
        zIndex: isRefreshing ? 1 : 5,
        opacity: isRefreshing ? refreshOpacity : (progress < 0.1 ? progress * 3 : Math.min(1, 0.3 + progress * 0.7)),
        transform: [{scale: isRefreshing ? 1 : 0.2 + progress * 0.8}],
      }]}
    >
      <CrayonLogo progress={displayProgress} />
    </View>
  );
}

/**
 * 로고를 크레파스로 칠하는 그림 — progress 0~1만큼 줄마다 칠해진다.
 * 당겨서 새로고침과 로딩 표시(LoadingLogo)가 같은 그림을 쓴다.
 */
export function CrayonLogo({progress, color}: {progress: number; color?: string}) {
  const colors = useColors();
  const ink = color ?? (colors['foreground/on-surface-muted'] as string);
  const displayProgress = progress;
  return (
      <View style={styles.logoWrapper}>
        {/* 고스트 (연한 실루엣) */}
        <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 36 36" style={{position: 'absolute'}}>
          <Path d={LOGO_PATH_D} fill={ink} fillOpacity={0.1} />
        </Svg>
        {/* 크레파스 스트립 마스크 */}
        {Array.from({length: STRIP_COUNT}, (_, i) => {
          const stripStart = i / STRIP_COUNT;
          const stripEnd = (i + 1) / STRIP_COUNT;
          const localProgress = Math.min(1, Math.max(0, (displayProgress - stripStart) / (stripEnd - stripStart)));
          const isLTR = i % 2 === 0;
          const diagOffset = (isLTR ? -DIAGONAL_PX : DIAGONAL_PX) * (1 - localProgress);
          const counterDiag = (isLTR ? DIAGONAL_PX : -DIAGONAL_PX) * (1 - localProgress);
          return (
            <View key={i} style={{
              position: 'absolute',
              top: i * STRIP_H,
              left: 0,
              width: LOGO_SIZE,
              height: STRIP_H,
              overflow: 'hidden',
              transform: [{translateX: diagOffset}],
            }}>
              <View style={{
                position: 'absolute',
                ...(isLTR ? {left: 0} : {right: 0}),
                top: 0,
                height: STRIP_H,
                width: localProgress * (LOGO_SIZE + DIAGONAL_PX),
                overflow: 'hidden',
              }}>
                <View style={{
                  position: 'absolute',
                  ...(isLTR ? {left: 0} : {right: 0}),
                  top: -i * STRIP_H,
                  transform: [{translateX: counterDiag}],
                }}>
                  <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 36 36">
                    <Path d={LOGO_PATH_D} fill={ink} />
                  </Svg>
                </View>
              </View>
            </View>
          );
        })}
      </View>
  );
}

/** 로딩 — 크레파스 로고가 되풀이해 칠해진다(당겨서 새로고침과 같은 모양) */
export function LoadingLogo({color}: {color?: string}) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      // 칠하기(DRAW_DURATION) + 다 칠한 채 잠깐 쉬기
      const t = ((Date.now() - start) % (DRAW_DURATION + 300)) / DRAW_DURATION;
      setP(Math.min(1, t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <CrayonLogo progress={p} color={color} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: APPBAR_CONTENT_BOTTOM + 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    overflow: 'hidden',
  },
});
