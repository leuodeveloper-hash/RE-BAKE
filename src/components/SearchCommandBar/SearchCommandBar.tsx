import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, Image, KeyboardAvoidingView, Modal, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput as RNTextInput, TextInputKeyPressEventData, View} from 'react-native';
import type {SvgProps} from 'react-native-svg';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {GlassContainer} from '@components/Container';
import {TextInput} from '@components/TextInput';
import {IconSearch, IconLockFilled, IconCloseCircleFilled} from '@components/Icon/IconIndex';
import {AppIcon} from '@components/Icon/AppIcon';
import {MenuItem} from '@components/Menu/MenuItem';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';

const emptyNoResultsImage = require('../../../assets/images/empty_no_results.png');

export interface SearchCommandBarItem {
  id: string;
  label: string;
  locked?: boolean;
  /** 아이템별 아이콘 색상 (공통 iconColor보다 우선) */
  iconColor?: string;
  /** 추가 검색 대상 텍스트 (공법, 비중, 레시피 북 등) */
  searchableTexts?: string[];
  /** 레시피 이미지 URL (있으면 RecipeCard로 렌더링) */
  imageUrl?: string;
}

export interface SearchCommandBarProps {
  visible: boolean;
  onClose: () => void;
  items: SearchCommandBarItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  /** 모든 아이템에 공통 적용할 아이콘 */
  icon?: React.FC<SvgProps>;
  /** 공통 아이콘 색상 */
  iconColor?: string;
  /** 열릴 때 미리 채울 검색어 */
  initialQuery?: string;
  /** 결과를 RecipeCard(list/small)로 표시 */
  useRecipeCards?: boolean;
}

export function SearchCommandBar({
  visible,
  onClose,
  items,
  selectedId,
  onSelect,
  placeholder = '검색',
  icon,
  iconColor,
  initialQuery,
  useRecipeCards,
}: SearchCommandBarProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<RNTextInput>(null);

  const filteredItems = useMemo(() => {
    const dedupe = (list: SearchCommandBarItem[]) => {
      const seen = new Set<string>();
      return list.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };
    if (!searchQuery.trim()) return dedupe(items).slice(-10);
    const q = searchQuery.trim().toLowerCase();
    return dedupe(items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.searchableTexts?.some(t => t.toLowerCase().includes(q)),
    ));
  }, [searchQuery, items]);

  // 검색어 변경 시 포커스 인덱스 리셋
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchQuery]);

  // 열릴 때 포커스 인덱스 리셋
  useEffect(() => {
    if (visible) {
      setSearchQuery(initialQuery ?? '');
      setFocusedIndex(0);
      setMounted(true);
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
        ]).start(() => {
          // iOS Modal에서 autoFocus가 불안정하므로 애니메이션 후 수동 포커스
          if (Platform.OS !== 'web') {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        });
      });
    } else {
      setSearchQuery('');
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
        setMounted(false);
      });
    }
  }, [visible, scale, opacity]);

  const handleKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const {key} = e.nativeEvent;
    if (key === 'ArrowDown') {
      e.preventDefault?.();
      setFocusedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (key === 'ArrowUp') {
      e.preventDefault?.();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (key === 'Enter') {
      e.preventDefault?.();
      const item = filteredItems[focusedIndex];
      if (item) onSelect(item.id);
    }
  }, [filteredItems, focusedIndex, onSelect]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Animated.View
            style={[
              styles.container,
              {opacity, transform: [{scale}]},
            ]}
            pointerEvents={visible ? 'auto' : 'none'}>
            <Pressable>
              <GlassContainer borderRadius="lg" contentStyle={styles.content}>
                <View style={styles.searchBar}>
                  <TextInput
                    ref={inputRef}
                    placeholder={placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style="ghost"
                    size="small"
                    autoFocus
                    onKeyPress={handleKeyPress}
                    leadingIcon={<AppIcon icon={IconSearch} size="xs" color={colors['foreground/on-surface-muted']} />}
                    trailingIcon={searchQuery.length > 0 ? (
                      <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                        <IconCloseCircleFilled width={18} height={18} color={colors['foreground/on-surface-muted']} />
                      </Pressable>
                    ) : undefined}
                  />
                </View>
                {filteredItems.length > 0 ? (
                  <ScrollView ref={scrollRef} bounces={false} showsVerticalScrollIndicator>
                    {filteredItems.map((item, index) => (
                      <View key={item.id}>
                        {useRecipeCards ? (
                          <RecipeCard
                            id={item.id}
                            title={item.label}
                            imageUrl={item.imageUrl || undefined}
                            customSubtitle={item.searchableTexts?.join(' · ')}
                            layout="list"
                            size="small"
                            onPress={() => onSelect(item.id)}
                            locked={item.locked}
                          />
                        ) : (
                          <>
                            <MenuItem
                              id={item.id}
                              label={item.label}
                              icon={icon}
                              iconColor={item.iconColor ?? iconColor}
                              selected={index === focusedIndex || item.id === selectedId}
                              onPress={() => onSelect(item.id)}
                            />
                            {item.locked && (
                              <View style={styles.lockOverlay} pointerEvents="none">
                                <IconLockFilled width={16} height={16} color={colors['foreground/on-surface-muted']} />
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Image source={emptyNoResultsImage} style={styles.emptyImage} />
                    <Text style={styles.emptySubtitle}>
                      '{searchQuery.trim()}'에 해당하는 레시피를 찾지 못했어요
                    </Text>
                  </View>
                )}
              </GlassContainer>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
  StyleSheet.create({
    keyboardAvoiding: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
      padding: Spacing.lg,
    },
    container: {
      width: '100%',
      maxWidth: 480,
    },
    content: {
      padding: Spacing.xs,
      paddingBottom: Spacing.xs,
      height: 320,
    },
    searchBar: {
      paddingHorizontal: Spacing.smd,
      paddingVertical: Spacing.sm,
      marginBottom: 4,
      minHeight: 40,
    },
    lockOverlay: {
      position: 'absolute' as const,
      right: Spacing.smd,
      top: 0,
      bottom: 0,
      justifyContent: 'center' as const,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.smd,
    },
    emptyImage: {
      width: 60,
      height: 60,
    },
    emptySubtitle: {
      fontFamily: Typography.label.medium.fontFamily,
      fontSize: Typography.label.medium.fontSize,
      fontWeight: Typography.label.medium.fontWeight as '500',
      lineHeight: Typography.label.medium.lineHeight,
      color: colors['foreground/on-surface-muted'],
      textAlign: 'center',
      marginTop: FONT_BASELINE_OFFSET,
    },
  });
