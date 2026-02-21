import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, ScrollView, StyleSheet, ViewStyle} from 'react-native';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {GlassContainer} from '@components/Container';
import {MenuItem} from './MenuItem';
import {Subheader} from './Subheader';
import {useThemedStyles} from '@hooks/useThemedStyles';

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
  /** 최대 높이 (초과 시 스크롤) */
  maxHeight?: number;
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
  maxHeight,
}: MenuProps) {
  const styles = useThemedStyles(createStyles);
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      scale.setValue(0.95);
      opacity.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
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
        Animated.timing(opacity, {
          toValue: 0,
          duration: 100,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, scale, opacity]);

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
          style,
          {
            opacity,
            transform: [{scale}],
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}>
        <GlassContainer borderRadius="lg" contentStyle={{padding: Spacing.xs, minWidth: 200, ...(maxHeight ? {maxHeight} : {})}}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={maxHeight != null}>
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
          </ScrollView>
        </GlassContainer>
    </Animated.View>
    </>
  );
}

const createStyles = (_colors: SemanticColors) => StyleSheet.create({
  backdrop: {
    position: 'absolute' as const,
    top: -9999,
    left: -9999,
    right: -9999,
    bottom: -9999,
  },
});
