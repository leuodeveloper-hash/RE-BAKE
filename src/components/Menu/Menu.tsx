import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleSheet, ViewStyle} from 'react-native';
import {BlurView} from 'expo-blur';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {MenuItem} from './MenuItem';
import {Subheader} from './Subheader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTheme} from '@contexts/ThemeContext';

export interface MenuItemData {
  id: string;
  label: string;
  icon?: React.FC<SvgProps>;
  destructive?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  title?: string;
  items: MenuItemData[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onClose?: () => void;
  style?: ViewStyle;
  /** 메뉴 표시 여부 */
  visible?: boolean;
}

export function Menu({
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  style,
  visible = true,
}: MenuProps) {
  const styles = useThemedStyles(createStyles);
  const {isDark} = useTheme();
  const scale = useRef(new Animated.Value(0.95)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // 초기값 설정
      scale.setValue(0.95);
      contentOpacity.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          // scale 애니메이션
          Animated.timing(scale, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // 콘텐츠 opacity (BlurView 내부에서만 적용)
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 100,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, scale, contentOpacity]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          transform: [{scale}],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}>
      {/* BlurView는 별도 래퍼 - opacity 애니메이션 없음, 항상 intensity 64 */}
      <BlurView intensity={64} tint={isDark ? 'dark' : 'default'} style={styles.blurView}>
        {/* 콘텐츠에만 opacity 애니메이션 적용 */}
        <Animated.View style={[styles.backgroundLayer, {opacity: contentOpacity}]}>
          {title && <Subheader title={title} />}
          {items.map(item => (
            <MenuItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              selected={item.id === selectedId}
              destructive={item.destructive}
              disabled={item.disabled}
              onPress={() => onSelect?.(item.id)}
            />
          ))}
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 8,
  },
  blurView: {
    overflow: 'hidden',
  },
  backgroundLayer: {
    backgroundColor: colors['background-transparent'],
    padding: Spacing.xs,
    minWidth: 200,
  },
});
