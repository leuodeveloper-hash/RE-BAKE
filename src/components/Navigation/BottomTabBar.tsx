import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {Avatar} from '@components/Avatar';
import {GlassContainer} from '@components/Container';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconNoteFilled, IconBookFilled} from '@components/Icon/IconIndex';
import {SheetHeader} from '@components/BottomSheet/SheetHeader';
import {Thumbnail} from '@components/Thumbnail';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

export interface TabItem {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  activeIcon?: React.FC<SvgProps>;
  avatar?: string;
  useRandomAvatar?: boolean;
  /** 랜덤 아바타 시드 (고정값). useRandomAvatar일 때 사용 */
  avatarSeed?: string | number;
  onPress?: () => void;
}

export interface AddMenuItem {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  iconColor?: string;
  onPress?: () => void;
}

export interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab?: string;
  /** 확장 상태 (추가 메뉴 표시) */
  expanded?: boolean;
  /** 확장 메뉴 닫기 콜백 */
  onClose?: () => void;
  /** 추가 메뉴 아이템 */
  addMenuItems?: AddMenuItem[];
  /** 추가 메뉴 아이템 선택 콜백 */
  onAddItemPress?: (item: AddMenuItem) => void;
}

export function BottomTabBar({
  tabs,
  activeTab,
  expanded = false,
  onClose,
  addMenuItems,
  onAddItemPress,
}: BottomTabBarProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  // expanded와 분리된 내부 상태: 닫을 때 애니메이션 완료 후 전환
  const [showMenu, setShowMenu] = useState(false);

  // 슬라이딩 탭 인디케이터
  const indicatorX = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const isFirstIndicator = useRef(true);
  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  useEffect(() => {
    if (segmentWidth <= 0 || activeIndex < 0) return;
    if (isFirstIndicator.current) {
      indicatorX.setValue(activeIndex * segmentWidth);
      isFirstIndicator.current = false;
    } else {
      Animated.spring(indicatorX, {
        toValue: activeIndex * segmentWidth,
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, segmentWidth]);

  const handleTabContentLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setSegmentWidth(w / tabs.length);
  }, [tabs.length]);

  const resolvedAddItems = useMemo<AddMenuItem[]>(() => addMenuItems ?? [
    {id: 'recipe', label: '레시피', icon: IconNoteFilled, iconColor: colors['custom/green-var']},
    {id: 'cookbook', label: '레시피 북', icon: IconBookFilled, iconColor: colors['custom/brown-var']},
  ], [addMenuItems, colors]);

  useEffect(() => {
    // 진행 중인 애니메이션 중단
    tabOpacity.stopAnimation();
    menuOpacity.stopAnimation();

    if (expanded) {
      // 열기: 탭 페이드아웃 → 컨테이너 전환 → 메뉴 페이드인
      Animated.timing(tabOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (!finished) return;
        setShowMenu(true);
        menuOpacity.setValue(0);
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    } else if (showMenu) {
      // 닫기: 메뉴 페이드아웃 → 컨테이너 전환 → 탭 페이드인
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (!finished) return;
        setShowMenu(false);
        Animated.timing(tabOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    } else {
      // 안전장치: expanded=false인데 showMenu도 false면 탭 복원
      tabOpacity.setValue(1);
      menuOpacity.setValue(0);
    }
  }, [expanded]);

  const handleAddItemPress = (item: AddMenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.onPress) {
      item.onPress();
    }
    if (onAddItemPress) {
      onAddItemPress(item);
    }
    onClose?.();
  };

  return (
    <GlassContainer
        borderRadius={showMenu ? 'xl' : 'full'}
        intensity={80}
        style={Platform.OS === 'web' ? styles.webTransition : undefined}
        contentStyle={showMenu ? styles.expandedContainer : styles.container}>
        {showMenu ? (
          <Animated.View style={{opacity: menuOpacity}}>
            <SheetHeader title="추가하기" headerType="center" onClose={onClose} />
            <View style={styles.menuItemsContainer}>
              {resolvedAddItems.map(item => {
                const IconComponent = item.icon;
                return (
                  <Pressable
                    key={item.id}
                    style={({pressed, focused}: {pressed: boolean; focused: boolean}) => [
                      styles.menuItem,
                      (pressed || focused) && styles.menuItemPressed,
                    ]}
                    onPress={() => handleAddItemPress(item)}>
                    <View style={styles.menuItemThumb}>
                      <IconComponent
                        width={24}
                        height={24}
                        color={item.iconColor || colors['foreground/on-surface']}
                      />
                    </View>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.tabContent, {opacity: tabOpacity}]} onLayout={handleTabContentLayout}>
            {/* 슬라이딩 활성 인디케이터 */}
            {segmentWidth > 0 && activeIndex >= 0 && (
              <Animated.View
                style={[
                  styles.activeIndicator,
                  {
                    width: segmentWidth,
                    transform: [{translateX: indicatorX}],
                  },
                ]}
              />
            )}
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const IconComponent =
                isActive && tab.activeIcon ? tab.activeIcon : tab.icon;
              const iconColor = isActive
                ? colors['foreground/on-surface']
                : colors['foreground/on-surface-muted'];
              const textColor = isActive
                ? colors['foreground/on-surface']
                : colors['foreground/on-surface-muted'];

              return (
                <Pressable
                  key={tab.id}
                  style={styles.segment}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    tab.onPress?.();
                  }}>
                  {({pressed, focused}: any) => (
                    <View style={styles.iconContainer}>
                      <View
                        style={[
                          styles.stateLayer,
                          (pressed || focused) && styles.stateLayerPressed,
                        ]}>
                        {tab.avatar ? (
                          <Avatar
                            size="small"
                            shape="circle"
                            type="image"
                            imageUrl={tab.avatar}
                            style={styles.avatarStyle}
                          />
                        ) : tab.useRandomAvatar ? (
                          <Avatar
                            size="small"
                            shape="circle"
                            type="random"
                            seed={tab.avatarSeed ?? tab.id}
                            style={styles.avatarStyle}
                          />
                        ) : (
                          <View style={styles.iconWrapper}>
                            <AppIcon icon={IconComponent} size="md" color={iconColor} />
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        )}
    </GlassContainer>
  );
}

// 공통 너비
const BOTTOM_MENU_WIDTH = 328;

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  // 탭바 컨테이너 (축소 상태)
  container: {
    width: BOTTOM_MENU_WIDTH,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  // 확장 컨테이너 (추가 메뉴 상태)
  expandedContainer: {
    maxWidth: 380,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  // 탭 콘텐츠 (메인 - 높이 결정)
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 웹: 컨테이너 크기 변화를 CSS transition으로 부드럽게
  webTransition: {
    ...Platform.select({web: {transition: 'all 0.25s ease-in-out'} as any}),
  },
  // 탭 세그먼트
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({web: {outlineStyle: 'none'} as any}),
  },
  iconContainer: {
    width: '100%',
    borderRadius: Radius['radius-full'],
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['state/hover'],
  },
  stateLayer: {
    width: '100%',
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: Radius['radius-full'],
  },
  stateLayerPressed: {},
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStyle: {
    width: 24,
    height: 24,
  },
  label: {
    fontFamily: Typography.label.small.fontFamily,
    fontSize: Typography.label.small.fontSize,
    fontWeight: Typography.label.small.fontWeight as '500',
    letterSpacing: Typography.label.small.letterSpacing,
    lineHeight: Typography.label.small.lineHeight,
    textAlign: 'center' as const,
  },
  // 추가 메뉴 스타일
  menuItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
    paddingBottom: 28,
    gap: Spacing.md,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  menuItemThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 94, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuItemLabel: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface-var'],
    textAlign: 'center',
  },
});
