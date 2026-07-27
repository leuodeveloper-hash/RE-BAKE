import React, {useEffect, useState} from 'react';
import {Keyboard, Platform, ScrollView, StyleSheet, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassContainer} from '@components/Container';
import {MAX_CONTENT_WIDTH} from '@components/Container/ContentContainer';

/** 바 대략 높이 — above 슬롯 위치 계산용 */
const BAR_HEIGHT = 52;

export interface KeyboardToolbarProps {
  /** 좌측 버튼 그룹 (아이콘 버튼들) */
  left?: React.ReactNode;
  /** 우측 끝 액션 (저장/완료 등) */
  right?: React.ReactNode;
  /** 바 바로 위에 뜨는 콘텐츠(드롭다운 메뉴 등) */
  above?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * 키보드 위에 떠 있는 입력 툴바 — 풀폭 플로팅 글래스 바.
 * 좌측 버튼 그룹(넘치면 가로 스크롤) + 우측 끝 고정 액션.
 * 네이티브는 키보드 높이를 추적해 키보드 위에, 웹은 하단 안전영역 위에 위치.
 *
 * 주의: 이 바는 포커스 중엔 항상 표시 + 항상 터치 가능해야 한다.
 * (opacity/pointerEvents로 조건부 숨기면 아이패드 하드웨어 키보드에서 안 뜨거나
 *  갤러리/메뉴 탭이 먹히지 않는 회귀가 발생 → 절대 조건부 숨김 금지)
 */
export function KeyboardToolbar({left, right, above, style}: KeyboardToolbarProps) {
  const insets = useSafeAreaInsets();
  // 재마운트(포커스 재진입) 시 이미 올라온 키보드 높이를 즉시 반영 → 키보드 뒤로 숨지 않게
  const [kbHeight, setKbHeight] = useState(
    () => (Platform.OS !== 'web' && Keyboard.metrics?.()?.height) || 0,
  );

  // 웹(모바일 브라우저): RN Keyboard 이벤트가 안 와서 툴바가 키보드에 깔린다.
  // visualViewport로 키보드에 가려진 높이를 계산해 그만큼 툴바를 띄운다.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const vv = (typeof window !== 'undefined' ? window.visualViewport : null) as VisualViewport | null;
    if (!vv) return;
    const update = () => {
      // 키보드가 올라오면 visualViewport.height가 줄어듦 → 가려진 높이 = 레이아웃뷰포트 - 시각뷰포트 - 오프셋
      const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbHeight(hidden > 80 ? hidden : 0); // 80px 미만은 키보드 아님(주소창 등)
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // 필드 전환 시 hide→show가 연속으로 와서 툴바가 바닥으로 떨어졌다 올라오는 깜빡임 발생.
    // → hide를 잠깐 지연시키고, 그 사이 show가 오면 취소해서 위치를 유지한다.
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } };
    const onShow = (e: any) => {
      cancelHide();
      const h = e?.endCoordinates?.height ?? 0;
      if (h > 0) setKbHeight(h);
    };
    const onHide = () => {
      cancelHide();
      hideTimer = setTimeout(() => setKbHeight(0), 80);
    };
    // will/did 둘 다 등록 — 툴바가 포커스 후 재마운트되면 willShow를 놓쳐 kbHeight가 0으로
    // 시작해 키보드 밑에 깔린다. didShow까지 들어 어느 시점에 마운트돼도 높이를 확보.
    const subs = Platform.OS === 'ios'
      ? [Keyboard.addListener('keyboardWillShow', onShow), Keyboard.addListener('keyboardDidShow', onShow),
         Keyboard.addListener('keyboardWillHide', onHide), Keyboard.addListener('keyboardDidHide', onHide)]
      : [Keyboard.addListener('keyboardDidShow', onShow), Keyboard.addListener('keyboardDidHide', onHide)];
    // 재마운트 시 이미 올라와 있는 키보드 높이를 즉시 반영
    const m = Keyboard.metrics?.();
    if (m?.height) setKbHeight(m.height);
    return () => {
      cancelHide();
      subs.forEach(s => s.remove());
    };
  }, []);

  // 키보드 위 8px. 키보드가 올라와 있으면(kbHeight>0) 그 위로, 없으면 하단 안전영역 위.
  // 웹은 safe-area가 0이라 키보드 없을 때 최소 여백 16 확보(바닥에 딱 안 붙게).
  const baseBottom = kbHeight > 0
    ? kbHeight
    : (Platform.OS === 'web' ? Math.max(insets.bottom, 16) : insets.bottom);
  const bottom = baseBottom + 8;

  return (
    <>
      {above && (
        <View style={[styles.aboveWrap, {bottom: bottom + BAR_HEIGHT}]} pointerEvents="box-none">
          {above}
        </View>
      )}
      <View style={[styles.container, {bottom}, style]} pointerEvents="box-none">
        <GlassContainer style={styles.pill} contentStyle={styles.pillContent}>
          {/* 좌측 버튼 그룹: 넘치면 가로 스크롤 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.leftScroll}
            contentContainerStyle={styles.side}
          >
            {left}
          </ScrollView>
          {/* 우측 완료/저장: 고정 */}
          <View style={styles.rightFixed}>{right}</View>
        </GlassContainer>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // 풀폭(좌우 여백만) — 가운데 알약처럼 쏠리지 않게 100% 폭
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    // 콘텐츠(ContentContainer)와 동일하게 최대 너비 캡 + 중앙정렬
    alignItems: 'center',
  },
  pill: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 4,
  },
  leftScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingLeft: 4,
  },
  aboveWrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    alignItems: 'flex-start',
  },
});
