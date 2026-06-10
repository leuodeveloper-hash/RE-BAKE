import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {getPersistentUri} from '@utils/imageUpload';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassContainer, Card, MAX_CONTENT_WIDTH} from '@components/Container';
import {BottomSheet} from '@components/BottomSheet';
import {Snackbar} from '@components/Snackbar';
import {Tooltip} from '@components/Tooltip';
import {IconButton} from '@components/IconButton';
import {Selector} from '@components/Selector';
import {navPillStyle} from '@components/Navigation';
import {Menu, MenuItem, Subheader, type MenuItemData} from '@components/Menu';
import {SearchCommandBar} from '@components/SearchCommandBar';
import {Button} from '@components/Button';
import {EditableChip} from '@components/EditableChip/EditableChip';
import {StepPhotos} from '@components/StepPhotos';
import {AppIcon} from '@components/Icon/AppIcon';
import {
  IconAdd,
  IconCaretRight,
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
  IconCircleInfoFilled,
  IconEllipsisVertical,
  IconListChecks,
  IconNoteFilled,
  IconLogoSymbol,
  IconArrowTopRight,
} from '@components/Icon/IconIndex';
import {YouTubePlayerModal} from '@components/YouTubePlayer';
import {parseYouTubeVideoId} from '@utils/youtube';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useKeyboardHeight} from '@hooks/useKeyboardHeight';
import {useEscapeKey} from '@hooks/useEscapeKey';
import {useColorsV2} from '@contexts/ThemeContext';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

// Types (same as RecipeDetailScreen)
interface ProcessStep {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
  photos?: string[];
  /** 과정별 수동 지정 재료 */
  ingredients?: IngredientInput[];
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
  /** 열릴 때 재료 바텀시트 자동 오픈 */
  initialShowIngredients?: boolean;
  /** 레시피 전환용 */
  recipeItems?: {id: string; label: string; iconColor?: string; imageUrl?: string}[];
  currentRecipeId?: string;
  onRecipeSelect?: (id: string) => void;
  /** 베이키의 조언 (마지막 카드에 표시) */
  advice?: string;
  /** 베이키의 조언 사진 */
  advicePhotos?: string[];
  /** 참고 링크 (YouTube면 PiP 플레이어로 재생) */
  referenceUrl?: string;
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
          matchedIngredients: step.ingredients ?? matchIngredients(step.description, ingredientGroups),
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
        matchedIngredients: step.ingredients ?? matchIngredients(step.description, ingredientGroups),
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
  initialShowIngredients = false,
  recipeItems,
  currentRecipeId,
  onRecipeSelect,
  advice,
  advicePhotos,
  referenceUrl,
}: CookingModeProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const insets = useSafeAreaInsets();

  // 로컬 스낵바 (Modal 위에 표시)
  const [localSnackbar, setLocalSnackbar] = useState<string | null>(null);
  const showSnackbar = useCallback((message: string) => {
    setLocalSnackbar(message);
  }, []);
  const clearLocalSnackbar = useCallback(() => setLocalSnackbar(null), []);
  const descInputRef = useRef<RNTextInput>(null);
  const lastTapRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
  const [editCards, setEditCards] = useState<CookingCard[]>([]);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showRecipeMenu, setShowRecipeMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);

  const referenceYouTubeId = useMemo(() => parseYouTubeVideoId(referenceUrl), [referenceUrl]);
  const [showPhotoSubmenu, setShowPhotoSubmenu] = useState(false);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [showIngredientList, setShowIngredientList] = useState(false);
  const [editAdvice, setEditAdvice] = useState(advice ?? '');
  const [editAdvicePhotos, setEditAdvicePhotos] = useState<string[]>(advicePhotos ?? []);
  const [isInitialIngredientSheet, setIsInitialIngredientSheet] = useState(false);

  // Refs for latest state (stale closure 방지)
  const editCardsRef = useRef<CookingCard[]>([]);
  const isEditingRef = useRef(false);
  const savedSnapshotRef = useRef<string | null>(null);
  editCardsRef.current = editCards;
  isEditingRef.current = isEditing;

  // Undo/Redo
  const undoStackRef = useRef<CookingCard[][]>([]);
  const redoStackRef = useRef<CookingCard[][]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showCardOverflow, setShowCardOverflow] = useState(false);

  const toggleIngredient = useCallback((name: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const allIngredientNames = useMemo(() => {
    if (!ingredientGroups) return [];
    return ingredientGroups.flatMap(g => (g.ingredients ?? []).filter(ing => ing.name?.trim()).map(ing => ing.name));
  }, [ingredientGroups]);

  const allIngredientsChecked = allIngredientNames.length > 0 && allIngredientNames.every(n => checkedIngredients.has(n));

  const toggleAllIngredients = useCallback(() => {
    if (allIngredientsChecked) {
      setCheckedIngredients(new Set());
    } else {
      setCheckedIngredients(new Set(allIngredientNames));
    }
  }, [allIngredientsChecked, allIngredientNames]);

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

  const hasAdvice = !!advice?.trim();
  const totalCards = flatCards.length + (hasAdvice ? 1 : 0);
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
  const isOnAdviceCard = hasAdvice && currentIndex >= displayCards.length;

  // Group menu items
  const groupMenuItems = useMemo(() => [
    ...groupNames.map((name, i) => ({id: String(i), label: name})),
    ...(hasAdvice ? [{id: 'advice', label: '베이키의 조언', icon: IconLogoSymbol}] : []),
  ], [groupNames, hasAdvice]);

  // Navigate to first card of a group (fade transition)
  const goToGroup = useCallback((id: string) => {
    let targetIdx: number;
    if (id === 'advice') {
      targetIdx = displayCards.length; // advice card is after all display cards
    } else {
      const groupIndex = Number(id);
      targetIdx = displayCards.findIndex(c => c.groupIndex === groupIndex);
    }
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
      const startIdx = Math.max(0, Math.min(initialIndex, totalCards - 1));
      setCurrentIndex(startIdx);
      setIsEditing(false);
      setCheckedIngredients(new Set());
      setShowIngredientList(initialShowIngredients);
      setIsInitialIngredientSheet(initialShowIngredients);
      setTimeout(() => {
        scrollToIndex(startIdx, false);
        // 스크롤 위치 안정화 후 콘텐츠 표시
        requestAnimationFrame(() => setContentReady(true));
      }, 50);
    }
    if (!visible) {
      setContentReady(false);
      setShowIngredientList(false);
      setIsInitialIngredientSheet(false);
    }
    prevVisible.current = visible;
  }, [visible, initialIndex, flatCards.length, scrollToIndex]);

  // editCards → 비교용 스냅샷 문자열
  const snapshotEditCards = useCallback((cards: CookingCard[]) => {
    return JSON.stringify(cards.map(c => ({
      d: c.description, t: c.tip, ca: c.caution,
      p: c.photos, ei: c.editIngredients,
    })));
  }, []);

  // 렌더링용 isDirty (버튼 disabled 등 UI 반영)
  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    const current = snapshotEditCards(editCards);
    if (savedSnapshotRef.current) return current !== savedSnapshotRef.current;
    // 아직 저장 안 됨 → flatCards 기준 비교
    return editCards.some((card, i) => {
      const orig = flatCards[i];
      if (!orig) return true;
      return card.description !== orig.description || card.tip !== orig.tip || card.caution !== orig.caution
        || JSON.stringify(card.photos) !== JSON.stringify(orig.photos)
        || JSON.stringify(card.editIngredients) !== JSON.stringify(orig.matchedIngredients);
    });
  }, [isEditing, editCards, flatCards, snapshotEditCards, lastSavedAt]);

  // isDirty를 ref 기반으로 즉시 계산 (stale closure 방지)
  const computeIsDirty = useCallback(() => {
    if (!isEditingRef.current) return false;
    const cards = editCardsRef.current;
    const current = snapshotEditCards(cards);
    if (savedSnapshotRef.current) return current !== savedSnapshotRef.current;
    return cards.some((card, i) => {
      const orig = flatCards[i];
      if (!orig) return true;
      return card.description !== orig.description || card.tip !== orig.tip || card.caution !== orig.caution
        || JSON.stringify(card.photos) !== JSON.stringify(orig.photos)
        || JSON.stringify(card.editIngredients) !== JSON.stringify(orig.matchedIngredients);
    });
  }, [flatCards, snapshotEditCards]);

  const saveEdits = useCallback((silent = false) => {
    if (!onUpdate) return;
    const adviceDirty = editAdvice !== (advice ?? '') || JSON.stringify(editAdvicePhotos) !== JSON.stringify(advicePhotos ?? []);
    if (!computeIsDirty() && !adviceDirty) return;

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
    const adviceData = adviceDirty ? {
      advice: editAdvice || undefined,
      ...(editAdvicePhotos.length > 0 ? {advicePhotos: editAdvicePhotos} : {advicePhotos: undefined}),
    } : {};

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
            ...(card.editIngredients?.length ? {ingredients: card.editIngredients} : {}),
          })),
      }));
      onUpdate({stepGroups: newStepGroups, ...ingData, ...adviceData});
    } else {
      const newSteps = cards.map((card, i) => ({
        step: i + 1,
        description: card.description,
        ...(card.tip ? {tip: card.tip} : {}),
        ...(card.caution ? {caution: card.caution} : {}),
        ...(card.photos?.length ? {photos: card.photos} : {}),
        ...(card.editIngredients?.length ? {ingredients: card.editIngredients} : {}),
      }));
      onUpdate({steps: newSteps, ...ingData, ...adviceData});
    }
    savedSnapshotRef.current = snapshotEditCards(cards);
    setLastSavedAt(new Date());
    showSnackbar(silent ? '자동저장 되었습니다' : '변경사항이 저장되었습니다');
  }, [onUpdate, computeIsDirty, stepGroups, ingredientGroups, showSnackbar, snapshotEditCards, editAdvice, advice, editAdvicePhotos, advicePhotos]);

  const exitEditing = useCallback(() => {
    if (computeIsDirty()) saveEdits(true);
    setIsEditing(false);
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    setShowInfoTooltip(false);
  }, [computeIsDirty, saveEdits]);

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
    if (isEditingRef.current) exitEditing();
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    setShowCardOverflow(false);
    setShowInfoTooltip(false);
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }, [currentIndex, scrollToIndex, exitEditing]);

  const goNext = useCallback(() => {
    if (currentIndex >= totalCards - 1) return;
    if (isEditingRef.current) exitEditing();
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    setShowCardOverflow(false);
    setShowInfoTooltip(false);
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }, [currentIndex, totalCards, scrollToIndex, exitEditing]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.max(0, Math.min(Math.round(offsetX / itemWidth), totalCards - 1));
    if (isEditingRef.current) exitEditing();
    setCurrentIndex(newIndex);
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    setShowCardOverflow(false);
    setShowInfoTooltip(false);
  }, [itemWidth, totalCards, exitEditing]);

  // Editing
  const startEditing = useCallback(() => {
    setEditCards(flatCards.map(c => ({...c, editIngredients: [...c.matchedIngredients]})));
    setEditAdvice(advice ?? '');
    setEditAdvicePhotos(advicePhotos ?? []);
    undoStackRef.current = [];
    redoStackRef.current = [];
    savedSnapshotRef.current = null;
    setHistoryVersion(0);
    setIsEditing(true);
    if (!isOnAdviceCard) {
      setTimeout(() => {
        const input = descInputRef.current;
        if (!input) return;
        const node = (input as any)?._node;
        if (node?.focus) {
          node.focus({preventScroll: true});
        } else {
          input.focus();
        }
        const card = flatCards[currentIndex];
        if (card) {
          const len = card.description.length;
          (input as any).setSelectionRange?.(len, len);
          (input as any).setNativeProps?.({selection: {start: len, end: len}});
        }
      }, 100);
    }
  }, [flatCards, currentIndex, advice, advicePhotos, isOnAdviceCard]);

  const handleDoubleTap = useCallback(() => {
    if (!canEdit || isEditing) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      startEditing();
    }
    lastTapRef.current = now;
  }, [canEdit, isEditing, startEditing]);

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
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { showSnackbar('카메라 권한이 필요해요'); return; }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { showSnackbar('사진 권한이 필요해요'); return; }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      base64: Platform.OS === 'web',
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets.length > 0) {
      const uris = await Promise.all(result.assets.map(a => getPersistentUri(a.uri, a.base64)));
      const newPhotos = [...(currentPhotos ?? []), ...uris].slice(0, MAX_PHOTOS);
      updateCardPhotos(globalIndex, newPhotos);
    }
  }, [updateCardPhotos, showSnackbar]);

  // 사진 삭제
  const removePhoto = useCallback((globalIndex: number, photoIndex: number, currentPhotos?: string[]) => {
    if (!currentPhotos) return;
    const newPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    updateCardPhotos(globalIndex, newPhotos.length > 0 ? newPhotos : undefined);
  }, [updateCardPhotos]);

  // 사진 교체
  const replacePhoto = useCallback(async (globalIndex: number, photoIndex: number, currentPhotos?: string[]) => {
    if (!currentPhotos) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showSnackbar('사진 권한이 필요해요'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: Platform.OS === 'web',
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = await getPersistentUri(result.assets[0].uri, result.assets[0].base64);
      const newPhotos = [...currentPhotos];
      newPhotos[photoIndex] = uri;
      updateCardPhotos(globalIndex, newPhotos);
    }
  }, [updateCardPhotos, showSnackbar]);

  // 조언 사진 추가
  const pickAdvicePhoto = useCallback(async (source: 'camera' | 'gallery') => {
    if (editAdvicePhotos.length >= MAX_PHOTOS) return;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { showSnackbar('카메라 권한이 필요해요'); return; }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { showSnackbar('사진 권한이 필요해요'); return; }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      base64: Platform.OS === 'web',
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets.length > 0) {
      const uris = await Promise.all(result.assets.map(a => getPersistentUri(a.uri, a.base64)));
      setEditAdvicePhotos(prev => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  }, [editAdvicePhotos, showSnackbar]);

  const removeAdvicePhoto = useCallback((photoIndex: number) => {
    setEditAdvicePhotos(prev => prev.filter((_, i) => i !== photoIndex));
  }, []);

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

  const formatSavedTime = useCallback((date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const period = h < 12 ? '오전' : '오후';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `마지막 저장 ${period} ${h12}:${String(m).padStart(2, '0')}`;
  }, []);

  // 카드 오버플로우 메뉴
  const cardOverflowItems = useMemo((): MenuItemData[] => [
    {id: 'delete', label: '과정 삭제', icon: IconTrash, destructive: true},
  ], []);

  const handleCardOverflowSelect = useCallback((menuId: string) => {
    setShowCardOverflow(false);
    if (menuId === 'delete') {
      const card = displayCards[currentIndex];
      if (!card || displayCards.length <= 1) return;

      if (isEditing) {
        // 편집 모드: editCards에서 삭제
        updateEditCards(prev => {
          const next = prev.filter(c => c.globalIndex !== card.globalIndex);
          return next.map((c, i) => ({...c, globalIndex: i, stepNumber: i + 1}));
        });
      }

      // 원본 데이터도 즉시 반영
      if (onUpdate) {
        if (stepGroups && stepGroups.length > 0) {
          const newStepGroups = stepGroups.map((group, gIdx) => ({
            title: group.title,
            steps: group.steps
              .filter((_, sIdx) => !(gIdx === card.groupIndex && sIdx === card.stepIndex))
              .map((s, i) => ({...s, step: i + 1})),
          })).filter(g => g.steps.length > 0);
          onUpdate({stepGroups: newStepGroups});
        } else if (steps) {
          const newSteps = steps
            .filter((_, i) => i !== card.stepIndex)
            .map((s, i) => ({...s, step: i + 1}));
          onUpdate({steps: newSteps});
        }
      }

      // 인덱스 조정
      if (currentIndex >= displayCards.length - 1) {
        const newIdx = Math.max(0, currentIndex - 1);
        setCurrentIndex(newIdx);
        scrollToIndex(newIdx);
      }
      showSnackbar('과정이 삭제되었습니다');
    }
  }, [displayCards, currentIndex, isEditing, updateEditCards, onUpdate, stepGroups, steps, scrollToIndex, showSnackbar]);

  // Render a single card (only active card can be edited)
  const renderCard = useCallback((item: CookingCard, isActive = false) => {
    const isCurrentEditing = isEditing && isActive;

    return (
      <View style={styles.cardOuter}>
        <Card style={styles.mainCard}>
          {/* Step count + actions */}
          <View style={styles.cardHeader}>
            <Text style={[styles.stepCount, {flex: 1}]}>{item.globalIndex + 1}/{totalCards}</Text>
            {isCurrentEditing ? (
              <View style={styles.cardHeaderActions}>
                <Tooltip
                  message={lastSavedAt ? formatSavedTime(lastSavedAt) : '아직 저장된 내역이 없습니다'}
                  visible={showInfoTooltip && isActive}
                  onClose={() => setShowInfoTooltip(false)}
                  position="bottom"
                >
                  <IconButton
                    icon={IconCircleInfoFilled}
                    onPress={() => setShowInfoTooltip(prev => !prev)}
                    variant="ghost-secondary"
                    size="medium"
                  />
                </Tooltip>
                <IconButton
                  icon={IconUndo}
                  onPress={undo}
                  variant="ghost-secondary"
                  size="medium"
                  disabled={!canUndo}
                />
                <IconButton
                  icon={IconRedo}
                  onPress={redo}
                  variant="ghost-secondary"
                  size="medium"
                  disabled={!canRedo}
                />
                <View style={{marginLeft: 6}}>
                  <IconButton
                    icon={IconAdd}
                    onPress={() => { setShowAddMenu(prev => !prev); setShowPhotoSubmenu(false); }}
                    variant="soft"
                    size="medium"
                    forcePressed={showAddMenu}
                  />
                </View>
              </View>
            ) : isActive && canEdit ? (
              <View style={styles.cardHeaderActions}>
                <IconButton
                  icon={IconEllipsisVertical}
                  onPress={() => setShowCardOverflow(prev => !prev)}
                  variant="ghost-secondary"
                  size="small"
                  forcePressed={showCardOverflow}
                />
              </View>
            ) : null}
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
                placeholderTextColor={colors['foreground/on-surface-muted']}
                selectionColor={colors['custom/yellow']}
              />
            ) : (
              <Pressable onPress={canEdit ? handleDoubleTap : undefined}>
                <Text style={styles.description}>{item.description}</Text>
              </Pressable>
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
          {item.photos && item.photos.length > 0 && (
            <StepPhotos
              photos={item.photos}
              mode={isCurrentEditing ? 'edit' : 'view'}
              thumbSize={containerWidth >= 600 ? {width: 200, height: 133} : {width: 100, height: 67}}
              gap={Spacing.sm}
              paddingTop={false}
              expanded={photoExpanded}
              onToggleExpand={() => setPhotoExpanded(prev => !prev)}
              onRemove={(pIdx) => removePhoto(item.globalIndex, pIdx, item.photos)}
              onReplace={(pIdx) => replacePhoto(item.globalIndex, pIdx, item.photos)}
            />
          )}
          {isCurrentEditing ? (
            <Pressable style={styles.ingredientsSection} onPress={() => setShowIngredientPicker(true)}>
              {(item.editIngredients ?? []).length > 0 ? (
                <Text style={styles.ingredientsText}>
                  {(item.editIngredients ?? []).map(ing => `${ing.name} ${ing.amount}`).join(', ')}
                </Text>
              ) : (
                <Text style={styles.ingredientEmpty}>과정에 필요한 재료를 선택하세요.</Text>
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
          {/* Overflow menu (non-editing) */}
          {!isCurrentEditing && isActive && canEdit && (
            <Menu
              items={cardOverflowItems}
              visible={showCardOverflow}
              onSelect={handleCardOverflowSelect}
              onClose={() => setShowCardOverflow(false)}
              style={styles.overflowMenu}
            />
          )}
        </Card>
      </View>
    );
  }, [isEditing, styles, colors, updateCardField, totalCards, removePhoto, replacePhoto, photoExpanded, checkedIngredients, toggleIngredient, undo, redo, canUndo, canRedo, showAddMenu, showPhotoSubmenu, addMenuItems, photoSubmenuItems, handleAddMenuSelect, removeCardField, canEdit, handleDoubleTap, lastSavedAt, formatSavedTime, showInfoTooltip, showCardOverflow, cardOverflowItems, handleCardOverflowSelect]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      fullScreen
      enableDragToDismiss={!isEditing && !showIngredientList && !showIngredientPicker}
      backgroundColor={colors['surface/dim']}
    >
        {/* Top nav */}
        <Pressable style={[styles.topNav, {paddingTop: Spacing.smd}]} onPress={isEditing ? exitEditing : undefined}>
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
                    disabled={!recipeItems?.length}
                    muted={!recipeItems?.length}
                    variant="ghost"
                    style={{maxWidth: 120}}
                    onPress={recipeItems?.length ? () => setShowRecipeMenu(prev => !prev) : undefined}
                  />
                  {hasGroups && !isOnAdviceCard && (
                    <>
                      <View style={styles.breadcrumbCaret}>
                        <AppIcon icon={IconCaretRight} size="xs" color={colors['foreground/on-surface-muted']} />
                      </View>
                      <Selector
                        label={currentGroupTitle}
                        onPress={() => setShowGroupMenu(prev => !prev)}
                        variant="ghost"
                      />
                    </>
                  )}
                  {isOnAdviceCard && (
                    <>
                      <View style={styles.breadcrumbCaret}>
                        <AppIcon icon={IconCaretRight} size="xs" color={colors['foreground/on-surface-muted']} />
                      </View>
                      <Selector
                        label="베이키의 조언"
                        variant="ghost"
                        onPress={() => setShowGroupMenu(prev => !prev)}
                      />
                    </>
                  )}
                </GlassContainer>
                <SearchCommandBar
                  visible={showRecipeMenu}
                  onClose={() => setShowRecipeMenu(false)}
                  items={recipeItems ?? []}
                  selectedId={currentRecipeId}
                  icon={IconNoteFilled}
                  iconColor={colors['custom/green-var']}
                  onSelect={(id) => { setShowRecipeMenu(false); onRecipeSelect?.(id); }}
                />
                {(hasGroups || hasAdvice) && (
                  <Menu
                    items={groupMenuItems}
                    selectedId={isOnAdviceCard ? 'advice' : String(currentCard?.groupIndex ?? 0)}
                    onSelect={(id) => goToGroup(id)}
                    visible={showGroupMenu}
                    style={styles.groupMenu}
                  />
                )}
              </View>
            </View>

            <View style={styles.topRight}>
              {isEditing ? (
                canEdit && (
                  <GlassContainer>
                    <IconButton
                      icon={IconTick}
                      disabled={!isDirty}
                      onPress={exitEditing}
                      variant="filled"
                      size="large"
                    />
                  </GlassContainer>
                )
              ) : (
                <GlassContainer contentStyle={navPillStyle}>
                  {referenceUrl && (
                    <IconButton
                      icon={IconArrowTopRight}
                      onPress={() => {
                        if (referenceYouTubeId) {
                          setYoutubeOpen(true);
                        } else {
                          Linking.openURL(referenceUrl);
                        }
                      }}
                      variant="ghost-secondary"
                      size="medium"
                    />
                  )}
                  <IconButton
                    icon={IconListChecks}
                    onPress={() => setShowIngredientList(true)}
                    variant="ghost-secondary"
                    size="medium"
                  />
                  {canEdit && (
                    <IconButton
                      icon={IconEdit}
                      onPress={startEditing}
                      variant="ghost-secondary"
                      size="medium"
                    />
                  )}
                </GlassContainer>
              )}
            </View>
          </View>
        </Pressable>

        {/* Cards with horizontal scroll */}
        <Animated.View
          style={{flex: 1, opacity: contentReady ? fadeAnim : 0}}
          onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
          <Pressable style={{height: 72}} onPress={isEditing ? exitEditing : undefined} />
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
            {/* 베이키의 조언 카드 */}
            {hasAdvice && (() => {
              const adviceIdx = displayCards.length;
              const inputRange = [
                (adviceIdx - 1) * itemWidth,
                adviceIdx * itemWidth,
                (adviceIdx + 1) * itemWidth,
              ];
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key="advice"
                  style={{width: cardWidth, marginHorizontal: CARD_GAP / 2, opacity}}>
                  <View style={styles.cardOuter}>
                    <Card variant="yellow" style={styles.adviceCard}>
                      {/* Header */}
                      <View style={styles.cardHeader}>
                        <View style={[styles.adviceTitleRow, {flex: 1}]}>
                          <AppIcon icon={IconLogoSymbol} size="sm" color={colors['custom/yellow-var']} />
                          <Text style={styles.adviceTitle}>베이키의 조언</Text>
                        </View>
                        {isEditing && isOnAdviceCard && (
                          <View style={styles.cardHeaderActions}>
                            <View style={{marginLeft: 6}}>
                              <IconButton
                                icon={IconAdd}
                                onPress={() => { setShowAddMenu(prev => !prev); setShowPhotoSubmenu(false); }}
                                variant={isOnAdviceCard ? 'ghost-yellow' : 'soft'}
                                size="small"
                                forcePressed={showAddMenu}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                      {/* Body */}
                      <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {isEditing && isOnAdviceCard ? (
                          <RNTextInput
                            style={[styles.adviceBody, noOutline]}
                            value={editAdvice}
                            onChangeText={setEditAdvice}
                            multiline
                            textAlignVertical="top"
                            placeholder="베이키의 조언을 입력하세요"
                            placeholderTextColor={colors['custom/yellow-var'] + '80'}
                            selectionColor={colors['custom/yellow']}
                          />
                        ) : (
                          <Pressable onPress={canEdit ? handleDoubleTap : undefined}>
                            <Text style={styles.adviceBody}>{advice}</Text>
                          </Pressable>
                        )}
                      </ScrollView>
                      {/* Photos */}
                      {(() => {
                        const photos = isEditing ? editAdvicePhotos : (advicePhotos ?? []);
                        if (photos.length === 0) return null;
                        return (
                          <StepPhotos
                            photos={photos}
                            mode={(isEditing && isOnAdviceCard) ? 'edit' : 'view'}
                            thumbSize={containerWidth >= 600 ? {width: 200, height: 133} : {width: 100, height: 67}}
                            gap={Spacing.sm}
                            paddingTop={false}
                            expanded={photoExpanded}
                            onToggleExpand={() => setPhotoExpanded(prev => !prev)}
                            onRemove={(pIdx) => removeAdvicePhoto(pIdx)}
                          />
                        );
                      })()}
                      {/* Add menu */}
                      {isEditing && isOnAdviceCard && (
                        <Menu
                          key={showPhotoSubmenu ? 'adv-sub' : 'adv-main'}
                          items={showPhotoSubmenu ? photoSubmenuItems : [{id: 'photo', label: '사진', icon: IconPhoto, hasChildren: true, disabled: editAdvicePhotos.length >= MAX_PHOTOS}]}
                          visible={showAddMenu}
                          onSelect={(id) => {
                            if (id === 'photo') {
                              setShowPhotoSubmenu(true);
                            } else if (id === 'camera' || id === 'gallery') {
                              pickAdvicePhoto(id);
                              setShowAddMenu(false);
                              setShowPhotoSubmenu(false);
                            }
                          }}
                          onClose={() => {
                            if (showPhotoSubmenu) setShowPhotoSubmenu(false);
                            else setShowAddMenu(false);
                          }}
                          style={styles.addMenu}
                        />
                      )}
                    </Card>
                  </View>
                </Animated.View>
              );
            })()}
          </Animated.ScrollView>
          <Pressable style={{height: insets.bottom + Spacing.md * 2 + 48 + 24}} onPress={isEditing ? exitEditing : undefined} />
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

        {/* 전체 재료 리스트 바텀시트 */}
        <BottomSheet
          visible={showIngredientList}
          onClose={() => { setShowIngredientList(false); setIsInitialIngredientSheet(false); }}
          title={isInitialIngredientSheet ? '재료 준비' : '재료'}
          headerType="center"
        >
          {ingredientGroups?.map((group, gIdx) => (
            <React.Fragment key={gIdx}>
              {(ingredientGroups?.length ?? 0) > 1 && group.title ? (
                <Subheader title={group.title} />
              ) : null}
              {(group.ingredients ?? []).filter(ing => ing.name?.trim()).map(ing => {
                const checked = checkedIngredients.has(ing.name);
                return (
                  <MenuItem
                    key={`list-${gIdx}-${ing.name}`}
                    id={`list-${gIdx}-${ing.name}`}
                    label={ing.name}
                    checked={checked}
                    trailingText={ing.amount}
                    onPress={() => toggleIngredient(ing.name)}
                  />
                );
              })}
            </React.Fragment>
          ))}
          <View style={styles.ingredientListFooter}>
            <Button
              label={allIngredientsChecked ? '전체 해제' : '전체선택'}
              variant="soft"
              onPress={toggleAllIngredients}
              style={{flex: 1}}
            />
            {allIngredientsChecked && (
              <Button
                label="준비 완료"
                onPress={() => { setShowIngredientList(false); setIsInitialIngredientSheet(false); }}
                style={{flex: 1}}
              />
            )}
          </View>
        </BottomSheet>

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

        <YouTubePlayerModal
          visible={youtubeOpen}
          onClose={() => setYoutubeOpen(false)}
          videoId={referenceYouTubeId}
        />
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
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
    },
    breadcrumbCaret: {
      marginHorizontal: -4,
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
      color: colors['foreground/on-surface-muted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    description: {
      ...Typography.headline.small,
      fontWeight: Typography.headline.small.fontWeight as '600',
      color: colors['foreground/on-surface'],
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
    overflowMenu: {
      position: 'absolute' as const,
      top: 28 + 28 + 4,
      right: 28,
      zIndex: 20,
    },
    ingredientsSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.xs,
    },
    ingredientsText: {
      ...Typography.body.xlarge,
      fontWeight: Typography.body.xlarge.fontWeight as '500',
      color: colors['foreground/on-surface-muted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    ingredientPlaceholder: {
      ...Typography.body.large,
      color: colors['foreground/on-surface-muted'],
      opacity: 0.5,
      marginTop: FONT_BASELINE_OFFSET,
    },
    ingredientEmpty: {
      ...Typography.body.xlarge,
      fontWeight: Typography.body.xlarge.fontWeight as '500',
      color: colors['foreground/on-surface-disabled'],
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
    ingredientListFooter: {
      flexDirection: 'row',
      padding: Spacing.md,
      gap: Spacing.sm,
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
    adviceTitleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: Spacing.sm,
    },
    adviceCard: {
      flex: 1,
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      padding: 28,
      gap: Spacing.smd,
    },
    adviceTitle: {
      ...Typography.title.large,
      fontWeight: Typography.title.large.fontWeight as '700',
      color: colors['custom/yellow-var'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    adviceBody: {
      ...Typography.headline.small,
      lineHeight: 30,
      fontWeight: Typography.headline.small.fontWeight as '600',
      color: colors['custom/yellow-var'],
      marginTop: FONT_BASELINE_OFFSET,
    },
  });
