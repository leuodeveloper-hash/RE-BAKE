import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Easing, LayoutChangeEvent, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.FC<SvgProps>;
  /** 선택 시 아이콘 색상 (기본: foreground-onsurface) */
  activeIconColor?: string;
  badge?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  /** 탭을 균등 분할하여 전체 너비를 채움 */
  fullWidth?: boolean;
}

const TAB_HEIGHT = 32;
const ICON_SIZE = 16;
const ICON_CONTAINER_WIDTH = 12;

interface TabLayout {
  x: number;
  width: number;
}

export function Tabs({tabs, selectedId, onSelect, style, fullWidth}: TabsProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayout>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const isFirstLayout = useRef(true);

  const handleTabLayout = useCallback((id: string, event: LayoutChangeEvent) => {
    const {x, width} = event.nativeEvent.layout;
    setTabLayouts(prev => ({...prev, [id]: {x, width}}));
  }, []);

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
    <View style={[styles.container, style]}>
      <View style={styles.tabGroup}>
        {/* 슬라이딩 인디케이터 */}
        {hasLayout && (
          <Animated.View
            style={[
              styles.indicator,
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
              style={[styles.tab, fullWidth && styles.tabFull]}
              onLayout={e => handleTabLayout(tab.id, e)}
              onPress={() => onSelect(tab.id)}>
              <View style={styles.tabContents}>
                {tab.icon && (
                  <View style={styles.iconContainer}>
                    <tab.icon
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                      color={
                        isSelected
                          ? (tab.activeIconColor ?? colors['foreground-onsurface'])
                          : colors['foreground-onsurfacemuted']
                      }
                    />
                  </View>
                )}
                <Text
                  style={[
                    styles.label,
                    !isSelected && styles.labelMuted,
                  ]}
                  numberOfLines={1}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    backgroundColor: colors['surface-surfacecontainer'],
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
    height: TAB_HEIGHT,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['surface-surface'],
  },
  tab: {
    height: TAB_HEIGHT,
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
    color: colors['foreground-onsurface'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  labelMuted: {
    color: colors['foreground-onsurfacemuted'],
  },
});
