import React, {useMemo, useRef} from 'react';
import {Animated, Easing, Platform, StyleSheet, View} from 'react-native';
import {RecipePack, PACK_WIDTH, type RecipePackProps} from './RecipePack';
import {RetrospectiveNote} from './RetrospectiveNote';

export interface PackBoardItem extends RecipePackProps {
  id: string;
  /** 팩 대신 그릴 화면(예: 게스트 랜딩 카드). 기울이지 않는다 */
  custom?: React.ReactNode;
  /** custom 화면의 크기 — 주변 팩을 이만큼 비켜 놓는다(없으면 팩 크기로 본다) */
  customSize?: {w: number; h: number};
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
  /** 처음 화면 가운데에 둘 지점(보드 좌표) — custom(랜딩 카드)이 있으면 그 중심을 알려준다 */
  onFocusPoint?: (p: {x: number; y: number} | null) => void;
}

// 스택 + 라벨 + 여백. 팩(202)과 차이가 클수록 보드가 길어지고, 화면보다
// 길어지면 가운데 정렬되면서 위아래가 휑해진다.
// 아이폰처럼 좁은 화면에서 벙벙해 보여 268→236으로 줄였다(팩 202 + 라벨·여백)
const ROW_HEIGHT = 236;
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

export function PackBoard({items, height, boardWidth, entrance = false, dimExceptId, onFocusPoint}: PackBoardProps) {
  const intro = useRef(new Animated.Value(entrance ? 0 : 1)).current;

  const {placed, width, contentHeight, originX, originY} = useMemo(() => {
    // 상하·좌우 여백 (보드 가장자리에 팩이 붙지 않게)
    const PAD_V = 24;
    const PAD_H = 32;
    // 화면 높이에 맞춰 행 수를 제한하면 팩이 가로로만 길어져 뭉쳐 보이고
    // 세로로 움직일 데가 없다. 폭에 맞춰 열 수를 정하고 아래로 쌓아
    // 위아래·좌우로 자유롭게 움직이게 한다.
    // 넓은 화면(웹 큰 화면·아이패드)은 팩 사이도 넉넉히 — 모바일 간격 그대로면 다닥다닥 붙어 보였다
    const wide = (boardWidth ?? 0) >= 768;
    const rowHeight = ROW_HEIGHT + (wide ? 32 : 0);
    const slackV = Math.max(0, rowHeight - PACK_HEIGHT);
    // 칸 사이 여백 — 56이면 좁은 화면에서 팩 사이가 휑했다(넓은 화면은 56)
    const cellW = PACK_WIDTH + (wide ? 56 : 32);
    // 화면 폭에 딱 맞춰 열을 채우면 가로로 넘칠 일이 없어 좌우로 움직일 데가 없다.
    // 화면보다 한 열 넓게 잡아 사방으로 펼친다 — 보드를 돌아다니는 느낌.
    const innerW = Math.max(cellW, (boardWidth ?? cellW * 3) - PAD_H * 2);
    const fitCols = Math.max(1, Math.floor(innerW / cellW));
    // 화면에 들어가는 수보다 두 열 넓게 — 한 열만 더하면 넘치는 폭이 100px도
    // 안 돼 좌우로 거의 못 움직인다
    // 팩이 많으면 아래로만 길어지지 않게 — 보드를 가로로 조금 넓게(가로 ≈ 세로의 1.4배) 펼친다.
    // 정사각으로 맞추면 흔들림·여백 탓에 세로가 더 길어져 위아래 스크롤만 많았다.
    const BOARD_ASPECT = 1.4; // 1이면 세로만, 2면 가로만 스크롤돼 그 사이
    const squareCols = Math.ceil(Math.sqrt(items.length * (rowHeight / cellW) * BOARD_ASPECT));
    const columns = Math.max(1, Math.min(Math.max(fitCols + 2, squareCols), items.length));
    const rows = Math.ceil(items.length / columns);
    const vOffset = PAD_V;

    /**
     * 가운데 칸부터 바깥으로 퍼지는 순서.
     * 왼쪽 위부터 채우면 팩이 한쪽에 몰리고 반대편이 텅 빈다 —
     * 중심에서 사방으로 번지게 칸 순서를 미리 정한다.
     */
    const cells: {row: number; col: number}[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) cells.push({row: r, col: c});
    const midR = (rows - 1) / 2;
    const midC = (columns - 1) / 2;
    cells.sort((a, b) => {
      const da = Math.hypot(a.row - midR, a.col - midC);
      const db = Math.hypot(b.row - midR, b.col - midC);
      if (da !== db) return da - db;
      // 거리가 같으면 순서를 고정해 다시 그려도 자리가 바뀌지 않게
      return a.row - b.row || a.col - b.col;
    });

    let maxRight = 0;
    const placed = items.map((item, i) => {
      const {row, col} = cells[i] ?? {row: 0, col: 0};
      const h = hashStr(item.id);

      const colOffset = 0;

      // 행 단위 stagger 대신 per-item 랜덤 오프셋 → 두 줄 격자처럼 보이지 않게 흩뿌림
      // 책상에 흩뿌린 느낌 — 위치를 조금 더 흔들되 서로 겹치진 않을 만큼
      const jitterX = (seeded(h) - 0.5) * cellW * 0.4;
      const jitterY = (seeded(h + 7) - 0.5) * (slackV + 24);
      // 사진+종이 덩어리를 툭 던져 둔 듯 기울인다(뱃지는 RecipePack에서 제외)
      const rotate = (seeded(h + 5) - 0.5) * 14; // ±7deg

      let top = vOffset + colOffset + row * rowHeight + slackV / 2 + jitterY;
      // 화면 높이로 가두지 않는다 — 아래로 쌓여야 세로로 움직일 수 있다
      top = Math.max(PAD_V, top);
      // 홀수 줄은 반 칸 옆으로 — 바둑판처럼 줄이 맞아 보이지 않게
      const stagger = row % 2 === 1 ? cellW / 2 : 0;
      const left = PAD_H + col * cellW + stagger + jitterX;

      // 뱃지 위치: id 시드로 결정적 랜덤. 카드 1장짜리(짧은 팩)는 우측에 두면 여백에
      // 떠 보이므로 좌측/하단중앙만, 여러 장 펼쳐진 긴 팩은 5개 위치 전부에서 랜덤.
      const isLong = (item.cards?.length ?? 0) > 1;
      const cornerSet: PackBoardItem['pillCorner'][] = isLong
        ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        : ['top-left', 'bottom-left'];
      const pillCorner = cornerSet[Math.min(cornerSet.length - 1, Math.floor(seeded(h + 3) * cornerSet.length))];

      maxRight = Math.max(maxRight, left + PACK_WIDTH);
      return {item, left, top, rotate, pillCorner};
    });

    // 보드 높이는 팩이 실제로 차지한 만큼 — height(뷰포트 전체)를 쓰면
    // 팩 아래 빈 공간까지 콘텐츠로 잡혀, 중앙 정렬해도 위가 뜬다.
    // 가운데 랜딩 카드(custom) 주위는 비운다 — 팩이 바짝 붙으면 헤드라인·버튼이 묻힌다.
    // 카드 둘레 여백 구역에 걸치는 팩은 카드 중심에서 바깥 방향으로 밀어낸다.
    const hero = placed.find(p => p.item.custom);
    if (hero) {
      // 카드 둘레 여백 — 화면 폭에 따라. 좁은 모바일은 촘촘히(44도 비어 보였다),
      // 넓은 웹 화면은 넉넉히(24면 팩이 랜딩 카드에 붙어 보였다)
      const CLEAR = wide ? 64 : 24;
      const heroW = hero.item.customSize?.w ?? PACK_WIDTH;
      const heroH = hero.item.customSize?.h ?? PACK_HEIGHT;
      // 카드를 자기 칸 가운데로 — 팩보다 크면 오른쪽·아래로 삐져나온다
      hero.left -= (heroW - PACK_WIDTH) / 2;
      hero.top -= (heroH - PACK_HEIGHT) / 2;
      hero.rotate = 0;
      const hx = hero.left + heroW / 2;
      const hy = hero.top + heroH / 2;
      // 카드 중심과 팩 중심 사이 최소 거리 = 두 반폭의 합 + 여백
      const halfW = heroW / 2 + PACK_WIDTH / 2 + CLEAR;
      const halfH = heroH / 2 + PACK_HEIGHT / 2 + CLEAR;
      for (const p of placed) {
        if (p === hero) continue;
        const cx = p.left + PACK_WIDTH / 2;
        const cy = p.top + PACK_HEIGHT / 2;
        let dx = cx - hx;
        let dy = cy - hy;
        if (dx === 0 && dy === 0) dx = 1;
        // 카드 둘레 타원 안에 들어온 팩만 — 축 하나로 경계까지 딱 밀면 줄 맞춰 비켜난 듯 보인다.
        // 중심에서 바깥 방향(대각선 포함)으로, 팩마다 조금씩 다른 거리만큼 민다.
        const d = Math.hypot(dx / halfW, dy / halfH);
        if (d >= 1) continue;
        const extra = 1 + seeded(hashStr(p.item.id) + 11) * 0.1; // 1~1.1배 — 경계 바로 밖까지만(멀리 밀면 안쪽이 빈다)
        const k = extra / Math.max(d, 0.05);
        p.left += dx * k - dx;
        p.top += dy * k - dy;
      }
      // 밀려서 보드 밖(왼쪽·위)으로 나간 만큼 전체를 옮긴다
      const minLeft = Math.min(...placed.map(p => p.left));
      const minTop = Math.min(...placed.map(p => p.top));
      const fixX = minLeft < PAD_H ? PAD_H - minLeft : 0;
      const fixY = minTop < PAD_V ? PAD_V - minTop : 0;
      if (fixX || fixY) for (const p of placed) { p.left += fixX; p.top += fixY; }
      maxRight = Math.max(...placed.map(p => p.left + (p.item.customSize?.w ?? PACK_WIDTH)));
    }
    const maxBottom = placed.reduce((m, p) => Math.max(m, p.top + PACK_HEIGHT), 0);
    // 상하좌우 어느 쪽으로든 움직일 수 있게 — 보드가 화면보다 작으면 그 방향은 스크롤이 안 된다.
    // 화면의 1.3배를 최소로 잡고, 남는 만큼 팩 덩어리를 가운데로 민다.
    const minW = (boardWidth ?? 0) * 1.3;
    const minH = height * 1.3;
    const rawW = maxRight + PAD_H;
    const rawH = maxBottom + PAD_V;
    const shiftX = Math.max(0, (minW - rawW) / 2);
    const shiftY = Math.max(0, (minH - rawH) / 2);
    if (shiftX > 0 || shiftY > 0) {
      for (const p of placed) { p.left += shiftX; p.top += shiftY; }
    }
    return {
      placed,
      width: Math.max(rawW, minW),
      contentHeight: Math.max(rawH, minH),
      originX: 0,
      originY: height / 2 - PACK_HEIGHT / 2,
    };
  }, [items, height, boardWidth]);

  // 랜딩 카드가 있으면 그 중심을 캔버스에 알린다 — 들어갈 때 화면 정중앙에 두려고
  const focus = useMemo(() => {
    const hero = placed.find(p => p.item.custom);
    if (!hero) return null;
    return {
      x: hero.left + (hero.item.customSize?.w ?? PACK_WIDTH) / 2,
      y: hero.top + (hero.item.customSize?.h ?? PACK_HEIGHT) / 2,
    };
  }, [placed]);
  React.useEffect(() => { onFocusPoint?.(focus); }, [focus, onFocusPoint]);

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
              {item.custom ? (
                // 자리(customSize) 안 세로 가운데 — 위에 붙이면 실제 내용이 자리보다 작을 때
                // 화면 가운데(자리 중심)보다 위로 올라가 보였다
                <View style={item.customSize ? {width: item.customSize.w, height: item.customSize.h, justifyContent: 'center', alignItems: 'center'} : undefined}>
                  {item.custom}
                </View>
              ) : item.variant === 'note' ? (
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
