import React, {useEffect, useRef, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {triggerHaptic} from '@utils/haptics';

/** 썸네일 한 칸 — 손톱만 하게 */
const THUMB = 44;
// 가운데 테두리(양옆 3)가 이웃 썸네일에 닿지 않게 넉넉히
const GAP = Spacing.smd;
const STEP = THUMB + GAP;

export interface ThumbnailSliderProps {
  uris: string[];
  /** 지금 보고 있는 장 */
  index: number;
  onSelect: (index: number) => void;
}

/**
 * 썸네일 슬라이더(사진 뷰어 아래) — 숫자·눈금 대신 사진으로.
 * 가운데에 흰 테두리가 고정돼 있고 썸네일이 그 밑으로 지나간다. 줄을 끌면 가운데 오는 썸네일로 바로 넘어가고(한 칸씩 딱 멈춤),
 * 썸네일을 누르면 그 장으로 간다. 검정 배경 뷰어 전용 색(흰 테두리).
 */
export function ThumbnailSlider({uris, index, onSelect}: ThumbnailSliderProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  // 손으로 끄는 중 — 그동안은 밖에서 index가 바뀌어도 스크롤을 되돌리지 않는다
  const dragging = useRef(false);
  const centered = useRef(index);

  // 코드로 옮기는 중 — 그 사이 스크롤 이벤트는 사람이 민 게 아니다
  const programmatic = useRef(false);
  const progTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollToIndex = (i: number, animated = true) => {
    programmatic.current = true;
    clearTimeout(progTimer.current);
    progTimer.current = setTimeout(() => { programmatic.current = false; }, 350);
    scrollRef.current?.scrollTo({x: i * STEP, animated});
  };

  // 지금 장을 가운데로 — 앞뒤 여백이 반 폭이라 x = index * STEP
  useEffect(() => {
    if (!width || dragging.current) return;
    centered.current = index;
    scrollToIndex(index);
  }, [index, width]);

  // 웹 — 마우스로 끌어도 가로 스크롤이 안 되고 끌기 이벤트도 없다. 손으로 옮기고, 멈추면 한 칸에 맞춘다
  const xRef = useRef(0);
  const dragStartX = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settle = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      pick(xRef.current);
      scrollToIndex(Math.round(xRef.current / STEP));
    }, 140);
  };
  const webDrag = Platform.OS === 'web' ? {
    // 조금 움직였을 때만 가로챈다 — 그냥 누르면 썸네일 탭
    onMoveShouldSetResponderCapture: (e: any) => Math.abs(e.nativeEvent.pageX - dragStartX.current) > 4,
    onStartShouldSetResponderCapture: (e: any) => { dragStartX.current = e.nativeEvent.pageX; return false; },
    onResponderGrant: (e: any) => { dragging.current = true; dragStartX.current = e.nativeEvent.pageX + xRef.current; },
    onResponderMove: (e: any) => { scrollRef.current?.scrollTo({x: Math.max(0, dragStartX.current - e.nativeEvent.pageX), animated: false}); },
    onResponderRelease: () => { dragging.current = false; settle(); },
    onResponderTerminate: () => { dragging.current = false; settle(); },
  } : {};

  const pick = (x: number) => {
    const i = Math.max(0, Math.min(uris.length - 1, Math.round(x / STEP)));
    if (i === centered.current) return;
    centered.current = i;
    triggerHaptic('selection');
    onSelect(i);
  };

  const side = Math.max(0, (width - THUMB) / 2);
  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.wrap} {...webDrag}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        // 처음 열 때도 지금 장이 가운데 — 폭·내용 크기가 정해지기 전 scrollTo는 먹지 않아 첫 장 자리에 머물렀다
        contentOffset={{x: index * STEP, y: 0}}
        onContentSizeChange={() => { if (!dragging.current) scrollToIndex(centered.current, false); }}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={[styles.row, {paddingHorizontal: side}]}
        onScrollBeginDrag={() => { dragging.current = true; }}
        onScroll={e => {
          const x = e.nativeEvent.contentOffset.x;
          xRef.current = x;
          if (programmatic.current) return;
          // 끄는 동안 가운데 온 장으로 바로. 웹(트랙패드·휠)은 끌기 이벤트가 없어 멈추면 한 칸에 맞춘다
          if (dragging.current || Platform.OS === 'web') pick(x);
          if (Platform.OS === 'web' && !dragging.current) settle();
        }}
        onMomentumScrollEnd={e => { pick(e.nativeEvent.contentOffset.x); dragging.current = false; }}
        onScrollEndDrag={e => {
          // 튕기지 않고 놓으면 momentum이 안 온다
          const x = e.nativeEvent.contentOffset.x;
          setTimeout(() => { if (dragging.current) { pick(x); dragging.current = false; } }, 120);
        }}>
        {uris.map((uri, i) => (
          <Pressable
            key={`${uri}-${i}`}
            onPress={() => { if (i !== index) { triggerHaptic('light'); onSelect(i); } }}
            hitSlop={4}
            style={[styles.thumb, i !== index && styles.inactive]}>
            <ExpoImage source={{uri}} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
          </Pressable>
        ))}
      </ScrollView>
      {/* 가운데 고정 테두리 — 썸네일이 이 밑으로 지나간다(눈금 슬라이더의 가운데 선처럼) */}
      <View pointerEvents="none" style={styles.centerFrameWrap}>
        <View style={styles.centerFrame} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 가로 줄(row) 안에 들어가도 폭을 끝까지 — 안 그러면 폭이 썸네일 줄 길이만큼만 잡혀 가운데가 안 맞았다
  wrap: {flex: 1, alignSelf: 'stretch'},
  row: {
    alignItems: 'center',
    gap: GAP,
    paddingVertical: Spacing.sm,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius['radius-sm'],
    overflow: 'hidden',
  },
  inactive: {opacity: 0.45},
  centerFrameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFrame: {
    width: THUMB + 6,
    height: THUMB + 6,
    borderRadius: Radius['radius-sm'] + 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
