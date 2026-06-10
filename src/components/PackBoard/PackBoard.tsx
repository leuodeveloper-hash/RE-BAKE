import React, {useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet} from 'react-native';
import {RecipePack, PACK_WIDTH, type RecipePackProps} from './RecipePack';

export interface PackBoardItem extends RecipePackProps {
  id: string;
}

export interface PackBoardProps {
  items: PackBoardItem[];
  /** 보드가 차지할 가로폭 (좌우 패딩 제외) */
  width: number;
  /** 원점에서 하나둘씩 튀어나오는 등장 애니메이션 사용 */
  entrance?: boolean;
}

const ROW_HEIGHT = 226; // 스택 + 라벨 + 여백
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

export function PackBoard({items, width, entrance = false}: PackBoardProps) {
  const intro = useRef(new Animated.Value(entrance ? 0 : 1)).current;

  const {placed, height, originX, originY} = useMemo(() => {
    // 흩뿌린 배치(위치 지터)는 복원, 카드 스택 기울기는 0 (정신없는 기울임 제거)
    const columns = Math.max(2, Math.floor(width / (PACK_WIDTH + 24)));
    const cellW = width / columns;
    const slack = Math.max(0, cellW - PACK_WIDTH);

    let maxBottom = 0;
    const placed = items.map((item, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const h = hashStr(item.id);

      const jitterX = (seeded(h) - 0.5) * (slack + 28);
      const jitterY = (seeded(h + 7) - 0.5) * 44;
      const stagger = (col % 2) * ROW_HEIGHT * 0.42;

      let left = col * cellW + slack / 2 + jitterX;
      left = Math.max(0, Math.min(left, width - PACK_WIDTH));
      const top = row * ROW_HEIGHT + stagger + jitterY;

      maxBottom = Math.max(maxBottom, top + PACK_HEIGHT);
      return {item, left, top, rotate: 0};
    });

    return {placed, height: maxBottom + 24, originX: width / 2 - PACK_WIDTH / 2, originY: 0};
  }, [items, width]);

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
    <Animated.View style={[styles.board, {width, height}]}>
      {placed.map(({item, left, top, rotate}, i) => {
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

        return (
          <Animated.View
            key={item.id}
            style={[
              styles.pack,
              {left, top, opacity, transform: [{translateX}, {translateY}, {scale}]},
            ]}>
            <RecipePack {...item} rotate={rotate} />
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
