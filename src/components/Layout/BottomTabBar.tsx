import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {Avatar} from '@components/Avatar';
import {GlassContainer} from './GlassContainer';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconNoteFilled, IconBookFilled} from '@components/Icon/IconIndex';
import {SheetHeader} from '@components/BottomSheet/SheetHeader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface TabItem {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  activeIcon?: React.FC<SvgProps>;
  avatar?: string;
  useRandomAvatar?: boolean;
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
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  // expanded와 분리된 내부 상태: 닫을 때 애니메이션 완료 후 전환
  const [showMenu, setShowMenu] = useState(false);

  const resolvedAddItems = useMemo<AddMenuItem[]>(() => addMenuItems ?? [
    {id: 'recipe', label: '레시피', icon: IconNoteFilled, iconColor: colors['custom-greenvar']},
    {id: 'cookbook', label: '요리책', icon: IconBookFilled, iconColor: colors['custom-brownvar']},
  ], [addMenuItems, colors]);

  useEffect(() => {
    if (expanded) {
      // 열기: 즉시 메뉴 표시
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext({
          duration: 280,
          update: {type: LayoutAnimation.Types.easeInEaseOut},
        });
      }
      setShowMenu(true);
      tabOpacity.setValue(0);
      menuOpacity.setValue(1);
    } else if (showMenu) {
      // 닫기: 메뉴 페이드아웃 → 컨테이너 축소 → 탭 페이드인
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (Platform.OS !== 'web') {
          LayoutAnimation.configureNext({
            duration: 200,
            update: {type: LayoutAnimation.Types.easeInEaseOut},
          });
        }
        setShowMenu(false);
        Animated.timing(tabOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }
  }, [expanded]);

  const handleAddItemPress = (item: AddMenuItem) => {
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
        style={Platform.OS === 'web' ? styles.webTransition : undefined}
        contentStyle={showMenu ? styles.expandedContainer : styles.container}>
        {showMenu ? (
          <Animated.View style={{opacity: menuOpacity}}>
            <SheetHeader title="추가하기" onClose={onClose} />
            <View style={styles.menuItemsContainer}>
              {resolvedAddItems.map(item => {
                const IconComponent = item.icon;
                return (
                  <Pressable
                    key={item.id}
                    style={({pressed}) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed,
                    ]}
                    onPress={() => handleAddItemPress(item)}>
                    <View style={styles.menuIconContainer}>
                      <IconComponent
                        width={28}
                        height={28}
                        color={item.iconColor || colors['foreground-onsurface']}
                      />
                    </View>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.tabContent, {opacity: tabOpacity}]}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const IconComponent =
                isActive && tab.activeIcon ? tab.activeIcon : tab.icon;
              const iconColor = isActive
                ? colors['foreground-onsurface']
                : colors['foreground-onsurfacemuted'];
              const textColor = isActive
                ? colors['foreground-onsurface']
                : colors['foreground-onsurfacemuted'];

              return (
                <Pressable
                  key={tab.id}
                  style={styles.segment}
                  onPress={tab.onPress}>
                  {({pressed, focused}: any) => (
                    <View
                      style={[
                        styles.iconContainer,
                        isActive && styles.iconContainerActive,
                      ]}>
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
                            seed={tab.id}
                            style={styles.avatarStyle}
                          />
                        ) : (
                          <View style={styles.iconWrapper}>
                            <AppIcon icon={IconComponent} size="md" color={iconColor} />
                          </View>
                        )}
                        <Text style={[styles.label, {color: textColor}]}>
                          {tab.label}
                        </Text>
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

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 탭바 컨테이너 (축소 상태)
  container: {
    width: BOTTOM_MENU_WIDTH,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  // 확장 컨테이너 (추가 메뉴 상태)
  expandedContainer: {
    width: BOTTOM_MENU_WIDTH,
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
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({web: {outlineStyle: 'none'} as any}),
  },
  iconContainer: {
    width: '100%',
    borderRadius: Radius['radius-full'],
    overflow: 'hidden',
  },
  iconContainerActive: {
    backgroundColor: colors['background-statelayers-surfacehover'],
  },
  stateLayer: {
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: Radius['radius-full'],
  },
  stateLayerPressed: {
    backgroundColor: colors['background-statelayers-surfacefocus_press'],
  },
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
    paddingTop: Spacing.sm,
    paddingBottom: 32,
    gap: Spacing.md,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors['surface-surfacecontainertransparent'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurfacevar'],
    textAlign: 'center',
  },
});
