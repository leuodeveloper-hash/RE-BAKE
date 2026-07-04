import React, {useEffect, useState} from 'react';
import {Keyboard, Platform, ScrollView, StyleSheet, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassContainer} from '@components/Container';

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
 */
export function KeyboardToolbar({left, right, above, style}: KeyboardToolbarProps) {
  const insets = useSafeAreaInsets();
  // 재마운트(포커스 재진입) 시 이미 올라온 키보드 높이를 즉시 반영 → 키보드 뒤로 숨지 않게
  const [kbHeight, setKbHeight] = useState(
    () => (Platform.OS !== 'web' && Keyboard.metrics?.()?.height) || 0,
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => setKbHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 키보드 위 8px (키보드 없으면 하단 안전영역 위)
  const bottom = ((Platform.OS !== 'web' && kbHeight > 0) ? kbHeight : insets.bottom) + 8;

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
    alignItems: 'stretch',
  },
  pill: {
    width: '100%',
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
