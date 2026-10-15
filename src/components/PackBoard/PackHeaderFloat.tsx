import React from 'react';
import {StyleSheet, View} from 'react-native';
import {ContentContainer, APPBAR_HEIGHT} from '@components/Container';
import {Spacing} from '@constants/spacing';

/**
 * 팩 보기 위에 떠 있는 머리말(프로필·배너 등) — 자리를 차지하지 않고 앱바 아래에 뜬다.
 * 홈 '전체'와 레시피북·공법 팩 보기가 같은 걸 쓴다(화면마다 따로 만들다 아이폰 안전영역이 한쪽만 어긋났다).
 *
 * 주의: 떠 있는 칸(absolute)은 바로 위 부모의 안쪽 여백(안전영역 등)을 무시하고 부모 맨 위에서 시작한다.
 * 그래서 안전영역 칸(SafeAreaView) 바로 안이 아니라, 안전영역 아래에서 시작하는 칸(팩 보드 칸) 안에 둔다.
 */
export function PackHeaderFloat({children, onHeight}: {children: React.ReactNode; onHeight: (h: number) => void}) {
  return (
    <View style={styles.float} pointerEvents="box-none" onLayout={e => onHeight(e.nativeEvent.layout.height)}>
      <ContentContainer style={styles.inner}>{children}</ContentContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // 앱바(10)보다는 아래 — 앱바 메뉴가 머리말 위로 펼쳐져야 한다
    zIndex: 5,
    elevation: 5,
  },
  // 앱바 아래에서 시작, 머리말과 팩 사이 16
  inner: {
    paddingTop: APPBAR_HEIGHT,
    paddingBottom: Spacing.md,
  },
});
