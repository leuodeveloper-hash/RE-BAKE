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
  iconColor?: string;
  /** 체크박스 표시 (undefined이면 체크박스 없음) */
  checked?: boolean;
  /** 하위 메뉴가 있는 항목 (우측 화살표 표시) */
  hasChildren?: boolean;
  /** 우측 텍스트 (예: 재료 양) */
  trailingText?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** 하단 구분선 */
  showDivider?: boolean;
}

export interface MenuSection {
  title?: string;
  items: MenuItemData[];
  selectedId?: string;
}

export interface MenuProps {
  title?: string;
  items?: MenuItemData[];
  /** 여러 섹션으로 구성된 메뉴 (title/items 대신 사용) */
  sections?: MenuSection[];
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
  sections,
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
    <>
      {/* 바깥 터치 시 닫기 오버레이 */}
      {visible && onClose && (
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />
      )}
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
          {sections ? (
            sections.map((section, idx) => (
              <React.Fragment key={idx}>
                {section.title && <Subheader title={section.title} />}
                {section.items.map(item => (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    selected={item.id === (section.selectedId ?? selectedId)}
                    checked={item.checked}
                    hasChildren={item.hasChildren}
                    trailingText={item.trailingText}
                    destructive={item.destructive}
                    disabled={item.disabled}
                    showDivider={item.showDivider}
                    onPress={() => onSelect?.(item.id)}
                  />
                ))}
              </React.Fragment>
            ))
          ) : (
            <>
              {title && <Subheader title={title} />}
              {items?.map(item => (
                <MenuItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  selected={item.id === selectedId}
                  checked={item.checked}
                  hasChildren={item.hasChildren}
                  trailingText={item.trailingText}
                  destructive={item.destructive}
                  disabled={item.disabled}
                  showDivider={item.showDivider}
                  onPress={() => onSelect?.(item.id)}
                />
              ))}
            </>
          )}
        </Animated.View>
      </BlurView>
    </Animated.View>
    </>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  backdrop: {
    position: 'absolute' as const,
    top: -9999,
    left: -9999,
    right: -9999,
    bottom: -9999,
  },
  container: {
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  },
  blurView: {
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
  },
  backgroundLayer: {
    backgroundColor: colors['background-transparent'],
    padding: Spacing.xs,
    minWidth: 200,
  },
});
