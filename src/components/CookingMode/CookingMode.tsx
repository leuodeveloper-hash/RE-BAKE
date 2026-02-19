import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassContainer, Card, MAX_CONTENT_WIDTH} from '@components/Container';
import {BottomSheet} from '@components/BottomSheet';
import {Snackbar} from '@components/Snackbar';
import {IconButton} from '@components/IconButton';
import {Selector} from '@components/Selector';
import {navPillStyle} from '@components/Navigation';
import {Menu, MenuItem, type MenuItemData} from '@components/Menu';
import {Button} from '@components/Button';
import {EditableChip} from '@components/EditableChip/EditableChip';
import {AppIcon} from '@components/Icon/AppIcon';
import {
  IconAdd,
  IconChevronRight,
  IconClose,
  IconEdit,
  IconTick,
  IconAstriks,
  IconCircleAlertFilled,
  IconCameraFilled,
  IconPhoto,
  IconTrash,
  IconUndo,
  IconRedo,
} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useKeyboardHeight} from '@hooks/useKeyboardHeight';
import {useEscapeKey} from '@hooks/useEscapeKey';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

// Types (same as RecipeDetailScreen)
interface ProcessStep {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
  photos?: string[];
  /** 번들 이미지 (require) */
  images?: any[];
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
  photos?: string[];
  images?: any[];
  matchedIngredients: IngredientInput[];
  editIngredients?: IngredientInput[];
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

const SIDE_PEEK = 40;
const CARD_GAP = 32;


const MAX_PHOTOS = 3;

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
          photos: step.photos,
          images: step.images,
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
        photos: step.photos,
        images: step.images,
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

  // 로컬 스낵바 (Modal 위에 표시)
  const [localSnackbar, setLocalSnackbar] = useState<string | null>(null);
  const showSnackbar = useCallback((message: string) => {
    setLocalSnackbar(message);
  }, []);
  const clearLocalSnackbar = useCallback(() => setLocalSnackbar(null), []);
  const descInputRef = useRef<RNTextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
  const [editCards, setEditCards] = useState<CookingCard[]>([]);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPhotoSubmenu, setShowPhotoSubmenu] = useState(false);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);

  // Refs for latest state (stale closure 방지)
  const editCardsRef = useRef<CookingCard[]>([]);
  const isEditingRef = useRef(false);
  editCardsRef.current = editCards;
  isEditingRef.current = isEditing;

  // Undo/Redo
  const undoStackRef = useRef<CookingCard[][]>([]);
  const redoStackRef = useRef<CookingCard[][]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  const toggleIngredient = useCallback((name: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const keyboardHeight = useKeyboardHeight();

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

  // Scroll-based card dimensions
  const sidePeek = containerWidth < 800 ? Spacing.md : SIDE_PEEK;
  const cardWidth = containerWidth - 2 * sidePeek;
  const itemWidth = cardWidth + CARD_GAP;

  const scrollToIndex = useCallback((index: number, animated = true) => {
    scrollViewRef.current?.scrollTo({x: index * itemWidth, animated});
  }, [itemWidth]);

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

  // Navigate to first card of a group (fade transition)
  const goToGroup = useCallback((groupIndex: number) => {
    const targetIdx = displayCards.findIndex(c => c.groupIndex === groupIndex);
    if (targetIdx >= 0) {
      Animated.timing(fadeAnim, {toValue: 0, duration: 150, useNativeDriver: true}).start(() => {
        setCurrentIndex(targetIdx);
        scrollToIndex(targetIdx, false);
        Animated.timing(fadeAnim, {toValue: 1, duration: 150, useNativeDriver: true}).start();
      });
    }
    setShowGroupMenu(false);
  }, [displayCards, fadeAnim, scrollToIndex]);

  // visible이 되면 초기 인덱스로 스크롤 (레이아웃 안정화 후 표시)
  const prevVisible = useRef(false);
  const [contentReady, setContentReady] = useState(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      setContentReady(false);
      const startIdx = Math.max(0, Math.min(initialIndex, flatCards.length - 1));
      setCurrentIndex(startIdx);
      setIsEditing(false);
      setCheckedIngredients(new Set());
      setTimeout(() => {
        scrollToIndex(startIdx, false);
        // 스크롤 위치 안정화 후 콘텐츠 표시
        requestAnimationFrame(() => setContentReady(true));
      }, 50);
    }
    if (!visible) setContentReady(false);
    prevVisible.current = visible;
  }, [visible, initialIndex, flatCards.length, scrollToIndex]);

  // 렌더링용 isDirty (버튼 disabled 등 UI 반영)
  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    return editCards.some((card, i) => {
      const orig = flatCards[i];
      if (!orig) return true;
      return card.description !== orig.description || card.tip !== orig.tip || card.caution !== orig.caution
        || JSON.stringify(card.photos) !== JSON.stringify(orig.photos)
        || JSON.stringify(card.editIngredients) !== JSON.stringify(orig.matchedIngredients);
    });
  }, [isEditing, editCards, flatCards]);

  // isDirty를 ref 기반으로 즉시 계산 (stale closure 방지)
  const computeIsDirty = useCallback(() => {
    if (!isEditingRef.current) return false;
    const cards = editCardsRef.current;
    return cards.some((card, i) => {
      const orig = flatCards[i];
      if (!orig) return true;
      return card.description !== orig.description || card.tip !== orig.tip || card.caution !== orig.caution
        || JSON.stringify(card.photos) !== JSON.stringify(orig.photos)
        || JSON.stringify(card.editIngredients) !== JSON.stringify(orig.matchedIngredients);
    });
  }, [flatCards]);

  const saveEdits = useCallback((silent = false) => {
    if (!onUpdate || !computeIsDirty()) return;

    const cards = editCardsRef.current;
    const ingredientAmountMap = new Map<string, string>();
    cards.forEach(card => {
      card.editIngredients?.forEach(ing => {
        if (ing.name.trim()) {
          ingredientAmountMap.set(ing.name, ing.amount);
        }
      });
    });

    let updatedIngredientGroups: IngredientGroupInput[] | undefined;
    if (ingredientGroups) {
      const existingNames = new Set(ingredientGroups.flatMap(g => g.ingredients.map(i => i.name)));
      updatedIngredientGroups = ingredientGroups.map(g => ({
        title: g.title,
        ingredients: g.ingredients.map(i => ({
          name: i.name,
          amount: ingredientAmountMap.has(i.name) ? ingredientAmountMap.get(i.name)! : i.amount,
        })),
      }));
      const newIngs = Array.from(ingredientAmountMap.entries())
        .filter(([name]) => !existingNames.has(name))
        .map(([name, amount]) => ({name, amount}));
      if (newIngs.length > 0 && updatedIngredientGroups.length > 0) {
        updatedIngredientGroups[0] = {
          ...updatedIngredientGroups[0],
          ingredients: [...updatedIngredientGroups[0].ingredients, ...newIngs],
        };
      }
    }

    const ingData = updatedIngredientGroups ? {ingredientGroups: updatedIngredientGroups} : {};

    if (stepGroups && stepGroups.length > 0) {
      const newStepGroups = stepGroups.map((group, gIdx) => ({
        title: group.title,
        steps: cards
          .filter(card => card.groupIndex === gIdx)
          .map((card, i) => ({
            step: i + 1,
            description: card.description,
            ...(card.tip ? {tip: card.tip} : {}),
            ...(card.caution ? {caution: card.caution} : {}),
            ...(card.photos?.length ? {photos: card.photos} : {}),
            ...(card.images?.length ? {images: card.images} : {}),
          })),
      }));
      onUpdate({stepGroups: newStepGroups, ...ingData});
    } else {
      const newSteps = cards.map((card, i) => ({
        step: i + 1,
        description: card.description,
        ...(card.tip ? {tip: card.tip} : {}),
        ...(card.caution ? {caution: card.caution} : {}),
        ...(card.photos?.length ? {photos: card.photos} : {}),
        ...(card.images?.length ? {images: card.images} : {}),
      }));
      onUpdate({steps: newSteps, ...ingData});
    }
    showSnackbar(silent ? '자동저장 되었습니다' : '변경사항이 저장되었습니다');
  }, [onUpdate, computeIsDirty, stepGroups, ingredientGroups, showSnackbar]);

  const handleClose = useCallback(() => {
    if (isEditingRef.current) saveEdits();
    setIsEditing(false);
    onClose();
  }, [saveEdits, onClose]);

  // 자동 저장: editCards 변경 후 1.5초 뒤 자동 저장
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isEditing || !onUpdate) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveEdits(true);
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editCards, isEditing, onUpdate, saveEdits]);

  // Undo/Redo helpers
  const updateEditCards = useCallback((updater: (prev: CookingCard[]) => CookingCard[]) => {
    setEditCards(prev => {
      undoStackRef.current.push(prev);
      redoStackRef.current = [];
      return updater(prev);
    });
    setHistoryVersion(v => v + 1);
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    setEditCards(prev => {
      redoStackRef.current.push(prev);
      return undoStackRef.current.pop()!;
    });
    setHistoryVersion(v => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    setEditCards(prev => {
      undoStackRef.current.push(prev);
      return redoStackRef.current.pop()!;
    });
    setHistoryVersion(v => v + 1);
  }, []);

  const canUndo = useMemo(() => undoStackRef.current.length > 0, [historyVersion]);
  const canRedo = useMemo(() => redoStackRef.current.length > 0, [historyVersion]);

  const removeCardField = useCallback((globalIndex: number, field: 'tip' | 'caution') => {
    updateEditCards(prev => prev.map(card =>
      card.globalIndex === globalIndex ? {...card, [field]: undefined} : card,
    ));
  }, [updateEditCards]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    if (isEditingRef.current) saveEdits(true);
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }, [currentIndex, scrollToIndex, saveEdits]);

  const goNext = useCallback(() => {
    if (currentIndex >= totalCards - 1) return;
    if (isEditingRef.current) saveEdits(true);
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }, [currentIndex, totalCards, scrollToIndex, saveEdits]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.max(0, Math.min(Math.round(offsetX / itemWidth), totalCards - 1));
    if (isEditingRef.current) saveEdits(true);
    setCurrentIndex(newIndex);
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
  }, [itemWidth, totalCards, saveEdits]);

  // Editing
  const startEditing = useCallback(() => {
    setEditCards(flatCards.map(c => ({...c, editIngredients: [...c.matchedIngredients]})));
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryVersion(0);
    setIsEditing(true);
    setTimeout(() => {
      const input = descInputRef.current;
      if (!input) return;
      // 웹: preventScroll로 포커스 시 스크롤 점프 방지
      const node = (input as any)?._node;
      if (node?.focus) {
        node.focus({preventScroll: true});
      } else {
        input.focus();
      }
      // 커서를 끝으로 이동
      const card = flatCards[currentIndex];
      if (card) {
        const len = card.description.length;
        (input as any).setSelectionRange?.(len, len);
        (input as any).setNativeProps?.({selection: {start: len, end: len}});
      }
    }, 100);
  }, [flatCards, currentIndex]);

  const updateCardField = useCallback((globalIndex: number, field: 'description' | 'tip' | 'caution', value: string | undefined) => {
    setEditCards(prev => prev.map(card =>
      card.globalIndex === globalIndex ? {...card, [field]: value} : card,
    ));
  }, []);

  const updateCardPhotos = useCallback((globalIndex: number, photos: string[] | undefined) => {
    updateEditCards(prev => prev.map(card =>
      card.globalIndex === globalIndex ? {...card, photos} : card,
    ));
  }, [updateEditCards]);

  const toggleCardIngredient = useCallback((globalIndex: number, ing: IngredientInput) => {
    updateEditCards(prev => prev.map(card => {
      if (card.globalIndex !== globalIndex) return card;
      const current = card.editIngredients ?? [];
      const exists = current.some(i => i.name === ing.name);
      return {
        ...card,
        editIngredients: exists
          ? current.filter(i => i.name !== ing.name)
          : [...current, {name: ing.name, amount: ing.amount}],
      };
    }));
  }, [updateEditCards]);

  const clearCardIngredients = useCallback((globalIndex: number) => {
    updateEditCards(prev => prev.map(card =>
      card.globalIndex === globalIndex ? {...card, editIngredients: []} : card,
    ));
  }, [updateEditCards]);

  // 사진 추가 (이미지 피커)
  const pickPhoto = useCallback(async (source: 'camera' | 'gallery', globalIndex: number, currentPhotos?: string[]) => {
    if ((currentPhotos?.length ?? 0) >= MAX_PHOTOS) return;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets.length > 0) {
      const newPhotos = [...(currentPhotos ?? []), ...result.assets.map(a => a.uri)].slice(0, MAX_PHOTOS);
      updateCardPhotos(globalIndex, newPhotos);
    }
  }, [updateCardPhotos]);

  // 사진 삭제
  const removePhoto = useCallback((globalIndex: number, photoIndex: number, currentPhotos?: string[]) => {
    if (!currentPhotos) return;
    const newPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    updateCardPhotos(globalIndex, newPhotos.length > 0 ? newPhotos : undefined);
  }, [updateCardPhotos]);

  // 사진 교체
  const replacePhoto = useCallback(async (globalIndex: number, photoIndex: number, currentPhotos?: string[]) => {
    if (!currentPhotos) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newPhotos = [...currentPhotos];
      newPhotos[photoIndex] = result.assets[0].uri;
      updateCardPhotos(globalIndex, newPhotos);
    }
  }, [updateCardPhotos]);

  // 번들 이미지 삭제
  const removeImage = useCallback((globalIndex: number, imageIndex: number) => {
    updateEditCards(prev => prev.map(card => {
      if (card.globalIndex !== globalIndex) return card;
      const newImages = (card.images ?? []).filter((_: any, i: number) => i !== imageIndex);
      return {...card, images: newImages.length > 0 ? newImages : undefined};
    }));
  }, [updateEditCards]);

  // 번들 이미지 교체 (번들 제거 → 사용자 사진으로 추가)
  const replaceImage = useCallback(async (globalIndex: number, imageIndex: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      updateEditCards(prev => prev.map(card => {
        if (card.globalIndex !== globalIndex) return card;
        const newImages = (card.images ?? []).filter((_: any, i: number) => i !== imageIndex);
        const newPhotos = [...(card.photos ?? []), result.assets[0].uri];
        return {
          ...card,
          images: newImages.length > 0 ? newImages : undefined,
          photos: newPhotos,
        };
      }));
    }
  }, [updateEditCards]);

  // 메뉴 아이템
  const addMenuItems = useMemo((): MenuItemData[] => {
    const card = editCards[currentIndex];
    return [
      {id: 'tip', label: '팁', icon: IconAstriks, disabled: card?.tip != null},
      {id: 'caution', label: '주의사항', icon: IconCircleAlertFilled, disabled: card?.caution != null},
      {id: 'photo', label: '사진', icon: IconPhoto, hasChildren: true, disabled: (card?.photos?.length ?? 0) >= MAX_PHOTOS},
    ];
  }, [editCards, currentIndex]);

  const photoSubmenuItems = useMemo((): MenuItemData[] => [
    {id: 'camera', label: '사진찍기', icon: IconCameraFilled},
    {id: 'gallery', label: '앨범에서 선택', icon: IconPhoto},
  ], []);

  // 메뉴 선택 핸들러
  const handleAddMenuSelect = useCallback((menuId: string) => {
    const card = editCards[currentIndex];
    if (!card) return;
    if (menuId === 'photo') {
      setShowPhotoSubmenu(true);
      return;
    }
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    if (menuId === 'tip') {
      updateEditCards(prev => prev.map(c =>
        c.globalIndex === card.globalIndex ? {...c, tip: c.tip ?? ''} : c,
      ));
    } else if (menuId === 'caution') {
      updateEditCards(prev => prev.map(c =>
        c.globalIndex === card.globalIndex ? {...c, caution: c.caution ?? ''} : c,
      ));
    } else if (menuId === 'camera' || menuId === 'gallery') {
      pickPhoto(menuId, card.globalIndex, card.photos);
    }
  }, [editCards, currentIndex, updateEditCards, pickPhoto]);

  // Render a single card (only active card can be edited)
  const renderCard = useCallback((item: CookingCard, isActive = false) => {
    const isCurrentEditing = isEditing && isActive;

    return (
      <View style={styles.cardOuter}>
        <Card style={styles.mainCard}>
          {/* Step count + undo/redo/add buttons */}
          <View style={styles.cardHeader}>
            <Text style={[styles.stepCount, {flex: 1}]}>{item.globalIndex + 1}/{totalCards}</Text>
            {isCurrentEditing && (
              <View style={styles.cardHeaderActions}>
                <IconButton
                  icon={IconUndo}
                  onPress={undo}
                  variant="ghost-secondary"
                  size="small"
                  disabled={!canUndo}
                />
                <IconButton
                  icon={IconRedo}
                  onPress={redo}
                  variant="ghost-secondary"
                  size="small"
                  disabled={!canRedo}
                />
                <View style={{marginLeft: 6}}>
                  <IconButton
                    icon={IconAdd}
                    onPress={() => { setShowAddMenu(prev => !prev); setShowPhotoSubmenu(false); }}
                    variant="soft"
                    size="small"
                    forcePressed={showAddMenu}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Scrollable content: description + chips */}
          <ScrollView
            style={{flex: 1}}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets>
            {/* Description */}
            {isCurrentEditing ? (
              <RNTextInput
                ref={descInputRef}
                style={[styles.description, noOutline]}
                value={item.description}
                onChangeText={text => updateCardField(item.globalIndex, 'description', text)}
                multiline
                textAlignVertical="top"
                placeholder="과정 설명"
                placeholderTextColor={colors['foreground-onsurfacemuted']}
                selectionColor={colors['custom-yellow']}
              />
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
                  onRemove={() => removeCardField(item.globalIndex, 'tip')}
                  placeholder="팁을 입력하세요"
                />
              ) : item.tip ? (
                <EditableChip label={item.tip} variant="tip" size="large" />
              ) : null
            ) : null}

            {/* Caution */}
            {item.caution != null ? (
              isCurrentEditing ? (
                <EditableChip
                  label={item.caution}
                  variant="yellow"
                  size="large"
                  onChangeText={text => updateCardField(item.globalIndex, 'caution', text)}
                  onRemove={() => removeCardField(item.globalIndex, 'caution')}
                  placeholder="주의사항을 입력하세요"
                />
              ) : item.caution ? (
                <EditableChip label={item.caution} variant="yellow" size="large" />
              ) : null
            ) : null}


          </ScrollView>

          {/* Photos + Ingredients pinned to bottom */}
          {((item.photos && item.photos.length > 0) || (item.images && item.images.length > 0)) && (
            <Pressable style={styles.photosSection} onPress={isCurrentEditing ? undefined : () => setPhotoExpanded(prev => !prev)}>
              {item.images?.map((src, iIdx) => (
                <View key={`img-${iIdx}`} style={styles.photoWrapper}>
                  <Image source={src} style={[containerWidth >= 600 ? styles.photoPadBase : styles.photoBase, photoExpanded && (containerWidth >= 600 ? styles.photoPadExpanded : styles.photoExpanded)]} />
                  {isCurrentEditing && (
                    <View style={styles.photoActions}>
                      <IconButton
                        icon={IconCameraFilled}
                        onPress={() => replaceImage(item.globalIndex, iIdx)}
                        variant="ghost-secondary"
                        size="small"
                      />
                      <IconButton
                        icon={IconTrash}
                        onPress={() => removeImage(item.globalIndex, iIdx)}
                        variant="ghost-secondary"
                        size="small"
                      />
                    </View>
                  )}
                </View>
              ))}
              {item.photos?.map((uri, pIdx) => (
                <View key={`photo-${pIdx}`} style={styles.photoWrapper}>
                  <Image source={{uri}} style={[containerWidth >= 600 ? styles.photoPadBase : styles.photoBase, photoExpanded && (containerWidth >= 600 ? styles.photoPadExpanded : styles.photoExpanded)]} />
                  {isCurrentEditing && (
                    <View style={styles.photoActions}>
                      <IconButton
                        icon={IconCameraFilled}
                        onPress={() => replacePhoto(item.globalIndex, pIdx, item.photos)}
                        variant="ghost-secondary"
                        size="small"
                      />
                      <IconButton
                        icon={IconTrash}
                        onPress={() => removePhoto(item.globalIndex, pIdx, item.photos)}
                        variant="ghost-secondary"
                        size="small"
                      />
                    </View>
                  )}
                </View>
              ))}
            </Pressable>
          )}
          {isCurrentEditing ? (
            <Pressable style={styles.ingredientsSection} onPress={() => setShowIngredientPicker(true)}>
              {(item.editIngredients ?? []).length > 0 ? (
                <Text style={styles.ingredientsText}>
                  {(item.editIngredients ?? []).map(ing => `${ing.name} ${ing.amount}`).join(', ')}
                </Text>
              ) : (
                <Text style={styles.ingredientPlaceholder}>과정에 필요한 재료를 추가할 수 있어요.</Text>
              )}
            </Pressable>
          ) : item.matchedIngredients.length > 0 ? (
            <View style={styles.ingredientsSection}>
              {item.matchedIngredients.map((ing, idx) => {
                const checked = checkedIngredients.has(ing.name);
                const isLast = idx === item.matchedIngredients.length - 1;
                return (
                  <Pressable
                    key={ing.name}
                    onPress={() => toggleIngredient(ing.name)}
                  >
                    <Text style={[styles.ingredientsText, checked && styles.ingredientChecked]}>
                      {ing.name} {ing.amount}{!isLast ? ', ' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Add menu — Card 레벨에 배치해야 iOS에서 터치 가능 */}
          {isCurrentEditing && (
            <Menu
              key={showPhotoSubmenu ? 'sub' : 'main'}
              items={showPhotoSubmenu ? photoSubmenuItems : addMenuItems}
              visible={showAddMenu}
              onSelect={handleAddMenuSelect}
              onClose={() => {
                if (showPhotoSubmenu) {
                  setShowPhotoSubmenu(false);
                } else {
                  setShowAddMenu(false);
                }
              }}
              style={styles.addMenu}
            />
          )}
        </Card>
      </View>
    );
  }, [isEditing, styles, colors, updateCardField, totalCards, removePhoto, replacePhoto, removeImage, replaceImage, photoExpanded, checkedIngredients, toggleIngredient, undo, redo, canUndo, canRedo, showAddMenu, showPhotoSubmenu, addMenuItems, photoSubmenuItems, handleAddMenuSelect, removeCardField]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      fullScreen
      enableDragToDismiss={!isEditing}
      backgroundColor={colors['surface-surfacedim']}
    >
        {/* Top nav */}
        <View style={[styles.topNav, {paddingTop: Spacing.smd}]}>
          <View style={styles.navInner}>
            <View style={styles.topLeft}>
              <GlassContainer contentStyle={navPillStyle}>
                <IconButton
                  icon={IconClose}
                  onPress={handleClose}
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
                  <IconButton
                    icon={IconTick}
                    disabled={!isDirty}
                    onPress={() => { saveEdits(); setIsEditing(false); setShowAddMenu(false); setShowPhotoSubmenu(false); }}
                    variant="filled"
                    size="large"
                  />
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

        {/* Cards with horizontal scroll */}
        <Animated.View
          style={{flex: 1, paddingTop: 72, paddingBottom: insets.bottom + Spacing.md * 2 + 48 + 24, opacity: contentReady ? fadeAnim : 0}}
          onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
          <Animated.ScrollView
            ref={scrollViewRef as any}
            horizontal
            pagingEnabled={false}
            snapToInterval={itemWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal: sidePeek - CARD_GAP / 2}}
            onScroll={Animated.event(
              [{nativeEvent: {contentOffset: {x: scrollX}}}],
              {useNativeDriver: false},
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScrollEnd}>
            {displayCards.map((card, index) => {
              const inputRange = [
                (index - 1) * itemWidth,
                index * itemWidth,
                (index + 1) * itemWidth,
              ];
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={card.globalIndex}
                  style={{width: cardWidth, marginHorizontal: CARD_GAP / 2, opacity}}>
                  {renderCard(card, index === currentIndex)}
                </Animated.View>
              );
            })}
          </Animated.ScrollView>

        </Animated.View>

        {/* 재료 선택 바텀시트 */}
        <BottomSheet
          visible={showIngredientPicker}
          onClose={() => setShowIngredientPicker(false)}
          title="재료"
          headerType="center"
        >
          <MenuItem
            id="none"
            label="재료없음"
            checked={!(editCards[currentIndex]?.editIngredients?.length)}
            onPress={() => {
              const card = editCards[currentIndex];
              if (card) clearCardIngredients(card.globalIndex);
            }}
          />
          {ingredientGroups?.map((group, gIdx) =>
            (group.ingredients ?? []).filter(ing => ing.name?.trim()).map((ing) => {
              const card = editCards[currentIndex];
              const isSelected = card?.editIngredients?.some(i => i.name === ing.name) ?? false;
              return (
                <MenuItem
                  key={`${gIdx}-${ing.name}`}
                  id={`${gIdx}-${ing.name}`}
                  label={ing.name}
                  checked={isSelected}
                  trailingText={ing.amount}
                  onPress={() => card && toggleCardIngredient(card.globalIndex, ing)}
                />
              );
            })
          )}
        </BottomSheet>

        {/* Bottom nav — 키보드가 올라오면 숨김 */}
        {/* Bottom nav — 키보드가 올라오면 숨김 */}
        {keyboardHeight === 0 && (
          <View
            style={[
              styles.bottomNav,
              {paddingBottom: insets.bottom + Spacing.md},
            ]}
          >
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
        )}

        {/* 로컬 스낵바 (Modal 내부) */}
        <View style={styles.localSnackbar}>
          <Snackbar
            message={localSnackbar ?? ''}
            visible={!!localSnackbar}
            onClose={clearLocalSnackbar}
          />
        </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
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
      alignItems: 'center',
    },
    mainCard: {
      flex: 1,
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      padding: 28,
      gap: Spacing.smd,
      overflow: 'visible',
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
      lineHeight: Typography.headline.small.lineHeight,
      marginTop: FONT_BASELINE_OFFSET,
      padding: 0,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 28, // IconButton small container 높이 — 편집 모드 전환 시 레이아웃 점프 방지
    },
    cardHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    addMenu: {
      position: 'absolute' as const,
      top: 28 + 28 + 4, // padding(28) + cardHeader(28) + gap(4)
      right: 28,
      zIndex: 20,
    },
    photosSection: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    photoWrapper: {
      position: 'relative' as const,
    },
    photoBase: {
      width: 100,
      height: 67,
      borderRadius: Radius['radius-md'],
    },
    photoExpanded: {
      width: 200,
      height: 133,
    },
    photoPadBase: {
      width: 200,
      height: 133,
      borderRadius: Radius['radius-md'],
    },
    photoPadExpanded: {
      width: 400,
      height: 267,
    },
    photoActions: {
      position: 'absolute' as const,
      bottom: Spacing.xs,
      right: Spacing.xs,
      flexDirection: 'row' as const,
      gap: Spacing.xs,
    },
    ingredientsSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    ingredientsText: {
      ...Typography.body.xlarge,
      fontWeight: Typography.body.xlarge.fontWeight as '500',
      color: colors['foreground-onsurfacemuted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    ingredientPlaceholder: {
      ...Typography.body.large,
      color: colors['foreground-onsurfacemuted'],
      opacity: 0.5,
      marginTop: FONT_BASELINE_OFFSET,
    },
    ingredientChecked: {
      textDecorationLine: 'line-through' as const,
      opacity: 0.5,
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
      marginBottom: 24,
    },
    localSnackbar: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 20,
      pointerEvents: 'box-none',
    },
  });
