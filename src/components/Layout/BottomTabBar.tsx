import React, {useEffect, useRef} from 'react';
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
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {Avatar} from '@components/Avatar';
import {GlassContainer} from './GlassContainer';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconButton} from './IconButton';
import {IconNoteFilled, IconBookFilled, IconClose} from '@components/Icon/IconIndex';

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

// 기본 추가 메뉴 아이템
const DEFAULT_ADD_ITEMS: AddMenuItem[] = [
  {
    id: 'recipe',
    label: '레시피',
    icon: IconNoteFilled,
    iconColor: SemanticColorsLight['custom-greenvar'],
  },
  {
    id: 'cookbook',
    label: '요리책',
    icon: IconBookFilled,
    iconColor: SemanticColorsLight['custom-brownvar'],
  },
];

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
  addMenuItems = DEFAULT_ADD_ITEMS,
  onAddItemPress,
}: BottomTabBarProps) {
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 레이아웃 애니메이션 설정
    LayoutAnimation.configureNext({
      duration: 280,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    if (expanded) {
      // 탭 콘텐츠 페이드 아웃 → 메뉴 콘텐츠 페이드 인
      Animated.sequence([
        Animated.timing(tabOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 메뉴 콘텐츠 페이드 아웃 → 탭 콘텐츠 페이드 인
      Animated.sequence([
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tabOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [expanded, tabOpacity, menuOpacity]);

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
    <>
      {/* 확장 시 오버레이 */}
      {expanded && (
        <Pressable
          style={styles.overlay}
          onPress={onClose}
        />
      )}

      <GlassContainer
        borderRadius={expanded ? 'xl' : 'full'}
        contentStyle={expanded ? styles.expandedContainer : styles.container}>
        {/* 확장 상태: 메뉴가 메인, 탭이 absolute */}
        {expanded ? (
          <>
            {/* 추가 메뉴 콘텐츠 (메인 - 높이 결정) */}
            <Animated.View style={[styles.menuContentMain, {opacity: menuOpacity}]}>
              {/* 헤더 */}
              <View style={styles.menuHeader}>
                <View style={styles.menuTitleContainer}>
                  <Text style={styles.menuTitle}>추가하기</Text>
                </View>
                <IconButton
                  icon={IconClose}
                  variant="soft"
                  size="small"
                  onPress={onClose}
                />
              </View>

              {/* 메뉴 아이템들 */}
              <View style={styles.menuItemsContainer}>
                {addMenuItems.map(item => {
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
                          color={item.iconColor || SemanticColorsLight['foreground-onsurface']}
                        />
                      </View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* 탭 콘텐츠 (absolute - 페이드 아웃) */}
            <Animated.View
              style={[styles.tabContentAbsolute, {opacity: tabOpacity}]}
              pointerEvents="none">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                const IconComponent =
                  isActive && tab.activeIcon ? tab.activeIcon : tab.icon;
                const iconColor = isActive
                  ? SemanticColorsLight['foreground-onsurface']
                  : SemanticColorsLight['foreground-onsurfacemuted'];
                const textColor = isActive
                  ? SemanticColorsLight['foreground-onsurface']
                  : SemanticColorsLight['foreground-onsurfacemuted'];

                return (
                  <View key={tab.id} style={styles.segment}>
                    <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                      <View style={styles.stateLayer}>
                        {tab.avatar ? (
                          <Avatar size="small" shape="circle" type="image" imageUrl={tab.avatar} style={styles.avatarStyle} />
                        ) : tab.useRandomAvatar ? (
                          <Avatar size="small" shape="circle" type="random" seed={tab.id} style={styles.avatarStyle} />
                        ) : (
                          <View style={styles.iconWrapper}>
                            <AppIcon icon={IconComponent} size="md" color={iconColor} />
                          </View>
                        )}
                        <Text style={[styles.label, {color: textColor}]}>{tab.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          </>
        ) : (
          <>
            {/* 탭 콘텐츠 (메인 - 높이 결정) */}
            <Animated.View style={[styles.tabContent, {opacity: tabOpacity}]}>
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                const IconComponent =
                  isActive && tab.activeIcon ? tab.activeIcon : tab.icon;
                const iconColor = isActive
                  ? SemanticColorsLight['foreground-onsurface']
                  : SemanticColorsLight['foreground-onsurfacemuted'];
                const textColor = isActive
                  ? SemanticColorsLight['foreground-onsurface']
                  : SemanticColorsLight['foreground-onsurfacemuted'];

                return (
                  <Pressable
                    key={tab.id}
                    style={styles.segment}
                    onPress={tab.onPress}>
                    {({pressed}) => (
                      <View
                        style={[
                          styles.iconContainer,
                          isActive && styles.iconContainerActive,
                        ]}>
                        <View
                          style={[
                            styles.stateLayer,
                            pressed && styles.stateLayerPressed,
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

            {/* 메뉴 콘텐츠 (absolute - 페이드 인 대기) */}
            <Animated.View
              style={[styles.menuContentAbsolute, {opacity: menuOpacity}]}
              pointerEvents="none">
              <View style={styles.menuHeader}>
                <View style={styles.menuTitleContainer}>
                  <Text style={styles.menuTitle}>추가하기</Text>
                </View>
                <IconButton
                  icon={IconClose}
                  variant="soft"
                  size="small"
                  onPress={onClose}
                />
              </View>
              <View style={styles.menuItemsContainer}>
                {addMenuItems.map(item => {
                  const IconComponent = item.icon;
                  return (
                    <View key={item.id} style={styles.menuItem}>
                      <View style={styles.menuIconContainer}>
                        <IconComponent
                          width={28}
                          height={28}
                          color={item.iconColor || SemanticColorsLight['foreground-onsurface']}
                        />
                      </View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </>
        )}
      </GlassContainer>
    </>
  );
}

// 공통 너비
const BOTTOM_MENU_WIDTH = 328;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
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
  // 탭 콘텐츠 (absolute - 확장 시)
  tabContentAbsolute: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    right: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 메뉴 콘텐츠 (메인 - 높이 결정)
  menuContentMain: {
    // normal flow - 높이 결정
  },
  // 메뉴 콘텐츠 (absolute - 축소 시)
  menuContentAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  // 탭 세그먼트
  segment: {
    flex: 1,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: '100%',
    borderRadius: Radius['radius-full'],
    overflow: 'hidden',
  },
  iconContainerActive: {
    backgroundColor:
      SemanticColorsLight['background-statelayers-surfacehover'],
  },
  stateLayer: {
    width: '100%',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: Radius['radius-full'],
  },
  stateLayerPressed: {
    backgroundColor:
      SemanticColorsLight['background-statelayers-surfacefocus_press'],
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
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  menuTitleContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  menuTitle: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  menuItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: Spacing.sm,
    paddingBottom: 32,
    gap: 32,
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
    backgroundColor: SemanticColorsLight['surface-surfacecontainertransparent'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurfacevar'],
    textAlign: 'center',
  },
});
