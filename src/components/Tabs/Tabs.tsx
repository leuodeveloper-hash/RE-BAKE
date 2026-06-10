import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Easing, LayoutChangeEvent, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import type {SemanticColorsV2} from '@constants/tokensV2';
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
}

const FILLED_TAB_HEIGHT = 32;
const TEXT_TAB_HEIGHT = 40;
const ICON_SIZE = 16;
const ICON_CONTAINER_WIDTH = 12;

interface TabLayout {
  x: number;
  width: number;
}

export function Tabs({tabs, selectedId, onSelect, style, fullWidth, variant = 'filled', disabled}: TabsProps) {
  const isText = variant === 'text';
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();

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
    <View style={[isText ? styles.textContainer : styles.container, style]}>
      <View style={isText ? styles.textTabGroup : styles.tabGroup}>
        {/* 슬라이딩 인디케이터 */}
        {hasLayout && (
          <Animated.View
            style={[
              isText ? styles.textIndicator : styles.indicator,
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
                    <View style={styles.iconContainer}>
                      <tab.icon
                        width={ICON_SIZE}
                        height={ICON_SIZE}
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
