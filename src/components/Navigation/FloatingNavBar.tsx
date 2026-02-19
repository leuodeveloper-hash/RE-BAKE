import React from 'react';
import {Platform, StyleSheet, View, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import {BlurView} from 'expo-blur';
import {LinearGradient} from 'expo-linear-gradient';
import {Spacing} from '@constants/spacing';
import {withOpacity} from '@constants/tokens';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {ContentContainer} from '@components/Container';

export interface FloatingNavBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** 좌측 캡슐 아래에 표시할 메뉴 */
  leftMenu?: React.ReactNode;
  /** 우측 캡슐 아래에 표시할 메뉴 */
  rightMenu?: React.ReactNode;
  /** left 영역을 전체 너비로 확장 */
  leftFull?: boolean;
  style?: ViewStyle;
}

/** NavBar pill 높이 */
export const NAV_PILL_HEIGHT = 44;

/** 공통 pill 스타일 — GlassContainer contentStyle에 사용 */
export const navPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  height: NAV_PILL_HEIGHT,
  padding: 2,
  gap: 2,
};

/** AppBar 영역 하단 위치 (paddingTop + pill height). 메뉴 top 기준으로 사용 */
export const APPBAR_CONTENT_BOTTOM = Spacing.smd + NAV_PILL_HEIGHT; // 10 + 44 = 54

const GRADIENT_EXTENSION = 40;

export function FloatingNavBar({left, right, leftMenu, rightMenu, leftFull, style}: FloatingNavBarProps) {
  const colors = useColors();
  const {isDark} = useTheme();
  const surfaceDim = colors['surface-surfacedim'] as string;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, style]}
      pointerEvents="box-none">
      {/* 블러 + 그라디언트 배경 (하단 페이드 포함) */}
      {Platform.OS === 'web' ? (
        <View
          style={[styles.blurBackground, {
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          } as any]}
          pointerEvents="none">
          <LinearGradient
            colors={[withOpacity(surfaceDim, 0.95), withOpacity(surfaceDim, 0)]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : (
        <MaskedView
          style={styles.blurBackground}
          pointerEvents="none"
          maskElement={
            <LinearGradient
              colors={['black', 'black', 'rgba(0,0,0,0.45)', 'transparent']}
              locations={[0, 0.35, 0.7, 1]}
              style={{flex: 1}}
            />
          }
        >
          <BlurView
            intensity={64}
            tint={isDark ? 'dark' : 'default'}
            style={{flex: 1}}
          />
          <LinearGradient
            colors={[
              withOpacity(surfaceDim, 0.95),
              withOpacity(surfaceDim, 0.5),
              withOpacity(surfaceDim, 0.12),
              withOpacity(surfaceDim, 0),
            ] as [string, string, string, string]}
            locations={[0, 0.35, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      )}

      <View style={styles.inner} pointerEvents="box-none">
        <ContentContainer
          style={styles.content}
          horizontalPadding={false}>
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
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  rightMenuContainer: {
    position: 'absolute' as const,
    top: NAV_PILL_HEIGHT + Spacing.xs,
    right: 0,
    zIndex: 20,
  },
});
