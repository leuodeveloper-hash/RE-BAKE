import React, {useMemo, useRef} from 'react';
import {Animated, Easing, Platform, StyleSheet, View} from 'react-native';
import {RecipePack, PACK_WIDTH, type RecipePackProps} from './RecipePack';
import {RetrospectiveNote} from './RetrospectiveNote';

export interface PackBoardItem extends RecipePackProps {
  id: string;
}

export interface PackBoardProps {
  items: PackBoardItem[];
  /** 보드가 차지할 세로높이 — 이 높이에 맞춰 행을 채우고 가로로 확장(좌우 스와이프) */
  height: number;
  /** 열 수를 정할 기준 폭 (뷰포트 폭) */
  boardWidth?: number;
  /** 원점에서 하나둘씩 튀어나오는 등장 애니메이션 사용 */
  entrance?: boolean;
  /** 회차 플로우 펼침 시: 이 id 팩은 숨김(오버레이가 대신 그림), 나머지는 흐리게 */
  dimExceptId?: string;
}

// 스택 + 라벨 + 여백. 팩(202)과 차이가 클수록 보드가 길어지고, 화면보다
// 길어지면 가운데 정렬되면서 위아래가 휑해진다.
const ROW_HEIGHT = 252;
const PACK_HEIGHT = 202;

// 결정적 해시 → 매 렌더마다 흩뿌림이 바뀌지 않도록 id 기반 시드 사용
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: 시드 → [0,1)
function seeded(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function PackBoard({items, height, boardWidth, entrance = false, dimExceptId}: PackBoardProps) {
  const intro = useRef(new Animated.Value(entrance ? 0 : 1)).current;

  const {placed, width, contentHeight, originX, originY} = useMemo(() => {
    // 상하·좌우 여백 (보드 가장자리에 팩이 붙지 않게)
    const PAD_V = 24;
    const PAD_H = 32;
    // 화면 높이에 맞춰 행 수를 제한하면 팩이 가로로만 길어져 뭉쳐 보이고
    // 세로로 움직일 데가 없다. 폭에 맞춰 열 수를 정하고 아래로 쌓아
    // 위아래·좌우로 자유롭게 움직이게 한다.
    const slackV = Math.max(0, ROW_HEIGHT - PACK_HEIGHT);
    const cellW = PACK_WIDTH + 40;
    // 화면 폭에 딱 맞춰 열을 채우면 가로로 넘칠 일이 없어 좌우로 움직일 데가 없다.
    // 화면보다 한 열 넓게 잡아 사방으로 펼친다 — 보드를 돌아다니는 느낌.
    const innerW = Math.max(cellW, (boardWidth ?? cellW * 3) - PAD_H * 2);
    const fitCols = Math.max(1, Math.floor(innerW / cellW));
    const columns = Math.max(1, Math.min(fitCols + 1, items.length));
    const rows = Math.ceil(items.length / columns);
    const vOffset = PAD_V;
    let maxRight = 0;
    const placed = items.map((item, i) => {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const h = hashStr(item.id);

      const colOffset = 0;

      // 행 단위 stagger 대신 per-item 랜덤 오프셋 → 두 줄 격자처럼 보이지 않게 흩뿌림
      const jitterX = (seeded(h) - 0.5) * cellW * 0.5;
      const jitterY = (seeded(h + 7) - 0.5) * (slackV + 16);
      const rotate = (seeded(h + 5) - 0.5) * 7; // ±3.5deg 살짝 기울임

      let top = vOffset + colOffset + row * ROW_HEIGHT + slackV / 2 + jitterY;
      // 화면 높이로 가두지 않는다 — 아래로 쌓여야 세로로 움직일 수 있다
      top = Math.max(PAD_V, top);
      const left = PAD_H + col * cellW + jitterX;

      // 뱃지 위치: id 시드로 결정적 랜덤. 카드 1장짜리(짧은 팩)는 우측에 두면 여백에
      // 떠 보이므로 좌측/하단중앙만, 여러 장 펼쳐진 긴 팩은 5개 위치 전부에서 랜덤.
      const isLong = (item.cards?.length ?? 0) > 1;
      const cornerSet: PackBoardItem['pillCorner'][] = isLong
        ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        : ['top-left', 'bottom-left'];
      const pillCorner = cornerSet[Math.min(cornerSet.length - 1, Math.floor(seeded(h + 3) * cornerSet.length))];

      maxRight = Math.max(maxRight, left + PACK_WIDTH);
      return {item, left, top, rotate: 0, pillCorner};
    });

    // 보드 높이는 팩이 실제로 차지한 만큼 — height(뷰포트 전체)를 쓰면
    // 팩 아래 빈 공간까지 콘텐츠로 잡혀, 중앙 정렬해도 위가 뜬다.
    const maxBottom = placed.reduce((m, p) => Math.max(m, p.top + PACK_HEIGHT), 0);
    return {
      placed,
      width: maxRight + PAD_H,
      contentHeight: maxBottom + PAD_V,
      originX: 0,
      originY: height / 2 - PACK_HEIGHT / 2,
    };
  }, [items, height, boardWidth]);

  // 등장 애니메이션 (부드럽게: 적은 튀어나옴 + 완만한 스태거)
  React.useEffect(() => {
    if (!entrance) return;
    intro.setValue(0);
    Animated.timing(intro, {
      toValue: 1,
      duration: 320 + items.length * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, items.length, intro]);

  const n = Math.max(1, placed.length);
  // 스태거를 완만히(겹침 많게) → 슉슉 대신 스르륵
  const step = 0.35 / n;

  return (
    <Animated.View style={[styles.board, {width, height: contentHeight}]}>
      {placed.map(({item, left, top, rotate, pillCorner}, i) => {
        const startT = Math.min(0.95, i * step);
        const endT = Math.min(1, startT + 0.6);
        const p = entrance
          ? intro.interpolate({inputRange: [startT, endT], outputRange: [0, 1], extrapolate: 'clamp'})
          : null;

        const opacity: Animated.AnimatedInterpolation<number> | number = p ?? 1;
        // 날아오는 거리/스케일 변화를 줄여 과한 모션 완화
        const translateX: Animated.AnimatedInterpolation<number> | number = p
          ? p.interpolate({inputRange: [0, 1], outputRange: [(originX - left) * 0.45, 0]}) : 0;
        const translateY: Animated.AnimatedInterpolation<number> | number = p
          ? p.interpolate({inputRange: [0, 1], outputRange: [(originY - top) * 0.45, 0]}) : 0;
        const scale: Animated.AnimatedInterpolation<number> | number = p
          ? p.interpolate({inputRange: [0, 1], outputRange: [0.85, 1]}) : 1;

        const isActive = dimExceptId != null && item.id === dimExceptId;
        const dimmed = dimExceptId != null && !isActive;
        return (
          <Animated.View
            key={item.id}
            // iOS: transform으로 이동하는 그림자(box-shadow) 요소는 이전 위치의 그림자가
            // 리페인트되지 않아 상단 등에 빈 그림자 박스 잔상이 남는다(필터 전환 시 재현).
            // 뷰를 하드웨어 텍스처로 래스터화해 이동 시 통째로 다시 그려지게 한다.
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
            style={[
              styles.pack,
              {left, top, opacity, transform: [{translateX}, {translateY}, {scale}]},
              // 웹: 그림자 요소를 transform 애니메이션할 때 box-shadow 잔상이 남음 →
              // GPU 레이어로 승격해 깨끗이 리페인트 (상단에 그림자 박스 잔상 방지)
              Platform.OS === 'web' && ({willChange: 'transform', backfaceVisibility: 'hidden'} as any),
            ]}>
            {/* 활성(원본)은 오버레이가 맨 위에 그리므로 보드에선 숨김 */}
            <View style={{opacity: isActive ? 0 : dimmed ? 0.5 : 1}}>
              {item.variant === 'note' ? (
                <RetrospectiveNote {...item} rotate={rotate} />
              ) : (
                <RecipePack
                  {...item}
                  rotate={rotate}
                  pillCorner={item.pillBottom ? undefined : pillCorner}
                />
              )}
            </View>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
  },
  pack: {
    position: 'absolute',
  },
});
