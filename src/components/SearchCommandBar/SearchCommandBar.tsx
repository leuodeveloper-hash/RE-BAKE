import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, Modal, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput as RNTextInput, TextInputKeyPressEventData, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {SvgProps} from 'react-native-svg';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {GlassContainer} from '@components/Container';
import {TextInput} from '@components/TextInput';
import {IconSearch, IconLockFilled, IconCloseCircleFilled} from '@components/Icon/IconIndex';
import {AppIcon} from '@components/Icon/AppIcon';
import {MenuItem} from '@components/Menu/MenuItem';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {EmptyState} from '@components/EmptyState';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';

// 검색 빈 상태: 꽃 일러스트 사용 (기존 노트+돋보기 대신)

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

/** 탭(레시피/사용자 등) — 각 탭이 자기 아이템/선택 핸들러/렌더 방식을 갖는다 */
export interface SearchCommandBarTab {
  id: string;
  label: string;
  items: SearchCommandBarItem[];
  onSelect: (id: string) => void;
  /** 이 탭 아이템에 공통 적용할 아이콘 */
  icon?: React.FC<SvgProps>;
  iconColor?: string;
  /** 결과를 RecipeCard(list/small)로 표시 */
  useRecipeCards?: boolean;
  placeholder?: string;
  /** 빈 결과 문구 (query 파라미터 사용) */
  emptyLabel?: (query: string) => string;
}

export interface SearchCommandBarProps {
  visible: boolean;
  onClose: () => void;
  items?: SearchCommandBarItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  placeholder?: string;
  /** 모든 아이템에 공통 적용할 아이콘 */
  icon?: React.FC<SvgProps>;
  /** 공통 아이콘 색상 */
  iconColor?: string;
  /** 열릴 때 미리 채울 검색어 */
  initialQuery?: string;
  /** 결과를 RecipeCard(list/small)로 표시 */
  useRecipeCards?: boolean;
  /** 탭 모드: 지정하면 상단에 탭 스트립 표시, 각 탭이 자기 items/onSelect 사용 (단일 items 무시) */
  tabs?: SearchCommandBarTab[];
}

export function SearchCommandBar({
  visible,
  onClose,
  items,
  selectedId,
  onSelect,
  placeholder,
  icon,
  iconColor,
  initialQuery,
  useRecipeCards,
  tabs,
}: SearchCommandBarProps) {
  const {t} = useTranslation();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeTabId, setActiveTabId] = useState<string | undefined>(tabs?.[0]?.id);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<RNTextInput>(null);

  // 활성 탭이 있으면 그 탭 설정을, 없으면 단일 items props를 사용 (하위호환)
  const activeTab = tabs?.find(tb => tb.id === activeTabId) ?? tabs?.[0];
  const activeItems = activeTab?.items ?? items ?? [];
  const activeOnSelect = activeTab?.onSelect ?? onSelect ?? (() => {});
  const activeIcon = activeTab?.icon ?? icon;
  const activeIconColor = activeTab?.iconColor ?? iconColor;
  const activeUseRecipeCards = activeTab?.useRecipeCards ?? useRecipeCards;
  const activePlaceholder = activeTab?.placeholder ?? placeholder;
  const activeEmptyLabel = activeTab?.emptyLabel
    ?? ((q: string) => t('searchCommandBar.emptyRecipes', {query: q}));

  const filteredItems = useMemo(() => {
    const dedupe = (list: SearchCommandBarItem[]) => {
      const seen = new Set<string>();
      return list.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };
    if (!searchQuery.trim()) return dedupe(activeItems).slice(-10);
    const q = searchQuery.trim().toLowerCase();
    return dedupe(activeItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.searchableTexts?.some(txt => txt.toLowerCase().includes(q)),
    ));
  }, [searchQuery, activeItems]);

  // 검색어/탭 변경 시 포커스 인덱스 리셋
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchQuery, activeTabId]);

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
      if (item) activeOnSelect(item.id);
    }
  }, [filteredItems, focusedIndex, activeOnSelect]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        {/* 전체 화면 딤 — 키보드와 무관하게 고정되어 relayout/깜빡임 없음 */}
        <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} />
        {/* 검색 카드는 상단에 고정(살짝 아래). 키보드가 올라와도 위치가 안 바뀌어
            덜컹임/리레이아웃 없음 — 카드가 상단이라 키보드와 겹치지 않음. */}
        <View
          style={[styles.topAnchor, {paddingTop: insets.top + Spacing.md}]}
          pointerEvents="box-none">
          <Animated.View
            style={[
              styles.container,
              {opacity, transform: [{scale}]},
            ]}
            pointerEvents={visible ? 'auto' : 'none'}>
            <Pressable>
              <GlassContainer borderRadius="lg" contentStyle={styles.content}>
                {tabs && tabs.length > 1 && (
                  <View style={styles.tabStrip}>
                    {tabs.map(tb => {
                      const active = tb.id === (activeTab?.id ?? tabs[0].id);
                      return (
                        <Pressable
                          key={tb.id}
                          onPress={() => setActiveTabId(tb.id)}
                          style={[styles.tab, active && styles.tabActive]}>
                          <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                            {tb.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <View style={styles.searchBar}>
                  <TextInput
                    ref={inputRef}
                    placeholder={activePlaceholder ?? t('searchCommandBar.searchPlaceholder')}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style="ghost"
                    size="medium"
                    autoFocus={Platform.OS === 'web'}
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
                        {activeUseRecipeCards ? (
                          <RecipeCard
                            id={item.id}
                            title={item.label}
                            imageUrl={item.imageUrl || undefined}
                            customSubtitle={item.searchableTexts?.join(' · ')}
                            layout="list"
                            size="small"
                            onPress={() => activeOnSelect(item.id)}
                            locked={item.locked}
                          />
                        ) : (
                          <>
                            <MenuItem
                              id={item.id}
                              label={item.label}
                              icon={activeIcon}
                              iconColor={item.iconColor ?? activeIconColor}
                              selected={index === focusedIndex || item.id === selectedId}
                              onPress={() => activeOnSelect(item.id)}
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
                    <EmptyState
                      variant="simple"
                      title={activeEmptyLabel(searchQuery.trim())}
                    />
                  </View>
                )}
              </GlassContainer>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    dim: {
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    topAnchor: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
    },
    container: {
      width: '100%',
      maxWidth: 480,
    },
    content: {
      padding: Spacing.xs,
      height: 320,
    },
    tabStrip: {
      flexDirection: 'row',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.xs,
      paddingBottom: Spacing.xs,
    },
    tab: {
      paddingHorizontal: Spacing.smd,
      paddingVertical: Spacing.xs,
      borderRadius: 999,
    },
    tabActive: {
      backgroundColor: colors['surface/dim'],
    },
    tabLabel: {
      fontFamily: Typography.label['large - semibold'].fontFamily,
      fontSize: Typography.label['large - semibold'].fontSize,
      fontWeight: Typography.label['large - semibold'].fontWeight as '600',
      color: colors['foreground/on-surface-muted'],
    },
    tabLabelActive: {
      color: colors['foreground/on-surface'],
    },
    searchBar: {
      paddingHorizontal: Spacing.sm,
      marginBottom: 4,
      height: 40,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors['border/muted'],
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
  });
