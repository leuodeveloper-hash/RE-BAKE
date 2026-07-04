import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {recognizeImageText} from '@utils/recipeOcr';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {getPersistentUri} from '@utils/imageUpload';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassContainer, Card, MAX_CONTENT_WIDTH} from '@components/Container';
import {BottomSheet} from '@components/BottomSheet';
import {Snackbar} from '@components/Snackbar';
import {Tooltip} from '@components/Tooltip';
import {IconButton} from '@components/IconButton';
import {Selector} from '@components/Selector';
import {navPillStyle, RulerSlider} from '@components/Navigation';
import {Menu, MenuItem, Subheader, type MenuItemData} from '@components/Menu';
import {SearchCommandBar} from '@components/SearchCommandBar';
import {Button} from '@components/Button';
import {EditableChip} from '@components/EditableChip/EditableChip';
import {StepPhotos} from '@components/StepPhotos';
import {BottomActionBar} from '@components/BottomActionBar';
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
  IconCamera,
  IconPhoto,
  IconTrash,
  IconUndo,
  IconRedo,
  IconCircleInfoFilled,
  IconEllipsisVertical,
  IconCheckList,
  IconNoteFilled,
  IconLogoSymbol,
  IconArrowTopRight,
  IconChevronLeft,
  IconChevronRight,
} from '@components/Icon/IconIndex';
import {KeyboardToolbar} from '@components/KeyboardToolbar';
import {EditorToolbar} from '@components/EditorToolbar';
import {YouTubePlayerModal} from '@components/YouTubePlayer';
import {parseYouTubeVideoId} from '@utils/youtube';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useKeyboardHeight} from '@hooks/useKeyboardHeight';
import {useEscapeKey} from '@hooks/useEscapeKey';
import {useColorsV2} from '@contexts/ThemeContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useResponsiveTypography} from '@hooks/useResponsiveTypography';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

/**
 * 요리모드 본문 폰트 토큰 (반응형) — 화면 폭 기준으로 mobile / tablet 분리.
 * iPad·iPhone은 둘 다 iOS라 Platform.OS로 못 나눔 → 폭(containerWidth<600)으로 판단.
 * - mobile(아이폰/좁은 화면): 20
 * - tablet(아이패드/넓은 화면·웹): 28
 */
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
  const {open: openAuthSheet} = useAuthSheet();
  // 반응형 본문 타이포(headline-medium): 폰 24/30, 태블릿 30/38. 폭 의존이라 inline 머지로 주입.
  const rType = useResponsiveTypography();
  const bodyType = useMemo(() => ({
    fontSize: rType.headline.medium.fontSize,
    lineHeight: rType.headline.medium.lineHeight,
    letterSpacing: rType.headline.medium.letterSpacing as number,
  }), [rType.headline.medium.fontSize, rType.headline.medium.lineHeight, rType.headline.medium.letterSpacing]);
  const descInputRef = useRef<RNTextInput>(null);
  const lastTapRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  // 현재 스크롤 오프셋(눈금 탭 점프 계산용) + 드래그 시작 위치/스톱(스와이프 한 칸 이동용)
  const scrollXValueRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragStartStopIdxRef = useRef(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  // 눈금에서 선택된 스톱 id (스텝 시작 또는 스텝 내부 사진 노출용 중간 스톱). null이면 현재 스텝의 첫 스톱.
  const [currentStopId, setCurrentStopId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
  const [editCards, setEditCards] = useState<CookingCard[]>([]);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showRecipeMenu, setShowRecipeMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showScanMenu, setShowScanMenu] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
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
  // 사진 전체보기 뷰어 (탭 시). editing = 편집모드(editCards 경로) 여부
  const [viewerPhoto, setViewerPhoto] = useState<{card: CookingCard; index: number; editing: boolean} | null>(null);
  // 사진 관리모드 (썸네일 롱프레스 → X 삭제 노출, 탭=교체)
  const [photoManage, setPhotoManage] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showCardOverflow, setShowCardOverflow] = useState(false);
  // 최상단 오버플로우 메뉴 (편집 / 과정 삭제)
  const [showTopOverflow, setShowTopOverflow] = useState(false);

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

  // 좁은 화면(폰): 세로 배치라 한 스텝이 정확히 한 판(화면 폭) → 한 판씩 이동
  const isNarrow = containerWidth < 600;
  // 요리모드 본문 폰트: 좁은 화면=mobile(20), 넓은 화면=tablet(28)
  // 타이포 시스템의 반응형 headline-medium 토큰 사용(폰 24/30 → 태블릿 30/38)
  const cookingBodyFont = bodyType;

  // 사진 있는 스텝은 면(페이지)이 더 넓음: [텍스트][사진 일렬·기울임].
  // 좁은 화면에선 사진이 잘려 보이고 슬라이드로 노출, 넓은 화면이면 다 보임. 눈금은 스텝 단위 스냅.
  const PAD = 28;
  const PHOTO_W = 180;
  const PHOTO_STEP = PHOTO_W * 0.6; // 사진 간 간격(많이 겹침)
  const MAX_TEXT_W = 380;
  const textColW = Math.max(180, Math.min(containerWidth - PAD * 2 - 48, MAX_TEXT_W));
  // 사진 카드 수 = 사진(최대3) + 추가카드(편집 가능 & 3장 미만)
  const cardCountFor = (nPhotos: number) => {
    const p = Math.min(nPhotos, 3);
    // 추가 카드 슬롯은 권한과 무관하게 확보(게스트도 사진 영역을 보고 탭하면 로그인)
    return p + (p < 3 ? 1 : 0);
  };
  const photoAreaW = (nPhotos: number) => {
    const c = cardCountFor(nPhotos);
    return c <= 0 ? 0 : PHOTO_W + (c - 1) * PHOTO_STEP;
  };
  // 넓은 화면에선 본문 시작선을 상/하단 네비(가운데 정렬, MAX_CONTENT_WIDTH)의 좌측 가장자리에 맞춤.
  const sideInset = Math.max(0, (containerWidth - MAX_CONTENT_WIDTH) / 2);
  // 좁은 화면은 세로 배치라 한 판 = 화면 폭(중간 스톱 없이 한 스텝씩 이동).
  // 넓은 화면만 [텍스트][사진] 가로 배치로 페이지가 넓어질 수 있음.
  const pageWidthFor = (nPhotos: number) =>
    isNarrow
      ? containerWidth
      : Math.max(containerWidth, sideInset + PAD + textColW + (photoAreaW(nPhotos) > 0 ? 40 + photoAreaW(nPhotos) : 0) + PAD);

  // 편집 모드는 카드가 세로 레이아웃(사진 측면배치 X)이라 페이지 폭을 화면 폭으로 고정 → 카드 중앙정렬
  const pageWidths = displayCards.map(c => isEditing ? containerWidth : pageWidthFor(c.photos?.length ?? 0));
  if (hasAdvice) pageWidths.push(pageWidthFor(0));
  const pageOffsets: number[] = [];
  { let acc = 0; for (const w of pageWidths) { pageOffsets.push(acc); acc += w; } }
  const pageOffsetsRef = useRef<number[]>([]);
  pageOffsetsRef.current = pageOffsets;

  // 눈금 스톱: 각 스텝의 시작점 + (그 스텝이 화면보다 넓으면) 사진을 드러내는 중간 스톱들.
  // → 눈금(드래그/화살표)만으로도 넓은 스텝의 사진까지 한 칸씩 넘겨볼 수 있음. 라벨은 스텝 번호로 고정.
  type RulerStop = {id: string; offset: number; stepIndex: number; label: string};
  const stops: RulerStop[] = [];
  pageWidths.forEach((w, i) => {
    const cw = containerWidth || w;
    const overflow = Math.max(0, w - cw);
    const label = `${i + 1}/${totalCards}`;
    if (overflow <= 4 || cw <= 0) {
      stops.push({id: `s${i}_0`, offset: pageOffsets[i], stepIndex: i, label});
    } else {
      const inc = cw * 0.85; // 화면폭의 85%씩 이동(사진이 살짝 겹쳐 보이며 노출)
      const n = Math.ceil(overflow / inc) + 1;
      for (let k = 0; k < n; k++) {
        const off = Math.min(pageOffsets[i] + k * inc, pageOffsets[i] + overflow);
        stops.push({id: `s${i}_${k}`, offset: off, stepIndex: i, label});
      }
    }
  });
  const stopsRef = useRef<RulerStop[]>([]);
  stopsRef.current = stops;

  // scrollX → 현재 오프셋 ref 동기화 (눈금 탭 점프 계산용)
  useEffect(() => {
    const id = scrollX.addListener(({value}) => { scrollXValueRef.current = value; });
    return () => scrollX.removeListener(id);
  }, [scrollX]);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    scrollViewRef.current?.scrollTo({x: pageOffsetsRef.current[index] ?? 0, animated});
    setCurrentStopId(null); // 프로그램 이동 시 해당 스텝의 첫 스톱으로 눈금 동기화
  }, []);

  // 눈금 탭 이동: 멀리 떨어진 번호면 "직전 한 페이지로 즉시 점프 → 마지막 한 칸만 애니메이션"
  // → 거리에 상관없이 항상 한 번 스와이프해 들어오는 느낌. (중간 스텝을 쫙 훑지 않음)
  const scrollToStop = useCallback((id: string) => {
    const stop = stopsRef.current.find(s => s.id === id);
    if (!stop) return;
    if (isEditingRef.current) exitEditingRef.current?.();
    const cw = containerWidth || 0;
    const cur = scrollXValueRef.current;
    const target = stop.offset;
    if (cw > 0 && Math.abs(target - cur) > cw * 1.5) {
      const pre = target + (target > cur ? -cw : cw); // 목표 직전 한 페이지
      scrollViewRef.current?.scrollTo({x: pre, animated: false});
      requestAnimationFrame(() => scrollViewRef.current?.scrollTo({x: target, animated: true}));
    } else {
      scrollViewRef.current?.scrollTo({x: target, animated: true});
    }
    setCurrentStopId(stop.id);
    setCurrentIndex(stop.stepIndex);
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    setShowCardOverflow(false);
    setShowInfoTooltip(false);
  }, [containerWidth]);

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
  const exitEditingRef = useRef<(() => void) | undefined>(undefined);
  exitEditingRef.current = exitEditing;

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

  // 눈금 항목 = 스톱들 (스텝 시작 + 사진 노출용 중간 스톱). 라벨은 스텝 번호로 고정.
  const stepRulerItems = stops.map(s => ({id: s.id, label: s.label}));
  // 현재 선택 스톱 (없거나 무효면 현재 스텝의 첫 스톱으로 폴백)
  const selectedStopId = (currentStopId && stops.some(s => s.id === currentStopId))
    ? currentStopId
    : (stops.find(s => s.stepIndex === currentIndex)?.id ?? stops[0]?.id ?? 's0_0');

  // 스크롤이 멈춘 위치에서 현재 스텝(눈금 표시용) 결정.
  // 스냅 없이 자유 팬 → 스텝 내부의 사진까지 둘러볼 수 있고, 멈춘 면에 가장 가까운 스텝을 현재로.
  const settleToNearest = useCallback((offsetX: number) => {
    const ss = stopsRef.current;
    let bi = 0, best = Infinity;
    ss.forEach((s, i) => { const d = Math.abs(s.offset - offsetX); if (d < best) { best = d; bi = i; } });
    const stop = ss[bi];
    if (isEditingRef.current) exitEditing();
    if (stop) {
      setCurrentStopId(stop.id);
      setCurrentIndex(stop.stepIndex);
    }
    setShowAddMenu(false);
    setShowPhotoSubmenu(false);
    setShowCardOverflow(false);
    setShowInfoTooltip(false);
  }, [exitEditing]);

  // 관성 종료 시엔 위치 보정 없이 표시만 동기화(드래그 종료에서 이미 한 칸으로 스냅함)
  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settleToNearest(e.nativeEvent.contentOffset.x);
  }, [settleToNearest]);

  // 드래그 시작 위치/스톱 기록 (스와이프 한 칸 이동 기준점)
  const handleScrollBeginDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    dragStartXRef.current = x;
    const ss = stopsRef.current;
    let bi = 0, best = Infinity;
    ss.forEach((s, i) => { const d = Math.abs(s.offset - x); if (d < best) { best = d; bi = i; } });
    dragStartStopIdxRef.current = bi;
  }, []);

  // 스와이프는 한 칸씩만 이동: 시작 스톱 기준 방향만 보고 ±1 스톱으로 스냅(관성으로 여러 칸 넘어감 방지).
  const handleScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const v = (e.nativeEvent as any).velocity?.x ?? 0;
    const delta = x - dragStartXRef.current;
    const thresh = (containerWidth || 300) * 0.12;
    let dir = 0;
    if (Math.abs(delta) > thresh) dir = delta > 0 ? 1 : -1;
    else if (Math.abs(v) > 0.5 && Math.abs(delta) > 4) dir = delta > 0 ? 1 : -1;
    const ss = stopsRef.current;
    const targetIdx = Math.max(0, Math.min(ss.length - 1, dragStartStopIdxRef.current + dir));
    const stop = ss[targetIdx];
    if (stop) {
      // scrollTo가 대기 중인 네이티브 관성을 덮어써 한 칸에서 멈춤
      scrollViewRef.current?.scrollTo({x: stop.offset, animated: true});
      if (isEditingRef.current) exitEditing();
      setCurrentStopId(stop.id);
      setCurrentIndex(stop.stepIndex);
      setShowAddMenu(false);
      setShowPhotoSubmenu(false);
      setShowCardOverflow(false);
      setShowInfoTooltip(false);
    }
  }, [containerWidth, exitEditing]);

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
  // OCR 스캔: 촬영/갤러리 → 텍스트 인식 → 현재 카드 설명에 추가 (편집 툴바와 동일 기능, 공용 EditorToolbar)
  const cookingScan = useCallback(async (source: 'camera' | 'gallery') => {
    if (ocrBusy) return;
    const card = editCards[currentIndex];
    if (!card) return;
    setOcrBusy(true);
    // iOS: 메뉴/키보드 전환과 겹치면 피커 present가 무시됨 → 정리 후 present
    Keyboard.dismiss();
    try {
      if (Platform.OS === 'ios') {
        await new Promise<void>(resolve => setTimeout(resolve, 350));
      }
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showSnackbar(source === 'camera' ? '카메라 권한이 필요해요 — 설정에서 허용해주세요' : '사진 권한이 필요해요 — 설정에서 허용해주세요');
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({quality: 0.85})
        : await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.85});
      if (result.canceled || !result.assets[0]) return;
      const text = (await recognizeImageText(result.assets[0].uri)).trim();
      if (!text) {
        showSnackbar('이미지에서 글씨를 찾지 못했어요');
        return;
      }
      updateEditCards(prev => prev.map(c =>
        c.globalIndex === card.globalIndex
          ? {...c, description: c.description?.trim() ? `${c.description.trim()}\n${text}` : text}
          : c,
      ));
      showSnackbar('텍스트를 인식했어요');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('CookingMode OCR failed', e);
      showSnackbar('이미지 분석 실패. 다시 시도해주세요');
    } finally {
      setOcrBusy(false);
    }
  }, [ocrBusy, editCards, currentIndex, updateEditCards, showSnackbar]);

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

  // 최상단 오버플로우 메뉴 (편집 / 과정 삭제)
  const topOverflowItems = useMemo((): MenuItemData[] => [
    {id: 'edit', label: '편집', icon: IconEdit},
    {id: 'delete', label: '과정 삭제', icon: IconTrash, destructive: true},
  ], []);

  const handleTopOverflowSelect = useCallback((menuId: string) => {
    setShowTopOverflow(false);
    if (menuId === 'edit') {
      startEditing();
    } else if (menuId === 'delete') {
      handleCardOverflowSelect('delete');
    }
  }, [startEditing, handleCardOverflowSelect]);

  // 스텝 사진을 원본 레시피에 반영 (뷰 모드 공통 — onUpdate 경로). 실제 반영 성공 여부 반환.
  const commitStepPhotos = useCallback((card: CookingCard, newPhotos: string[]): boolean => {
    if (!onUpdate) return false;
    const photos = newPhotos.length > 0 ? newPhotos : undefined;
    if (stepGroups && stepGroups.length > 0) {
      onUpdate({stepGroups: stepGroups.map((g, gIdx) => ({
        title: g.title,
        steps: g.steps.map((s, sIdx) => (gIdx === card.groupIndex && sIdx === card.stepIndex) ? {...s, photos} : s),
      }))});
      return true;
    }
    if (steps) {
      onUpdate({steps: steps.map((s, i) => i === card.stepIndex ? {...s, photos} : s)});
      return true;
    }
    return false;
  }, [onUpdate, stepGroups, steps]);

  // 보기 모드에서 사진 바로 등록 (편집 진입 없이 원본 데이터 갱신)
  const addStepPhoto = useCallback(async (card: CookingCard) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showSnackbar('사진 권한이 필요해요'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      base64: Platform.OS === 'web',
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    // 영상(시네마틱 포함) 선택 시 → 프레임(썸네일) 추출해서 사진으로 사용
    let srcUri = asset.uri;
    let srcBase64 = asset.base64;
    if (asset.type === 'video') {
      if (Platform.OS === 'web') { showSnackbar('영상 프레임 추출은 앱에서 가능해요'); return; }
      try {
        const {uri: frameUri} = await VideoThumbnails.getThumbnailAsync(asset.uri, {time: 0, quality: 0.9});
        srcUri = frameUri;
        srcBase64 = undefined;
      } catch (e) {
        console.warn('영상 프레임 추출 실패:', e);
        showSnackbar('영상에서 이미지를 가져오지 못했어요');
        return;
      }
    }
    const uri = await getPersistentUri(srcUri, srcBase64);
    const newPhotos = [...(card.photos ?? []), uri].slice(0, MAX_PHOTOS);
    const ok = commitStepPhotos(card, newPhotos);
    showSnackbar(ok ? '사진이 추가되었습니다' : '사진을 추가하지 못했어요');
  }, [commitStepPhotos, showSnackbar]);

  // 보기 모드에서 기존 사진 탭 → 교체 (onUpdate 경로로 실제 반영/저장)
  const replaceStepPhotoView = useCallback(async (card: CookingCard, photoIndex: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showSnackbar('사진 권한이 필요해요'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: Platform.OS === 'web',
    });
    if (result.canceled || result.assets.length === 0) return;
    const uri = await getPersistentUri(result.assets[0].uri, result.assets[0].base64);
    const newPhotos = [...(card.photos ?? [])];
    newPhotos[photoIndex] = uri;
    const ok = commitStepPhotos(card, newPhotos);
    showSnackbar(ok ? '사진이 교체되었습니다' : '사진을 교체하지 못했어요');
  }, [commitStepPhotos, showSnackbar]);

  // 스텝 사진 스택 — 뷰·편집 공통 렌더러(동일 경험). 큰 이미지 겹침 + 추가(+) 카드.
  // 탭=전체보기, 롱프레스=관리모드(X 삭제 노출)·관리모드 탭=교체.
  // 데이터 경로: editing=false → onUpdate(즉시), editing=true → editCards(저장/되돌리기).
  const renderPhotoStack = useCallback((item: CookingCard, editing: boolean) => {
    const photos = (item.photos ?? []).slice(0, 3);
    const photoW = isNarrow ? 96 : PHOTO_W;
    const photoStep = isNarrow ? photoW - 12 : photoW * 0.6;
    const tilts = [-8, 6, -6];
    const lifts = isNarrow ? [0, 0, 0] : [-56, 56, -56];
    const showAdd = photos.length < 3;
    const onAdd = () => {
      if (!canEdit) { openAuthSheet(); return; }
      if (editing) pickPhoto('gallery', item.globalIndex, item.photos);
      else addStepPhoto(item);
    };
    const onReplace = (i: number) => {
      if (editing) replacePhoto(item.globalIndex, i, item.photos);
      else replaceStepPhotoView(item, i);
    };
    const onDelete = (i: number) => {
      if (editing) {
        removePhoto(item.globalIndex, i, item.photos);
      } else {
        const np = (item.photos ?? []).filter((_, k) => k !== i);
        const ok = commitStepPhotos(item, np);
        showSnackbar(ok ? '사진이 삭제되었습니다' : '삭제하지 못했어요');
      }
    };
    return (
      <View style={[
        styles.photoRow,
        isNarrow
          ? {marginLeft: 0, marginTop: Spacing.lg, height: photoW, alignSelf: 'flex-start'}
          : {marginLeft: 40},
      ]}>
        {photos.map((p, i) => (
          <View
            key={i}
            style={[styles.photoCard, {
              width: photoW, height: photoW,
              marginLeft: i === 0 ? 0 : -(photoW - photoStep),
              transform: [{translateY: lifts[i] ?? 0}, {rotate: `${tilts[i] ?? 0}deg`}],
              zIndex: i,
            }]}>
            <Pressable
              style={{flex: 1}}
              onPress={() => {
                if (canEdit && photoManage) onReplace(i);
                else setViewerPhoto({card: item, index: i, editing});
              }}
              onLongPress={canEdit ? () => setPhotoManage(m => !m) : undefined}
              delayLongPress={300}>
              <Image source={{uri: p}} style={{flex: 1, borderRadius: 11}} resizeMode="cover" />
            </Pressable>
            {canEdit && photoManage ? (
              <Pressable style={styles.photoDeleteBtn} hitSlop={8} onPress={() => onDelete(i)}>
                <IconClose width={12} height={12} color={colors['foreground/on-surface-inverse']} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {showAdd ? (
          <Pressable
            onPress={onAdd}
            style={[styles.emptyPack, {width: photoW, height: photoW, marginLeft: photos.length === 0 ? 0 : -(photoW - photoStep), zIndex: photos.length}]}>
            <View style={styles.addCircle}>
              <AppIcon icon={IconAdd} size="md" color={colors['foreground/on-surface-muted']} />
            </View>
          </Pressable>
        ) : null}
      </View>
    );
  }, [isNarrow, canEdit, photoManage, openAuthSheet, pickPhoto, addStepPhoto, replacePhoto, replaceStepPhotoView, removePhoto, commitStepPhotos, showSnackbar, styles, colors]);

  // 보기(요리) 스텝 — [텍스트 칼럼(좌)][사진 최대 3장 일렬·기울임 + 추가카드(우)].
  // 사진은 고정 크기, 좁으면 잘리고 슬라이드로 노출.
  const renderViewStep = useCallback((item: CookingCard) => {
    return (
      <View style={[
        styles.viewStep,
        isNarrow && {flexDirection: 'column', alignItems: 'stretch'},
        {paddingLeft: PAD + sideInset, paddingRight: PAD},
      ]}>
        {/* 텍스트 칼럼 (넓을 땐 고정폭·좌측, 좁을 땐 전체폭·상단) */}
        <View style={isNarrow ? {flex: 1, width: '100%'} : {width: textColW, height: '100%'}}>
          <ScrollView style={{flex: 1}} contentContainerStyle={styles.viewScrollContent} showsVerticalScrollIndicator={false}>
            <Pressable onPress={canEdit ? handleDoubleTap : undefined}>
              <Text style={[styles.descLarge, cookingBodyFont]}>{item.description}</Text>
            </Pressable>
            {item.tip ? (
              <Text style={[styles.noteInlineText, cookingBodyFont]}>
                <View style={styles.noteIconInline}><AppIcon icon={IconAstriks} size="sm" color={colors['foreground/on-surface-muted']} /></View>
                {' '}{item.tip}
              </Text>
            ) : null}
            {item.caution ? (
              <Text style={[styles.noteInlineText, cookingBodyFont, {color: colors['custom/yellow-var']}]}>
                <View style={styles.noteIconInline}><AppIcon icon={IconAstriks} size="sm" color={colors['custom/yellow-var']} /></View>
                {' '}{item.caution}
              </Text>
            ) : null}
            {item.matchedIngredients.length > 0 ? (
              <View style={[styles.ingredientsSection, {paddingHorizontal: 0}]}>
                {item.matchedIngredients.map((ing, idx) => {
                  const checked = checkedIngredients.has(ing.name);
                  const isLast = idx === item.matchedIngredients.length - 1;
                  return (
                    <Pressable key={ing.name} onPress={() => toggleIngredient(ing.name)}>
                      <Text style={[styles.viewIngredientText, cookingBodyFont, checked && styles.ingredientChecked]}>
                        {ing.name} {ing.amount}{!isLast ? ', ' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {/* 모바일: 사진을 글 밑에 붙여 flow (고정 X, 넘치면 함께 스크롤) */}
            {isNarrow && renderPhotoStack(item, false)}
          </ScrollView>
        </View>
        {/* 태블릿/넓은 화면: 사진은 우측 컬럼에 고정 배치 */}
        {!isNarrow && renderPhotoStack(item, false)}
      </View>
    );
  }, [renderPhotoStack, styles, textColW, sideInset, canEdit, handleDoubleTap, checkedIngredients, toggleIngredient, colors, cookingBodyFont, isNarrow]);

  // Render a single card (only active card can be edited)
  const renderCard = useCallback((item: CookingCard, isActive = false) => {
    const isCurrentEditing = isEditing && isActive;
    // 보기 모드(편집 아님)는 새 풀스크린 레이아웃
    if (!isCurrentEditing) return renderViewStep(item);

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
                style={[styles.descLarge, cookingBodyFont, {padding: 0}, noOutline]}
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

            {/* Photos — 글 바로 밑에 붙여 flow (고정 X, 내용 넘치면 스크롤) */}
            {renderPhotoStack(item, true)}
          </ScrollView>

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
  }, [isEditing, renderViewStep, renderPhotoStack, styles, colors, updateCardField, totalCards, photoExpanded, checkedIngredients, toggleIngredient, undo, redo, canUndo, canRedo, showAddMenu, showPhotoSubmenu, addMenuItems, photoSubmenuItems, handleAddMenuSelect, removeCardField, canEdit, handleDoubleTap, lastSavedAt, formatSavedTime, showInfoTooltip, showCardOverflow, cardOverflowItems, handleCardOverflowSelect]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      fullScreen
      animationType="fade"
      hideHandle
      enableDragToDismiss={false}
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
                  {/* 좁은 화면(모바일): 요리(레시피) 셀렉터는 숨기고 과정 중심으로.
                      단, 보여줄 과정 브레드크럼이 없으면(단일 그룹) 빈 알약 방지 위해 레시피 표시 */}
                  {(!isNarrow || (!hasGroups && !isOnAdviceCard)) && (
                    <Selector
                      label={title}
                      disabled={!recipeItems?.length}
                      muted={!recipeItems?.length}
                      variant="ghost"
                      style={{maxWidth: 120}}
                      onPress={recipeItems?.length ? () => setShowRecipeMenu(prev => !prev) : undefined}
                    />
                  )}
                  {hasGroups && !isOnAdviceCard && (
                    <>
                      {!isNarrow && (
                        <View style={styles.breadcrumbCaret}>
                          <AppIcon icon={IconCaretRight} size="xs" color={colors['foreground/on-surface-muted']} />
                        </View>
                      )}
                      <Selector
                        label={currentGroupTitle}
                        onPress={() => setShowGroupMenu(prev => !prev)}
                        variant="ghost"
                      />
                    </>
                  )}
                  {isOnAdviceCard && (
                    <>
                      {!isNarrow && (
                        <View style={styles.breadcrumbCaret}>
                          <AppIcon icon={IconCaretRight} size="xs" color={colors['foreground/on-surface-muted']} />
                        </View>
                      )}
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
              {isEditing ? null : (
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
                    icon={IconCheckList}
                    onPress={() => setShowIngredientList(true)}
                    variant="ghost-secondary"
                    size="medium"
                  />
                  {canEdit && (
                    <IconButton
                      icon={IconEllipsisVertical}
                      onPress={() => setShowTopOverflow(prev => !prev)}
                      variant="ghost-secondary"
                      size="medium"
                      forcePressed={showTopOverflow}
                    />
                  )}
                </GlassContainer>
              )}
              {!isEditing && canEdit && (
                <Menu
                  items={topOverflowItems}
                  visible={showTopOverflow}
                  onSelect={handleTopOverflowSelect}
                  onClose={() => setShowTopOverflow(false)}
                  style={styles.topOverflowMenu}
                />
              )}
            </View>
          </View>
        </Pressable>

        {/* Cards with horizontal scroll */}
        <Animated.View
          style={{flex: 1, opacity: contentReady ? fadeAnim : 0}}
          onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
          {/* 앱바(topNav) 높이만큼만 비움 — 세이프에어리어는 BottomSheet가 이미 처리하므로 insets.top 중복 금지 */}
          <Pressable style={{height: 72}} onPress={isEditing ? exitEditing : undefined} />
          <Animated.ScrollView
            ref={scrollViewRef as any}
            horizontal
            pagingEnabled={false}
            decelerationRate="normal"
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal: 0}}
            onScroll={Animated.event(
              [{nativeEvent: {contentOffset: {x: scrollX}}}],
              {useNativeDriver: false},
            )}
            scrollEventThrottle={16}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleScrollEnd}>
            {displayCards.map((card, index) => (
              <View key={card.globalIndex} style={{width: pageWidths[index]}}>
                {renderCard(card, index === currentIndex)}
              </View>
            ))}
            {/* 베이키의 조언 카드 */}
            {hasAdvice && (() => {
              const adviceIdx = displayCards.length;
              return (
                <View
                  key="advice"
                  style={{width: pageWidths[adviceIdx]}}>
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
                            size={containerWidth >= 600 ? 140 : 96}
                            gap={Spacing.sm}
                            paddingTop={false}
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
                </View>
              );
            })()}
          </Animated.ScrollView>
          <Pressable style={{height: insets.bottom + Spacing.md * 2 + 48 + 24}} onPress={isEditing ? exitEditing : undefined} />
        </Animated.View>

        {/* 편집 키보드 툴바: 과정이동·실행취소/다시·추가·사진 + 완료 (우측 상단 편집 툴바 통합) */}
        {isEditing && canEdit && (
          <EditorToolbar
            prev={{onPress: () => { if (currentIndex > 0) { const i = currentIndex - 1; setCurrentIndex(i); scrollToIndex(i); } }, disabled: currentIndex <= 0}}
            next={{onPress: () => { if (currentIndex < displayCards.length - 1) { const i = currentIndex + 1; setCurrentIndex(i); scrollToIndex(i); } }, disabled: currentIndex >= displayCards.length - 1}}
            undo={{onPress: undo, disabled: !canUndo}}
            redo={{onPress: redo, disabled: !canRedo}}
            scan={{onPress: () => { setShowScanMenu(v => !v); setShowAddMenu(false); setShowPhotoSubmenu(false); }, active: showScanMenu, disabled: !editCards[currentIndex] || ocrBusy}}
            add={{
              onPress: () => { setShowAddMenu(prev => !prev); setShowPhotoSubmenu(false); setShowScanMenu(false); },
              active: showAddMenu,
              disabled: (() => {
                const c = editCards[currentIndex];
                // 팁·주의·사진 모두 이미 추가/최대면 비활성화
                return !!c && c.tip != null && c.caution != null && (c.photos?.length ?? 0) >= MAX_PHOTOS;
              })(),
            }}
            onDone={exitEditing}
            doneDisabled={!isDirty}
            above={
              showScanMenu ? (
                <Menu
                  items={[
                    {id: 'camera', label: '촬영해서 스캔', icon: IconCameraFilled},
                    {id: 'gallery', label: '갤러리에서 스캔', icon: IconPhoto},
                  ]}
                  visible={showScanMenu}
                  onSelect={(id) => { setShowScanMenu(false); cookingScan(id === 'camera' ? 'camera' : 'gallery'); }}
                  onClose={() => setShowScanMenu(false)}
                  style={styles.bottomAddMenu}
                />
              ) : (
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
                  style={styles.bottomAddMenu}
                />
              )
            }
          />
        )}

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
          bottomAction={
            <>
              <Button label={allIngredientsChecked ? '전체 해제' : '전체선택'} variant="soft" onPress={toggleAllIngredients} style={{flex: 1}} />
              {allIngredientsChecked && (
                <Button label="준비 완료" onPress={() => { setShowIngredientList(false); setIsInitialIngredientSheet(false); }} style={{flex: 1}} />
              )}
            </>
          }
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
              <RulerSlider
                items={stepRulerItems}
                selectedId={selectedStopId}
                onSelect={scrollToStop}
              />
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

        {/* 사진 전체보기 뷰어 — 탭하면 큰 이미지 풀스크린. 편집 가능하면 교체/삭제 */}
        {viewerPhoto && (() => {
          const uri = viewerPhoto.card.photos?.[viewerPhoto.index];
          if (!uri) return null;
          return (
            <Modal visible transparent animationType="fade" onRequestClose={() => setViewerPhoto(null)} statusBarTranslucent>
              <View style={styles.viewerRoot}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewerPhoto(null)} />
                <Image source={{uri}} style={styles.viewerImage} resizeMode="contain" />
                {canEdit ? (
                  <View style={styles.viewerActionsWrap}>
                    <BottomActionBar background="#000000">
                      <Button
                        label="교체"
                        variant="soft"
                        onPress={() => {
                          const {card, index, editing} = viewerPhoto;
                          setViewerPhoto(null);
                          // 편집모드=editCards 경로, 뷰=onUpdate 경로 (경험 동일)
                          if (editing) replacePhoto(card.globalIndex, index, card.photos);
                          else replaceStepPhotoView(card, index);
                        }}
                      />
                      <Button
                        label="삭제"
                        variant="soft"
                        destructive
                        onPress={() => {
                          const {card, index, editing} = viewerPhoto;
                          setViewerPhoto(null);
                          if (editing) {
                            removePhoto(card.globalIndex, index, card.photos);
                          } else {
                            const np = (card.photos ?? []).filter((_, k) => k !== index);
                            const ok = commitStepPhotos(card, np);
                            showSnackbar(ok ? '사진이 삭제되었습니다' : '삭제하지 못했어요');
                          }
                        }}
                      />
                    </BottomActionBar>
                  </View>
                ) : null}
              </View>
            </Modal>
          );
        })()}
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
    topOverflowMenu: {
      position: 'absolute' as const,
      top: 48 + Spacing.xs,
      right: 0,
      zIndex: 20,
    },
    cardOuter: {
      flex: 1,
      // 편집 카드는 중앙정렬 (maxWidth 캡 + 가운데)
      alignItems: 'center',
    },
    mainCard: {
      flex: 1,
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      padding: 28,
      gap: Spacing.smd,
      overflow: 'visible',
      // 보기 페이지처럼 카드 프레임 없이 평평하게 (surface/dim 위에 그대로)
      backgroundColor: 'transparent',
      borderRadius: 0,
    },
    scrollContent: {
      gap: Spacing.smd,
    },
    // 보기 본문: 세로 중앙 정렬 (짧으면 가운데, 길면 위부터 스크롤)
    viewScrollContent: {
      gap: Spacing.smd,
      flexGrow: 1,
      justifyContent: 'center',
    },
    // 새 보기 레이아웃 (카드 없음, 좌 설명 / 우 사진 팩)
    viewStep: {
      flexDirection: 'row',
      alignItems: 'center',
      height: '100%',
    },
    photoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: '100%',
    },
    photoCard: {
      backgroundColor: colors['surface/bright'],
      borderRadius: 16,
      padding: 6,
      boxShadow: '0px 10px 22px -6px rgba(14, 14, 13, 0.22)',
    },
    // 추가(+) 카드도 사진과 같은 흰 프레임 + 안쪽 dim 채움 (Figma)
    emptyPack: {
      padding: 6,
      borderRadius: 16,
      // 이미지 미등록(+ 박스): 하얀 배경/그림자 없이 점선 아웃라인만
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors['border/normal'],
    },
    photoDeleteBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    },
    viewerRoot: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerImage: {
      width: '92%',
      height: '74%',
    },
    viewerActionsWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    addCircle: {
      flex: 1,
      alignSelf: 'stretch',
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    descLarge: {
      // Figma headline-medium/regular (24/30, -0.4, Medium 500)
      fontFamily: 'Pretendard-Medium',
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '500',
      letterSpacing: -0.4,
      color: colors['foreground/on-surface'],
      textAlign: 'left',
    },
    // 참고사항(팁/주의) — 아이콘이 글줄 안에 인라인, 본문과 같은 크기, muted
    noteInlineText: {
      // 크기/행간/자간은 bodyType(반응형 headline-medium)이 inline으로 덮어씀
      fontFamily: 'Pretendard-Medium',
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '500',
      letterSpacing: -0.4,
      color: colors['foreground/on-surface-muted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    noteIconInline: {
      width: 18,
      height: 22,
      transform: [{translateY: 4}],
    },
    // 재료 인라인 — 본문과 같은 크기
    viewIngredientText: {
      // 크기/행간/자간은 bodyType(반응형 headline-medium)이 inline으로 덮어씀
      fontFamily: 'Pretendard-Medium',
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '500',
      letterSpacing: -0.4,
      color: colors['foreground/on-surface-muted'],
      marginTop: FONT_BASELINE_OFFSET,
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
    // 하단 키보드 툴바의 ＋ 위에 뜨는 추가 메뉴 (바 위쪽에 앵커, 좌측 ＋ 아래쯤)
    bottomAddMenu: {
      marginLeft: 120,
      marginBottom: 6,
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
      alignItems: 'center',
      // 눈금자 하단 여백: 24는 너무 높고 0은 너무 낮아 중간값(12). safe-area는 bottomNav paddingBottom이 별도 처리.
      marginBottom: Spacing.smd,
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
