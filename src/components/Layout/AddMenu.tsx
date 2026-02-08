import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SemanticColorsLight} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {IconNoteFilled, IconBookFilled, IconClose} from '@components/Icon/IconIndex';
import {IconButton} from './IconButton';
import {GlassContainer} from './GlassContainer';

export interface AddMenuItem {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  iconColor?: string;
  onPress?: () => void;
}

// 추가 메뉴 아이템 (기본값) - 피그마 디자인 기준
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

export interface AddMenuProps {
  visible: boolean;
  onClose: () => void;
  items?: AddMenuItem[];
  onItemPress?: (item: AddMenuItem) => void;
}

export function AddMenu({
  visible,
  onClose,
  items = DEFAULT_ADD_ITEMS,
  onItemPress,
}: AddMenuProps) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      // 먼저 렌더링
      setShouldRender(true);
      // 초기값 설정
      scale.setValue(0.9);
      contentOpacity.setValue(0);
      // 다음 프레임에서 애니메이션 시작
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      // 닫기 애니메이션
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, scale, contentOpacity]);

  const handleItemPress = (item: AddMenuItem) => {
    if (item.onPress) {
      item.onPress();
    }
    if (onItemPress) {
      onItemPress(item);
    }
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* 오버레이 */}
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      />

      {/* 메뉴 컨테이너 */}
      <Animated.View
        style={[
          styles.wrapper,
          {
            transform: [{scale}],
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}>
        {/* GlassContainer는 항상 intensity 64 유지 */}
        <GlassContainer borderRadius="xl" contentStyle={styles.menuContent} intensity={64}>
          {/* 콘텐츠에만 opacity 애니메이션 적용 */}
          <Animated.View style={{opacity: contentOpacity}}>
            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>추가하기</Text>
              </View>
              <IconButton
                icon={IconClose}
                variant="soft"
                size="small"
                onPress={onClose}
              />
            </View>

            {/* 메뉴 아이템들 */}
            <View style={styles.itemsContainer}>
              {items.map(item => {
                const IconComponent = item.icon;
                return (
                  <Pressable
                    key={item.id}
                    style={({pressed}) => [
                      styles.item,
                      pressed && styles.itemPressed,
                    ]}
                    onPress={() => handleItemPress(item)}>
                    <View style={styles.iconContainer}>
                      <IconComponent
                        width={28}
                        height={28}
                        color={item.iconColor || SemanticColorsLight['foreground-onsurface']}
                      />
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </GlassContainer>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  wrapper: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    // 아래에서 위로 확장되도록 transformOrigin 효과
    // React Native는 transformOrigin을 직접 지원하지 않으므로 bottom 기준 배치
  },
  menuContent: {
    width: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  itemsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: Spacing.sm,
    paddingBottom: 32,
    gap: 32,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  itemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: SemanticColorsLight['surface-surfacecontainertransparent'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurfacevar'],
    textAlign: 'center',
  },
});
