import React, {useEffect, useMemo, useRef, useState} from 'react';
import {LayoutChangeEvent, Platform, StyleSheet, View, type ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withDecay, withSpring} from 'react-native-reanimated';
import Svg, {Defs, Pattern, Circle, Rect} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';
import {PackBoard, type PackBoardItem} from './PackBoard';
import type {PackOriginRect} from './RecipePack';

// 배경 모눈 점 격자
const DOT_GAP = 22;
const DOT_R = 1;

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.4;
// 줌 경계 밖 고무줄 저항(클수록 더 늘어남) + 릴리즈 스냅 스프링
const ZOOM_RUBBER = 0.35;
const SNAP_SPRING = {damping: 20, stiffness: 220, mass: 0.6} as const;
// 기준 배율: 팩의 기본(원본) 크기. 진입 시 이 크기로 두고, 가로가 뷰포트를
// 넘칠 때만 이 이하로 축소. (팩 개수와 무관하게 일관된 기준 크기)
const BASE_SCALE = 1;

function clampW(v: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(v, min), Math.max(min, max));
}

export interface PackCanvasProps {
  items: PackBoardItem[];
  /** PackBoard 등장 애니메이션 */
  entrance?: boolean;
  /** 이 id 팩만 남기고 흐리게 (회차 플로우 펼침 시) */
  dimExceptId?: string;
}

/**
 * 팩 보드를 정사각에 가까운 캔버스로 흩뿌리고, 상하좌우 패닝 + 핀치 줌(0.4~2.4x)으로
 * 로밍하는 래퍼. 진입 시 전체가 보이도록 fit-to-view 후 중앙 정렬.
 */
export function PackCanvas({items, entrance, dimExceptId}: PackCanvasProps) {
  const colors = useColors();
  const [viewport, setViewport] = useState({w: 0, h: 0});
  const [content, setContent] = useState({w: 0, h: 0});

  // 보드 높이 = 뷰포트 높이(세로는 창에 맞춰 채움). 항목이 많으면 가로로 길어지고,
  // 넘치는 가로는 좌우 스와이프(팬)/핀치로 로밍.
  const boardHeight = viewport.h;

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  // 진입 시 적용할 가로맞춤 배율(상단정렬 기준).
  const fitScale = useSharedValue(BASE_SCALE);
  // 줌아웃 하한 = 리스트 전체(가로·세로 모두)가 한 화면에 들어가는 배율.
  const minScale = useSharedValue(BASE_SCALE);

  // 드래그/줌 중에는 팩 탭(onPress)을 무시 (드래그하다 상세로 넘어가는 오탭 방지).
  // Pan/Pinch가 활성화될 때 켜고, 끝난 뒤 80ms 후 해제(트레일링 탭까지 차단).
  const draggedRef = useRef(false);
  const setDragged = (v: boolean) => { draggedRef.current = v; };
  const clearDraggedSoon = () => { setTimeout(() => { draggedRef.current = false; }, 80); };

  const guardedItems = useMemo(() => items.map(it => (
    it.onPress
      ? {...it, onPress: (rect: PackOriginRect) => { if (draggedRef.current) return; it.onPress!(rect); }}
      : it
  )), [items]);

  const pan = Gesture.Pan()
    // 이동이 임계값(±8px)을 넘어야 Pan 활성화 → 그 전(=탭)엔 팩 onPress 정상 동작,
    // 넘으면 Pan이 제스처를 가져가며 드래그로 간주(오탭 방지)
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      runOnJS(setDragged)(true);
    })
    .onEnd(e => {
      // 릴리즈: 스와이프 속도로 미끄러지며 감속(관성). 경계에선 고무줄로 살짝 넘었다 복귀.
      // 콘텐츠가 화면에 다 들어오는 축은 clamp가 한 점(중앙)이라, 플릭하면 살짝 미끄러졌다
      // 중앙으로 되돌아오는 "슥슥" 바운스가 됨 → 항상 관성 적용.
      const s = scale.value;
      const cw = content.w * s;
      const ch = content.h * s;
      let minTx, maxTx, minTy, maxTy;
      if (cw <= viewport.w) { const c = (viewport.w - cw) / 2; minTx = c; maxTx = c; }
      else { minTx = viewport.w - cw; maxTx = 0; }
      if (ch <= viewport.h) { const c = (viewport.h - ch) / 2; minTy = c; maxTy = c; }
      else { minTy = viewport.h - ch; maxTy = 0; }
      tx.value = withDecay({velocity: e.velocityX, clamp: [minTx, maxTx], rubberBandEffect: true, rubberBandFactor: 0.6});
      ty.value = withDecay({velocity: e.velocityY, clamp: [minTy, maxTy], rubberBandEffect: true, rubberBandFactor: 0.6});
      runOnJS(clearDraggedSoon)();
    })
    .onUpdate(e => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    });

  // 핀치: 뷰포트 중앙을 고정점으로 줌 (focal 기준이면 손가락 위치 따라 좌하단으로 쏠림)
  const cx = viewport.w / 2;
  const cy = viewport.h / 2;
  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      runOnJS(setDragged)(true);
    })
    .onUpdate(e => {
      // 축소 하한 = 리스트 전체가 다 보이는 배율, 확대 상한 = MAX_ZOOM
      const minS = Math.min(minScale.value, MAX_ZOOM);
      const raw = savedScale.value * e.scale;
      // 경계 밖은 하드 클램프 대신 고무줄 저항 → 살짝 넘어갔다가 릴리즈 때 스냅
      let next = raw;
      if (raw < minS) next = minS - (minS - raw) * ZOOM_RUBBER;
      else if (raw > MAX_ZOOM) next = MAX_ZOOM + (raw - MAX_ZOOM) * ZOOM_RUBBER;
      const k = next / savedScale.value;
      // 뷰포트 중앙(cx, cy)을 화면상 같은 위치에 고정한 채 확대/축소
      tx.value = cx - (cx - savedTx.value) * k;
      ty.value = cy - (cy - savedTy.value) * k;
      scale.value = next;
    })
    .onEnd(() => {
      // 경계 밖이면 유효 범위로 스프링 스냅(뷰포트 중앙 고정)
      const minS = Math.min(minScale.value, MAX_ZOOM);
      const target = clampW(scale.value, minS, MAX_ZOOM);
      if (target !== scale.value) {
        const k = target / scale.value;
        tx.value = withSpring(cx - (cx - tx.value) * k, SNAP_SPRING);
        ty.value = withSpring(cy - (cy - ty.value) * k, SNAP_SPRING);
        scale.value = withSpring(target, SNAP_SPRING);
      }
      runOnJS(clearDraggedSoon)();
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: tx.value},
      {translateY: ty.value},
      {scale: scale.value},
    ] as ViewStyle['transform'],
  }));

  const handleViewportLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== viewport.w || height !== viewport.h)) {
      setViewport({w: width, h: height});
    }
  };

  const handleContentLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== content.w || height !== content.h)) {
      setContent({w: width, h: height});
    }
  };

  // 기준 배율(BASE_SCALE)로 팩을 항상 같은 크기로 두고, 콘텐츠/뷰포트 크기가
  // 바뀔 때마다(=사이즈별) 중앙 정렬. 같은 콘텐츠 안에서는 유지(사용자 팬/줌 보존).
  const lastFitKey = useRef('');
  useEffect(() => {
    if (viewport.w <= 0 || content.w <= 0) return;
    const key = `${Math.round(viewport.w)}x${Math.round(viewport.h)}|${Math.round(content.w)}x${Math.round(content.h)}`;
    if (lastFitKey.current === key) return;
    lastFitKey.current = key;
    // 진입: 세로만 창에 맞춤(가로는 기준 크기 유지). 세로 넘치면만 축소, 가로는 안 줄임.
    const fit = clampW(Math.min(viewport.h / content.h, BASE_SCALE), MIN_ZOOM, BASE_SCALE);
    fitScale.value = fit;
    scale.value = fit;
    // 줌아웃 하한: 가로·세로 모두 들어가는 배율(=전체가 다 보이는 지점)
    minScale.value = clampW(Math.min(viewport.w / content.w, viewport.h / content.h), MIN_ZOOM, BASE_SCALE);
    // 세로 중앙. 가로는 콘텐츠가 들어가면 중앙, 넘치면 좌측 정렬(우측으로 팬)
    ty.value = (viewport.h - content.h * fit) / 2;
    tx.value = content.w * fit <= viewport.w ? (viewport.w - content.w * fit) / 2 : 0;
  }, [viewport, content, scale, tx, ty, fitScale, minScale]);

  return (
    <View style={styles.viewport} onLayout={handleViewportLayout}>
      {/* 배경 모눈 점 격자 (고정 배경) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="dotgrid" width={DOT_GAP} height={DOT_GAP} patternUnits="userSpaceOnUse">
              <Circle cx={DOT_R} cy={DOT_R} r={DOT_R} fill={colors['border/muted']} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dotgrid)" />
        </Svg>
      </View>
      <GestureDetector gesture={gesture}>
        {/* 웹: 캔버스 transform 재-fit(전체→레시피북 전환 등) 시 하위 box-shadow 잔상이
            상단에 남는 문제 → GPU 레이어로 승격해 깨끗이 리페인트. (PackBoard 개별 팩과 동일 처리) */}
        <Animated.View
          // iOS: 캔버스 transform 재-fit 시 하위 box-shadow 잔상이 클리어되지 않아
          // 빈 그림자 박스가 남는다 → 하드웨어 텍스처로 래스터화해 통째로 리페인트.
          shouldRasterizeIOS
          renderToHardwareTextureAndroid
          style={[
            styles.canvas,
            Platform.OS === 'web' && ({willChange: 'transform', backfaceVisibility: 'hidden'} as any),
            canvasStyle,
          ]}
          pointerEvents="box-none">
          <View onLayout={handleContentLayout}>
            {boardHeight > 0 && <PackBoard items={guardedItems} height={boardHeight} entrance={entrance} dimExceptId={dimExceptId} />}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
});
