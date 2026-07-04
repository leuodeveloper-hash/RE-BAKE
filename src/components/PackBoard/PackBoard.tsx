import React, {useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {RecipePack, PACK_WIDTH, type RecipePackProps} from './RecipePack';

export interface PackBoardItem extends RecipePackProps {
  id: string;
}

export interface PackBoardProps {
  items: PackBoardItem[];
  /** 보드가 차지할 세로높이 — 이 높이에 맞춰 행을 채우고 가로로 확장(좌우 스와이프) */
  height: number;
  /** 원점에서 하나둘씩 튀어나오는 등장 애니메이션 사용 */
  entrance?: boolean;
  /** 회차 플로우 펼침 시: 이 id 팩은 숨김(오버레이가 대신 그림), 나머지는 흐리게 */
  dimExceptId?: string;
}

const ROW_HEIGHT = 272; // 스택 + 라벨 + 여백 (팩 커진 만큼 간격 넓힘)
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

export function PackBoard({items, height, entrance = false, dimExceptId}: PackBoardProps) {
  const intro = useRef(new Animated.Value(entrance ? 0 : 1)).current;

  const {placed, width, originX, originY} = useMemo(() => {
    // 상하·좌우 여백 (보드 가장자리에 팩이 붙지 않게)
    const PAD_V = 40;
    const PAD_H = 32;
    // 높이 기준: 화면 높이에 맞춰 들어가는 행 수만큼만 쓰고, 자연 간격(ROW_HEIGHT)으로
    // 묶어 세로 중앙 정렬한다 (전체 높이에 펼치지 않음 → 흩어져 떨어져 보이지 않게).
    const innerH = Math.max(PACK_HEIGHT, height - PAD_V * 2);
    const maxRows = Math.max(1, Math.floor(innerH / ROW_HEIGHT));
    const rows = Math.max(1, Math.min(maxRows, items.length));
    const slackV = Math.max(0, ROW_HEIGHT - PACK_HEIGHT);
    const cellW = PACK_WIDTH + 48;
    // 실제 사용 행 블록을 세로 중앙 정렬
    const blockH = rows * ROW_HEIGHT;
    const vOffset = PAD_V + Math.max(0, (innerH - blockH) / 2);

    const columns = Math.ceil(items.length / rows);
    let maxRight = 0;
    const placed = items.map((item, i) => {
      const row = i % rows;
      const col = Math.floor(i / rows);
      const h = hashStr(item.id);

      // 덜 찬 열(마지막)은 세로 가운데로 몰아줌
      const itemsInCol = col < columns - 1 ? rows : items.length - rows * (columns - 1);
      const colOffset = ((rows - itemsInCol) * ROW_HEIGHT) / 2;

      // 행 단위 stagger 대신 per-item 랜덤 오프셋 → 두 줄 격자처럼 보이지 않게 흩뿌림
      const jitterX = (seeded(h) - 0.5) * cellW * 0.5;
      const jitterY = (seeded(h + 7) - 0.5) * (slackV + 16);
      const rotate = (seeded(h + 5) - 0.5) * 7; // ±3.5deg 살짝 기울임

      let top = vOffset + colOffset + row * ROW_HEIGHT + slackV / 2 + jitterY;
      top = Math.max(PAD_V, Math.min(top, height - PAD_V - PACK_HEIGHT));
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

    return {placed, width: maxRight + PAD_H, originX: 0, originY: height / 2 - PACK_HEIGHT / 2};
  }, [items, height]);

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
            style={[
              styles.pack,
              {left, top, opacity, transform: [{translateX}, {translateY}, {scale}]},
            ]}>
            {/* 활성(원본)은 오버레이가 맨 위에 그리므로 보드에선 숨김 */}
            <View style={{opacity: isActive ? 0 : dimmed ? 0.5 : 1}}>
              <RecipePack
                {...item}
                rotate={rotate}
                pillCorner={item.pillBottom ? undefined : pillCorner}
              />
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
