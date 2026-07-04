import React, {useEffect} from 'react';
import {Pressable, StyleSheet, View, type ViewStyle} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {useColorsV2} from '@contexts/ThemeContext';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {triggerHaptic} from '@utils/haptics';
import type {SemanticColorsV2} from '@constants/tokens';
import {RecipePack, PACK_WIDTH} from './RecipePack';
import type {PackOriginRect} from './RecipePack';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface SessionFlowItem {
  id: string;
  title: string;
  imageUrl?: string | number;
  paperPreview?: string[];
  /** "2회차" 같은 라벨 */
  sessionLabel: string;
}

const CARD_H = 188; // RecipePack 스택 높이 근사
const CARD_HALF = 70; // 점이 카드 가장자리에 맞닿도록 (시각 카드 반높이 근사)
const SUB_SCALE = 1; // 2회차+ 카드 크기는 팩 카드와 동일 (구성만 다름)
const V_GAP = 256;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.4;
const MAX_NODES = 16;
const STAGGER = 55;
const DOT_R = 2; // 점 지름 4px

type Pt = {x: number; y: number};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seeded(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function clampW(v: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(v, min), Math.max(min, max));
}

function lerpPt(start: Pt, target: Pt, p: number): Pt {
  'worklet';
  return {x: start.x + (target.x - start.x) * p, y: start.y + (target.y - start.y) * p};
}

// 카드 가장자리에서 시작/끝나도록 두 중심을 보정 후 곡선
function edgeCurve(a: Pt, b: Pt): string {
  'worklet';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const ax = a.x + ux * CARD_HALF;
  const ay = a.y + uy * CARD_HALF;
  const bx = b.x - ux * CARD_HALF;
  const by = b.y - uy * CARD_HALF;
  const ex = bx - ax;
  const ey = by - ay;
  const c1x = ax + ex * 0.3 - ey * 0.18;
  const c1y = ay + ey * 0.3 + ex * 0.18;
  const c2x = ax + ex * 0.7 - ey * 0.06;
  const c2y = ay + ey * 0.7 + ex * 0.06;
  return `M ${ax} ${ay} C ${c1x} ${c1y} ${c2x} ${c2y} ${bx} ${by}`;
}
function edgeDot(a: Pt, b: Pt, atStart: boolean): string {
  'worklet';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const cx = atStart ? a.x + ux * CARD_HALF : b.x - ux * CARD_HALF;
  const cy = atStart ? a.y + uy * CARD_HALF : b.y - uy * CARD_HALF;
  return `M ${cx - DOT_R} ${cy} a ${DOT_R} ${DOT_R} 0 1 0 ${DOT_R * 2} 0 a ${DOT_R} ${DOT_R} 0 1 0 ${-DOT_R * 2} 0`;
}

const MAX_SHOWN = 3; // 펼칠 때 최대 3장만
const SCATTER_R = 150; // 썸네일에서 종이까지 거리 (둥근 덩어리로 뭉치게)
const SPREAD_ANG = 1.15; // 종이 간 기본 분산 각도

type FlowPos = {start: Pt; target: Pt; restTilt: number; spreadTilt: number};

// RecipePack 의 fanFor 와 동일 (접힘 상태를 보드 팩과 정확히 일치시키기 위함)
function packFan(count: number): {x: number; y: number; rotate: number}[] {
  if (count <= 1) return [{x: 0, y: 0, rotate: 0}];
  if (count === 2) return [{x: -14, y: 0, rotate: -8}, {x: 14, y: 0, rotate: 8}];
  return [{x: -18, y: 5, rotate: -8}, {x: 18, y: 5, rotate: 8}, {x: 0, y: 0, rotate: 0}];
}

function layout(sessions: SessionFlowItem[], origin: PackOriginRect) {
  const ox = origin.x + origin.width / 2;
  const oy = origin.y + origin.height / 2;
  const n = sessions.length;
  const fan = packFan(n + 1); // 보드 팩 = 종이 n장 + 썸네일1 의 부채
  const nodes: FlowPos[] = sessions.map((s, i) => {
    const f = fan[i] ?? fan[fan.length - 1];
    const h = hashStr(s.id);
    // 썸네일 아래(π/2) 기준 넓게 분산 + 각도/거리/기울기 불규칙 → 둥근 덩어리
    const base = Math.PI / 2 + (i - (n - 1) / 2) * SPREAD_ANG;
    const angle = base + (seeded(h) - 0.5) * 0.55;
    const r = SCATTER_R + (seeded(h + 3) - 0.5) * 90;
    return {
      start: {x: ox + f.x, y: oy + f.y}, // 접힘 = 보드 팩 부채 위치(정확 일치)
      restTilt: f.rotate,
      // 펼침 = 썸네일 주변에 불규칙하게 깔림 (극좌표 + 지터)
      target: {x: ox + r * Math.cos(angle), y: oy + r * Math.sin(angle)},
      spreadTilt: (seeded(h + 11) - 0.5) * 28,
    };
  });
  return {origin: {x: ox, y: oy}, nodes};
}

function FlowEdge({
  prevStart, prevTarget, curStart, curTarget, progPrev, progCur, color,
}: {
  prevStart: Pt; prevTarget: Pt; curStart: Pt; curTarget: Pt;
  progPrev: SharedValue<number>; progCur: SharedValue<number>; color: string;
}) {
  const lineProps = useAnimatedProps(() => {
    const a = lerpPt(prevStart, prevTarget, progPrev.value);
    const b = lerpPt(curStart, curTarget, progCur.value);
    return {d: edgeCurve(a, b), opacity: Math.min(1, progCur.value * 1.6)};
  });
  const dotAProps = useAnimatedProps(() => {
    const a = lerpPt(prevStart, prevTarget, progPrev.value);
    const b = lerpPt(curStart, curTarget, progCur.value);
    return {d: edgeDot(a, b, true), opacity: Math.min(1, progCur.value * 1.6)};
  });
  const dotBProps = useAnimatedProps(() => {
    const a = lerpPt(prevStart, prevTarget, progPrev.value);
    const b = lerpPt(curStart, curTarget, progCur.value);
    return {d: edgeDot(a, b, false), opacity: Math.min(1, progCur.value * 1.6)};
  });
  return (
    <>
      <AnimatedPath animatedProps={lineProps} stroke={color} strokeWidth={1} fill="none" strokeLinecap="round" />
      <AnimatedPath animatedProps={dotAProps} fill={color} />
      <AnimatedPath animatedProps={dotBProps} fill={color} />
    </>
  );
}

function FlowNode({
  item, pos, prog, onSelect, styles,
}: {
  item: SessionFlowItem; pos: FlowPos; prog: SharedValue<number>;
  onSelect: (id: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const {start, target, restTilt, spreadTilt} = pos;
  const st = useAnimatedStyle(() => {
    const p = prog.value;
    const x = start.x + (target.x - start.x) * p;
    const y = start.y + (target.y - start.y) * p;
    const tilt = restTilt + (spreadTilt - restTilt) * p;
    return {
      transform: [
        {translateX: x - PACK_WIDTH / 2},
        {translateY: y - CARD_H / 2},
        {rotate: `${tilt}deg`}, // 접힘(보드 부채 기울기) → 펼침 기울기
        {scale: SUB_SCALE},
      ] as ViewStyle['transform'],
      // 종이는 접힘 상태(보드 팩)에서도 보여야 일치 → 항상 보임
      opacity: 1,
    };
  });
  const num = item.sessionLabel.replace(/[^0-9]/g, '');
  return (
    <Animated.View style={[styles.node, st]}>
      <RecipePack
        title={item.sessionLabel}
        subtitle=""
        count={0}
        pillBottom
        pillProgress={prog}
        cards={[{title: `${item.title} #${num}`, paperPreview: item.paperPreview}]}
        onPress={() => { triggerHaptic('light'); onSelect(item.id); }}
      />
    </Animated.View>
  );
}

/**
 * 공법 보드는 그대로(다른 팩 50% 흐림). 탭한 팩(=1회차 원본)에서 2회차+가
 * 뒤에 숨었다가 어두운 선(+점)을 따라 슥 나오는 인플레이스 오버레이.
 * 핀치줌/팬 로밍, 빈 곳 탭하면 접힘.
 */
export function SessionFlow({
  sessions,
  origin,
  root,
  onSelect,
  onClose,
}: {
  sessions: SessionFlowItem[];
  origin: PackOriginRect;
  /** 썸네일(앞에 그대로 유지 + 탭하면 토글 닫힘). 회차 종이들은 이 뒤에서 퍼짐 */
  root: {imageUrl?: string | number; title: string; count: number};
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const shown = sessions.slice(0, MAX_SHOWN); // 최대 3장만 펼침
  const {origin: originPt, nodes} = layout(shown, origin);

  const progs = Array.from({length: MAX_NODES}, () => useSharedValue(0));
  useEffect(() => {
    shown.forEach((_, i) => {
      // 가속 후 끝에서 살짝 밀려났다 안착 (미세 오버슈트 — 단조롭지 않게)
      progs[i].value = withDelay(STAGGER * i, withTiming(1, {duration: 240, easing: Easing.bezier(0.34, 0, 0.2, 1.25)}));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.length]);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sScale = useSharedValue(1);
  const sTx = useSharedValue(0);
  const sTy = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => { sTx.value = tx.value; sTy.value = ty.value; })
    .onUpdate(e => { tx.value = sTx.value + e.translationX; ty.value = sTy.value + e.translationY; });
  const pinch = Gesture.Pinch()
    .onStart(() => { sScale.value = scale.value; })
    .onUpdate(e => { scale.value = clampW(sScale.value * e.scale, MIN_ZOOM, MAX_ZOOM); });
  const gesture = Gesture.Simultaneous(pan, pinch);

  // 토글 닫기: 나왔을 때의 역순/역방향으로 사라진 뒤 언마운트
  const dismiss = () => {
    triggerHaptic('light');
    const n = shown.length;
    if (n <= 0) { onClose(); return; }
    for (let i = 0; i < n; i++) {
      const delay = STAGGER * (n - 1 - i); // 뒤 회차부터 먼저 접히고 1회차가 마지막
      const last = i === 0;
      progs[i].value = withDelay(
        delay,
        withTiming(0, {duration: 240, easing: Easing.bezier(0.34, 0, 0.2, 1.25)}, finished => {
          if (last && finished) runOnJS(onClose)();
        }),
      );
    }
  };

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: tx.value},
      {translateY: ty.value},
      {scale: scale.value},
    ] as ViewStyle['transform'],
  }));

  const canvasW = Math.max(origin.x + origin.width, ...nodes.map(nd => nd.target.x)) + 300;
  const canvasH = Math.max(origin.y + origin.height, ...nodes.map(nd => nd.target.y)) + 300;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[StyleSheet.absoluteFill, {transformOrigin: 'top left'}, canvasStyle]} pointerEvents="box-none">
          {/* 회차 종이들이 썸네일 주변에 불규칙하게 깔림 (최대 3장). 뒤 종이가 더 뒤로 → 역순 */}
          {shown
            .map((s, i) => (
              <FlowNode
                key={s.id}
                item={s}
                pos={nodes[i]}
                prog={progs[i]}
                onSelect={onSelect}
                styles={styles}
              />
            ))
            .reverse()}
          {/* 썸네일(원본) — 맨 위. 탭하면 토글 닫힘 */}
          <View style={[styles.node, {left: originPt.x - PACK_WIDTH / 2, top: originPt.y - CARD_H / 2}]}>
            <RecipePack
              title={root.title}
              subtitle=""
              count={root.count}
              cards={[{imageUrl: root.imageUrl, title: root.title}]}
              onPress={dismiss}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const createStyles = (_colors: SemanticColorsV2) =>
  StyleSheet.create({
    node: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: PACK_WIDTH,
    },
  });
