import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassContainer, IconButton, Selector, navPillStyle, MAX_CONTENT_WIDTH} from '@components/Layout';
import {Card} from '@components/Layout/Card';
import {Menu} from '@components/Menu';
import {Button} from '@components/Button';
import {EditableChip} from '@components/EditableChip/EditableChip';
import {AppIcon} from '@components/Icon/AppIcon';
import {
  IconArrowLeft,
  IconChevronRight,
  IconClose,
  IconEdit,
  IconTick,
  IconAdd,
  IconAstriks,
  IconCircleAlertFilled,
} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useEscapeKey} from '@hooks/useEscapeKey';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

// Types (same as RecipeDetailScreen)
interface ProcessStep {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
}

interface ProcessStepGroup {
  title: string;
  steps: ProcessStep[];
}

interface IngredientInput {
  name: string;
  amount: string;
}

interface IngredientGroupInput {
  title: string;
  ingredients: IngredientInput[];
}

// Flattened card for rendering
interface CookingCard {
  globalIndex: number;
  stepNumber: number;
  groupTitle: string;
  groupIndex: number;
  stepIndex: number;
  description: string;
  tip?: string;
  caution?: string;
  matchedIngredients: IngredientInput[];
}

export interface CookingModeProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  steps?: ProcessStep[];
  stepGroups?: ProcessStepGroup[];
  ingredientGroups?: IngredientGroupInput[];
  canEdit: boolean;
  onUpdate?: (data: Record<string, any>) => void;
  /** 열릴 때 시작할 카드 인덱스 */
  initialIndex?: number;
}

const ANIMATION_DURATION = 200;
const CARD_FADE_DURATION = 120;

// 슬래시 메뉴 아이템
const SLASH_MENU_ITEMS = [
  {id: 'tip', label: '팁', icon: IconAstriks},
  {id: 'caution', label: '주의사항', icon: IconCircleAlertFilled},
];

// Match ingredients by checking if name appears in step description
function matchIngredients(
  description: string,
  ingredientGroups?: IngredientGroupInput[],
): IngredientInput[] {
  if (!ingredientGroups) return [];
  const matched: IngredientInput[] = [];
  const descLower = description.toLowerCase();
  for (const group of ingredientGroups) {
    for (const ing of group.ingredients) {
      if (ing.name && descLower.includes(ing.name.toLowerCase())) {
        matched.push({name: ing.name, amount: ing.amount});
      }
    }
  }
  return matched;
}

// Flatten stepGroups/steps into sequential cards
function buildCards(
  steps?: ProcessStep[],
  stepGroups?: ProcessStepGroup[],
  ingredientGroups?: IngredientGroupInput[],
): CookingCard[] {
  const cards: CookingCard[] = [];
  let globalIdx = 0;

  if (stepGroups && stepGroups.length > 0) {
    stepGroups.forEach((group, gIdx) => {
      group.steps.forEach((step, sIdx) => {
        cards.push({
          globalIndex: globalIdx,
          stepNumber: step.step,
          groupTitle: group.title,
          groupIndex: gIdx,
          stepIndex: sIdx,
          description: step.description,
          tip: step.tip,
          caution: step.caution,
          matchedIngredients: matchIngredients(step.description, ingredientGroups),
        });
        globalIdx++;
      });
    });
  } else if (steps) {
    steps.forEach((step, sIdx) => {
      cards.push({
        globalIndex: globalIdx,
        stepNumber: step.step,
        groupTitle: '',
        groupIndex: 0,
        stepIndex: sIdx,
        description: step.description,
        tip: step.tip,
        caution: step.caution,
        matchedIngredients: matchIngredients(step.description, ingredientGroups),
      });
      globalIdx++;
    });
  }

  return cards;
}

// Web: textarea 포커스 아웃라인 제거
const noOutline: any = {outlineStyle: 'none'};

export function CookingMode({
  visible,
  onClose,
  title,
  steps,
  stepGroups,
  ingredientGroups,
  canEdit,
  onUpdate,
  initialIndex = 0,
}: CookingModeProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const descInputRef = useRef<RNTextInput>(null);
  const cardOpacity = useRef(new Animated.Value(1)).current;

  // Animation
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);
  const wasVisible = useRef(false);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editCards, setEditCards] = useState<CookingCard[]>([]);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  // ESC key to close
  useEscapeKey(useCallback(() => {
    if (visible) {
      onClose();
      return true;
    }
    return false;
  }, [visible, onClose]));

  const flatCards = useMemo(
    () => buildCards(steps, stepGroups, ingredientGroups),
    [steps, stepGroups, ingredientGroups],
  );

  const totalCards = flatCards.length;
  const displayCards = isEditing ? editCards : flatCards;

  // Group names for selector
  const groupNames = useMemo(() => {
    if (!stepGroups || stepGroups.length <= 1) return [];
    return stepGroups.map(g => g.title);
  }, [stepGroups]);

  const hasGroups = groupNames.length > 0;

  // Current group based on currentIndex
  const currentCard = displayCards[currentIndex];
  const currentGroupTitle = currentCard?.groupTitle ?? '';

  // Group menu items
  const groupMenuItems = useMemo(() =>
    groupNames.map((name, i) => ({id: String(i), label: name})),
    [groupNames],
  );

  // Navigation with opacity fade
  const goTo = useCallback((index: number) => {
    Animated.timing(cardOpacity, {
      toValue: 0,
      duration: CARD_FADE_DURATION,
      useNativeDriver: false,
    }).start(() => {
      setCurrentIndex(index);
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: CARD_FADE_DURATION,
        useNativeDriver: false,
      }).start();
    });
  }, [cardOpacity]);

  // Navigate to first card of a group
  const goToGroup = useCallback((groupIndex: number) => {
    const targetIdx = displayCards.findIndex(c => c.groupIndex === groupIndex);
    if (targetIdx >= 0) {
      goTo(targetIdx);
    }
    setShowGroupMenu(false);
  }, [displayCards, goTo]);

  // Open/close animation
  useEffect(() => {
    if (visible && !wasVisible.current) {
      wasVisible.current = true;
      setRendered(true);
      const startIdx = Math.max(0, Math.min(initialIndex, flatCards.length - 1));
      setCurrentIndex(startIdx);
      setIsEditing(false);
      cardOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else if (!visible && wasVisible.current) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        wasVisible.current = false;
        setRendered(false);
      });
    }
  }, [visible, backdropOpacity, contentOpacity]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const goNext = useCallback(() => {
    if (currentIndex < totalCards - 1) goTo(currentIndex + 1);
  }, [currentIndex, totalCards, goTo]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Editing
  const startEditing = useCallback(() => {
    setEditCards(flatCards.map(c => ({...c})));
    setIsEditing(true);
    setTimeout(() => {
      const input = descInputRef.current;
      if (!input) return;
      input.focus();
      // 커서를 끝으로 이동
      const card = flatCards[currentIndex];
      if (card) {
        const len = card.description.length;
        (input as any).setSelectionRange?.(len, len);
        (input as any).setNativeProps?.({selection: {start: len, end: len}});
      }
    }, 100);
  }, [flatCards, currentIndex]);

  const finishEditing = useCallback(() => {
    if (!onUpdate) return;

    if (stepGroups && stepGroups.length > 0) {
      const newStepGroups = stepGroups.map((group, gIdx) => ({
        title: group.title,
        steps: editCards
          .filter(card => card.groupIndex === gIdx)
          .map((card, i) => ({
            step: i + 1,
            description: card.description,
            ...(card.tip ? {tip: card.tip} : {}),
            ...(card.caution ? {caution: card.caution} : {}),
          })),
      }));
      onUpdate({stepGroups: newStepGroups});
    } else {
      const newSteps = editCards.map((card, i) => ({
        step: i + 1,
        description: card.description,
        ...(card.tip ? {tip: card.tip} : {}),
        ...(card.caution ? {caution: card.caution} : {}),
      }));
      onUpdate({steps: newSteps});
    }

    setIsEditing(false);
  }, [onUpdate, editCards, stepGroups]);

  const updateCardField = useCallback((globalIndex: number, field: 'description' | 'tip' | 'caution', value: string | undefined) => {
    setEditCards(prev => prev.map(card =>
      card.globalIndex === globalIndex ? {...card, [field]: value} : card,
    ));
  }, []);

  // 슬래시 메뉴 선택 핸들러
  const handleSlashMenuSelect = useCallback((menuId: string) => {
    const card = editCards[currentIndex];
    if (!card) return;
    const desc = card.description.endsWith('/') ? card.description.slice(0, -1) : card.description;
    if (menuId === 'tip') {
      updateCardField(card.globalIndex, 'description', desc);
      updateCardField(card.globalIndex, 'tip', card.tip ?? '');
    } else if (menuId === 'caution') {
      updateCardField(card.globalIndex, 'description', desc);
      updateCardField(card.globalIndex, 'caution', card.caution ?? '');
    }
    setShowSlashMenu(false);
  }, [editCards, currentIndex, updateCardField]);

  // Track if edits changed anything
  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    return editCards.some((card, i) => {
      const orig = flatCards[i];
      if (!orig) return true;
      return card.description !== orig.description || card.tip !== orig.tip || card.caution !== orig.caution;
    });
  }, [isEditing, editCards, flatCards]);

  // Render a single card
  const renderCard = useCallback((item: CookingCard) => {
    const isCurrentEditing = isEditing;

    return (
      <View
        style={[
          styles.cardOuter,
          {paddingTop: insets.top + 72, paddingBottom: insets.bottom + 80},
        ]}>
        <Card style={styles.mainCard}>
          {/* Step count */}
          <Text style={styles.stepCount}>{item.globalIndex + 1}/{totalCards}</Text>

          {/* Scrollable content: description + chips */}
          <ScrollView
            style={{flex: 1}}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Description */}
            {isCurrentEditing ? (
              <View>
                <RNTextInput
                  ref={descInputRef}
                  style={[styles.description, noOutline]}
                  value={item.description}
                  onChangeText={text => {
                    updateCardField(item.globalIndex, 'description', text);
                    if (text.endsWith('/')) {
                      setShowSlashMenu(true);
                    } else if (showSlashMenu) {
                      setShowSlashMenu(false);
                    }
                  }}
                  multiline
                  placeholder="과정 설명"
                  placeholderTextColor={colors['foreground-onsurfacemuted']}
                  selectionColor={colors['custom-yellow']}
                />
                {showSlashMenu && (
                  <View style={styles.slashMenuInline}>
                    <Menu
                      items={SLASH_MENU_ITEMS.map(mi => ({
                        ...mi,
                        disabled: (mi.id === 'tip' && item.tip != null) || (mi.id === 'caution' && item.caution != null),
                      }))}
                      onSelect={handleSlashMenuSelect}
                      visible
                    />
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.description}>{item.description}</Text>
            )}

            {/* Tip */}
            {item.tip != null ? (
              isCurrentEditing ? (
                <EditableChip
                  label={item.tip}
                  variant="tip"
                  size="large"
                  onChangeText={text => updateCardField(item.globalIndex, 'tip', text)}
                  onRemove={() => updateCardField(item.globalIndex, 'tip', undefined)}
                  placeholder="팁을 입력하세요"
                  style={styles.chipFullWidth}
                />
              ) : item.tip ? (
                <EditableChip label={item.tip} variant="tip" size="large" style={styles.chipFullWidth} />
              ) : null
            ) : isCurrentEditing ? (
              <Pressable
                style={styles.addChipButton}
                onPress={() => updateCardField(item.globalIndex, 'tip', '')}>
                <AppIcon icon={IconAdd} size="sm" color={colors['foreground-onsurfacemuted']} />
                <Text style={styles.addChipText}>팁 추가</Text>
              </Pressable>
            ) : null}

            {/* Caution */}
            {item.caution != null ? (
              isCurrentEditing ? (
                <EditableChip
                  label={item.caution}
                  variant="yellow"
                  size="large"
                  onChangeText={text => updateCardField(item.globalIndex, 'caution', text)}
                  onRemove={() => updateCardField(item.globalIndex, 'caution', undefined)}
                  placeholder="주의사항을 입력하세요"
                  style={styles.chipFullWidth}
                />
              ) : item.caution ? (
                <EditableChip label={item.caution} variant="yellow" size="large" style={styles.chipFullWidth} />
              ) : null
            ) : null}
          </ScrollView>

          {/* Fixed ingredients at bottom */}
          {item.matchedIngredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={styles.ingredientsText}>
                {item.matchedIngredients.map(ing => `${ing.name} ${ing.amount}`).join(', ')}
              </Text>
            </View>
          )}
        </Card>
      </View>
    );
  }, [isEditing, styles, colors, insets, updateCardField, totalCards, showSlashMenu, handleSlashMenuSelect]);

  if (!visible && !rendered) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
          },
        ]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, {opacity: contentOpacity}]}>
        {/* Top nav */}
        <View style={[styles.topNav, {paddingTop: insets.top + Spacing.smd}]}>
          <View style={styles.navInner}>
            <View style={styles.topLeft}>
              <GlassContainer contentStyle={navPillStyle}>
                <IconButton
                  icon={IconArrowLeft}
                  onPress={onClose}
                  variant="ghost-secondary"
                  size="medium"
                />
              </GlassContainer>

              <View>
                <GlassContainer contentStyle={styles.breadcrumbPill}>
                  <Selector
                    label={title}
                    disabled
                    muted
                    variant="ghost"
                    style={{maxWidth: 120}}
                  />
                  {hasGroups && (
                    <>
                      <AppIcon icon={IconChevronRight} size="xs" color={colors['foreground-onsurfacemuted']} />
                      <Selector
                        label={currentGroupTitle}
                        showDropdown
                        onPress={() => setShowGroupMenu(prev => !prev)}
                        variant="ghost"
                      />
                    </>
                  )}
                </GlassContainer>
                {hasGroups && (
                  <Menu
                    items={groupMenuItems}
                    selectedId={String(currentCard?.groupIndex ?? 0)}
                    onSelect={(id) => goToGroup(Number(id))}
                    visible={showGroupMenu}
                    style={styles.groupMenu}
                  />
                )}
              </View>
            </View>

            <View style={styles.topRight}>
              {canEdit && (
                isEditing ? (
                  <>
                    <GlassContainer contentStyle={navPillStyle}>
                      <IconButton
                        icon={IconClose}
                        onPress={cancelEditing}
                        variant="ghost-secondary"
                        size="medium"
                      />
                    </GlassContainer>
                    <IconButton
                      icon={IconTick}
                      variant="filled"
                      size="large"
                      onPress={finishEditing}
                      disabled={!isDirty}
                    />
                  </>
                ) : (
                  <GlassContainer contentStyle={navPillStyle}>
                    <IconButton
                      icon={IconEdit}
                      onPress={startEditing}
                      variant="ghost-secondary"
                      size="medium"
                    />
                  </GlassContainer>
                )
              )}
            </View>
          </View>
        </View>

        {/* Card with opacity transition */}
        {currentCard && (
          <Animated.View style={{flex: 1, opacity: cardOpacity}}>
            {renderCard(currentCard)}
          </Animated.View>
        )}

        {/* Bottom nav */}
        <View style={[styles.bottomNav, {paddingBottom: insets.bottom + Spacing.md}]}>
          <View style={styles.bottomInner}>
            <View style={styles.bottomControls}>
              <Button
                label="이전"
                variant="soft"
                onPress={goPrev}
                disabled={currentIndex === 0}
                style={{flex: 1}}
              />
              <Button
                label="다음"
                variant="soft"
                onPress={goNext}
                disabled={currentIndex >= totalCards - 1}
                style={{flex: 1}}
              />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scrim,
    },
    content: {
      flex: 1,
      backgroundColor: colors['surface-surfacedim'],
    },
    topNav: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
    },
    navInner: {
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    topLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    topRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    breadcrumbPill: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 2,
      gap: Spacing.xs,
    },
    groupMenu: {
      position: 'absolute' as const,
      top: 44 + Spacing.xs,
      right: 0,
      zIndex: 20,
    },
    cardOuter: {
      flex: 1,
      paddingHorizontal: Spacing.md,
      alignItems: 'center',
    },
    mainCard: {
      flex: 1,
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      padding: 28,
      gap: Spacing.smd,
    },
    scrollContent: {
      gap: Spacing.smd,
    },
    stepCount: {
      ...Typography.title.large,
      fontWeight: Typography.title.large.fontWeight as '700',
      color: colors['foreground-onsurfacemuted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    description: {
      ...Typography.headline.small,
      fontWeight: Typography.headline.small.fontWeight as '600',
      color: colors['foreground-onsurface'],
      lineHeight: (Typography.headline.small.lineHeight ?? 28) * 1.3,
      marginTop: FONT_BASELINE_OFFSET,
    },
    chipFullWidth: {
      alignSelf: 'stretch',
    },
    slashMenuInline: {
      paddingTop: Spacing.sm,
      alignSelf: 'flex-start',
    },
    addChipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },
    addChipText: {
      ...Typography.label.medium,
      fontWeight: Typography.label.medium.fontWeight as '600',
      color: colors['foreground-onsurfacemuted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    ingredientsSection: {
      paddingHorizontal: Spacing.xs,
    },
    ingredientsText: {
      ...Typography.body.medium,
      fontWeight: Typography.body.medium.fontWeight as '400',
      color: colors['foreground-onsurfacemuted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: Spacing.md,
      alignItems: 'center',
    },
    bottomInner: {
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
    },
    bottomControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.sm,
    },
  });
