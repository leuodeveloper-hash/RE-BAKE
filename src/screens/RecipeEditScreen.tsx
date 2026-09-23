import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  Linking,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {getPersistentUri} from '@utils/imageUpload';
import {PhotoViewer} from '@components/PhotoViewer';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FloatingNavBar, NavPillButton, navPillStyle, NAV_PILL_HEIGHT} from '@components/Navigation';
import {RecipeInputFloatingBar} from '@components/RecipeOcrButton';
import type {RecipeOcrField} from '@utils/recipeOcr';
import {ContentContainer, Card, GlassContainer, MAX_CONTENT_WIDTH} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {Button} from '@components/Button';
import {ListItem} from '@components/ListItem';
import {Menu} from '@components/Menu';
import {Popover} from '@components/Popover';
import {CookbookSelectSheet} from '@components/BottomSheet';
import {EditableChip} from '@components/EditableChip';
import {Switch} from '@components/Switch';
import {OptionTile} from '@components/OptionTile';
import {StepPhotos} from '@components/StepPhotos';
import {FieldManageDialog, TimeDialog, ServingsDialog, IngredientAmountDialog} from '@components/Dialog';
import type {ReviewData} from '@components/Dialog';
import {TextInput} from '@components/TextInput';
import {AutoGrowInput} from '@components/AutoGrowInput';
import {DragHandle} from '@components/DragHandle';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import {ensureImagePermission} from '@utils/imagePermission';
import {applyLink, expandToLink, stripRichText} from '@utils/richText';
import {LinkTargetProvider, useLinkTarget} from '@contexts/LinkTargetContext';
import {UrlField, isUrlLike} from '@components/UrlField/UrlField';
import {LinkInputDialog} from '@components/Dialog';
import {Tooltip} from '@components/Tooltip';
import {getColorVarKey} from '@components/ColorPicker';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {RainbowText, BulkTypingOverlay} from '@components/RainbowText';
import {SkeletonLine} from '@components/SkeletonLine';
import {useYouTubePlayer} from '@contexts/YouTubePlayerContext';
import {parseYouTubeVideoId} from '@utils/youtube';
import {triggerHaptic} from '@utils/haptics';
import {
  bulkTextToIngredients,
  bulkTextToToolNames,
  bulkTextToStepDescriptions,
  ingredientsToBulkText,
  toolsToBulkText,
  stepsToBulkText,
} from '@utils/recipeBulkText';
import {Radius} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {useAuth} from '@contexts/AuthContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useDragReorder, ROW_HEIGHT} from '@hooks/useDragReorder';
import {useEditHistory} from '@hooks/useEditHistory';
import {RichEditor} from '@components/RichEditor';
import {KEYBOARD_TOOLBAR_HEIGHT} from '@components/KeyboardToolbar';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {MENU_GAP} from './RecipeEditScreen.constants';
import {createStyles} from './RecipeEditScreen.styles';
import {useOcrTypewriter} from './useOcrTypewriter';
import {importRecipeFromUrl} from '@utils/importRecipeFromUrl';
import type {StepPhoto} from '../types/recipe';
import {normalizeStepPhotos} from '@utils/stepPhotos';
import {
  IconClose,
  IconTick,
  IconEllipsisVertical,
  IconPhoto,
  IconClockFilled,
  IconUsersRoundFilled,
  IconMinus,
  IconAdd,
  IconPlusCircleFilled,
  IconMinusCircleFilled,
  IconChevronRight,
  IconChevronDown,
  IconBookFilled,
  IconExprolerBookFilled,
  IconSettingsFilled,
  IconOpenbookFilled,
  IconWind,
  IconAstriks,
  IconCircleAlert,
  IconCircleAlertFilled,
  IconCameraFilled,
  IconLeafFilled,
  IconFilesFilled,
  IconToolCaseFilled,
  IconProcess,
  IconChartNoAxesGantt,
  IconCornerDownRight,
  IconEdit,
  IconTrash,
  IconLogoSymbol,
  IconBlockPlus,
  IconLink,
  IconYourubeColored,
  IconImport,
  IconArrowTopRight,
  IconMic,
} from '@components/Icon/IconIndex';

// ---- Types ----
// 편집용 타입은 RecipeEditScreen.types.ts로 분리 (화면 파일이 길어 읽기 어려웠다)
import type {
  EditableIngredient,
  EditableStep,
  IngredientGroup,
  EditableTool,
  EditableToolGroup,
  StepGroup,
  RecipeEditScreenProps,
} from './RecipeEditScreen.types';
export type {RecipeEditScreenProps};

type TFn = (key: string, params?: Record<string, any>) => string;

// 메뉴 아이템

/** 상단 이미지는 대표 1장 + 추가 2장까지 (스텝 사진과 동일한 3장 제한) */
const MAX_EXTRA_HERO = 2;
const makeEditMenuItems = (t: TFn) => [
  {id: 'import-url', label: t('recipeEdit.importFromSite'), icon: IconImport},
  {id: 'field-manage', label: t('recipeEdit.fieldManage'), icon: IconSettingsFilled},
];

// 레시피 북 오버플로우 메뉴 아이템
const makeCookbookSheetMenuItems = (t: TFn) => [
  {id: 'rename', label: t('recipeEdit.edit'), icon: IconEdit},
  {id: 'delete', label: t('recipeEdit.delete'), icon: IconTrash, destructive: true},
];

// 슬래시 메뉴 아이템
const BAKING_METHODS = [
  '시폰법', '별립법', '공립법', '슈가법', '익반죽법', '크림법',
  '제노아즈법', '머랭법', '핫프로세스법', '냉동반죽법',
];

const makeSlashMenuItems = (t: TFn) => [
  // 사진: 촬영/갤러리 둘 다 제공 (기존 photo 하나는 카메라 직행이라 갤러리 선택지가 없었음)
  {id: 'camera', label: t('recipeEdit.takePhoto'), icon: IconCameraFilled},
  {id: 'gallery', label: t('recipeEdit.chooseFromGallery'), icon: IconPhoto},
  {id: 'tip', label: t('recipeEdit.tip'), icon: IconAstriks},
  {id: 'caution', label: t('recipeEdit.caution'), icon: IconCircleAlertFilled},
];

// Web: textarea 포커스 아웃라인 제거
const noOutline: any = {outlineStyle: 'none'};


// ---- Component ----

/**
 * 링크 배선(LinkTargetProvider)으로 감싼 편집 화면.
 * Provider 안에서 AutoGrowInput들이 선택 구간을 자동 등록하므로,
 * 입력칸마다 핸들러를 달 필요가 없다.
 */
export function RecipeEditScreen(props: RecipeEditScreenProps) {
  return (
    <LinkTargetProvider>
      <RecipeEditScreenInner {...props} />
    </LinkTargetProvider>
  );
}

function RecipeEditScreenInner({onClose, onSave, recipe, cookbooks, cookbookColors: cookbookColorsProp, onSetCookbookColor, initialSection, initialCookbook, isExplore, onDeleteCookbook}: RecipeEditScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  const EDIT_MENU_ITEMS = useMemo(() => makeEditMenuItems(t), [t]);
  const COOKBOOK_SHEET_MENU_ITEMS = useMemo(() => makeCookbookSheetMenuItems(t), [t]);
  const SLASH_MENU_ITEMS = useMemo(() => makeSlashMenuItems(t), [t]);
  const {setShowCookbookDialog, setCookbookEditTarget, onCookbookCreatedRef} = useAddSheet();
  const {user} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
  const isLoggedIn = !!user && !user.isAnonymous;
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();
  // 팝오버는 콘텐츠 최대너비 기준 X 버튼 아래에 붙어야 함(넓은 웹 화면에서 좌측 밖으로 안 나가게)
  const contentLeftEdge = Math.max(Spacing.md, (screenWidth - MAX_CONTENT_WIDTH) / 2 + Spacing.md);
  const {showSnackbar} = useSnackbar();
  const nextIdRef = useRef(100);
  const genId = () => String(nextIdRef.current++);

  const emptyIngredient = (): EditableIngredient => ({id: genId(), name: '', amount: '', unit: 'g'});

  /** 저장형 재료({name, amount}) → 편집형({amount, unit}). "600g" → {amount:'600', unit:'g'}, "약간" → {amount:'', unit:'약간'} */
  const toEditableIngredient = (i: {name: string; amount: string}): EditableIngredient => {
    const amount = i.amount ?? '';
    const numUnit = amount.match(/^([\d.]+)\s*([a-zA-Z\u3131-\u314e\uac00-\ud7a3]+)/);
    if (numUnit) return {id: genId(), name: i.name, amount: numUnit[1], unit: numUnit[2]};
    const textOnly = amount.match(/^([a-zA-Z\u3131-\u314e\uac00-\ud7a3]+)$/);
    if (textOnly) return {id: genId(), name: i.name, amount: '', unit: textOnly[1]};
    return {id: genId(), name: i.name, amount: amount.replace(/[^0-9.]/g, ''), unit: 'g'};
  };

  // State — recipe prop이 있으면 편집 모드, 없으면 빈 생성 모드
  const [title, setTitle] = useState(() => recipe?.title ?? '');
  const [titleError, setTitleError] = useState(false);
  const titleInputRef = useRef<RNTextInput>(null);
  // OCR 툴바: 활성 필드 추적 (키보드 위 고정이라 위치 측정 불필요)
  const [focusedOcrField, setFocusedOcrField] = useState<RecipeOcrField | null>(null);
  // bulk 재료 입력 중 포커스된 그룹 id — OCR/타이핑 오버레이를 해당 그룹에만 적용
  const [ocrBulkGroupId, setOcrBulkGroupId] = useState<string | null>(null);
  // 포커스된 과정(step) — 툴바 + 로 팁/주의/사진 추가 대상
  const [focusedStep, setFocusedStep] = useState<{groupId: string; stepId: string} | null>(null);
  // 링크 대상은 공용 컨텍스트가 관리한다 — 입력칸마다 핸들러를 달 필요 없이
  // AutoGrowInput이 자동 등록한다(LinkTargetProvider로 이 화면을 감싼다).
  const linkCtx = useLinkTarget();
  // Android 폴백용 링크 입력 다이얼로그
  const [linkDialog, setLinkDialog] = useState<{initial: string; label: string} | null>(null);
  // 다이얼로그가 확인될 때 실행할 적용 함수 (툴바 핸들러·링크 탭에서 채운다)
  const applyLinkRef = useRef<((url: string, label: string) => void) | undefined>(undefined);

  // 편집 화면에서 옐로우 링크 단어를 탭하면 URL 편집 다이얼로그를 연다.
  // 다이얼로그는 이 화면이 갖고 있으므로 여는 함수를 컨텍스트에 등록해 둔다.
  useEffect(() => {
    linkCtx?.setEditRequestHandler((tgt) => {
      const src = tgt.getValue();
      const range = expandToLink(src, tgt.selection);
      applyLinkRef.current = (url: string, label: string) => {
        tgt.setValue(applyLink(src, range, url, label));
      };
      setLinkDialog({initial: range.url ?? '', label: stripRichText(src.slice(range.start, range.end))});
    });
    return () => linkCtx?.setEditRequestHandler(null);
  }, [linkCtx]);
  // 사진 픽/크롭/OCR 진행 중엔 blur로 바가 언마운트되지 않게 유지 (크롭 모달이 바로 닫히는 문제 방지)
  // 툴바는 편집화면 진입 시부터 항상 마운트(요리모드와 동일) → 픽 중 유지 플래그 불필요
  const ocrFieldRef = useRef<RecipeOcrField | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 타자기 타이머 정리는 useOcrTypewriter가 직접 한다(타이머를 소유한 쪽이 치운다)
  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);
  // 툴바 표시 = 포커스된 OCR 필드 기준(웹·네이티브 공통). 키보드 이벤트 타이밍에 의존하지 않아
  // 첫 필드부터 즉시 뜨고, 필드 전환 시 '뜨기도 안 뜨기도' 하던 경합이 사라진다.
  // focus 시 즉시 표시, blur는 지연 숨김(다른 필드로 이동 중이면 재focus가 타이머를 취소 → 안 사라짐).
  const handleFieldFocus = useCallback((f: RecipeOcrField, _e?: any) => {
    if (blurTimerRef.current) { clearTimeout(blurTimerRef.current); blurTimerRef.current = null; }
    ocrFieldRef.current = f;
    setFocusedOcrField(f);
  }, []);
  const handleFieldBlur = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => setFocusedOcrField(null), 250);
  }, []);
  // OCR 타자기(이미지 인식 결과를 써 넣는 애니메이션)는 useOcrTypewriter로 분리.
  // setSteps: 첫 묶음의 과정을 점진적으로 채우는 콜백 — 훅이 화면 상태를 모르게 한다.
  const {
    typing,
    typingField,
    finishTyping,
    typewriteString,
    typewriteAppendItems,
    typewriteSteps,
    stopTyping,
  } = useOcrTypewriter({
    setSteps: useCallback((descriptions: string[]) => {
      setStepGroups(prev => prev.map((g, gi) => gi === 0
        ? {...g, steps: descriptions.map(description => ({id: genId(), description}))}
        : g));
    }, []),
  });

  /**
   * OCR 타자기 오버레이 대상 묶음인지.
   *
   * 투명 처리(입력 글자 숨김)와 무지개 오버레이는 반드시 같은 조건을 써야 한다.
   * 한쪽만 참이면 글자도 오버레이도 없는 "빈 화면"이 된다(실제로 그랬다).
   * ocrBulkGroupId가 아직 없으면(폼 모드 경로) 첫 묶음을 대상으로 본다.
   */
  const isOcrTypingTarget = useCallback(
    (groupId: string, firstGroupId: string | undefined) =>
      ocrBulkGroupId ? ocrBulkGroupId === groupId : groupId === firstGroupId,
    [ocrBulkGroupId],
  );

  const [cookbook, setCookbook] = useState(() => recipe?.cookbook ?? initialCookbook ?? '');
  const [method, setMethod] = useState(() => recipe?.method ?? '');
  const [ratio, setRatio] = useState(() => recipe?.specificGravity ?? '');
  const [time, setTime] = useState(() => recipe?.time ?? '');
  const [servings, setServings] = useState(() => recipe?.servings ?? '');
  const [session, setSession] = useState(() => recipe?.session ?? '');
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showServingsDialog, setShowServingsDialog] = useState(false);
  const [amountDialogTarget, setAmountDialogTarget] = useState<{groupId: string; ingredientId: string} | null>(null);
  const [description, setDescription] = useState('');
  const [ingredientGroups, setIngredientGroups] = useState<IngredientGroup[]>(() => {
    if (recipe?.ingredientGroups?.length) {
      return recipe.ingredientGroups.map(g => {
        const ingredients = g.ingredients.map(toEditableIngredient);
        return {
          id: genId(),
          title: g.title,
          ingredients: ingredients.length ? ingredients : [emptyIngredient()],
          bulkMode: false,
          bulkText: ingredientsToBulkText(ingredients),
        };
      });
    }
    // 구버전 데이터: ingredientGroups 없이 ingredients만 있는 레시피(도구의 recipe.tools 폴백과 동일)
    if (recipe?.ingredients?.length) {
      const ingredients = recipe.ingredients.map(toEditableIngredient);
      return [{
        id: genId(),
        title: '재료',
        ingredients,
        bulkMode: false,
        bulkText: ingredientsToBulkText(ingredients),
      }];
    }
    return [{id: genId(), title: '재료', ingredients: [emptyIngredient()], bulkMode: false, bulkText: ''}];
  });
  // 도구는 항상 "한번에 쓰기"로 연다 — 이름만 나열하면 되는 짧은 항목이라
  // 행을 하나씩 추가하는 폼보다 쉼표로 이어 쓰는 편이 빠르다(새 레시피는 원래 그랬고,
  // 기존 레시피 편집만 폼으로 열려 방식이 갈렸다).
  const [toolGroups, setToolGroups] = useState<EditableToolGroup[]>(() => {
    if (recipe?.toolGroups) {
      return recipe.toolGroups.map(g => {
        const tools = g.tools.map(t => ({id: genId(), name: t.name}));
        return {
          id: genId(),
          title: g.title,
          tools,
          bulkMode: true,
          bulkText: toolsToBulkText(tools),
        };
      });
    }
    if (recipe?.tools) {
      const tools = recipe.tools.map(t => ({id: genId(), name: t.name}));
      return [{id: genId(), title: '도구', tools, bulkMode: true, bulkText: toolsToBulkText(tools)}];
    }
    return [{id: genId(), title: '도구', tools: [{id: genId(), name: ''}], bulkMode: true, bulkText: ''}];
  });
  const [stepGroups, setStepGroups] = useState<StepGroup[]>(() => {
    if (recipe?.stepGroups) {
      return recipe.stepGroups.map(g => ({
        id: genId(),
        title: g.title,
        steps: g.steps.map(s => ({
          id: genId(),
          description: s.description,
          tip: s.tip,
          caution: s.caution,
          photos: normalizeStepPhotos(s.photos),
        })),
        bulkMode: false,
        bulkText: '',
      }));
    }
    if (recipe?.steps) {
      return [{
        id: genId(),
        title: '과정',
        bulkMode: false,
        bulkText: '',
        steps: recipe.steps.map(s => ({
          id: genId(),
          description: s.description,
          tip: s.tip,
          caution: s.caution,
          photos: normalizeStepPhotos(s.photos),
        })),
      }];
    }
    return [{id: genId(), title: '과정', steps: [{id: genId(), description: ''}], bulkMode: false, bulkText: ''}];
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showCookbookMenu, setShowCookbookMenu] = useState(false);
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const [cookbookOverflowTarget, setCookbookOverflowTarget] = useState<string | null>(null);
  const [cookbookMenuPos, setCookbookMenuPos] = useState({top: 0, right: 0});
  const cookbookItemLayouts = useRef<Record<string, {y: number; height: number}>>({});
  const [localCookbooks, setLocalCookbooks] = useState<string[]>([]);
  const [fieldManageVisible, setFieldManageVisible] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>(recipe?.reviews ?? []);
  const [advice, setAdvice] = useState(recipe?.advice ?? '');
  const [referenceUrl, setReferenceUrl] = useState(recipe?.referenceUrl ?? '');
  // 원본 링크 (외부 사이트에서 가져온 레시피 출처). 참고 링크와 별개 필드.
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl ?? '');
  // 공식(둘러보기) 레시피 숨김 — 어드민만 보임(다른 유저 비공개). 개발 중 콘텐츠 가림용.
  const [hidden, setHidden] = useState(() => !!recipe?.hidden);
  // PiP는 앱 루트에서 단일 인스턴스로 관리 (화면 전환 시에도 유지)
  const {open: openYouTube} = useYouTubePlayer();
  const referenceYouTubeId = useMemo(() => parseYouTubeVideoId(referenceUrl), [referenceUrl]);
  const [slashMenu, setSlashMenu] = useState<{groupId: string; stepId: string} | null>(null);
  // 과정 묶음 롱프레스 메뉴 (위/아래 이동) — 열린 묶음 id
  const [stepGroupMenu, setStepGroupMenu] = useState<string | null>(null);
  // 재료·도구도 과정과 같은 방식 — 아이콘 버튼 탭으로 묶음 메뉴
  const [ingGroupMenu, setIngGroupMenu] = useState<string | null>(null);
  const [toolGroupMenu, setToolGroupMenu] = useState<string | null>(null);
  const [ingAddMenu, setIngAddMenu] = useState<string | null>(null);
  const [toolAddMenu, setToolAddMenu] = useState<string | null>(null);
  // 과정 행 롱프레스 메뉴 — 여기서 나누기(묶음 만들기) 등 행 단위 조작
  const [stepRowMenu, setStepRowMenu] = useState<{groupId: string; stepId: string} | null>(null);
  // 재료·도구 행도 과정과 같은 조작 — 핸들 탭으로 위/아래 추가 메뉴
  const [ingRowMenu, setIngRowMenu] = useState<{groupId: string; itemId: string} | null>(null);
  const [toolRowMenu, setToolRowMenu] = useState<{groupId: string; itemId: string} | null>(null);
  // 과정 헤더 + 버튼 아래 붙는 메뉴 (과정 추가 / 묶음 추가)
  const [stepAddMenu, setStepAddMenu] = useState<string | null>(null);
  // 한번에 쓰기 작성법 안내 툴팁 (열린 묶음 id)
  const [bulkHelpFor, setBulkHelpFor] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(recipe?.imageUri ?? null);
  // 추가 상단 이미지(대표 imageUri 뒤로 최대 2장 — 합쳐서 3장)
  const [imageUris, setImageUris] = useState<string[]>(recipe?.imageUris ?? []);
  // 대표 + 추가분을 한 줄로 — 뷰어는 이 목록을 그대로 보여주고, 인덱스로 교체/삭제한다
  const heroUris = useMemo(
    () => [imageUri, ...imageUris].filter((u): u is string => !!u),
    [imageUri, imageUris],
  );
  const [heroViewerIndex, setHeroViewerIndex] = useState<number | null>(null);
  // 재료 bulk 상태는 그룹별(ingredientGroups[].bulkMode/bulkText)로 관리한다. 전역 상태 없음.
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [activeFieldIds, setActiveFieldIds] = useState<string[]>(
    // 새 레시피는 모든 필드를 켠 상태로 시작한다 — 뭘 쓸 수 있는지 바로 보이게.
    // (필요 없는 항목은 필드관리에서 끄면 된다)
    recipe?.activeFieldIds ?? [
      'info', 'photo', 'time', 'ingredients', 'tools', 'steps', 'servings',
      'method', 'ratio', 'cookbook', 'advice', 'review', 'source', 'origin',
    ],
  );
  const isFieldActive = (id: string) => activeFieldIds.includes(id);

  // 재료 묶음 → 저장용 {name, amount}[] 변환. bulkMode면 bulkText 파싱, 아니면 개별 폼.
  /** 도구 묶음 → 저장용 이름 배열. bulkMode면 bulkText 파싱, 아니면 개별 폼. */
  const resolveGroupTools = (g: EditableToolGroup): {name: string}[] =>
    g.bulkMode
      ? bulkTextToToolNames(g.bulkText).map(name => ({name}))
      : g.tools.filter(t => t.name.trim()).map(t => ({name: t.name}));

  /** 과정 묶음 → 저장용 설명 배열. bulkMode면 bulkText 파싱, 아니면 개별 폼. */
  const resolveGroupSteps = (g: StepGroup) =>
    g.bulkMode
      ? bulkTextToStepDescriptions(g.bulkText).map((description, idx) => ({step: idx + 1, description}))
      : g.steps.filter(x => x.description.trim())
          .map((x, idx) => ({step: idx + 1, description: x.description, tip: x.tip, caution: x.caution, photos: x.photos}));

  const resolveGroupIngredients = (g: IngredientGroup): {name: string; amount: string}[] => {
    if (g.bulkMode) {
      return bulkTextToIngredients(g.bulkText).map(i => ({
        name: i.name,
        amount: i.amount ? `${i.amount}${i.unit}` : i.unit || '',
      }));
    }
    return g.ingredients
      .filter(i => i.name.trim())
      .map(i => ({name: i.name, amount: i.amount ? `${i.amount}${i.unit}` : i.unit}));
  };

  // 변경 감지: 현재 폼 상태를 저장 데이터 형태로 스냅샷
  const currentSnapshot = useMemo(() => JSON.stringify({
    title: title.trim(),
    cookbook: cookbook || undefined,
    method: method || undefined,
    specificGravity: ratio || undefined,
    time: time || undefined,
    servings: servings || undefined,
    session: session || undefined,
    ingredientGroups: ingredientGroups.map(g => ({
      title: g.title,
      ingredients: resolveGroupIngredients(g),
    })),
    toolGroups: toolGroups.map(g => ({
      title: g.title,
      tools: resolveGroupTools(g),
    })),
    stepGroups: stepGroups.map(g => ({title: g.title, steps: resolveGroupSteps(g)})),
    activeFieldIds,
    reviews: reviews.filter(rv => rv.evaluation.trim() || rv.improvement.trim()).length > 0 ? reviews.filter(rv => rv.evaluation.trim() || rv.improvement.trim()) : undefined,
    advice: advice || undefined,
    imageUri: imageUri || undefined,
    imageUris: imageUris.length > 0 ? imageUris : undefined,
    referenceUrl: referenceUrl || undefined,
    sourceUrl: sourceUrl || undefined,
    // 비공개 토글도 변경 감지 대상 — 이게 빠지면 비공개만 바꿨을 때 isDirty가 안 잡혀 저장 불가.
    hidden: isExplore ? hidden : undefined,
  }), [title, cookbook, method, ratio, time, servings, session, ingredientGroups, toolGroups, stepGroups, activeFieldIds, reviews, advice, imageUri, imageUris, referenceUrl, sourceUrl, isExplore, hidden]);
  const initialSnapshotRef = useRef(currentSnapshot);

  // ── 되돌리기/다시하기 ──────────────────────────────────────
  // currentSnapshot은 "저장용 정규화 데이터"라(빈 항목이 필터링됨) 복원에 쓸 수 없다.
  // 편집 상태 원본을 그대로 담는 별도 스냅샷을 쓴다.
  const historySnapshot = useMemo(() => ({
    title, cookbook, method, ratio, time, servings,
    ingredientGroups, toolGroups, stepGroups,
    activeFieldIds, reviews, advice, imageUri, imageUris, referenceUrl, sourceUrl, hidden,
  }), [title, cookbook, method, ratio, time, servings, ingredientGroups, toolGroups, stepGroups,
    activeFieldIds, reviews, advice, imageUri, imageUris, referenceUrl, sourceUrl, hidden]);

  const applyHistory = useCallback((s: typeof historySnapshot) => {
    setTitle(s.title);
    setCookbook(s.cookbook);
    setMethod(s.method);
    setRatio(s.ratio);
    setTime(s.time);
    setServings(s.servings);
    setIngredientGroups(s.ingredientGroups);
    setToolGroups(s.toolGroups);
    setStepGroups(s.stepGroups);
    setActiveFieldIds(s.activeFieldIds);
    setReviews(s.reviews);
    setAdvice(s.advice);
    setImageUri(s.imageUri);
    setImageUris(s.imageUris);
    setReferenceUrl(s.referenceUrl);
    setSourceUrl(s.sourceUrl);
    setHidden(s.hidden);
  }, []);

  const history = useEditHistory(historySnapshot, applyHistory);
  // 생성 모드(recipe 없음)는 항상 저장 가능, 편집 모드에서만 변경 여부 체크
  const isDirty = !recipe || currentSnapshot !== initialSnapshotRef.current;
  const hasTitle = title.trim().length > 0;
  const hasIngredient = ingredientGroups.some(g =>
    g.bulkMode ? g.bulkText.split(',').some(s => s.trim()) : g.ingredients.some(i => i.name.trim()),
  );
  const hasStep = stepGroups.some(g => g.bulkMode)
    ? stepGroups.some(g => resolveGroupSteps(g).length > 0)
    : stepGroups.some(g => g.steps.some(s => s.description.trim()));
  const canSave = isDirty && hasTitle && hasIngredient && hasStep;
  const [saving, setSaving] = useState(false);
  // 닫기 확인: 변경사항이 있고 실제 입력한 내용이 있을 때만(빈 폼은 그냥 닫음)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  // 닫기(X) 버튼의 실제 위치 — 팝오버를 이 버튼 아래에 붙인다.
  // 하드코딩한 좌표는 노치 높이·화면 폭에 따라 어긋났다.
  const [closeBtnRect, setCloseBtnRect] = useState<{x: number; y: number; height: number} | null>(null);
  const closeBtnViewRef = useRef<View>(null);
  const requestClose = useCallback(() => {
    const hasContent = hasTitle || hasIngredient || hasStep || !!imageUri || !!sourceUrl;
    if (isDirty && hasContent) setShowDiscardConfirm(true);
    else onClose?.();
  }, [isDirty, hasTitle, hasIngredient, hasStep, imageUri, sourceUrl, onClose]);

  // 저장 실행 — 저장 버튼과 닫기 팝오버 "저장" 공용. 필수 필드 없으면 해당 위치로 스크롤/포커스.
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setTitleError(true);
      scrollViewRef.current?.scrollTo({y: 0, animated: true});
      titleInputRef.current?.focus();
      return;
    }
    const hasIng = ingredientGroups.some(g =>
      g.bulkMode ? g.bulkText.split(',').some(s => s.trim()) : g.ingredients.some(i => i.name.trim()),
    );
    if (!hasIng) {
      const y = sectionPositions.current['ingredients'];
      if (y != null) scrollViewRef.current?.scrollTo({y: y - 80, animated: true});
      setTimeout(() => sectionInputRefs.current['ingredients']?.focus(), 300);
      return;
    }
    const hasStp = stepGroups.some(g => g.bulkMode)
      ? stepGroups.some(g => resolveGroupSteps(g).length > 0)
      : stepGroups.some(g => g.steps.some(s => s.description.trim()));
    if (!hasStp) {
      const y = sectionPositions.current['steps'];
      if (y != null) scrollViewRef.current?.scrollTo({y: y - 80, animated: true});
      setTimeout(() => sectionInputRefs.current['steps']?.focus(), 300);
      return;
    }
    setSaving(true);
    try {
      await onSave?.({
        title: title.trim(),
        cookbook: cookbook || undefined,
        method: method || undefined,
        specificGravity: ratio || undefined,
        time: time || undefined,
        servings: servings || undefined,
        session: session || undefined,
        ingredientGroups: ingredientGroups.map(g => ({
          title: g.title,
          ingredients: resolveGroupIngredients(g),
        })),
        toolGroups: toolGroups.map(g => ({title: g.title, tools: resolveGroupTools(g)})),
        stepGroups: stepGroups.map(g => ({
              title: g.title,
              steps: resolveGroupSteps(g),
            })),
        activeFieldIds,
        reviews: reviews.filter(rv => rv.evaluation.trim() || rv.improvement.trim()).length > 0 ? reviews.filter(rv => rv.evaluation.trim() || rv.improvement.trim()) : undefined,
        advice: advice || undefined,
        imageUri: imageUri || undefined,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
        referenceUrl: referenceUrl || undefined,
        sourceUrl: sourceUrl || undefined,
        ...(isExplore ? {hidden} : {}),
      });
    } finally {
      setSaving(false);
    }
  }, [title, cookbook, method, ratio, time, servings, session, ingredientGroups, toolGroups, stepGroups, activeFieldIds, reviews, advice, imageUri, imageUris, referenceUrl, sourceUrl, isExplore, hidden, onSave]);

  const pickImage = async (source: 'camera' | 'gallery', slot: 'main' | 'extra' = 'main') => {
    if (source === 'camera') {
      const ok = await ensureImagePermission('camera', {
        deniedMessage: t('recipeEdit.cameraPermissionNeeded'),
        showSnackbar,
        settingsTitle: t('permission.cameraTitle'),
        settingsBody: t('permission.cameraBody'),
        settingsConfirmLabel: t('permission.openSettings'),
        settingsCancelLabel: t('permission.cancel'),
      });
      if (!ok) return;
    } else {
      const ok = await ensureImagePermission('mediaLibrary', {
        deniedMessage: t('recipeEdit.photoPermissionNeeded'),
        showSnackbar,
        settingsTitle: t('permission.photoTitle'),
        settingsBody: t('permission.photoBody'),
        settingsConfirmLabel: t('permission.openSettings'),
        settingsCancelLabel: t('permission.cancel'),
      });
      if (!ok) return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: Platform.OS === 'web',
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) {
      const uri = await getPersistentUri(result.assets[0].uri, result.assets[0].base64);
      if (slot === 'extra') {
        // 추가분은 뒤에 붙이고, 올린 직후 뷰어로 바로 확인시킨다
        setImageUris(prev => {
          const next = [...prev, uri].slice(0, MAX_EXTRA_HERO);
          setHeroViewerIndex((imageUri ? 1 : 0) + next.length - 1);
          return next;
        });
      } else {
        setImageUri(uri);
      }
    }
  };

  /** 뷰어에서 추가분 교체 — imageUris의 idx 자리를 새로 고른 사진으로 바꾼다 */
  const replaceExtraHeroAt = useCallback(async (idx: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: Platform.OS === 'web',
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = await getPersistentUri(result.assets[0].uri, result.assets[0].base64);
    setImageUris(prev => prev.map((u, i) => (i === idx ? uri : u)));
  }, []);

  /** 뷰어에서 삭제 — 대표(0번)를 지우면 추가분의 첫 장이 대표로 올라온다 */
  const removeHeroAt = useCallback((idx: number) => {
    const next = heroUris.filter((_, i) => i !== idx);
    setImageUri(next[0] ?? null);
    setImageUris(next.slice(1));
    setHeroViewerIndex(next.length > 0 ? Math.min(idx, next.length - 1) : null);
  }, [heroUris]);


  const handleMenuPress = () => {
    setShowMenu(prev => !prev);
  };

  // "600g" → {amount:'600', unit:'g'} 등, 합쳐진 양 문자열을 편집화면 재료 형태로 분리
  const splitAmountUnit = (amount: string): {amount: string; unit: string} => {
    const numUnit = amount.match(/^([\d.]+)\s*([a-zA-Zㄱ-ㅎ가-힣]+)/);
    if (numUnit) return {amount: numUnit[1], unit: numUnit[2]};
    const textOnly = amount.match(/^([a-zA-Zㄱ-ㅎ가-힣]+)$/);
    if (textOnly) return {amount: '', unit: textOnly[1]};
    return {amount: amount.replace(/[^0-9.]/g, ''), unit: 'g'};
  };

  const [importing, setImporting] = useState(false);

  // 같은 URL을 자동+수동으로 중복 임포트하지 않도록 마지막 시도 URL 기억
  const lastImportedUrlRef = useRef<string>('');

  /** 원본 링크 URL에서 레시피를 가져와 폼을 채운다 (두 엔트리 공용). 성공 시 sourceUrl 저장. */
  const runImportFromUrl = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/.test(trimmed) || importing) return;
    // 가져오기는 로그인 필요 — 미로그인이면 로그인 시트 → 성공 시 이어서 진행
    if (!isLoggedIn) {
      openAuthSheet({onSuccess: () => { runImportFromUrl(trimmed); }});
      return;
    }
    lastImportedUrlRef.current = trimmed;
    setImporting(true);
    showSnackbar(t('recipeEdit.importLoading'));
    try {
      const r = await importRecipeFromUrl(trimmed);
      if (r.title) setTitle(r.title);
      if (r.servings) setServings(r.servings);
      if (r.imageUrl && !imageUri) setImageUri(r.imageUrl);
      if (r.ingredients.length > 0) {
        setIngredientGroups([{
          id: genId(),
          title: '재료',
          ingredients: r.ingredients.map(i => ({id: genId(), name: i.name, ...splitAmountUnit(i.amount)})),
          bulkMode: false,
          bulkText: '',
        }]);
      }
      if (r.steps.length > 0) {
        setStepGroups([{
          id: genId(),
          title: '과정',
          steps: r.steps.map(s => ({id: genId(), description: s.description, photos: s.photo ? [{uri: s.photo}] : undefined})),
          bulkMode: false,
          bulkText: '',
        }]);
      }
      setSourceUrl(trimmed);
      showSnackbar(t('recipeEdit.importSuccess'));
    } catch (e: any) {
      const code = e?.message ?? '';
      const key = code === 'NO_RECIPE_DATA' ? 'recipeEdit.importNoData'
        : code.startsWith('HTTP_') || code === 'FETCH_FAILED' ? 'recipeEdit.importFetchFailed'
        : 'recipeEdit.importFailed';
      showSnackbar(t(key));
    } finally {
      setImporting(false);
    }
  }, [importing, imageUri, isLoggedIn, openAuthSheet, showSnackbar, t]);

  const handleMenuSelect = (id: string) => {
    setShowMenu(false);
    if (id === 'field-manage') {
      setFieldManageVisible(true);
    } else if (id === 'import-url') {
      // 원본 링크 필드가 꺼져 있으면 켜고, 그 위치로 스크롤 + 입력 포커스 (두 번째 엔트리)
      if (!isFieldActive('origin')) setActiveFieldIds(prev => [...prev, 'origin']);
      setTimeout(() => {
        const y = sectionPositions.current['origin'];
        if (y != null) scrollViewRef.current?.scrollTo({y: y - 80, animated: true});
        setTimeout(() => originInputRef.current?.focus(), 250);
      }, 50);
    }
  };

  const handleCookbookPress = () => {
    setShowCookbookMenu(true);
  };

  const allCookbooks = [...new Set([...(cookbooks || []), ...localCookbooks, ...(recipe?.cookbook ? [recipe.cookbook] : [])])];

  const handleCookbookSelect = (id: string) => {
    setCookbook(id === '__none__' ? '' : id);
    setShowCookbookMenu(false);
  };



  const handleCookbookOverflow = (name: string) => {
    const layout = cookbookItemLayouts.current[name];
    if (layout) {
      setCookbookOverflowTarget(name);
      setCookbookMenuPos({
        top: layout.y + layout.height,
        right: Spacing.md,
      });
    }
  };

  const handleCookbookOverflowSelect = (id: string) => {
    const target = cookbookOverflowTarget;
    setCookbookOverflowTarget(null);
    if (!target) return;

    if (id === 'rename') {
      setShowCookbookMenu(false);
      const color = cookbookColorsProp?.[target] || (isExplore ? 'orange' as AvatarColor : 'brown' as AvatarColor);
      onCookbookCreatedRef.current = (newName: string, newColor: AvatarColor) => {
        if (cookbook === target) setCookbook(newName);
        setLocalCookbooks(prev => prev.map(n => n === target ? newName : n));
        onSetCookbookColor?.(newName, newColor);
      };
      setCookbookEditTarget({name: target, color, isExplore});
      setShowCookbookDialog(true);
    } else if (id === 'delete') {
      if (cookbook === target) setCookbook('');
      setShowCookbookMenu(false);
      onDeleteCookbook?.(target);
    }
  };

  const handleOverlayPress = () => {
    setShowMenu(false);
  };
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const sectionInputRefs = useRef<Record<string, RNTextInput | null>>({});
  // 행(재료/과정) 단위 입력 ref — 엔터로 새 행을 만든 뒤 그리로 포커스를 옮긴다
  const rowInputRefs = useRef<Record<string, RNTextInput | null>>({});
  // 과정 행별 커서 위치 — 맨 앞에서 백스페이스 시 이전 행과 병합하는 판단에 쓴다
  const stepSelRef = useRef<Record<string, {start: number; end: number}>>({});
  // 과정 행별 스크롤 y 위치 — 상세에서 특정 과정을 눌러 들어왔을 때 그 줄로 이동하는 데 쓴다
  const stepRowY = useRef<Record<string, number>>({});
  // 재료 행도 동일 (상세에서 특정 재료를 눌러 들어온 경우)
  const ingRowY = useRef<Record<string, number>>({});
  const originInputRef = useRef<RNTextInput | null>(null);

  useEffect(() => {
    if (!initialSection) return;
    // 레이아웃 완료 직후 한 프레임만 기다린 뒤 즉시 점프 (애니메이션 없음)
    /**
     * 포커스 + 커서를 문장 끝으로.
     *
     * 입력이 두 종류라 한쪽만 다루면 안 된다:
     *  - RichEditor(재료 이름·과정 설명): setSelection이 없다. focus(caret)으로 함께 처리.
     *    기존 코드가 setSelection만 불러 커서가 늘 맨 앞에 있었다.
     *  - TextInput(제목·한번에 쓰기): focus() 후 setSelection.
     * 길이를 넘는 값(99999)은 무시되거나 0으로 되돌아가므로 실제 글자 수를 쓴다.
     */
    const focusAtEnd = (node: any, text: string) => {
      if (!node) return;
      const end = (text ?? '').length;
      if (typeof node.setSelection !== 'function') {
        // RichEditor — caret을 함께 넘긴다
        node.focus?.(end);
        return;
      }
      node.focus?.();
      // 포커스 직후엔 네이티브가 아직 값을 반영하기 전이라 한 틱 늦춘다
      setTimeout(() => node.setSelection?.(end, end), 30);
    };

    // 행 좌표(stepRowY/ingRowY)는 각 행의 onLayout에서 채워진다. 한 번만 재보고
    // 없으면 섹션 맨 위로 폴백했는데, 목록이 길면 레이아웃이 아직 안 끝나 늘 폴백으로
    // 빠졌다 → "누른 항목이 아니라 섹션 처음으로 간다". 좌표가 잡힐 때까지 몇 번 더 본다.
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      // 'steps:3' 처럼 인덱스가 붙어 오면 그 과정 줄로 이동한다
      // (섹션만 넘기면 항상 과정 목록 맨 위로 가서 "누른 위치가 아니다"라는 문제가 됐다)
      const [section, idxRaw] = initialSection.split(':');
      const stepIndex = idxRaw != null ? parseInt(idxRaw, 10) : NaN;

      if (section === 'steps' && !Number.isNaN(stepIndex)) {
        const flat = stepGroups.flatMap(g => g.steps);
        const target = flat[stepIndex];
        // 위치는 각 행이 onLayout으로 미리 기록해둔 값을 쓴다.
        // (measureLayout은 ScrollView 노드 핸들이 필요하고 렌더 타이밍도 타서 불안정)
        const y = target ? stepRowY.current[target.id] : undefined;
        if (target && y != null) {
          scrollViewRef.current?.scrollTo({y: Math.max(0, y - 120), animated: false});
          focusAtEnd(rowInputRefs.current[target.id], (target as any).description ?? '');
          return;
        }
        // 아직 레이아웃 전이면 잠시 뒤 다시 본다(최대 ~1초). 그래도 없으면 섹션 폴백.
        if (target && tries < 20) { tries++; timer = setTimeout(run, 50); return; }
      }

      if (section === 'ingredients' && !Number.isNaN(stepIndex)) {
        const flat = ingredientGroups.flatMap(g => g.ingredients);
        const target = flat[stepIndex];
        const y = target ? ingRowY.current[target.id] : undefined;
        if (target && y != null) {
          scrollViewRef.current?.scrollTo({y: Math.max(0, y - 120), animated: false});
          focusAtEnd(rowInputRefs.current[target.id], (target as any).name ?? '');
          return;
        }
        if (target && tries < 20) { tries++; timer = setTimeout(run, 50); return; }
      }

      const y = sectionPositions.current[section];
      if (y != null) {
        scrollViewRef.current?.scrollTo({y: y - 80, animated: false});
      }
      const input = sectionInputRefs.current[section];
      if (input) {
        // 섹션 입력은 제목/한번에쓰기 등 종류가 달라 현재 값을 직접 찾아 쓴다
        const text = section === 'title'
          ? title
          : (section === 'ingredients' ? ingredientGroups[0]?.bulkText
            : section === 'tools' ? toolGroups[0]?.bulkText
            : section === 'steps' ? stepGroups[0]?.bulkText
            : '') ?? '';
        focusAtEnd(input, text);
      }
    };
    timer = setTimeout(run, 50);
    return () => clearTimeout(timer);
    // stepGroups는 진입 시점 값만 쓰면 되므로 의존성에 넣지 않는다
    // (넣으면 편집할 때마다 스크롤이 다시 튄다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSection]);

  const drag = useDragReorder();

  // 멀티라인 자동확장 높이 관리는 이제 <AutoGrowInput> 내부로 이동(한 곳 관리)

  // Drop target listener — 햅틱 + 타겟 아이템 하이라이트
  const flatItemsRef = useRef<{id: string; groupId: string}[]>([]);
  const dropHighlights = useRef(new Map<string, Animated.Value>()).current;
  const getDropHighlight = useCallback((itemId: string) => {
    if (!dropHighlights.has(itemId)) {
      dropHighlights.set(itemId, new Animated.Value(0));
    }
    return dropHighlights.get(itemId)!;
  }, [dropHighlights]);
  const clearDropHighlights = useCallback(() => {
    dropHighlights.forEach(v => v.setValue(0));
  }, [dropHighlights]);

  React.useEffect(() => {
    const id = drag.dragY.addListener(({value}) => {
      if (drag.dragFromRef.current === null) return;
      const fromIdx = drag.dragFromRef.current;
      const fs = flatItemsRef.current;
      const positions = drag.itemPageYRef.current;
      const currentPageY = drag.draggedItemOriginalY.current + value;

      let newIdx = fromIdx;
      let minDist = Infinity;
      for (let i = 0; i < fs.length; i++) {
        const itemY = positions.get(fs[i].id);
        if (itemY != null) {
          const dist = Math.abs(currentPageY - itemY);
          if (dist < minDist) {
            minDist = dist;
            newIdx = i;
          }
        }
      }
      // 위치 정보 없으면 ROW_HEIGHT 폴백
      if (minDist === Infinity) {
        const moveBy = Math.round(value / ROW_HEIGHT);
        const maxIdx = drag.dragItemsLengthRef.current - 1;
        newIdx = Math.max(0, Math.min(maxIdx, fromIdx + moveBy));
      }

      if (newIdx !== drag.dropTargetRef.current) {
        drag.dropTargetRef.current = newIdx;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        clearDropHighlights();
        if (newIdx !== fromIdx && fs[newIdx]) {
          getDropHighlight(fs[newIdx].id).setValue(newIdx > fromIdx ? 1 : -1);
        }
      }
    });
    return () => drag.dragY.removeListener(id);
  }, [drag.dragY, getDropHighlight, clearDropHighlights]);

  React.useEffect(() => {
    if (!drag.draggingId) clearDropHighlights();
  }, [drag.draggingId, clearDropHighlights]);

  // ---- Ingredient Group Handlers ----

  const addIngredientGroup = (afterGroupId?: string) => {
    const newGroup = {id: genId(), title: '재료', ingredients: [{id: genId(), name: '', amount: '', unit: 'g'}], bulkMode: false, bulkText: ''};
    setIngredientGroups(prev => {
      if (afterGroupId) {
        const idx = prev.findIndex(g => g.id === afterGroupId);
        return [...prev.slice(0, idx + 1), newGroup, ...prev.slice(idx + 1)];
      }
      return [...prev, newGroup];
    });
  };

  const updateIngredientGroupTitle = (groupId: string, newTitle: string) => {
    setIngredientGroups(prev =>
      prev.map(g => (g.id === groupId ? {...g, title: newTitle} : g)),
    );
  };

  /**
   * 재료 행 추가.
   * afterId를 주면 그 행 "바로 다음"에 넣는다(엔터로 이어 입력할 때).
   * initialName을 주면 그 값으로 시작한다 — 문단 중간 엔터로 넘어온 뒷글자.
   * @returns 새로 만든 행 id — 포커스를 옮기는 데 쓴다
   */
  const addIngredient = (groupId: string, position: 'top' | 'bottom' = 'top', afterId?: string, initialName = '') => {
    const newId = genId();
    setIngredientGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        // initialName: 문단 중간에서 엔터를 눌렀을 때 커서 뒤에 있던 글자
        const row = {id: newId, name: initialName, amount: '', unit: 'g'};
        if (afterId) {
          const i = g.ingredients.findIndex(x => x.id === afterId);
          if (i >= 0) {
            const next = [...g.ingredients];
            next.splice(i + 1, 0, row);
            return {...g, ingredients: next};
          }
        }
        return {
          ...g,
          ingredients: position === 'top' ? [row, ...g.ingredients] : [...g.ingredients, row],
        };
      }),
    );
    return newId;
  };

  const removeIngredient = (groupId: string, ingredientId: string) => {
    setIngredientGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const filtered = g.ingredients.filter(i => i.id !== ingredientId);
        // 과정(steps)과 동일하게 최소 1개 유지 — 비면 빈 재료 한 줄로 대체
        if (filtered.length === 0) {
          return {...g, ingredients: [{id: genId(), name: '', amount: '', unit: 'g'}]};
        }
        return {...g, ingredients: filtered};
      }),
    );
  };

  const updateIngredient = (groupId: string, ingredientId: string, field: 'name' | 'amount', value: string) => {
    setIngredientGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, ingredients: g.ingredients.map(i => (i.id === ingredientId ? {...i, [field]: value} : i))}
          : g,
      ),
    );
  };

  const updateIngredientAmount = (groupId: string, ingredientId: string, amount: string, unit: string) => {
    setIngredientGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, ingredients: g.ingredients.map(i => (i.id === ingredientId ? {...i, amount, unit} : i))}
          : g,
      ),
    );
  };

  const removeIngredientGroup = (groupId: string) => {
    setIngredientGroups(prev => {
      const target = prev.find(g => g.id === groupId);
      if (!target) return prev;
      const remaining = prev.filter(g => g.id !== groupId);
      if (remaining.length === 0) return prev;
      // 삭제된 그룹의 재료를 첫 번째 그룹으로 이동
      return remaining.map((g, i) =>
        i === 0 ? {...g, ingredients: [...g.ingredients, ...target.ingredients]} : g,
      );
    });
  };

  // 글로벌 플랫 리스트 (크로스그룹 드래그용)
  const flatIngredients = useMemo(() => {
    const result: {id: string; groupId: string}[] = [];
    for (const g of ingredientGroups) {
      for (const ing of g.ingredients) {
        result.push({id: ing.id, groupId: g.id});
      }
    }
    return result;
  }, [ingredientGroups]);

  const reorderIngredientsGlobal = useCallback((globalFrom: number, globalTo: number) => {
    setIngredientGroups(prev => {
      const flat = prev.flatMap(g => g.ingredients.map(ing => ({item: ing, groupId: g.id})));
      const [moved] = flat.splice(globalFrom, 1);
      let targetGroupId: string;
      if (flat.length === 0) {
        targetGroupId = prev[0].id;
      } else if (globalTo >= flat.length) {
        targetGroupId = flat[flat.length - 1].groupId;
      } else {
        targetGroupId = flat[globalTo].groupId;
      }
      moved.groupId = targetGroupId;
      flat.splice(globalTo, 0, moved);
      return prev.map(g => ({
        ...g,
        ingredients: flat.filter(f => f.groupId === g.id).map(f => f.item),
      }));
    });
  }, []);

  // ---- Tool Group Handlers ----

  const addToolGroup = (afterGroupId?: string) => {
    const newGroup: EditableToolGroup = {id: genId(), title: '도구', tools: [{id: genId(), name: ''}], bulkMode: false, bulkText: ''};
    setToolGroups(prev => {
      if (afterGroupId) {
        const idx = prev.findIndex(g => g.id === afterGroupId);
        return [...prev.slice(0, idx + 1), newGroup, ...prev.slice(idx + 1)];
      }
      return [...prev, newGroup];
    });
  };

  const updateToolGroupTitle = (groupId: string, newTitle: string) => {
    setToolGroups(prev =>
      prev.map(g => (g.id === groupId ? {...g, title: newTitle} : g)),
    );
  };

  const removeToolGroup = (groupId: string) => {
    setToolGroups(prev => {
      const target = prev.find(g => g.id === groupId);
      if (!target) return prev;
      const remaining = prev.filter(g => g.id !== groupId);
      if (remaining.length === 0) return prev;
      return remaining.map((g, i) =>
        i === 0 ? {...g, tools: [...g.tools, ...target.tools]} : g,
      );
    });
  };

  // 재료·과정의 add*와 같은 시그니처 — 특정 행 뒤 삽입과 새 id 반환을 지원한다
  // (행 메뉴의 "위에 추가 / 아래에 추가"가 세 섹션에서 같게 동작해야 한다)
  const addTool = (groupId: string, position: 'top' | 'bottom' = 'top', afterId?: string) => {
    const newId = genId();
    setToolGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const row = {id: newId, name: ''};
        if (afterId) {
          const i = g.tools.findIndex(x => x.id === afterId);
          if (i >= 0) {
            const next = [...g.tools];
            next.splice(i + 1, 0, row);
            return {...g, tools: next};
          }
        }
        return {...g, tools: position === 'top' ? [row, ...g.tools] : [...g.tools, row]};
      }),
    );
    return newId;
  };

  const removeTool = (groupId: string, toolId: string) => {
    setToolGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const filtered = g.tools.filter(t => t.id !== toolId);
        // 과정/재료와 동일하게 최소 1개 유지 — 비면 빈 도구 한 줄로 대체
        if (filtered.length === 0) {
          return {...g, tools: [{id: genId(), name: ''}]};
        }
        return {...g, tools: filtered};
      }),
    );
  };

  const updateTool = (groupId: string, toolId: string, value: string) => {
    setToolGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, tools: g.tools.map(t => (t.id === toolId ? {...t, name: value} : t))}
          : g,
      ),
    );
  };

  const flatTools = useMemo(() => {
    const result: {id: string; groupId: string}[] = [];
    for (const g of toolGroups) {
      for (const t of g.tools) {
        result.push({id: t.id, groupId: g.id});
      }
    }
    return result;
  }, [toolGroups]);

  const reorderToolsGlobal = useCallback((globalFrom: number, globalTo: number) => {
    setToolGroups(prev => {
      const flat = prev.flatMap(g => g.tools.map(t => ({item: t, groupId: g.id})));
      const [moved] = flat.splice(globalFrom, 1);
      let targetGroupId: string;
      if (flat.length === 0) {
        targetGroupId = prev[0].id;
      } else if (globalTo >= flat.length) {
        targetGroupId = flat[flat.length - 1].groupId;
      } else {
        targetGroupId = flat[globalTo].groupId;
      }
      moved.groupId = targetGroupId;
      flat.splice(globalTo, 0, moved);
      return prev.map(g => ({
        ...g,
        tools: flat.filter(f => f.groupId === g.id).map(f => f.item),
      }));
    });
  }, []);

  // ---- Step Group Handlers ----

  const addStepGroup = (afterGroupId?: string) => {
    const newGroup = {id: genId(), title: '과정', steps: [{id: genId(), description: ''}], bulkMode: false, bulkText: ''};
    setStepGroups(prev => {
      if (afterGroupId) {
        const idx = prev.findIndex(g => g.id === afterGroupId);
        return [...prev.slice(0, idx + 1), newGroup, ...prev.slice(idx + 1)];
      }
      return [...prev, newGroup];
    });
  };

  const insertStepGroupAbove = (groupId: string) => {
    const newGroup = {id: genId(), title: '과정', steps: [{id: genId(), description: ''}], bulkMode: false, bulkText: ''};
    setStepGroups(prev => {
      const idx = prev.findIndex(g => g.id === groupId);
      return [...prev.slice(0, idx), newGroup, ...prev.slice(idx)];
    });
  };


  const updateStepGroupTitle = (groupId: string, newTitle: string) => {
    setStepGroups(prev =>
      prev.map(g => (g.id === groupId ? {...g, title: newTitle} : g)),
    );
  };

  // 과정 묶음 순서 이동 (박스 롱프레스 메뉴). dir: -1=위로, 1=아래로. 인접 묶음과 swap.
  const moveIngredientGroup = (groupId: string, dir: -1 | 1) => {
    setIngredientGroups(prev => {
      const idx = prev.findIndex(g => g.id === groupId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  const moveToolGroup = (groupId: string, dir: -1 | 1) => {
    setToolGroups(prev => {
      const idx = prev.findIndex(g => g.id === groupId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  const moveStepGroup = (groupId: string, dir: -1 | 1) => {
    setStepGroups(prev => {
      const idx = prev.findIndex(g => g.id === groupId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  /**
   * 과정 묶음 나누기 — 지정한 행부터 아래를 새 그룹으로 옮긴다.
   * 그 행은 새 그룹의 "첫 과정"으로 남는다. 제목으로 올려버리면 내용이 목록에서
   * 사라져, 끊으려던 갈래가 통째로 없어진 것처럼 보였다. 제목은 임의로 붙이고
   * 사용자가 필요하면 고친다.
   * 행 롱프레스 메뉴와 키보드 툴바 버튼이 공유한다.
   */
  const splitStepGroupAt = useCallback((groupId: string, stepId: string) => {
    setStepGroups(prev => {
      const gi = prev.findIndex(g => g.id === groupId);
      if (gi < 0) return prev;
      const g = prev[gi];
      const si = g.steps.findIndex(s => s.id === stepId);
      if (si <= 0) return prev; // 첫 줄이면 나눌 게 없다
      const next = [...prev];
      next[gi] = {...g, steps: g.steps.slice(0, si)};
      // 기본 제목: 묶음이 여러 개면 구분되도록 번호를 붙인다
      const title = `과정 ${prev.length + 1}`;
      next.splice(gi + 1, 0, {id: genId(), title, steps: g.steps.slice(si), bulkMode: false, bulkText: ''});
      return next;
    });
    setFocusedStep(null);
  }, []);

  /** 과정 행 추가. afterId를 주면 그 행 바로 다음에 넣고, 새 행 id를 반환한다. */
  const addStep = (groupId: string, position: 'top' | 'bottom' = 'top', afterId?: string, initialDescription = '') => {
    const newId = genId();
    setStepGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        // initialDescription: 문단 중간에서 엔터를 눌렀을 때 커서 뒤에 있던 글자
        const row = {id: newId, description: initialDescription};
        if (afterId) {
          const i = g.steps.findIndex(x => x.id === afterId);
          if (i >= 0) {
            const next = [...g.steps];
            next.splice(i + 1, 0, row);
            return {...g, steps: next};
          }
        }
        return {...g, steps: position === 'top' ? [row, ...g.steps] : [...g.steps, row]};
      }),
    );
    return newId;
  };

  const removeStep = (groupId: string, stepId: string) => {
    setStepGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const filtered = g.steps.filter(s => s.id !== stepId);
        if (filtered.length === 0) {
          return {...g, steps: [{id: genId(), description: ''}]};
        }
        return {...g, steps: filtered};
      }),
    );
  };

  const updateStep = (groupId: string, stepId: string, value: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, description: value} : s))}
          : g,
      ),
    );
  };

  const updateStepTip = (groupId: string, stepId: string, value: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, tip: value} : s))}
          : g,
      ),
    );
  };

  const removeStepTip = (groupId: string, stepId: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, tip: undefined} : s))}
          : g,
      ),
    );
  };

  const updateStepCaution = (groupId: string, stepId: string, value: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, caution: value} : s))}
          : g,
      ),
    );
  };

  const removeStepCaution = (groupId: string, stepId: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, caution: undefined} : s))}
          : g,
      ),
    );
  };

  // 슬래시 메뉴 선택 핸들러
  const handleSlashMenuSelect = async (menuId: string) => {
    if (!slashMenu) return;
    const {groupId, stepId} = slashMenu;

    // 사진: 촬영(camera) 또는 갤러리(gallery) → step.photos에 추가
    if (menuId === 'camera' || menuId === 'gallery') {
      const isCamera = menuId === 'camera';
      setSlashMenu(null);
      const permOk = isCamera
        ? await ensureImagePermission('camera', {
            deniedMessage: t('recipeEdit.cameraPermissionNeeded'),
            showSnackbar,
            settingsTitle: t('permission.cameraTitle'),
            settingsBody: t('permission.cameraBody'),
            settingsConfirmLabel: t('permission.openSettings'),
            settingsCancelLabel: t('permission.cancel'),
          })
        : await ensureImagePermission('mediaLibrary', {
            deniedMessage: t('recipeEdit.photoPermissionNeeded'),
            showSnackbar,
            settingsTitle: t('permission.photoTitle'),
            settingsBody: t('permission.photoBody'),
            settingsConfirmLabel: t('permission.openSettings'),
            settingsCancelLabel: t('permission.cancel'),
          });
      if (!permOk) return;
      const result = isCamera
        ? await ImagePicker.launchCameraAsync({quality: 0.8, base64: Platform.OS === 'web'})
        : await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.8, base64: Platform.OS === 'web'});
      if (!result.canceled && result.assets.length > 0) {
        const uris = await Promise.all(
          result.assets.map(a => getPersistentUri(a.uri, a.base64)),
        );
        setStepGroups(prev =>
          prev.map(g =>
            g.id === groupId
              ? {...g, steps: g.steps.map(s => {
                  if (s.id !== stepId) return s;
                  const existing = s.photos ?? [];
                  return {...s, photos: [...existing, ...uris.map(u => ({uri: u}))].slice(0, 3)};
                })}
              : g,
          ),
        );
      }
      return;
    }

    // "/" 제거
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => {
              if (s.id !== stepId) return s;
              const desc = s.description.endsWith('/') ? s.description.slice(0, -1) : s.description;
              if (menuId === 'tip') return {...s, description: desc, tip: s.tip ?? ''};
              if (menuId === 'caution') return {...s, description: desc, caution: s.caution ?? ''};
              return {...s, description: desc};
            })}
          : g,
      ),
    );
    setSlashMenu(null);
  };

  const removeStepGroup = (groupId: string) => {
    setStepGroups(prev => {
      const target = prev.find(g => g.id === groupId);
      if (!target) return prev;
      const remaining = prev.filter(g => g.id !== groupId);
      if (remaining.length === 0) return prev;
      // 삭제된 그룹의 과정을 첫 번째 그룹으로 이동
      return remaining.map((g, i) =>
        i === 0 ? {...g, steps: [...g.steps, ...target.steps]} : g,
      );
    });
  };

  // 글로벌 플랫 리스트 (크로스그룹 드래그용)
  const flatSteps = useMemo(() => {
    const result: {id: string; groupId: string}[] = [];
    for (const g of stepGroups) {
      for (const s of g.steps) {
        result.push({id: s.id, groupId: g.id});
      }
    }
    return result;
  }, [stepGroups]);

  const reorderStepsGlobal = useCallback((globalFrom: number, globalTo: number) => {
    setStepGroups(prev => {
      const flat = prev.flatMap(g => g.steps.map(s => ({step: s, groupId: g.id})));
      const [moved] = flat.splice(globalFrom, 1);
      let targetGroupId: string;
      if (flat.length === 0) {
        targetGroupId = prev[0].id;
      } else if (globalTo >= flat.length) {
        targetGroupId = flat[flat.length - 1].groupId;
      } else {
        targetGroupId = flat[globalTo].groupId;
      }
      moved.groupId = targetGroupId;
      flat.splice(globalTo, 0, moved);
      return prev.map(g => ({
        ...g,
        steps: flat.filter(f => f.groupId === g.id).map(f => f.step),
      }));
    });
  }, []);

  // 드래그 시작 시 활성 flat 리스트 동기화
  React.useEffect(() => {
    if (!drag.draggingId) return;
    if (flatIngredients.some(f => f.id === drag.draggingId)) {
      flatItemsRef.current = flatIngredients;
    } else if (flatSteps.some(f => f.id === drag.draggingId)) {
      flatItemsRef.current = flatSteps;
    } else if (flatTools.some(f => f.id === drag.draggingId)) {
      flatItemsRef.current = flatTools;
    }
  }, [drag.draggingId, flatIngredients, flatSteps, flatTools]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        // 포커스된 입력이 키보드 바로 위에 딱 붙지 않도록 여유를 준다.
        // (기본 0이면 커서 줄이 키보드에 닿아 답답하고, 다음 줄이 안 보인다)
        keyboardDismissMode="none"
        scrollEnabled={drag.scrollEnabled}>
        {/* Spacer for nav bar */}
        <View style={{height: 72 + insets.top}} />

        {/* Title & Description */}
        <View style={{zIndex: showMethodMenu ? 100 : 1, elevation: showMethodMenu ? 100 : 1}}>
        <ContentContainer>
          <Card style={{overflow: 'visible'}}>
            <View style={styles.titleRow}>
              <View style={[styles.titleInputWrap, titleError && {borderBottomColor: colors['foreground/negative'], borderBottomWidth: 2}]}>
                <AutoGrowInput
                  // 툴바의 영역이동(◀▶)이 sectionInputRefs를 보므로 여기에도 등록해야
                  // '제목'으로 이동이 동작한다.
                  ref={(node: any) => {
                    titleInputRef.current = node;
                    sectionInputRefs.current['title'] = node;
                  }}
                  style={[styles.cardFieldInput, noOutline, typing && typingField === 'title' && !!title && {color: 'transparent'}]}
                  placeholder={t('recipeEdit.titlePlaceholder')}
                  placeholderTextColor={titleError ? colors['foreground/negative'] : colors['foreground/on-surface-muted']}
                  value={title}
                  onChangeText={t => { setTitle(t); if (titleError) setTitleError(false); }}
                  onFocus={(e) => handleFieldFocus('title', e.nativeEvent)}
                  onBlur={handleFieldBlur}
                />
                {/* OCR 진행 중 스켈레톤 */}
                {ocrLoading && focusedOcrField === 'title' && (
                  <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.skeletonOverlay]}>
                    <SkeletonLine lines={1} lineHeight={22} lastLineRatio={1} />
                  </View>
                )}
                {/* 타이핑 중 무지개 프리즘 오버레이 */}
                {typing && typingField === 'title' && !!title && (
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <RainbowText style={styles.cardFieldInput} animated onDone={finishTyping}>{title}</RainbowText>
                  </View>
                )}
              </View>
            </View>
            {(isFieldActive('method') || isFieldActive('ratio')) && (
              <>
                <View style={styles.dividerFull} />
                <View style={[styles.methodRatioContainer, {zIndex: showMethodMenu ? 100 : 1, elevation: showMethodMenu ? 100 : 1}]}>
                  <View style={styles.methodRatioRow}>
                    {isFieldActive('method') && (
                      <View style={{flex: 1, position: 'relative'}}>
                        <Pressable
                          style={styles.methodField}
                          onPress={() => setShowMethodMenu(prev => !prev)}>
                          <Text style={[styles.cardFieldInput, !method && {color: colors['foreground/on-surface-muted']}]} numberOfLines={1}>
                            {method || t('recipeEdit.methodPlaceholder')}
                          </Text>
                          <IconChevronDown width={14} height={14} color={colors['foreground/on-surface-muted']} />
                        </Pressable>
                        <Menu
                          items={BAKING_METHODS.map(m => ({id: m, label: m}))}
                          selectedId={method || undefined}
                          visible={showMethodMenu}
                          onSelect={id => { setMethod(id); setShowMethodMenu(false); }}
                          onClose={() => setShowMethodMenu(false)}
                          style={styles.methodMenu}
                          maxHeight={180}
                        />
                      </View>
                    )}
                    {isFieldActive('method') && isFieldActive('ratio') && (
                      <View style={styles.methodRatioVDivider} />
                    )}
                    {isFieldActive('ratio') && (
                      <View style={styles.ratioField}>
                        <RNTextInput
                          // 비중은 원래 padding:0이 없던 필드 — 공통 스타일을 쓰되
                          // 좌우 기본 여백은 되살려 다른 필드와 시작 위치를 맞춘다
                          style={[styles.cardFieldInput, noOutline, {flex: 1, paddingHorizontal: Spacing.sm}]}
                          placeholder={t('recipeEdit.ratioPlaceholder')}
                          placeholderTextColor={colors['foreground/on-surface-muted']}
                          value={ratio}
                          onChangeText={setRatio}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
            <View style={styles.dividerFull} />
            <View style={styles.descriptionContainer}>
              <AutoGrowInput
                style={[styles.cardFieldInput, noOutline]}
                placeholder={t('recipeEdit.descriptionPlaceholder')}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </Card>
        </ContentContainer>
        </View>

        {/* Option Tiles */}
        <ContentContainer style={styles.optionTilesSection}>
          <View style={styles.optionTilesRow}>
            <View style={styles.photoTileWrap}>
              <Pressable style={{flex: 1}} onPress={() => setShowPhotoMenu(prev => !prev)}>
                {imageUri ? (
                  <Card style={styles.photoTileFilled}>
                    <Image
                      source={{uri: imageUri}}
                      style={styles.photoTileImage}
                    />
                    {saving && (
                      <View style={styles.photoTileSpinner}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    )}
                    {/* 여러 장이면 장수 표시 — 타일엔 대표만 보이므로 이게 없으면 알 수 없다 */}
                    {heroUris.length > 1 && (
                      <View style={styles.photoTileCount} pointerEvents="none">
                        <Text style={styles.photoTileCountText}>{heroUris.length}</Text>
                      </View>
                    )}
                  </Card>
                ) : (
                  <OptionTile icon={IconPhoto} label={t('recipeEdit.photo')} />
                )}
              </Pressable>
              <Menu
                items={[
                  {id: 'camera', label: t('recipeEdit.takePhoto'), icon: IconCameraFilled},
                  {id: 'gallery', label: t('recipeEdit.chooseFromGallery'), icon: IconPhoto},
                  // 대표가 있어야 "추가"가 의미 있다. 3장을 채우면 추가 항목을 감춘다.
                  ...(imageUri && imageUris.length < MAX_EXTRA_HERO
                    ? [{id: 'add', label: t('recipeEdit.addPhoto'), icon: IconFilesFilled}]
                    : []),
                  ...(heroUris.length > 1
                    ? [{id: 'view', label: t('recipeEdit.viewPhotos'), icon: IconPhoto}]
                    : []),
                ]}
                visible={showPhotoMenu}
                onSelect={(id) => {
                  setShowPhotoMenu(false);
                  if (id === 'add') pickImage('gallery', 'extra');
                  else if (id === 'view') setHeroViewerIndex(0);
                  else pickImage(id as 'camera' | 'gallery');
                }}
                onClose={() => setShowPhotoMenu(false)}
                style={styles.photoMenu}
              />
            </View>
            <OptionTile icon={IconClockFilled} label={time || t('recipeEdit.time')} onPress={() => setShowTimeDialog(true)} />
            <OptionTile icon={IconUsersRoundFilled} label={servings || t('recipeEdit.servings')} onPress={() => setShowServingsDialog(true)} />
            {/* 회차 타일 제거 — '다시 만들기' 자동값이라 편집화면에 표시할 필요 없음 (session 데이터는 저장 유지) */}
          </View>
          {/* 공법/비중 칩은 제목 영역으로 이동됨 */}
        </ContentContainer>
        <ContentContainer style={styles.navItemGap}>
          <Card>
            <ListItem
              // 유튜브 주소면 유튜브 아이콘으로 — 무엇이 걸린 링크인지 한눈에 보이게
              leading={{type: 'icon', icon: referenceYouTubeId ? IconYourubeColored : IconLink}}
              showDivider={false}
            >
              <View style={styles.referenceLinkRow}>
                <View style={{flex: 1, minWidth: 0}}>
                  <UrlField
                    value={referenceUrl}
                    onChangeText={setReferenceUrl}
                    placeholder={t('recipeEdit.referenceLinkPlaceholder')}
                    // 유튜브면 앱 내 플레이어로, 아니면 기본 열기
                    onOpen={referenceYouTubeId ? () => openYouTube(referenceYouTubeId) : undefined}
                  />
                </View>
                {isUrlLike(referenceUrl) ? (
                  <IconButton icon={IconClose} size="small" variant="ghost-secondary" onPress={() => setReferenceUrl('')} />
                ) : null}
              </View>
            </ListItem>
          </Card>
        </ContentContainer>

        {/* 원본 링크 — 만개의레시피 등 외부 사이트 URL. 입력 시 자동으로 레시피를 가져온다.
            'origin'/'source'(옛 ID 혼용) 중 하나라도 활성이거나 값이 있으면 노출 → 상세에 뜨면 편집에서도 수정 가능 */}
        {(isFieldActive('origin') || isFieldActive('source') || !!sourceUrl) && (
        <View onLayout={e => { sectionPositions.current['origin'] = e.nativeEvent.layout.y; }}>
        <ContentContainer style={styles.navItemGap}>
          <Card>
            <ListItem
              leading={{type: 'icon', icon: IconImport}}
              showDivider={false}
              trailing={importing ? {type: 'custom', element: <ActivityIndicator size="small" color={colors['foreground/on-surface-muted']} />} : undefined}
            >
              {/* 한 줄 고정: [왼쪽 URL(입력/링크·말줄임)] [열기] [X] [가져오기]. 오른쪽 버튼은 항상 고정 → 이동 없음 */}
              <View style={styles.referenceLinkRow}>
                <View style={{flex: 1, minWidth: 0}}>
                  <UrlField
                    inputRef={(node: any) => { originInputRef.current = node; }}
                    value={sourceUrl}
                    onChangeText={setSourceUrl}
                    onSubmitEditing={() => runImportFromUrl(sourceUrl)}
                    onBlur={() => runImportFromUrl(sourceUrl)}
                    placeholder={t('recipeEdit.originLinkPlaceholder')}
                    editable={!importing}
                  />
                </View>
                <IconButton
                  icon={IconClose}
                  size="small"
                  variant="ghost-secondary"
                  onPress={() => setSourceUrl('')}
                  disabled={!sourceUrl}
                />
                <Button
                  label={t('recipeEdit.import')}
                  variant="soft"
                  size="small"
                  onPress={() => runImportFromUrl(sourceUrl)}
                  disabled={importing || !/^https?:\/\/.+/.test(sourceUrl.trim())}
                  loading={importing}
                />
              </View>
            </ListItem>
          </Card>
        </ContentContainer>
        </View>
        )}

        {/* 재료 Groups */}
        {isFieldActive('ingredients') && <View onLayout={e => { sectionPositions.current['ingredients'] = e.nativeEvent.layout.y; }}>
        {ingredientGroups.map((group, groupIndex) => {
          const ingGroupHasDragging = drag.draggingId !== null && group.ingredients.some(i => i.id === drag.draggingId);
          return (
          <ContentContainer key={group.id} style={{...(groupIndex === 0 ? styles.section : styles.addGroupSection), ...(ingGroupMenu === group.id || ingAddMenu === group.id || ingRowMenu?.groupId === group.id ? {zIndex: 9999} : ingGroupHasDragging ? {zIndex: 100} : undefined)}}>
            <Card style={ingGroupHasDragging || ingGroupMenu === group.id || ingAddMenu === group.id
              || ingRowMenu?.groupId === group.id
              ? {overflow: 'visible'} : undefined}>
              {/* Group Header — 메뉴가 헤더 바로 아래에 붙도록 relative 래퍼로 감싼다 */}
              <View style={{position: 'relative', zIndex: (ingGroupMenu === group.id || ingAddMenu === group.id) ? 9999 : undefined}}>
              {ingredientGroups.length >= 2 ? (
                <ListItem
                  leading={{type: 'iconButton', icon: IconLeafFilled,
                    onPress: () => setIngGroupMenu(group.id), variant: 'ghost-secondary'}}
                  trailing={{type: 'iconButton', icon: IconPlusCircleFilled, onPress: () => addIngredient(group.id), variant: 'ghost-secondary'}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>{t('recipeEdit.ingredientsLabel')}</Text>
                    <IconChevronRight width={8} height={8} color={colors['foreground/on-surface-var']} />
                    <AutoGrowInput
                      style={[styles.cardFieldInput, noOutline]}
                      value={group.title}
                      onChangeText={v => updateIngredientGroupTitle(group.id, v)}
                      placeholder={t('recipeEdit.groupNamePlaceholder')}
                    />
                  </View>
                </ListItem>
              ) : (
                <ListItem
                  leading={{type: 'iconButton', icon: IconLeafFilled, onPress: () => setIngAddMenu(group.id), variant: 'ghost-secondary'}}
                  trailing={{type: 'custom', element: (
                    <View style={styles.toolHeaderTrailing}>
                      {/* 한번에 쓰기가 켜졌을 때만 작성법 안내 */}
                      {group.bulkMode && (
                        <Tooltip
                          message={t('recipeEdit.bulkHelpIngredients')}
                          visible={bulkHelpFor === group.id}
                          onClose={() => setBulkHelpFor(null)}>
                          <IconButton
                            icon={IconCircleAlert}
                            size="small"
                            variant="ghost-secondary"
                            onPress={() => setBulkHelpFor(bulkHelpFor === group.id ? null : group.id)}
                          />
                        </Tooltip>
                      )}
                      {/* 묶음마다 개별 "한번에 쓰기" 토글 */}
                      <Switch
                        label={t('recipeEdit.bulkWrite')}
                        value={group.bulkMode}
                        onValueChange={(v) => {
                          if (!v) {
                            // bulk → 폼: 이 그룹 bulkText를 파싱해 개별 재료로. 기존 값(양·단위) 최대 보존.
                            const parsed = bulkTextToIngredients(group.bulkText);
                            const existingByName = new Map(group.ingredients.map(i => [i.name, i]));
                            // 파싱 결과가 비어도 최소 1행은 남긴다 — 0행이면 재료가 안 보이고 카드 높이가 무너진다
                            const nextIngredients = parsed.length > 0 ? parsed.map(item => {
                              const existing = existingByName.get(item.name);
                              if (existing && !item.amount && existing.unit === item.unit) {
                                return {...existing, id: genId(), name: item.name};
                              }
                              return {id: genId(), name: item.name, amount: item.amount, unit: item.unit};
                            }) : [emptyIngredient()];
                            setIngredientGroups(p => p.map(g => g.id === group.id ? {...g, bulkMode: false, ingredients: nextIngredients} : g));
                          } else {
                            // 폼 → bulk: 이 그룹 재료를 bulkText로.
                            setIngredientGroups(p => p.map(g => g.id === group.id ? {...g, bulkMode: true, bulkText: ingredientsToBulkText(group.ingredients)} : g));
                          }
                        }}
                      />
                      <View style={styles.headerAddSlot}>
                        <IconButton icon={IconPlusCircleFilled} onPress={() => addIngredient(group.id)} variant="ghost-secondary" size="medium" />
                      </View>
                    </View>
                  )}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>{t('recipeEdit.ingredientsLabel')}</Text>
                  </View>
                </ListItem>
              )}

              <Menu
                items={[
                  {id: 'up', label: t('recipeEdit.moveGroupUp'), disabled: groupIndex === 0},
                  {id: 'down', label: t('recipeEdit.moveGroupDown'), disabled: groupIndex === ingredientGroups.length - 1},
                  {id: 'delete', label: t('recipeEdit.deleteGroup'), destructive: true, disabled: ingredientGroups.length <= 1},
                ]}
                visible={ingGroupMenu === group.id}
                onSelect={(id) => {
                  if (id === 'delete') removeIngredientGroup(group.id);
                  else moveIngredientGroup(group.id, id === 'up' ? -1 : 1);
                  setIngGroupMenu(null);
                }}
                onClose={() => setIngGroupMenu(null)}
                style={styles.anchoredMenuLeft}
              />
              <Menu
                items={[
                  {id: 'item', label: t('recipeEdit.addItem')},
                  {id: 'group', label: t('recipeEdit.addGroup')},
                ]}
                visible={ingAddMenu === group.id}
                onSelect={(id) => {
                  if (id === 'item') addIngredient(group.id);
                  else addIngredientGroup(group.id);
                  setIngAddMenu(null);
                }}
                onClose={() => setIngAddMenu(null)}
                style={styles.anchoredMenuLeft}
              />
              </View>

              {/* Ingredients */}
              {group.bulkMode ? (
                <View style={styles.bulkToolInput}>
                  <AutoGrowInput
                    ref={(node: any) => { sectionInputRefs.current[`ingredients:${group.id}`] = node; }}
                    style={[styles.cardFieldInput, styles.bulkInput, noOutline, typing && typingField === 'ingredients' && isOcrTypingTarget(group.id, ingredientGroups[0]?.id) && !!group.bulkText && {color: 'transparent'}]}
                    placeholder={t('recipeEdit.ingredientsBulkPlaceholder')}
                    value={group.bulkText}
                    onChangeText={(v: string) => setIngredientGroups(p => p.map(g => g.id === group.id ? {...g, bulkText: v} : g))}
                    onFocus={(e) => { setOcrBulkGroupId(group.id); handleFieldFocus('ingredients', e.nativeEvent); }}
                    onBlur={handleFieldBlur}
                  />
                  {ocrLoading && focusedOcrField === 'ingredients' && ocrBulkGroupId === group.id && (
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bulkToolInput]}>
                      <SkeletonLine lines={2} lineHeight={14} />
                    </View>
                  )}
                  {typing && typingField === 'ingredients' && isOcrTypingTarget(group.id, ingredientGroups[0]?.id) && !!group.bulkText && (
                    <BulkTypingOverlay
                      text={group.bulkText}
                      textStyle={styles.cardFieldInput}
                      containerStyle={styles.bulkToolInput}
                      onDone={finishTyping}
                    />
                  )}
                </View>
              ) : (
              <>
              <View style={styles.dragArea}>
                {group.ingredients.map((ingredient, index) => {
                  const canDragIngredient = !!ingredient.name.trim();
                  // 과정과 동일: 마지막 한 줄은(내용 없으면) 삭제 비활성 → 최소 1개 유지
                  const canDeleteIngredient = group.ingredients.length > 1 || canDragIngredient;
                  const globalIndex = flatIngredients.findIndex(f => f.id === ingredient.id);
                  const responder = canDragIngredient
                    ? drag.createDragHandlers(
                        ingredient.id,
                        globalIndex,
                        flatIngredients,
                        reorderIngredientsGlobal,
                      )
                    : null;
                  const isDragging = drag.draggingId === ingredient.id;
                  const highlightAnim = getDropHighlight(ingredient.id);
                  return (
                    <View
                      key={ingredient.id}
                      ref={drag.createItemRef(ingredient.id)}
                      onLayout={e => {
                        drag.handleItemLayout(ingredient.id)();
                        // 상세에서 특정 재료를 눌러 들어왔을 때 그 줄로 스크롤하기 위해 기록
                        const sectionY = sectionPositions.current['ingredients'] ?? 0;
                        ingRowY.current[ingredient.id] = sectionY + e.nativeEvent.layout.y;
                      }}
                      style={isDragging ? {zIndex: 10} : undefined}>
                    <Animated.View
                      style={[
                        isDragging ? {transform: [{translateY: drag.dragY}], opacity: 0.85} : undefined,
                        {
                          borderBottomWidth: highlightAnim.interpolate({inputRange: [-1, 0, 1], outputRange: [0, 0, 2]}),
                          borderBottomColor: colors['custom/yellow'],
                          borderTopWidth: highlightAnim.interpolate({inputRange: [-1, 0, 1], outputRange: [2, 0, 0]}),
                          borderTopColor: colors['custom/yellow'],
                        },
                      ]}>
                      <ListItem
                        leading={{
                          type: 'custom',
                          element: (
                            <DragHandle
                              responder={responder}
                              enabled={canDragIngredient}
                              onPress={() => { triggerHaptic('light'); setIngRowMenu({groupId: group.id, itemId: ingredient.id}); }}
                            />
                          ),
                        }}
                        trailing={{
                          type: 'iconButton',
                          icon: IconMinusCircleFilled,
                          onPress: canDeleteIngredient ? () => removeIngredient(group.id, ingredient.id) : undefined,
                          disabled: !canDeleteIngredient,
                          variant: 'ghost-secondary',
                        }}
                        // 과정 행과 같은 기준(위 정렬) — 여러 줄이 되어도 버튼이 첫 줄 옆에
                        titleNumberOfLines={0}
                        showDivider={index < group.ingredients.length - 1}>
                        <View style={styles.editableRowContent}>
                          <RichEditor
                            ref={(node: any) => {
                              rowInputRefs.current[ingredient.id] = node;
                              if (groupIndex === 0 && index === 0) sectionInputRefs.current['ingredients'] = node;
                            }}
                            style={styles.cardFieldInput}
                            placeholder={t('recipeEdit.ingredientNamePlaceholder')}
                            value={ingredient.name}
                            onChangeText={v => updateIngredient(group.id, ingredient.id, 'name', v)}
                            // 폼(개별) 입력에서도 대상 그룹을 기록해야 OCR 결과가
                            // 엉뚱한 그룹(항상 첫 그룹)으로 들어가지 않는다
                            onFocus={() => { setOcrBulkGroupId(group.id); handleFieldFocus('ingredients'); }}
                            onBlur={handleFieldBlur}
                            // 엔터 = 다음 재료 행 (모바일엔 Shift+Enter가 없어 재료는 줄바꿈 대신 행 추가)
                            onSubmit={(rest) => {
                              // 문단 중간이면 커서 뒤 글자를 새 행으로 가져간다
                              const newId = addIngredient(group.id, 'bottom', ingredient.id, rest ?? '');
                              // 새 행이 렌더된 뒤 포커스 — 넘어온 글자가 있으면 그 맨 앞에 커서
                              // rowInputRefs는 RNTextInput 타입이라 RichEditor의 focus(caret)을 모른다
                              setTimeout(() => (rowInputRefs.current[newId] as any)?.focus?.(0), 50);
                            }}
                            onBackspaceAtStart={() => {
                              // 빈 칸에서 백스페이스 = 그 행 삭제 (과정과 같은 약속).
                              // 재료는 이름·분량이 따로라 과정처럼 이전 행과 "병합"하면
                              // 분량이 어디로 갈지 모호하다 → 빈 칸일 때만 지운다.
                              if (ingredient.name || ingredient.amount) return;
                              const prev = group.ingredients[index - 1];
                              if (!prev) return; // 첫 행은 지우지 않는다(최소 1행 유지)
                              removeIngredient(group.id, ingredient.id);
                              setTimeout(() => (rowInputRefs.current[prev.id] as any)?.focus(Number.MAX_SAFE_INTEGER), 50);
                            }}
                            onSelectionChange={(sel, srcValue) => {
                              // 툴바 링크 버튼이 볼 대상 — 쿠팡 링크의 주 용도가 재료다
                              linkCtx?.report({
                                getValue: () => srcValue,
                                setValue: (v: string) => updateIngredient(group.id, ingredient.id, 'name', v),
                                selection: sel,
                              });
                            }}
                            onLinkTap={info => {
                              applyLinkRef.current = (url, label) => {
                                const src = ingredient.name;
                                const range = expandToLink(src, {start: info.start, end: info.end});
                                updateIngredient(group.id, ingredient.id, 'name', applyLink(src, range, url, label));
                              };
                              setLinkDialog({initial: info.url, label: info.label});
                            }}
                          />
                          <Pressable
                            style={styles.amountInputContainer}
                            onPress={() => setAmountDialogTarget({groupId: group.id, ingredientId: ingredient.id})}
                          >
                              <Text style={[styles.amountInput, !ingredient.amount && styles.amountPlaceholder]}>
                                {ingredient.amount || '0'}
                              </Text>
                              <Text style={styles.unitText}>{ingredient.unit}</Text>
                          </Pressable>
                        </View>
                      </ListItem>
                    </Animated.View>
                    <Menu
                      items={[
                        {id: 'addAbove', label: t('recipeEdit.addStepAbove')},
                        {id: 'addBelow', label: t('recipeEdit.addStepBelow')},
                      ]}
                      visible={ingRowMenu?.itemId === ingredient.id}
                      onSelect={(id) => {
                        const prevId = group.ingredients[index - 1]?.id;
                        const newId = id === 'addAbove'
                          ? addIngredient(group.id, prevId ? 'bottom' : 'top', prevId)
                          : addIngredient(group.id, 'bottom', ingredient.id);
                        setTimeout(() => rowInputRefs.current[newId]?.focus(), 50);
                        setIngRowMenu(null);
                      }}
                      onClose={() => setIngRowMenu(null)}
                      style={styles.anchoredMenuLeft}
                    />
                    </View>
                  );
                })}
              </View>

              {/* Add ingredient / Add ingredient group buttons */}
              <View style={styles.addButtonRow}>
                <View style={styles.addButtonDivider}>
                  <View style={styles.divider} />
                </View>
                <View style={styles.addButtonPair}>
                  <Pressable style={styles.addGroupButton} onPress={() => { triggerHaptic('light'); addIngredientGroup(group.id); }}>
                  <Text style={styles.addGroupText}>{t('recipeEdit.addGroup')}</Text>
                </Pressable>
                <View style={styles.addButtonVDivider} />
                <Pressable style={styles.addGroupButton} onPress={() => { triggerHaptic('light'); addIngredient(group.id, 'bottom'); }}>
                  <Text style={styles.addGroupText}>{t('recipeEdit.addItem')}</Text>
                </Pressable>
                </View>
              </View>
              </>
              )}
            </Card>
          </ContentContainer>
        );})}

        </View>}

        {/* 도구 Groups */}
        <View onLayout={e => { sectionPositions.current['tools'] = e.nativeEvent.layout.y; }}>
        {toolGroups.map((group, groupIndex) => {
          const toolGroupHasDragging = drag.draggingId !== null && group.tools.some(t => t.id === drag.draggingId);
          return (
          <ContentContainer key={group.id} style={{...(groupIndex === 0 ? styles.section : styles.addGroupSection), ...(toolGroupMenu === group.id || toolAddMenu === group.id || toolRowMenu?.groupId === group.id ? {zIndex: 9999} : toolGroupHasDragging ? {zIndex: 100} : undefined)}}>
            <Card style={toolGroupHasDragging || toolGroupMenu === group.id || toolAddMenu === group.id
              || toolRowMenu?.groupId === group.id
              ? {overflow: 'visible'} : undefined}>
              {/* Group Header — 메뉴가 헤더 바로 아래에 붙도록 relative 래퍼로 감싼다 */}
              <View style={{position: 'relative', zIndex: (toolGroupMenu === group.id || toolAddMenu === group.id) ? 9999 : undefined}}>
              {toolGroups.length >= 2 ? (
                <ListItem
                  leading={{type: 'iconButton', icon: IconToolCaseFilled,
                    onPress: () => setToolGroupMenu(group.id), variant: 'ghost-secondary'}}
                  trailing={{type: 'iconButton', icon: IconPlusCircleFilled, onPress: () => addTool(group.id), variant: 'ghost-secondary'}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>{t('recipeEdit.toolsLabel')}</Text>
                    <IconChevronRight width={8} height={8} color={colors['foreground/on-surface-var']} />
                    <AutoGrowInput
                      style={[styles.cardFieldInput, noOutline]}
                      value={group.title}
                      onChangeText={v => updateToolGroupTitle(group.id, v)}
                      placeholder={t('recipeEdit.groupNamePlaceholder')}
                    />
                  </View>
                </ListItem>
              ) : (
                <ListItem
                  leading={{type: 'iconButton', icon: IconToolCaseFilled, onPress: () => setToolAddMenu(group.id), variant: 'ghost-secondary'}}
                  trailing={{type: 'custom', element: (
                    <View style={styles.toolHeaderTrailing}>
                      {group.bulkMode && (
                        <Tooltip
                          message={t('recipeEdit.bulkHelpTools')}
                          visible={bulkHelpFor === group.id}
                          onClose={() => setBulkHelpFor(null)}>
                          <IconButton
                            icon={IconCircleAlert}
                            size="small"
                            variant="ghost-secondary"
                            onPress={() => setBulkHelpFor(bulkHelpFor === group.id ? null : group.id)}
                          />
                        </Tooltip>
                      )}
                      {/* 묶음마다 개별 "한번에 쓰기" 토글 (재료와 동일) */}
                      <Switch
                        label={t('recipeEdit.bulkWrite')}
                        value={group.bulkMode}
                        onValueChange={(v) => {
                          if (!v) {
                            // bulk → 폼: 이 묶음의 bulkText를 파싱해 개별 도구로
                            const names = bulkTextToToolNames(group.bulkText);
                            setToolGroups(p => p.map(g => g.id === group.id
                              ? {...g, bulkMode: false, tools: names.map(name => ({id: genId(), name}))}
                              : g));
                          } else {
                            // 폼 → bulk: 이 묶음 도구를 bulkText로
                            setToolGroups(p => p.map(g => g.id === group.id
                              ? {...g, bulkMode: true, bulkText: toolsToBulkText(group.tools)}
                              : g));
                          }
                        }}
                      />
                      <View style={styles.headerAddSlot}>
                        <IconButton icon={IconPlusCircleFilled} onPress={() => addTool(group.id)} variant="ghost-secondary" size="medium" />
                      </View>
                    </View>
                  )}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>{t('recipeEdit.toolsLabel')}</Text>
                  </View>
                </ListItem>
              )}

              <Menu
                items={[
                  {id: 'up', label: t('recipeEdit.moveGroupUp'), disabled: groupIndex === 0},
                  {id: 'down', label: t('recipeEdit.moveGroupDown'), disabled: groupIndex === toolGroups.length - 1},
                  {id: 'delete', label: t('recipeEdit.deleteGroup'), destructive: true, disabled: toolGroups.length <= 1},
                ]}
                visible={toolGroupMenu === group.id}
                onSelect={(id) => {
                  if (id === 'delete') removeToolGroup(group.id);
                  else moveToolGroup(group.id, id === 'up' ? -1 : 1);
                  setToolGroupMenu(null);
                }}
                onClose={() => setToolGroupMenu(null)}
                style={styles.anchoredMenuLeft}
              />
              <Menu
                items={[
                  {id: 'item', label: t('recipeEdit.addItem')},
                  {id: 'group', label: t('recipeEdit.addGroup')},
                ]}
                visible={toolAddMenu === group.id}
                onSelect={(id) => {
                  if (id === 'item') addTool(group.id);
                  else addToolGroup(group.id);
                  setToolAddMenu(null);
                }}
                onClose={() => setToolAddMenu(null)}
                style={styles.anchoredMenuLeft}
              />
              </View>

              {/* Tools */}
              {group.bulkMode ? (
                <View style={styles.bulkToolInput}>
                  <AutoGrowInput
                    ref={(node: any) => { sectionInputRefs.current['tools'] = node; }}
                    style={[styles.cardFieldInput, styles.bulkInput, noOutline, typing && typingField === 'tools' && isOcrTypingTarget(group.id, toolGroups[0]?.id) && !!group.bulkText && {color: 'transparent'}]}
                    placeholder={t('recipeEdit.toolsBulkPlaceholder')}
                    value={group.bulkText}
                    onChangeText={(v: string) => setToolGroups(p => p.map(g => g.id === group.id ? {...g, bulkText: v} : g))}
                    onFocus={(e) => handleFieldFocus('tools', e.nativeEvent)}
                    onBlur={handleFieldBlur}
                  />
                  {ocrLoading && focusedOcrField === 'tools' && (
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bulkToolInput]}>
                      <SkeletonLine lines={2} lineHeight={14} />
                    </View>
                  )}
                  {typing && typingField === 'tools' && isOcrTypingTarget(group.id, toolGroups[0]?.id) && !!group.bulkText && (
                    <BulkTypingOverlay
                      text={group.bulkText}
                      textStyle={styles.cardFieldInput}
                      containerStyle={styles.bulkToolInput}
                      onDone={finishTyping}
                    />
                  )}
                </View>
              ) : (
              <>
              <View style={styles.dragArea}>
                {group.tools.map((tool, index) => {
                  const canDrag = !!tool.name.trim();
                  // 과정/재료와 동일: 마지막 한 줄은(내용 없으면) 삭제 비활성 → 최소 1개 유지
                  const canDeleteTool = group.tools.length > 1 || canDrag;
                  const globalIndex = flatTools.findIndex(f => f.id === tool.id);
                  const responder = canDrag
                    ? drag.createDragHandlers(
                        tool.id,
                        globalIndex,
                        flatTools,
                        reorderToolsGlobal,
                      )
                    : null;
                  const isDragging = drag.draggingId === tool.id;
                  const highlightAnim = getDropHighlight(tool.id);
                  return (
                    <View
                      key={tool.id}
                      ref={drag.createItemRef(tool.id)}
                      onLayout={drag.handleItemLayout(tool.id)}
                      style={isDragging ? {zIndex: 10} : undefined}>
                    <Animated.View
                      style={[
                        isDragging ? {transform: [{translateY: drag.dragY}], opacity: 0.85} : undefined,
                        {
                            borderBottomWidth: highlightAnim.interpolate({inputRange: [-1, 0, 1], outputRange: [0, 0, 2]}),
                            borderBottomColor: colors['custom/yellow'],
                            borderTopWidth: highlightAnim.interpolate({inputRange: [-1, 0, 1], outputRange: [2, 0, 0]}),
                            borderTopColor: colors['custom/yellow'],
                          },
                      ]}>
                      <ListItem
                        leading={{
                          type: 'custom',
                          element: (
                            <DragHandle
                              responder={responder}
                              enabled={canDrag}
                              onPress={() => { triggerHaptic('light'); setToolRowMenu({groupId: group.id, itemId: tool.id}); }}
                            />
                          ),
                        }}
                        trailing={{
                          type: 'iconButton',
                          icon: IconMinusCircleFilled,
                          onPress: canDeleteTool ? () => removeTool(group.id, tool.id) : undefined,
                          disabled: !canDeleteTool,
                          variant: 'ghost-secondary',
                        }}
                        titleNumberOfLines={0}
                        showDivider={index < group.tools.length - 1}>
                        <RichEditor
                          ref={(node: any) => {
                            rowInputRefs.current[tool.id] = node;
                            if (groupIndex === 0 && index === 0) sectionInputRefs.current['tools'] = node;
                          }}
                          style={styles.cardFieldInput}
                          placeholder={t('recipeEdit.toolNamePlaceholder')}
                          value={tool.name}
                          onChangeText={v => updateTool(group.id, tool.id, v)}
                          onFocus={() => handleFieldFocus('tools')}
                          onBlur={handleFieldBlur}
                          // 엔터 = 다음 도구 행 (재료·과정과 같은 약속)
                          onSubmit={() => {
                            const newId = addTool(group.id, 'bottom', tool.id);
                            setTimeout(() => rowInputRefs.current[newId]?.focus(), 50);
                          }}
                          onBackspaceAtStart={() => {
                            // 빈 칸에서 백스페이스 = 그 행 삭제 (재료·과정과 같은 약속)
                            if (tool.name) return;
                            const prev = group.tools[index - 1];
                            if (!prev) return; // 첫 행은 지우지 않는다(최소 1행 유지)
                            removeTool(group.id, tool.id);
                            setTimeout(() => (rowInputRefs.current[prev.id] as any)?.focus(Number.MAX_SAFE_INTEGER), 50);
                          }}
                          onSelectionChange={(sel, srcValue) => {
                            linkCtx?.report({
                              getValue: () => srcValue,
                              setValue: (v: string) => updateTool(group.id, tool.id, v),
                              selection: sel,
                            });
                          }}
                          onLinkTap={info => {
                            applyLinkRef.current = (url, label) => {
                              const src = tool.name;
                              const range = expandToLink(src, {start: info.start, end: info.end});
                              updateTool(group.id, tool.id, applyLink(src, range, url, label));
                            };
                            setLinkDialog({initial: info.url, label: info.label});
                          }}
                        />
                      </ListItem>
                    </Animated.View>
                    <Menu
                      items={[
                        {id: 'addAbove', label: t('recipeEdit.addStepAbove')},
                        {id: 'addBelow', label: t('recipeEdit.addStepBelow')},
                      ]}
                      visible={toolRowMenu?.itemId === tool.id}
                      onSelect={(id) => {
                        const prevId = group.tools[index - 1]?.id;
                        const newId = id === 'addAbove'
                          ? addTool(group.id, prevId ? 'bottom' : 'top', prevId)
                          : addTool(group.id, 'bottom', tool.id);
                        setTimeout(() => rowInputRefs.current[newId]?.focus(), 50);
                        setToolRowMenu(null);
                      }}
                      onClose={() => setToolRowMenu(null)}
                      style={styles.anchoredMenuLeft}
                    />
                    </View>
                  );
                })}
              </View>
              <View style={styles.addButtonRow}>
                <View style={styles.addButtonDivider}>
                  <View style={styles.divider} />
                </View>
                <View style={styles.addButtonPair}>
                  <Pressable style={styles.addGroupButton} onPress={() => { triggerHaptic('light'); addToolGroup(group.id); }}>
                    <Text style={styles.addGroupText}>{t('recipeEdit.addGroup')}</Text>
                  </Pressable>
                  <View style={styles.addButtonVDivider} />
                  <Pressable style={styles.addGroupButton} onPress={() => { triggerHaptic('light'); addTool(group.id, 'bottom'); }}>
                    <Text style={styles.addGroupText}>{t('recipeEdit.addItem')}</Text>
                  </Pressable>
                </View>
              </View>
              </>
              )}
            </Card>
          </ContentContainer>
        );})}
        </View>

        {/* 과정 Groups */}
        <View onLayout={e => { sectionPositions.current['steps'] = e.nativeEvent.layout.y; }}>
        {stepGroups.map((group, groupIndex) => {
          const groupHasDragging = drag.draggingId !== null && group.steps.some(s => s.id === drag.draggingId);
          return (
          <ContentContainer key={group.id} style={{...(groupIndex === 0 ? styles.section : styles.addGroupSection), ...(stepAddMenu === group.id || stepGroupMenu === group.id || stepRowMenu?.groupId === group.id ? {zIndex: 9999} : groupHasDragging ? {zIndex: 100} : undefined)}}>
            <Card style={groupHasDragging || stepAddMenu === group.id || stepGroupMenu === group.id
              || stepRowMenu?.groupId === group.id
              ? {overflow: 'visible'} : undefined}>
              {/* Group Header — editable when 2+ groups, non-first gets minus button */}
              {/* 묶음 헤더 박스 롱프레스 → 위/아래 이동 메뉴 (묶음 2개 이상일 때만 의미) */}
              <View style={{position: 'relative', zIndex: (stepGroupMenu === group.id || stepAddMenu === group.id) ? 9999 : undefined}}>
              <Pressable
                onLongPress={stepGroups.length >= 2 ? () => { triggerHaptic('light'); setStepGroupMenu(group.id); } : undefined}
                delayLongPress={300}>
              {stepGroups.length >= 2 ? (
                <ListItem
                  // 모든 묶음이 같은 아이콘 버튼 — 탭하면 이동/삭제 메뉴.
                  // 예전엔 두 번째 묶음부터 '-' 버튼이라 조작이 갈렸다.
                  leading={{type: 'iconButton', icon: IconProcess,
                    onPress: () => setStepGroupMenu(group.id), variant: 'ghost-secondary'}}
                  // 재료·도구 헤더와 같은 + 버튼. 누르면 아래에 "과정 추가 / 묶음 추가" 메뉴.
                  trailing={{type: 'iconButton', icon: IconPlusCircleFilled,
                    onPress: () => setStepAddMenu(group.id), variant: 'ghost-secondary'}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>{t('recipeEdit.stepsLabel')}</Text>
                    <IconChevronRight width={8} height={8} color={colors['foreground/on-surface-var']} />
                    <AutoGrowInput
                      style={[styles.cardFieldInput, noOutline]}
                      value={group.title}
                      onChangeText={v => updateStepGroupTitle(group.id, v)}
                      placeholder={t('recipeEdit.groupNamePlaceholder')}
                    />
                  </View>
                </ListItem>
              ) : (
                <ListItem
                  // 묶음이 하나면 이동할 곳이 없으므로, 아이콘 버튼엔 추가 메뉴를 붙인다
                  leading={{type: 'iconButton', icon: IconProcess,
                    onPress: () => setStepAddMenu(group.id), variant: 'ghost-secondary'}}
                  trailing={{type: 'custom', element: (
                    <View style={styles.toolHeaderTrailing}>
                      {group.bulkMode && (
                        <Tooltip
                          message={t('recipeEdit.bulkHelpSteps')}
                          visible={bulkHelpFor === group.id}
                          onClose={() => setBulkHelpFor(null)}>
                          <IconButton
                            icon={IconCircleAlert}
                            size="small"
                            variant="ghost-secondary"
                            onPress={() => setBulkHelpFor(bulkHelpFor === group.id ? null : group.id)}
                          />
                        </Tooltip>
                      )}
                      {/* 묶음마다 개별 "한번에 쓰기" 토글 (재료·도구와 동일) */}
                      <Switch
                        label={t('recipeEdit.bulkWrite')}
                        value={group.bulkMode}
                        onValueChange={(v) => {
                          if (!v) {
                            // 한번에 쓰기 해제: 줄 단위로 파싱해 개별 과정으로 변환
                            const descs = bulkTextToStepDescriptions(group.bulkText);
                            setStepGroups(p => p.map(g => g.id === group.id
                              ? {...g, bulkMode: false, steps: descs.length > 0
                                  ? descs.map(description => ({id: genId(), description}))
                                  : [{id: genId(), description: ''}]}
                              : g));
                          } else {
                            // 한번에 쓰기 진입: 기존 과정 설명을 줄바꿈 텍스트로 직렬화
                            setStepGroups(p => p.map(g => g.id === group.id
                              ? {...g, bulkMode: true, bulkText: stepsToBulkText(group.steps)}
                              : g));
                          }
                        }}
                      />
                      {/* 맨 위 추가 버튼 제거 — 행 드래그 핸들 롱프레스 메뉴의
                          "위에 추가 / 아래에 추가"로 대체됐다 */}
                    </View>
                  )}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>{t('recipeEdit.stepsLabel')}</Text>
                  </View>
                </ListItem>
              )}
              </Pressable>
              <Menu
                items={[
                  {id: 'step', label: t('recipeEdit.addItem')},
                  {id: 'group', label: t('recipeEdit.addGroup')},
                ]}
                visible={stepAddMenu === group.id}
                onSelect={(id) => {
                  if (id === 'step') {
                    const newId = addStep(group.id);
                    setTimeout(() => rowInputRefs.current[newId]?.focus(), 50);
                  } else {
                    insertStepGroupAbove(group.id);
                  }
                  setStepAddMenu(null);
                }}
                onClose={() => setStepAddMenu(null)}
                style={styles.anchoredMenuRight}
              />
              <Menu
                items={[
                  {id: 'up', label: t('recipeEdit.moveGroupUp'), disabled: groupIndex === 0},
                  {id: 'down', label: t('recipeEdit.moveGroupDown'), disabled: groupIndex === stepGroups.length - 1},
                  // 마지막 묶음은 지우면 과정이 통째로 사라지므로 막는다
                  {id: 'delete', label: t('recipeEdit.deleteGroup'), destructive: true, disabled: stepGroups.length <= 1},
                ]}
                visible={stepGroupMenu === group.id}
                onSelect={(id) => {
                  if (id === 'delete') removeStepGroup(group.id);
                  else moveStepGroup(group.id, id === 'up' ? -1 : 1);
                  setStepGroupMenu(null);
                }}
                onClose={() => setStepGroupMenu(null)}
                style={styles.anchoredMenuLeft}
              />
              </View>

              {/* Steps — 한번에 쓰기 모드면 줄바꿈 구분 일괄 입력 */}
              {group.bulkMode ? (
                <View style={styles.bulkToolInput}>
                  <AutoGrowInput
                    ref={(node: any) => { sectionInputRefs.current['steps'] = node; }}
                    style={[styles.cardFieldInput, styles.bulkInput, noOutline, typing && typingField === 'steps' && isOcrTypingTarget(group.id, stepGroups[0]?.id) && !!group.bulkText && {color: 'transparent'}]}
                    placeholder={t('recipeEdit.stepsBulkPlaceholder')}
                    value={group.bulkText}
                    onChangeText={(v: string) => setStepGroups(p => p.map(g => g.id === group.id ? {...g, bulkText: v} : g))}
                    onFocus={(e) => handleFieldFocus('steps', e.nativeEvent)}
                    onBlur={handleFieldBlur}
                  />
                  {ocrLoading && focusedOcrField === 'steps' && (
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bulkToolInput]}>
                      <SkeletonLine lines={3} lineHeight={14} />
                    </View>
                  )}
                  {typing && typingField === 'steps' && isOcrTypingTarget(group.id, stepGroups[0]?.id) && !!group.bulkText && (
                    <BulkTypingOverlay
                      text={group.bulkText}
                      textStyle={styles.cardFieldInput}
                      containerStyle={styles.bulkToolInput}
                      onDone={finishTyping}
                    />
                  )}
                </View>
              ) : (
              <>
              {/* Steps */}
              <View style={styles.dragArea}>
                {group.steps.map((step, index) => {
                  const canDragStep = !!step.description.trim();
                  const canDeleteStep = group.steps.length > 1 || canDragStep;
                  const globalIndex = flatSteps.findIndex(f => f.id === step.id);
                  const responder = canDragStep
                    ? drag.createDragHandlers(
                        step.id,
                        globalIndex,
                        flatSteps,
                        reorderStepsGlobal,
                      )
                    : null;
                  const isDragging = drag.draggingId === step.id;
                  const highlightAnim = getDropHighlight(step.id);
                  return (
                    <View
                      key={step.id}
                      ref={drag.createItemRef(step.id)}
                      onLayout={e => {
                        drag.handleItemLayout(step.id)();
                        // 상세에서 특정 과정을 눌러 들어왔을 때 그 줄로 스크롤하기 위해
                        // 화면 기준 y를 기록해 둔다(과정 섹션 시작 + 행의 상대 y).
                        const sectionY = sectionPositions.current['steps'] ?? 0;
                        stepRowY.current[step.id] = sectionY + e.nativeEvent.layout.y;
                      }}
                      style={
                        stepRowMenu?.stepId === step.id
                          ? {zIndex: 9999}
                          : isDragging ? {zIndex: 10} : undefined
                      }>
                    <Animated.View
                      style={[
                        isDragging ? {transform: [{translateY: drag.dragY}], opacity: 0.85} : undefined,
                        {
                          borderBottomWidth: highlightAnim.interpolate({inputRange: [-1, 0, 1], outputRange: [0, 0, 2]}),
                          borderBottomColor: colors['custom/yellow'],
                          borderTopWidth: highlightAnim.interpolate({inputRange: [-1, 0, 1], outputRange: [2, 0, 0]}),
                          borderTopColor: colors['custom/yellow'],
                        },
                      ]}>
                      <ListItem
                        leading={{
                          type: 'custom',
                          element: (
                            <DragHandle
                              responder={responder}
                              enabled={canDragStep}
                              onPress={() => { triggerHaptic('light'); setStepRowMenu({groupId: group.id, stepId: step.id}); }}
                            />
                          ),
                        }}
                        trailing={{
                          type: 'iconButton',
                          icon: IconMinusCircleFilled,
                          onPress: canDeleteStep ? () => removeStep(group.id, step.id) : undefined,
                          disabled: !canDeleteStep,
                          variant: 'ghost-secondary',
                        }}
                        titleNumberOfLines={0}
                        showDivider={index < group.steps.length - 1}>
                        <RichEditor
                          ref={(node: any) => {
                            rowInputRefs.current[step.id] = node;
                            if (groupIndex === 0 && index === 0) sectionInputRefs.current['steps'] = node;
                          }}
                          style={styles.cardFieldInput}
                          placeholder={t('recipeEdit.stepDescriptionPlaceholder')}
                          value={step.description}
                          onChangeText={v => { updateStep(group.id, step.id, v); }}
                          onFocus={() => { handleFieldFocus('steps'); setFocusedStep({groupId: group.id, stepId: step.id}); }}
                          onBlur={handleFieldBlur}
                          // 엔터 = 다음 과정 행. 모바일엔 Shift+Enter가 없어
                          // 줄바꿈보다 "다음 과정으로 넘어가기"를 우선한다.
                          onSubmit={(rest) => {
                            // 문단 중간이면 커서 뒤 글자를 새 과정으로 가져간다
                            const newId = addStep(group.id, 'bottom', step.id, rest ?? '');
                            // 넘어온 글자가 있으면 그 맨 앞에 커서
                            setTimeout(() => (rowInputRefs.current[newId] as any)?.focus?.(0), 50);
                          }}
                          // 커서가 맨 앞일 때 백스페이스 → 이전 행과 병합
                          // (엔터로 잘못 나눈 걸 되돌리는 가장 자연스러운 조작)
                          onBackspaceAtStart={() => {
                            const prev = group.steps[index - 1];
                            if (!prev) return; // 첫 행은 병합할 대상이 없다
                            const mergedAt = prev.description.length;
                            setStepGroups(p => p.map(g => g.id !== group.id ? g : {
                              ...g,
                              steps: g.steps
                                .map(s => s.id === prev.id
                                  ? {...s, description: s.description + step.description}
                                  : s)
                                .filter(s => s.id !== step.id),
                            }));
                            // 이전 행으로 포커스 이동 + 병합 지점에 커서
                            // RichEditor.focus(caret) — ref 맵 타입은 RN TextInput 기준이라 캐스팅한다
                            setTimeout(() => (rowInputRefs.current[prev.id] as any)?.focus(mergedAt), 50);
                          }}
                          onSelectionChange={(sel, srcValue) => {
                            stepSelRef.current[step.id] = sel;
                            // 툴바 링크 버튼이 볼 대상 — 저장값(마크다운) 기준으로 넘긴다
                            linkCtx?.report({
                              getValue: () => srcValue,
                              setValue: (v: string) => updateStep(group.id, step.id, v),
                              selection: sel,
                            });
                          }}
                          onLinkTap={info => {
                            // 링크 태그를 누르면 URL·표시 텍스트 편집 다이얼로그
                            applyLinkRef.current = (url, label) => {
                              const src = step.description;
                              const range = expandToLink(src, {start: info.start, end: info.end});
                              updateStep(group.id, step.id, applyLink(src, range, url, label));
                            };
                            setLinkDialog({initial: info.url, label: info.label});
                          }}
                        />
                        {/* 슬래시/칩추가 메뉴는 이제 키보드 툴바 하위 뎁스(subView)로 통일 (인라인 제거) */}
                        {step.tip != null && (
                          <View style={styles.tipChipInline}>
                            <EditableChip
                              label={step.tip}
                              variant="tip"
                              onChangeText={v => updateStepTip(group.id, step.id, v)}
                              onRemove={() => removeStepTip(group.id, step.id)}
                            />
                          </View>
                        )}
                        {step.caution != null && (
                          <View style={styles.tipChipInline}>
                            <EditableChip
                              label={step.caution}
                              variant="yellow"
                              placeholder={t('recipeEdit.cautionPlaceholder')}
                              onChangeText={v => updateStepCaution(group.id, step.id, v)}
                              onRemove={() => removeStepCaution(group.id, step.id)}
                            />
                          </View>
                        )}
                        {step.photos && step.photos.length > 0 && (
                          <StepPhotos
                            photos={step.photos}
                            mode="edit"
                            onCaptionChange={(pi, caption) => {
                              setStepGroups(prev => prev.map(g =>
                                g.id === group.id
                                  ? {...g, steps: g.steps.map(s =>
                                      s.id === step.id
                                        ? {...s, photos: s.photos?.map((p, i) => i === pi ? {...p, caption: caption || undefined} : p)}
                                        : s,
                                    )}
                                  : g,
                              ));
                            }}
                            onRemove={(pi) => {
                              setStepGroups(prev => prev.map(g =>
                                g.id === group.id
                                  ? {...g, steps: g.steps.map(s =>
                                      s.id === step.id
                                        ? {...s, photos: s.photos?.filter((_, i) => i !== pi)}
                                        : s,
                                    )}
                                  : g,
                              ));
                            }}
                            onReplace={async (pi) => {
                              const ok = await ensureImagePermission('mediaLibrary', {
                                deniedMessage: t('recipeEdit.photoPermissionNeeded'),
                                showSnackbar,
                                settingsTitle: t('permission.photoTitle'),
                                settingsBody: t('permission.photoBody'),
                                settingsConfirmLabel: t('permission.openSettings'),
                                settingsCancelLabel: t('permission.cancel'),
                              });
                              if (!ok) return;
                              const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.8, base64: Platform.OS === 'web'});
                              if (result.canceled || !result.assets[0]) return;
                              const uri = await getPersistentUri(result.assets[0].uri, result.assets[0].base64);
                              setStepGroups(prev => prev.map(g =>
                                g.id === group.id
                                  ? {...g, steps: g.steps.map(s =>
                                      s.id === step.id
                                        ? {...s, photos: s.photos?.map((p, i) => i === pi ? {...p, uri} : p)}
                                        : s,
                                    )}
                                  : g,
                              ));
                            }}
                          />
                        )}
                      </ListItem>
                    </Animated.View>
                    {/* 행 롱프레스 메뉴 — 여기서 나누기(묶음 만들기), 위/아래 행 추가 */}
                    <Menu
                      items={[
                        // 첫 줄은 위로 나눌 게 없다. (이 행은 새 묶음의 첫 과정으로
                        // 남으므로 빈 줄이어도 나눌 수 있다 — 제목으로 쓰지 않는다)
                        // 나눌 수 없으면 비활성으로 두지 않고 아예 감춘다.
                        ...(index > 0
                          ? [{id: 'split', label: t('recipeEdit.splitGroupHere')}]
                          : []),
                        {id: 'addAbove', label: t('recipeEdit.addStepAbove')},
                        {id: 'addBelow', label: t('recipeEdit.addStepBelow')},
                      ]}
                      visible={stepRowMenu?.stepId === step.id}
                      onSelect={(id) => {
                        if (id === 'split') splitStepGroupAt(group.id, step.id);
                        else if (id === 'addAbove') {
                          const prevId = group.steps[index - 1]?.id;
                          const newId = addStep(group.id, prevId ? 'bottom' : 'top', prevId);
                          setTimeout(() => rowInputRefs.current[newId]?.focus(), 50);
                        } else if (id === 'addBelow') {
                          const newId = addStep(group.id, 'bottom', step.id);
                          setTimeout(() => rowInputRefs.current[newId]?.focus(), 50);
                        }
                        setStepRowMenu(null);
                      }}
                      onClose={() => setStepRowMenu(null)}
                      style={styles.anchoredMenuLeft}
                    />
                    </View>
                  );
                })}
              </View>

              {/* Add step / Add step group buttons */}
              <View style={styles.addButtonRow}>
                <View style={styles.addButtonDivider}>
                  <View style={styles.divider} />
                </View>
                <View style={styles.addButtonPair}>
                  <Pressable style={styles.addGroupButton} onPress={() => { triggerHaptic('light'); addStepGroup(group.id); }}>
                    <Text style={styles.addGroupText}>{t('recipeEdit.addGroup')}</Text>
                  </Pressable>
                  <View style={styles.addButtonVDivider} />
                  <Pressable style={styles.addGroupButton} onPress={() => { triggerHaptic('light'); addStep(group.id, 'bottom'); }}>
                    <Text style={styles.addGroupText}>{t('recipeEdit.addItem')}</Text>
                  </Pressable>
                </View>
              </View>
              </>
              )}
            </Card>
          </ContentContainer>
        );})}

        </View>

        {/* Navigation Items */}
        {isFieldActive('cookbook') && (
          <ContentContainer style={styles.section}>
            <Card>
              <ListItem
                title={t('recipeEdit.cookbook')}
                leading={{type: 'custom', element: (
                  <View style={styles.cookbookLeadingSlot}>
                    {React.createElement(isExplore ? IconExprolerBookFilled : IconBookFilled, {
                      width: 20,
                      height: 20,
                      color: cookbook
                        ? colors[getColorVarKey(cookbookColorsProp?.[cookbook] || (isExplore ? 'orange' : 'brown'))]
                        : colors['foreground/on-surface-muted'],
                    })}
                  </View>
                )}}
                trailing={{type: 'custom', element: (
                  <View style={styles.cookbookTrailing}>
                    {cookbook ? <Text style={styles.cookbookValue}>{cookbook}</Text> : null}
                    <IconChevronRight width={16} height={16} color={colors['foreground/on-surface-muted']} />
                  </View>
                )}}
                onPress={handleCookbookPress}
                showDivider={false}
              />
            </Card>
          </ContentContainer>
        )}
        {/* 조언은 모든 레시피에서 사용 — 필드 추가 다이얼로그도 전체에 노출하므로
            여기서 isExplore로 막으면 "추가했는데 안 뜨는" 불일치가 생긴다 */}
        {isFieldActive('advice') && (
          <View onLayout={e => { sectionPositions.current['advice'] = e.nativeEvent.layout.y; }}>
          <ContentContainer style={isFieldActive('cookbook') ? styles.navItemGap : styles.section}>
            <Card variant="yellow">
              <ListItem
                title={t('recipeEdit.bakeyAdvice')}
                leading={{type: 'icon', icon: IconLogoSymbol}}
              />
              <ListItem showDivider={false}>
                <TextInput
                  ref={(node: any) => { sectionInputRefs.current['advice'] = node; }}
                  style="ghost"
                  variant="yellow"
                  multiline
                  value={advice}
                  onChangeText={setAdvice}
                  placeholder={t('recipeEdit.bakeyAdvicePlaceholder')}
                />
              </ListItem>
            </Card>
          </ContentContainer>
          </View>
        )}
        {isFieldActive('review') && (
          <View onLayout={e => { sectionPositions.current['review'] = e.nativeEvent.layout.y; }}>
          <ContentContainer style={(isFieldActive('cookbook') || isFieldActive('advice')) ? styles.navItemGap : styles.section}>
            <Card>
              <ListItem
                title={t('recipeEdit.review')}
                leading={{type: 'icon', icon: IconChartNoAxesGantt}}
              />
              <ListItem showDivider>
                <TextInput
                  ref={(node: any) => { sectionInputRefs.current['review'] = node; }}
                  style="ghost"
                  multiline
                  value={reviews.length > 0 ? reviews[reviews.length - 1].evaluation : ''}
                  onChangeText={text => {
                    setReviews(prev => {
                      if (prev.length === 0) return [{evaluation: text, improvement: ''}];
                      const updated = [...prev];
                      updated[updated.length - 1] = {...updated[updated.length - 1], evaluation: text};
                      return updated;
                    });
                  }}
                  placeholder={t('recipeEdit.reviewEvaluationPlaceholder')}
                />
              </ListItem>
              <ListItem
                leading={{type: 'icon', icon: IconCornerDownRight}}
                showDivider={false}
              >
                <TextInput
                  style="ghost"
                  multiline
                  value={reviews.length > 0 ? reviews[reviews.length - 1].improvement : ''}
                  onChangeText={text => {
                    setReviews(prev => {
                      if (prev.length === 0) return [{evaluation: '', improvement: text}];
                      const updated = [...prev];
                      updated[updated.length - 1] = {...updated[updated.length - 1], improvement: text};
                      return updated;
                    });
                  }}
                  placeholder={t('recipeEdit.reviewImprovementPlaceholder')}
                />
              </ListItem>
            </Card>
          </ContentContainer>
          </View>
        )}
        <ContentContainer style={styles.navItemGap}>
          <Card>
            <ListItem
              title={t('recipeEdit.fieldManageNav')}
              leading={{type: 'icon', icon: IconSettingsFilled}}
              trailing={{type: 'icon', icon: IconChevronRight}}
              showDivider={false}
              onPress={() => setFieldManageVisible(true)}
            />
          </Card>
        </ContentContainer>

        {/* Bottom Padding */}
        <View style={{height: Spacing.xxl + insets.bottom}} />
      </ScrollView>

      {/* Overlay for Menu */}
      {showMenu && (
        <Pressable
          style={styles.overlay}
          onPress={handleOverlayPress}
        />
      )}

      {/* 사진 선택 메뉴는 photoTileWrap 내부로 이동됨 */}

      {/* 레시피 북 선택 바텀시트 */}
      <CookbookSelectSheet
        visible={showCookbookMenu}
        onClose={() => { setShowCookbookMenu(false); setCookbookOverflowTarget(null); }}
        cookbooks={allCookbooks}
        cookbookColors={cookbookColorsProp}
        selectedCookbook={cookbook}
        onSelect={handleCookbookSelect}
        onAddCookbook={(name, color) => {
          setLocalCookbooks(prev => [...prev, name]);
          setCookbook(name);
          onSetCookbookColor?.(name, color);
        }}
        bookIcon={isExplore ? IconExprolerBookFilled : IconBookFilled}
        initialOfficial={isExplore}
        renderItemTrailing={(name) => (
          <IconButton
            icon={IconEllipsisVertical}
            size="small"
            variant="ghost"
            onPress={() => handleCookbookOverflow(name)}
          />
        )}
        onItemLayout={(name, e) => {
          cookbookItemLayouts.current[name] = {
            y: e.nativeEvent.layout.y,
            height: e.nativeEvent.layout.height,
          };
        }}
      >
        {cookbookOverflowTarget && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCookbookOverflowTarget(null)} />
        )}
        {cookbookOverflowTarget && (
          <Menu
            items={COOKBOOK_SHEET_MENU_ITEMS}
            visible={!!cookbookOverflowTarget}
            onSelect={handleCookbookOverflowSelect}
            onClose={() => setCookbookOverflowTarget(null)}
            style={{position: 'absolute', top: cookbookMenuPos.top, right: cookbookMenuPos.right, zIndex: 50}}
          />
        )}
      </CookbookSelectSheet>


      {/* 저장 안 하고 닫기 — X 버튼 아래 팝오버(저장/버리기 버튼) */}
      <Popover
        visible={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        style={{
          position: 'absolute',
          // 측정값(화면 절대좌표)이 있으면 X 버튼 바로 아래에, 없으면 기존 추정치로 폴백
          top: closeBtnRect
            ? closeBtnRect.y + closeBtnRect.height + 8
            : insets.top + NAV_PILL_HEIGHT + 8,
          left: closeBtnRect ? closeBtnRect.x : contentLeftEdge,
          zIndex: 100,
        }}
      >
        <View style={{gap: Spacing.xs}}>
          <Button
            label={t('recipeEdit.discardConfirm')}
            variant="soft"
            size="medium"
            shape="square"
            destructive
            onPress={() => { setShowDiscardConfirm(false); onClose?.(); }}
          />
          <Button
            label={t('recipeEdit.saveAndClose')}
            variant="soft"
            size="medium"
            shape="square"
            disabled={!canSave}
            onPress={() => { setShowDiscardConfirm(false); handleSave(); }}
          />
        </View>
      </Popover>

      {/* 필드관리 다이얼로그 */}
      <FieldManageDialog
        visible={fieldManageVisible}
        onClose={() => setFieldManageVisible(false)}
        activeFieldIds={activeFieldIds}
        onConfirm={setActiveFieldIds}
        isExplore={isExplore}
      />

      {/* 시간 다이얼로그 */}
      <TimeDialog
        visible={showTimeDialog}
        onClose={() => setShowTimeDialog(false)}
        value={time}
        onConfirm={setTime}
      />

      {/* 링크 입력 — 모든 플랫폼 공통 (웹 window.prompt는 차단·모양 제각각) */}
      <LinkInputDialog
        visible={!!linkDialog}
        initialUrl={linkDialog?.initial ?? ''}
        onClose={() => setLinkDialog(null)}
        initialLabel={linkDialog?.label ?? ''}
        onConfirm={(url, label) => { setLinkDialog(null); applyLinkRef.current?.(url, label); }}
      />

      {/* 분량 다이얼로그 */}
      <ServingsDialog
        visible={showServingsDialog}
        onClose={() => setShowServingsDialog(false)}
        value={servings}
        onConfirm={setServings}
      />

      {/* 재료 용량 다이얼로그 */}
      <IngredientAmountDialog
        visible={amountDialogTarget !== null}
        onClose={() => setAmountDialogTarget(null)}
        amount={(() => {
          if (!amountDialogTarget) return '';
          const g = ingredientGroups.find(g => g.id === amountDialogTarget.groupId);
          const i = g?.ingredients.find(i => i.id === amountDialogTarget.ingredientId);
          return i?.amount ?? '';
        })()}
        unit={(() => {
          if (!amountDialogTarget) return 'g';
          const g = ingredientGroups.find(g => g.id === amountDialogTarget.groupId);
          const i = g?.ingredients.find(i => i.id === amountDialogTarget.ingredientId);
          return i?.unit ?? 'g';
        })()}
        onConfirm={(amount, unit) => {
          if (amountDialogTarget) {
            updateIngredientAmount(amountDialogTarget.groupId, amountDialogTarget.ingredientId, amount, unit);
          }
        }}
      />

      {/* Fixed Top Navigation Bar */}
      <FloatingNavBar
        left={
          // 팝오버를 이 버튼 아래에 정확히 붙이기 위해 실제 위치를 측정한다
          // (하드코딩한 top/left는 노치·화면폭에 따라 어긋났다)
          <View
            ref={closeBtnViewRef}
            // onLayout은 부모 기준 좌표라 화면 절대 위치가 필요하면 measureInWindow를 쓴다
            onLayout={() => {
              closeBtnViewRef.current?.measureInWindow((x, y, _w, height) => {
                setCloseBtnRect({x, y, height});
              });
            }}>
            <NavPillButton icon={IconClose} onPress={requestClose} />
          </View>
        }
        rightMenu={
          <Menu
            items={EDIT_MENU_ITEMS}
            onSelect={handleMenuSelect}
            visible={showMenu}
          />
        }
        right={
          <>
            {/* 비공개(공식 레시피 어드민 전용) — 플로팅 박스 없이 라벨 + 스위치만, 오버플로우 메뉴 옆 */}
            {isExplore && (
              <View style={styles.hiddenInline}>
                <Text style={styles.hiddenLabel} numberOfLines={1}>{t('recipeEdit.hidden')}</Text>
                <Switch value={hidden} onValueChange={setHidden} />
              </View>
            )}
            <GlassContainer contentStyle={navPillStyle}>
              <IconButton
                icon={IconEllipsisVertical}
                onPress={handleMenuPress}
                variant="ghost-primary"
                size="medium"
                forcePressed={showMenu}
              />
            </GlassContainer>
            <GlassContainer>
              <IconButton
                icon={IconTick}
                disabled={!canSave}
                loading={saving}
                onPress={handleSave}
              variant="filled"
              size="large"
            />
            </GlassContainer>
          </>
        }
      />

      {/* OCR/음성 인식 툴바 — 키보드가 올라와 있으면 그냥 표시 (필드마다 나왔다 안 나왔다 안 함).
          현재 필드가 OCR 대상(제목·재료·도구·과정)이 아니면 OCR/영역이동/칩 버튼만 disabled.
          - 네이티브: keyboardVisible 기준 / 웹: focus 기준(키보드 이벤트 없음). 픽/크롭 중(ocrPickActive)엔 유지 */}
      {(() => {
        // 현재 포커스가 OCR 대상 필드인지 (아니면 OCR 기능 비활성)
        const isOcrField = !!focusedOcrField;
        // 영역이동(◀▶): 활성화된 입력 구역을 순서대로 이동
        const OCR_FIELD_ORDER: RecipeOcrField[] = ['title', 'ingredients', 'tools', 'steps'];
        const navFields = OCR_FIELD_ORDER.filter(f => f === 'title' || isFieldActive(f));
        // blur되면 focusedOcrField가 null이 되는데, 툴바 버튼을 누르는 순간이
        // 바로 그 blur 시점이라 그대로 두면 ◀▶가 항상 비활성이 된다.
        // 마지막으로 포커스했던 필드(ocrFieldRef)를 폴백으로 쓴다.
        const navCurrent = focusedOcrField ?? ocrFieldRef.current;
        const curIdx = navCurrent ? navFields.indexOf(navCurrent) : -1;
        const focusField = (f: RecipeOcrField) => {
          // 예약된 blur가 새 포커스를 지우지 않도록 취소한다
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          sectionInputRefs.current[f]?.focus();
          setFocusedOcrField(f);
          ocrFieldRef.current = f;
        };
        const canPrev = curIdx > 0;
        const canNext = curIdx >= 0 && curIdx < navFields.length - 1;
        // 칩 추가(+): 포커스된 과정에 팁/주의/사진 여유가 있을 때만 활성
        let stepHasRoom = false;
        if (focusedStep) {
          const g = stepGroups.find(gg => gg.id === focusedStep.groupId);
          const s = g?.steps.find(ss => ss.id === focusedStep.stepId);
          if (s) stepHasRoom = s.tip == null || s.caution == null || (s.photos?.length ?? 0) < 3;
        }
        const canAddChip = focusedOcrField === 'steps' && stepHasRoom;
        // 묶음 나누기: 커서가 있는 과정 줄을 새 그룹의 제목(과정명)으로 올리고,
        // 그 아래 과정들을 새 그룹으로 옮긴다. 해당 줄 자체는 제목이 되므로 목록에서 빠진다.
        const canGroupSplit = focusedOcrField === 'steps' && !!focusedStep && (() => {
          const g = stepGroups.find(gg => gg.id === focusedStep.groupId);
          const s = g?.steps.find(ss => ss.id === focusedStep.stepId);
          // 첫 줄이면 나눌 게 없고, 내용이 없으면 제목으로 쓸 수 없다
          return !!s?.description.trim() && (g?.steps.findIndex(ss => ss.id === focusedStep.stepId) ?? 0) > 0;
        })();
        // 선택한 텍스트에 링크 — 모든 플랫폼 공통 다이얼로그
        const handleLink = () => {
          // 다이얼로그가 열리면 입력이 blur되어 targetRef가 비워진다.
          // 그래서 "버튼을 누른 시점"의 대상과 선택 구간을 여기서 붙잡아 둔다.
          const tgt = linkCtx?.targetRef.current;
          const captured = tgt
            ? {value: tgt.getValue(), setValue: tgt.setValue, selection: tgt.selection}
            : null;
          const existing = captured
            ? (expandToLink(captured.value, captured.selection).url ?? '')
            : '';

          applyLinkRef.current = (url: string, label: string) => {
            if (!captured) return;
            // 링크 안을 선택했으면 링크 전체를 대상으로 (표시 텍스트만 골라도 수정되게)
            const range = expandToLink(captured.value, captured.selection);
            captured.setValue(applyLink(captured.value, range, url, label));
          };
          setLinkDialog({
            initial: existing,
            label: captured
              ? stripRichText(captured.value.slice(
                  expandToLink(captured.value, captured.selection).start,
                  expandToLink(captured.value, captured.selection).end,
                ))
              : '',
          });
        };
        const handleGroupSplit = () => {
          if (!focusedStep) return;
          splitStepGroupAt(focusedStep.groupId, focusedStep.stepId);
        };
        // 칩추가(+) 툴바 뎁스: slashMenu 열리면 [←][사진][팁][주의] (여유 있는 것만)
        const chipSubView = slashMenu ? (() => {
          const g = stepGroups.find(gg => gg.id === slashMenu.groupId);
          const s = g?.steps.find(ss => ss.id === slashMenu.stepId);
          const actions = SLASH_MENU_ITEMS
            .filter(item =>
              (item.id === 'camera' || item.id === 'gallery') ? (s?.photos?.length ?? 0) < 3
              : item.id === 'tip' ? s?.tip == null
              : item.id === 'caution' ? s?.caution == null
              : true,
            )
            .map(item => ({
              label: item.label,
              icon: item.icon as any,
              onPress: () => handleSlashMenuSelect(item.id),
            }));
          return {onBack: () => setSlashMenu(null), actions};
        })() : null;
        return (
        <RecipeInputFloatingBar
          field={focusedOcrField ?? ocrFieldRef.current ?? 'title'}
          ocrDisabled={!isOcrField}
          onPrevField={() => { if (canPrev) focusField(navFields[curIdx - 1]); }}
          onNextField={() => { if (canNext) focusField(navFields[curIdx + 1]); }}
          canPrev={canPrev}
          canNext={canNext}
          onAddChip={() => { if (focusedStep) setSlashMenu(focusedStep); }}
          canAddChip={canAddChip}
          onUndo={history.undo}
          canUndo={history.canUndo}
          onRedo={history.redo}
          canRedo={history.canRedo}
          onGroupSplit={handleGroupSplit}
          canGroupSplit={canGroupSplit}
          onLink={handleLink}
          canLink={isOcrField}
          subView={chipSubView}
          onDone={handleSave}
          onOcrStart={() => setOcrLoading(true)}
          onOcrEnd={() => setOcrLoading(false)}
          externalBusy={typing || ocrLoading}
          onStop={stopTyping}
          onRecognized={(value, field) => {
            if (field === 'title' && typeof value === 'string' && value.trim()) {
              typewriteString(value.trim().replace(/\s+/g, ' '), setTitle, 'title');
            } else if (field === 'ingredients' && Array.isArray(value)) {
              const cleaned = value.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
              if (cleaned.length === 0) return;
              // OCR 대상 그룹: 마지막 포커스한 그룹, 없으면 첫 그룹.
              const targetId = ocrBulkGroupId ?? ingredientGroups[0]?.id;
              if (!targetId) return;
              const target = ingredientGroups.find(g => g.id === targetId);
              if (!target) return;
              setOcrBulkGroupId(targetId);

              if (!target.bulkMode) {
                // 폼 모드는 그대로 둔다 — OCR 한 번에 "한번에 쓰기"로 바뀌면
                // 사용자가 쓰던 방식이 예고 없이 뒤집힌다. 개별 행으로 채운다.
                const parsed = bulkTextToIngredients(cleaned.join(', '));
                setIngredientGroups(p => p.map(g => g.id !== targetId ? g : {
                  ...g,
                  ingredients: [
                    // 빈 행은 걷어내고 이어붙인다
                    ...g.ingredients.filter(i => i.name.trim()),
                    ...parsed.map(i => ({id: genId(), name: i.name, amount: i.amount, unit: i.unit})),
                  ],
                }));
                return;
              }

              const existing = target.bulkText.trim();
              const prefix = existing ? existing + ', ' : '';
              // 그룹 bulkText setter
              const setGroupBulk = (v: string) => setIngredientGroups(p => p.map(g => g.id === targetId ? {...g, bulkText: v} : g));
              typewriteAppendItems(cleaned, prefix, setGroupBulk, 'ingredients');
            } else if (field === 'tools' && Array.isArray(value)) {
              const cleaned = value.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
              if (cleaned.length === 0) return;
              // 재료와 동일 — 포커스된 묶음(없으면 첫 묶음)에 넣는다. 모드는 유지한다.
              const targetId = ocrBulkGroupId ?? toolGroups[0]?.id;
              const target = toolGroups.find(g => g.id === targetId);
              if (!target) return;
              setOcrBulkGroupId(targetId);

              if (!target.bulkMode) {
                // 폼 모드 유지 — 개별 행으로 채운다
                setToolGroups(p => p.map(g => g.id !== targetId ? g : {
                  ...g,
                  tools: [
                    ...g.tools.filter(x => x.name.trim()),
                    ...cleaned.map(name => ({id: genId(), name})),
                  ],
                }));
                return;
              }

              const existing = target.bulkText.trim();
              const prefix = existing ? existing + ', ' : '';
              const setGroupBulk = (v: string) => setToolGroups(p => p.map(g => g.id === targetId ? {...g, bulkText: v} : g));
              typewriteAppendItems(cleaned, prefix, setGroupBulk, 'tools');
            } else if (field === 'steps' && Array.isArray(value)) {
              const cleaned = value.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
              if (cleaned.length === 0) return;
              // 한번에 쓰기 묶음이면 줄바꿈으로 이어붙이고, 아니면 기존 청크 애니메이션
              const targetId = ocrBulkGroupId ?? stepGroups[0]?.id;
              const target = stepGroups.find(g => g.id === targetId);
              if (target?.bulkMode) {
                setOcrBulkGroupId(targetId);
                const existing = target.bulkText.trim();
                const prefix = existing ? existing + '\n' : '';
                const setGroupBulk = (v: string) => setStepGroups(p => p.map(g => g.id === targetId ? {...g, bulkText: v} : g));
                typewriteAppendItems(cleaned, prefix, setGroupBulk, 'steps', '\n');
              } else {
                typewriteSteps(cleaned);
              }
            }
          }}
        />
        );
      })()}

      {/* 상단 이미지 전체보기 — 스와이프로 넘기고, 여기서 교체·삭제까지 한다 */}
      <PhotoViewer
        photos={heroUris.map(uri => ({uri}))}
        index={heroViewerIndex}
        onIndexChange={setHeroViewerIndex}
        onClose={() => setHeroViewerIndex(null)}
        onReplace={() => {
          const idx = heroViewerIndex;
          if (idx === null) return;
          setHeroViewerIndex(null);
          // 대표(0번)를 교체하면 대표가, 추가분이면 그 자리가 바뀐다
          if (idx === 0) pickImage('gallery');
          else replaceExtraHeroAt(idx - 1);
        }}
        onDelete={() => { if (heroViewerIndex !== null) removeHeroAt(heroViewerIndex); }}
      />
    </View>
  );
}

// ---- Styles ----

