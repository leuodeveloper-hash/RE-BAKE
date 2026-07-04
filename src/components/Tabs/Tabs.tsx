import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Easing, LayoutChangeEvent, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2, useTheme} from '@contexts/ThemeContext';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {triggerHaptic} from '@utils/haptics';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.FC<SvgProps>;
  /** 선택 시 아이콘 색상 (기본: foreground-onsurface) */
  activeIconColor?: string;
  badge?: boolean;
}

export type TabsVariant = 'filled' | 'text' | 'icon';

export interface TabsProps {
  tabs: TabItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  /** 탭을 균등 분할하여 전체 너비를 채움 */
  fullWidth?: boolean;
  /** filled: 배경+인디케이터, text: 텍스트 전용 (기본: filled) */
  variant?: TabsVariant;
  /** 탭 비활성화 (표시는 하되 터치 불가) */
  disabled?: boolean;
  /** filled 탭 높이 — 'large'면 메뉴 아이템(정렬 등)과 높이 통일 (기본: medium) */
  size?: 'medium' | 'large';
}

const FILLED_TAB_HEIGHT = 32;
// 트랙 박스 총높이를 메뉴 항목(38)과 맞추기 위해: 탭 34 + 컨테이너 패딩 2*2 = 38
const FILLED_TAB_HEIGHT_LARGE = 34;
const ICON_SIZE_LARGE = 20;
const TEXT_TAB_HEIGHT = 40;
const ICON_SIZE = 16;
const ICON_CONTAINER_WIDTH = 12;

interface TabLayout {
  x: number;
  width: number;
}

export function Tabs({tabs, selectedId, onSelect, style, fullWidth, variant = 'filled', disabled, size = 'medium'}: TabsProps) {
  const isText = variant === 'text';
  const isLarge = size === 'large';
  const filledTabHeight = isLarge ? FILLED_TAB_HEIGHT_LARGE : FILLED_TAB_HEIGHT;
  const iconSize = isLarge ? ICON_SIZE_LARGE : ICON_SIZE;
  // large: 둥근 사각(스퀘어, 메뉴 선택과 동일 radius-md), 기본: 알약(full)
  const filledRadius = isLarge ? Radius['radius-md'] : Radius['radius-full'];
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const {isDark} = useTheme();
  // filled 활성 인디케이터를 트랙보다 확실히 밝게.
  // 라이트: 트랙(container=#F4F3F1) 위에 순백(surface/bright)으로 또렷한 알약. (기존 surface/normal은
  //         흰 배경에서 회끄무레하게 떠 "어둡게" 보였음)
  // 다크: surface/normal이 트랙보다 어두우므로 container-high(더 밝음) 사용.
  const filledActiveBg = isDark ? colors['surface/container-high'] : colors['surface/bright'];

  // Sliding indicator (both variants)
  const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayout>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const isFirstLayout = useRef(true);

  // Text variant: 가장 긴 레이블에 맞춰 균등 너비
  const tabWidthsRef = useRef<Record<string, number>>({});
  const hasComputedUniform = useRef(false);
  const [uniformTabWidth, setUniformTabWidth] = useState<number | undefined>(undefined);

  const handleTabLayout = useCallback((id: string, event: LayoutChangeEvent) => {
    const {x, width} = event.nativeEvent.layout;
    setTabLayouts(prev => ({...prev, [id]: {x, width}}));

    if (isText && !hasComputedUniform.current) {
      tabWidthsRef.current[id] = width;
      if (Object.keys(tabWidthsRef.current).length === tabs.length) {
        hasComputedUniform.current = true;
        const maxW = Math.max(...Object.values(tabWidthsRef.current));
        setUniformTabWidth(maxW);
      }
    }
  }, [isText, tabs.length]);

  // uniformTabWidth가 결정되면 tabLayouts를 균등 너비 기준으로 즉시 재계산.
  // (두 번째 onLayout 호출이 일부 탭에서만 fire되거나 x값이 stale로 남는 문제 회피)
  useEffect(() => {
    if (!isText || uniformTabWidth == null) return;
    const next: Record<string, TabLayout> = {};
    tabs.forEach((tab, idx) => {
      next[tab.id] = {x: idx * uniformTabWidth, width: uniformTabWidth};
    });
    setTabLayouts(next);
  }, [isText, uniformTabWidth, tabs]);

  useEffect(() => {
    const layout = tabLayouts[selectedId];
    if (!layout) return;

    if (isFirstLayout.current) {
      indicatorX.setValue(layout.x);
      indicatorWidth.setValue(layout.width);
      isFirstLayout.current = false;
      return;
    }

    Animated.parallel([
      Animated.timing(indicatorX, {
        toValue: layout.x,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(indicatorWidth, {
        toValue: layout.width,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [selectedId, tabLayouts, indicatorX, indicatorWidth]);

  const hasLayout = tabLayouts[selectedId] != null;

  return (
    <View style={[isText ? styles.textContainer : styles.container, !isText && isLarge && {borderRadius: filledRadius, backgroundColor: 'transparent'}, style]}>
      <View style={isText ? styles.textTabGroup : styles.tabGroup}>
        {/* 슬라이딩 인디케이터 */}
        {hasLayout && (
          <Animated.View
            style={[
              isText ? styles.textIndicator : styles.indicator,
              !isText && {height: filledTabHeight, borderRadius: filledRadius},
              // filled(non-large): 트랙보다 밝은 활성 알약 (라이트=순백, 다크=container-high)
              !isText && !isLarge && {backgroundColor: filledActiveBg},
              // 배경 없는 large 변형: 트랙은 투명, 선택 탭만 메뉴 선택색으로 채움
              isLarge && {backgroundColor: colors['state/pressed']},
              {
                left: indicatorX,
                width: indicatorWidth,
              },
            ]}
          />
        )}

        {tabs.map(tab => {
          const isSelected = tab.id === selectedId;
          return (
            <Pressable
              key={tab.id}
              style={[
                isText ? styles.textTab : styles.tab,
                !isText && {height: filledTabHeight, borderRadius: filledRadius},
                fullWidth && styles.tabFull,
                isText && uniformTabWidth != null && {minWidth: uniformTabWidth},
              ]}
              onLayout={e => handleTabLayout(tab.id, e)}
              onPress={() => { triggerHaptic('light'); onSelect(tab.id); }}
              disabled={disabled}>
              {isText ? (
                <Text
                  style={[
                    styles.textLabel,
                    !isSelected && styles.textLabelMuted,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="clip">
                  {tab.label}
                </Text>
              ) : (
                <View style={styles.tabContents}>
                  {tab.icon && (
                    <View style={[styles.iconContainer, !tab.label && [styles.iconContainerCentered, {width: iconSize}]]}>
                      <tab.icon
                        width={iconSize}
                        height={iconSize}
                        color={
                          isSelected
                            ? (tab.activeIconColor ?? colors['foreground/on-surface'])
                            : colors['foreground/on-surface-muted']
                        }
                      />
                    </View>
                  )}
                  {!!tab.label && (
                    <Text
                      style={[
                        styles.label,
                        !isSelected && styles.labelMuted,
                      ]}
                      numberOfLines={1}>
                      {tab.label}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  // ---- Filled variant ----
  container: {
    backgroundColor: colors['surface/container'],
    borderRadius: Radius['radius-full'],
    padding: 2,
  },
  tabGroup: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: FILLED_TAB_HEIGHT,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['surface/normal'],
  },
  tab: {
    height: FILLED_TAB_HEIGHT,
    borderRadius: Radius['radius-full'],
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabFull: {
    flex: 1,
  },
  tabContents: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  iconContainer: {
    width: ICON_CONTAINER_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // 레이블 없는 아이콘 전용 탭 — 아이콘을 탭 중앙에 정렬
  iconContainerCentered: {
    width: ICON_SIZE,
    alignItems: 'center',
  },
  label: {
    fontFamily: Typography.label['large - semibold'].fontFamily,
    fontSize: Typography.label['large - semibold'].fontSize,
    fontWeight: Typography.label['large - semibold'].fontWeight as '600',
    lineHeight: Typography.label['large - semibold'].lineHeight,
    color: colors['foreground/on-surface'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  labelMuted: {
    color: colors['foreground/on-surface-muted'],
  },

  // ---- Text variant ----
  textContainer: {},
  textTabGroup: {
    flexDirection: 'row',
  },
  textTab: {
    height: TEXT_TAB_HEIGHT,
    borderRadius: Radius['radius-full'],
    paddingHorizontal: Spacing.lg,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textIndicator: {
    position: 'absolute',
    top: 0,
    height: TEXT_TAB_HEIGHT,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['state/hover'],
  },
  textLabel: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight,
    lineHeight: Typography.title.medium.lineHeight,
    color: colors['foreground/on-surface'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  textLabelMuted: {
    color: colors['foreground/on-surface-muted'],
  },
});
