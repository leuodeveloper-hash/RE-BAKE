import React from 'react';
import {Platform, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colorAlpha, colorRgb} from '@utils/color';
import {EdgeFade} from '@components/Container/ContentMask';
import {useSafeBottom} from '@hooks/useSafeBottom';
import {LinearGradient} from 'expo-linear-gradient';
import {Spacing} from '@constants/spacing';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {Typography} from '@constants/typography';
import {ContentContainer} from '@components/Container';
import {TABBAR_BOTTOM_SPACE} from '@components/Container/ContentContainer';

export interface FloatingNavBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** 중앙 타이틀 (좌우 캡슐 사이 가운데 정렬, 아이콘 위치에 영향 없음) */
  title?: string;
  /** 중앙 커스텀 노드 — title 대신 임의 요소를 정중앙에 둘 때 */
  center?: React.ReactNode;
  /** 가운데 요소 아래로 펼쳐지는 메뉴(가운데 정렬) */
  centerMenu?: React.ReactNode;
  /** 좌측 캡슐 아래에 표시할 메뉴 */
  leftMenu?: React.ReactNode;
  /** 우측 캡슐 아래에 표시할 메뉴 */
  rightMenu?: React.ReactNode;
  /** left 영역을 전체 너비로 확장 */
  leftFull?: boolean;
  /**
   * 배경 그라디언트 틴트 색 (기본: surface/dim = 페이지 배경과 같은 색).
   * 이미지 위(상세 히어로 등)에선 fill/faint 같은 반투명 색을 넘겨 흰 웹을 없애고
   * 블러(프로스티드 글래스)가 드러나게 한다. hex / rgba 모두 허용.
   */
  tintColor?: string;
  style?: ViewStyle;
}


/** NavBar pill 높이 */
export {NAV_PILL_HEIGHT, APPBAR_TOP_PADDING, APPBAR_CONTENT_BOTTOM, APPBAR_CONTENT_GAP, APPBAR_CONTENT_TOP, APPBAR_AREA_BOTTOM} from '@constants/layout';
import {NAV_PILL_HEIGHT, APPBAR_CONTENT_BOTTOM, APPBAR_CONTENT_GAP, APPBAR_AREA_BOTTOM, APPBAR_ITEM_GAP} from '@constants/layout';

/** 공통 pill 스타일 — GlassContainer contentStyle에 사용 */
export const navPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  height: NAV_PILL_HEIGHT,
  padding: 2,
  gap: 2,
};



/**
 * 앱바 위 안전영역 — 플랫폼마다 다르다.
 * 네이티브: 기기 값(노치·다이내믹 아일랜드·상태바, iOS/안드로이드 기종별로 다름). 웹: 0(브라우저가 이미 비켜준다).
 * 시트 하단의 sheetBottomInset과 같은 방식.
 */
export const appBarTopInset = (safeTop: number) => (Platform.OS === 'web' ? 0 : safeTop);

/**
 * 앱바 아래 콘텐츠가 시작할 위치(안전영역 + 앱바 + 간격).
 * 화면 맨 위가 안전영역 밖(SafeAreaView top 아님)인 스크롤에 paddingTop으로 준다.
 */
export function useAppBarContentTop(gap: number = APPBAR_CONTENT_GAP) {
  const insets = useSafeAreaInsets();
  return appBarTopInset(insets.top) + APPBAR_AREA_BOTTOM + gap;
}

/** 앱바 버튼(알약) 아래 끝 — 앱바 버튼에서 펼쳐지는 메뉴·팝오버 위치용(콘텐츠 위치엔 쓰지 않는다) */
export function useAppBarPillBottom() {
  const insets = useSafeAreaInsets();
  return appBarTopInset(insets.top) + APPBAR_CONTENT_BOTTOM;
}

/**
 * 페이지 콘텐츠 상하 기본 여백 — 위는 앱바 아래 8, 아래는 하단 안전영역 위 8.
 * 이 8은 여기 한 곳만 책임진다. 화면·섹션은 위아래 바깥 여백을 따로 두지 않는다
 * (첫 섹션 marginTop 같은 걸 더하면 화면마다 간격이 달라진다).
 * 보통은 PageScrollView를 쓰면 자동으로 들어간다.
 */
export function usePageContentPadding() {
  const paddingTop = useAppBarContentTop();
  const paddingBottom = useSafeBottom() + Spacing.sm;
  return {paddingTop, paddingBottom};
}

// pill 바로 아래에서 짧게 페이드아웃 — 콘텐츠 침범 방지 (이전 66 → 24)
const GRADIENT_EXTENSION = Spacing.xxl; // 사라지는 구간을 길게 — 짧으면 경계가 보인다

export function FloatingNavBar({left, right, title, center, centerMenu, leftMenu, rightMenu, leftFull, tintColor, style}: FloatingNavBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {isDark} = useTheme();
  // 페이지 배경과 같은 색이라야 그라디언트 끝이 표시 안 나게 녹는다.
  // surface/normal(neutral/98)은 페이지(neutral/95)보다 밝아 앱바만 떠 보였다.
  const surfaceDim = colors['surface/dim'] as string;
  // 그라디언트 베이스: tintColor 지정 시 그 색(반투명 알파 반영), 아니면 페이지 배경색.
  const gradBase = tintColor ?? surfaceDim;
  const gradAlpha = tintColor ? colorAlpha(tintColor) : 1;
  const [gr, gg, gb] = colorRgb(gradBase);
  const gradStop = (a: number) => `rgba(${gr}, ${gg}, ${gb}, ${a * gradAlpha})`;

  return (
    <View
      style={[styles.container, {paddingTop: appBarTopInset(insets.top)}, style]}
      pointerEvents="box-none">
      {/* 배경 — 콘텐츠 마스크와 같은 공통 가림 그라디언트(블러 없음). 앱바 색(tint)이 있으면 그 색으로 */}
      <EdgeFade position="top" color={tintColor ?? surfaceDim} style={styles.blurBackground} />

      <View style={styles.inner} pointerEvents="box-none">
        <ContentContainer
          style={styles.content}
          horizontalPadding={false}>
          {title != null && (
            <View style={styles.titleCenter} pointerEvents="none">
              <Text style={[styles.title, {color: colors['foreground/on-surface']}]} numberOfLines={1}>{title}</Text>
            </View>
          )}
          {/* absoluteFill이라 좌우 캡슐 폭과 무관하게 항상 화면 정중앙 */}
          {center != null && (
            <View style={styles.titleCenter} pointerEvents="box-none">
              {center}
            </View>
          )}
          {left ? (
            <View style={leftFull ? styles.leftFull : undefined}>
              {left}
              {leftMenu && (
                <View style={styles.leftMenuContainer}>
                  {leftMenu}
                </View>
              )}
            </View>
          ) : null}
          {centerMenu ? (
            <View style={styles.centerMenuContainer} pointerEvents="box-none">
              {centerMenu}
            </View>
          ) : null}
          {right && (
            <View>
              <View style={styles.right}>{right}</View>
              {rightMenu && (
                <View style={styles.rightMenuContainer}>
                  {rightMenu}
                </View>
              )}
            </View>
          )}
        </ContentContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'visible',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -GRADIENT_EXTENSION,
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
  },
  content: {
    // 캡슐 아래로 펼쳐지는 메뉴가 below(탭)에 가리지 않게 — 형제끼리는
    // 나중에 그려진 쪽이 위로 온다
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  titleCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title.medium,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: APPBAR_ITEM_GAP,
  },
  leftFull: {
    flex: 1,
  },
  leftMenuContainer: {
    position: 'absolute' as const,
    top: NAV_PILL_HEIGHT + Spacing.xs,
    left: 0,
    zIndex: 20,
  },
  centerMenuContainer: {
    position: 'absolute' as const,
    top: NAV_PILL_HEIGHT + Spacing.xs,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  rightMenuContainer: {
    position: 'absolute' as const,
    top: NAV_PILL_HEIGHT + Spacing.xs,
    right: 0,
    zIndex: 20,
  },
});
