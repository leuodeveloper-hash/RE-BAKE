import {shortDate} from '@utils/dateLabel';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {Dimensions, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppBar} from '@components/Navigation';
import {Breadcrumb} from '@components/Navigation/Breadcrumb';
import {ContentContainer, GlassContainer} from '@components/Container';
import {SectionHeader} from '@components/SectionHeader';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {PackCanvas, CookbookCarousel, GroupExpandOverlay, SessionFlow, type SessionFlowItem, type PackBoardItem, type PackOriginRect} from '@components/PackBoard';
import {Menu, type MenuItemData} from '@components/Menu';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import {useMadeStamps} from '@hooks/useMadeStamps';
import {recipePreviewParts} from '@utils/recipePreview';
import {ReviewDialog} from '@components/Dialog/ReviewDialog';
import {Tabs} from '@components/Tabs';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {ReviewLogSheet} from '@components/BottomSheet';
import {getCookbookColorKey} from '@components/ColorPicker';
import {PullIndicator, RefreshGap, usePullProgress} from '@components/PullIndicator';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {useColors} from '@contexts/ThemeContext';
import {useAddSheet} from '@contexts/AddSheetContext';
import {DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {Recipe} from '../types/recipe';
import {IconTrash, IconTrashTwotone, IconEdit, IconBookFilled, IconExprolerBookFilled, IconChartNoAxesGantt, IconChevronRight, IconCornerDownRight, IconGlobeFilled, IconSparkle, IconProcess, IconCards, IconCardsFilled, IconArrowDownToLine, IconList, IconClose} from '@components/Icon/IconIndex';
import {parseSession} from '@utils/session';
import {buildPaperPreview} from '@utils/recipePaperPreview';
import {coverCards, recipeCoverCards, emptyCoverCard} from '@utils/cookbookCards';
import {deriveBookAuthors} from '@utils/bookAuthors';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';
import {axisLabel, DEFAULT_AXES, useAxisMenuItems, type AxisOverrides, type GroupAxis} from '@components/RecipeGroups/groupAxis';
import {doc, writeBatch} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useSnackbar} from '@contexts/SnackbarContext';

// 축 정의는 공통 모듈(groupAxis)로 일원화 — 재노출(기존 import 경로 호환)
export type {GroupAxis};

// 레시피 없는 빈 레시피 북 표지 썸넬용 (no-recipe 일러스트)

export interface GroupScreenProps {
  recipes: Recipe[];
  cookbookColors: Record<string, AvatarColor>;
  /** 현재 그룹화 축 (홈이 소유, 'all'이면 홈이 평면 리스트를 그리므로 여기엔 cookbook/method/retrospective만 전달됨) */
  axis: GroupAxis;
  /** 축 변경 (드롭다운). 'all' 선택 시 홈이 평면 리스트로 전환 */
  onAxisChange: (axis: GroupAxis) => void;
  onComingSoon: () => void;
  onDeleteCookbook?: (name: string) => void;
  onCookbookPress?: (cookbookName: string) => void;
  /** 공법 행 탭 시 (홈을 해당 공법으로 필터) */
  onMethodPress?: (method: string) => void;
  /** 공법 축 AppBar ⓘ 탭 시 (공법 설명 페이지 이동) */
  onMethodGuidePress?: () => void;
  /** 둘러보기 레시피 (어드민 전용) */
  exploreRecipes?: Recipe[];
  /**
   * 회고 노트에만 더할 레시피 — 홈은 내 레시피북만 보여주지만, 둘러보기
   * 레시피에 내가 쓴 회고는 내 기록이라 회고 노트 목록에는 보여준다(회고 있는 것만 뽑힌다).
   * 복사하지 않는다 — 누르면 둘러보기 레시피로 간다.
   */
  retrospectiveExtraRecipes?: Recipe[];
  /** 둘러보기 레시피 북 목록 (Firestore explore_cookbooks) */
  exploreCookbooks?: ExploreCookbook[];
  /** 어드민 여부 */
  isAdmin?: boolean;
  /** 둘러보기 레시피 북 탭 시 콜백 */
  onExploreCookbookPress?: (cookbookName: string) => void;
  /** 둘러보기 레시피 북 삭제 콜백 (어드민 전용) */
  onDeleteExploreCookbook?: (name: string) => void;
  /** Pull-to-refresh 시 호출 */
  onRefresh?: () => Promise<void> | void;
  /** 레시피 상세 이동 */
  onRecipePress?: (recipeId: string) => void;
  /** 축 드롭다운에 노출할 축 목록 (기본: 전체/레시피북/공법/회고). 둘러보기는 회고 제외 */
  availableAxes?: GroupAxis[];
  /** 축별 라벨/아이콘 오버라이드 (둘러보기: cookbook → "공식 레시피북" + 로고 아이콘) */
  axisOverrides?: AxisOverrides;
  /** 상단 앱바 + 버튼 노출 (기본 true). 둘러보기(공식 북)에선 어드민만 true로 전달 */
  showAddButton?: boolean;
  /** 레시피 북 팩뷰를 센터 카드 캐러셀로 (홈 전용). 기본 false면 기존 흩뿌림 PackCanvas */
  bookCarousel?: boolean;
  /** 상단 + 로 레시피 북 추가 시 '공식 레시피 북' 토글 기본 ON (둘러보기 전용) */
  addAsOfficial?: boolean;
  /** 주 레시피 북 목록이 공식(explore) 북인지 (둘러보기 전용). true면 편집/삭제는 어드민만 + explore 경로로 처리 */
  cookbooksAreOfficial?: boolean;
  /** PDF 다운로드(현재 리스트 익스포트) 콜백. 주어지면 오버플로우 메뉴에 'PDF 다운로드' 노출 (둘러보기 전용) */
  /** PDF 다운로드. cookbook 인자가 있으면 해당 북만, 없으면 전체(현재 리스트) 출력 */
  onDownloadPdf?: (cookbook?: string) => void;
  /** 팩뷰 확대 오버레이 헤더의 +추가 — 해당 레시피 북으로 레시피 추가 (리스트뷰 앱바와 공통) */
  onAddRecipeToCookbook?: (cookbook: string) => void;
  /** 앱바 셀렉터 앞에 나란히 넣을 컴팩트 노드(작성자 배지). 셀렉터를 대체하지 않음 */
  authorBadge?: React.ReactNode;
  /** 축 셀렉터 메뉴 최상단에 넣을 작성자 정보 한 줄(작성자 홈용). 미전달이면 없음. */
  menuHeaderNode?: React.ReactNode;
  /** 뒤로가기 (작성자 홈 등). 주어지면 AppBar 좌측에 닫기(X) 버튼 노출 */
  onBack?: () => void;
}

const VIEW_MODE_STORAGE_KEY = '@bakle_group_view_mode';
type ViewMode = 'list' | 'pack';

export function GroupScreen({recipes, retrospectiveExtraRecipes, cookbookColors, axis, onAxisChange, onComingSoon, onDeleteCookbook, onCookbookPress, onMethodPress, onMethodGuidePress, exploreRecipes, exploreCookbooks, isAdmin, onExploreCookbookPress, onDeleteExploreCookbook, onRefresh, onRecipePress, availableAxes = DEFAULT_AXES, axisOverrides, showAddButton = true, bookCarousel = false, addAsOfficial = false, cookbooksAreOfficial = false, onDownloadPdf, onAddRecipeToCookbook, authorBadge, menuHeaderNode, onBack}: GroupScreenProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const {reviewsOf, reviewOf, saveReview} = useRecipeReviews();
  const {madeAtOf} = useMadeStamps();
  // 빈 회고 노트에서 '회고 쓰기'를 누른 레시피
  const [writeTarget, setWriteTarget] = useState<Recipe | null>(null);
  const colors = useColors();
  const COOKBOOK_MENU_ITEMS = useMemo(() => [
    {id: 'rename', label: t('group.edit'), icon: IconEdit},
    {id: 'delete', label: t('group.delete'), icon: IconTrash, destructive: true},
  ], [t]);
  // 공식(둘러보기) 북 — 어드민만: 북 안 숨김 레시피를 한 번에 공개
  const OFFICIAL_COOKBOOK_MENU_ITEMS = useMemo(() => [
    {id: 'publishAll', label: t('group.publishAll'), icon: IconGlobeFilled},
    ...COOKBOOK_MENU_ITEMS,
  ], [COOKBOOK_MENU_ITEMS, t]);
  const {showSnackbar} = useSnackbar();

  /**
   * 북의 숨김 레시피를 모두 공개로 — 북 자체가 숨김이면 북도 공개한다
   * (북이 숨김이면 안의 레시피가 공개여도 사용자에겐 안 보인다).
   */
  const publishAllInBook = async (name: string) => {
    const hiddenIds = [...recipes, ...(exploreRecipes ?? [])]
      .filter(r => r.cookbook === name && r.hidden)
      .map(r => r.id);
    try {
      const batch = writeBatch(db);
      for (const id of new Set(hiddenIds)) batch.update(doc(db, 'explore_recipes', id), {hidden: false});
      batch.set(doc(db, 'explore_cookbooks', name), {hidden: false}, {merge: true});
      await batch.commit();
      showSnackbar(t('group.publishAllDone', {name, count: new Set(hiddenIds).size}), {tone: 'positive'});
      onRefresh?.();
    } catch (e) {
      console.warn('[publishAllInBook] 실패:', e);
      showSnackbar(t('group.publishAllFailed'), {tone: 'error'});
    }
  };
  const {setShowCookbookDialog, setCookbookEditTarget, setCookbookInitialOfficial} = useAddSheet();
  const {pullProgress, isRefreshing, refreshStripProgress, refreshOpacity, refreshGapHeight, handleScroll} = usePullProgress(onRefresh);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showGroupFilterMenu, setShowGroupFilterMenu] = useState(false);
  // 2뎁스 셀렉터 메뉴(북·공법 목록) — 레시피 축과 같은 [축 아이콘][항목 ⌄] 구성
  const [showItemMenu, setShowItemMenu] = useState(false);
  // 회고 노트 팩을 누른 레시피 — 그 레시피의 회고로 바로 연다
  const [retroTarget, setRetroTarget] = useState<Recipe | null>(null);
  const [cookbookMenuTarget, setCookbookMenuTarget] = useState<string | null>(null);
  const [cookbookMenuPosition, setCookbookMenuPosition] = useState<{top: number; right: number} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState('');
  const [deleteTargetIsExplore, setDeleteTargetIsExplore] = useState(false);
  const [exploreCookbookMenuTarget, setExploreCookbookMenuTarget] = useState<string | null>(null);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [expandedOrigin, setExpandedOrigin] = useState<PackOriginRect | null>(null);
  // 회고 팩(다회차) → 회차 펼침
  const [retroFlow, setRetroFlow] = useState<{
    sessions: SessionFlowItem[];
    origin: PackOriginRect;
    root: {imageUrl?: string | number; title: string; count: number};
  } | null>(null);

  // viewMode 저장/복원
  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY).then(v => {
      if (v === 'pack' || v === 'list') setViewMode(v);
    });
  }, []);

  const handleViewModeSelect = (id: string) => {
    setShowLayoutMenu(false);
    if (id === 'list' || id === 'pack') {
      setViewMode(id);
      AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, id);
    }
  };

  // 레시피 0개인 레시피 북 목록 (정리 대상)
  const emptyCookbookNames = useMemo(() => {
    const used = new Set<string>();
    for (const r of recipes) {
      if (r.cookbook) used.add(r.cookbook);
    }
    return Object.keys(cookbookColors).filter(name => !used.has(name));
  }, [recipes, cookbookColors]);

  const moreMenuItems = useMemo(() => {
    const items: MenuItemData[] = [];
    if (emptyCookbookNames.length > 0) {
      items.push({id: 'cleanup', label: t('group.cleanupEmptyCookbooks', {count: emptyCookbookNames.length}), icon: IconSparkle});
    }
    // PDF 다운로드(현재 리스트 익스포트) — 콜백이 주어질 때만 (둘러보기 전용)
    if (onDownloadPdf) {
      items.push({id: 'downloadPdf', label: t('group.downloadPdf'), icon: IconArrowDownToLine});
    }
    // 전체 삭제는 어드민 전용 (게스트/일반 사용자에겐 노출하지 않음)
    if (isAdmin) {
      items.push({id: 'deleteAll', label: t('group.deleteAll'), icon: IconTrash, destructive: true});
    }
    return items;
  }, [emptyCookbookNames, isAdmin, onDownloadPdf, t]);

  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutMenuItems = useMemo(() => [
    {id: 'list', label: t('group.listView'), icon: IconList},
    {id: 'pack', label: t('group.packView'), icon: IconCards},
  ], [t]);

  const groupFilterMenuItems = useAxisMenuItems(availableAxes, axisOverrides);

  // 레시피를 카테고리별로 그룹핑 → 레시피 북 섹션
  const cookbooks = useMemo(() => {
    // 회차(remakeGroup)는 최신 1개로 — 3회차여도 1개 레시피로 계산
    const latestByLineage = new Map<string, Recipe>();
    for (const r of recipes) {
      const key = r.remakeGroupId ?? r.id;
      const ex = latestByLineage.get(key);
      if (!ex || parseSession(r.session).current > parseSession(ex.session).current) latestByLineage.set(key, r);
    }
    const map = new Map<string, Recipe[]>();
    // '레시피 북 없음'을 기본으로 항상 포함
    map.set('레시피 북 없음', []);
    // cookbookColors에 등록된 빈 레시피 북도 포함
    for (const name of Object.keys(cookbookColors)) {
      if (!map.has(name)) map.set(name, []);
    }
    for (const recipe of latestByLineage.values()) {
      const key = recipe.cookbook || '레시피 북 없음';
      const list = map.get(key) || [];
      list.push(recipe);
      map.set(key, list);
    }
    // 정렬: '레시피 북 없음'은 항상 맨 뒤 → 콘텐츠 개수 많은 순 → 최신순 (모든 북 뷰 공용)
    const latestTime = (items: {createdAt?: string}[]) =>
      items.reduce((mx, r) => {
        const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return t > mx ? t : mx;
      }, 0);
    return Array.from(map.entries())
      .map(([name, items]) => ({name, items}))
      // 둘러보기(공식)에서 일반 유저에겐 '레시피 북 없음'(미분류) 숨김 — 어드민만 정리용으로 노출
      .filter(({name}) => !(name === '레시피 북 없음' && cookbooksAreOfficial && !isAdmin))
      .sort((a, b) => {
        const aUngrouped = a.name === '레시피 북 없음';
        const bUngrouped = b.name === '레시피 북 없음';
        if (aUngrouped !== bUngrouped) return aUngrouped ? 1 : -1;
        if (b.items.length !== a.items.length) return b.items.length - a.items.length;
        return latestTime(b.items) - latestTime(a.items);
      });
  }, [recipes, cookbookColors, cookbooksAreOfficial, isAdmin]);

  // 팩뷰: 공법(method)별로 묶기 (어드민은 공식 레시피 합산, 회차는 최신 하나로)
  const methodGroups = useMemo(() => {
    const source = isAdmin ? [...recipes, ...(exploreRecipes ?? [])] : recipes;
    const latestByLineage = new Map<string, Recipe>();
    for (const r of source) {
      const groupKey = r.remakeGroupId ?? r.id;
      const existing = latestByLineage.get(groupKey);
      if (!existing || parseSession(r.session).current > parseSession(existing.session).current) {
        latestByLineage.set(groupKey, r);
      }
    }
    const map = new Map<string, Recipe[]>();
    for (const r of latestByLineage.values()) {
      const key = r.method?.trim() || '공법 없음';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([method, items]) => {
      // 서브타이틀: 모두 같은 레시피 북이면 그 이름, 섞여 있으면 '모든 요리책'
      const cookbookSet = new Set(items.map(r => r.cookbook || '레시피 북 없음'));
      const cookbookLabel = cookbookSet.size === 1 ? [...cookbookSet][0] : t('group.allCookbooks');
      // 대표 카드 최대 3장 (공통 헬퍼: 이미지 우선 + 종이 미리보기)
      const cards = recipeCoverCards(items);
      return {method, items, subtitle: [cookbookLabel, t('group.itemCount', {count: items.length})], cards};
    });
  }, [recipes, exploreRecipes, isAdmin, t]);

  const methodPacks = useMemo<PackBoardItem[]>(() => methodGroups.map(g => ({
    id: g.method,
    title: g.method,
    subtitle: g.subtitle,
    count: g.items.length,
    iconColor: colors['custom/lime-var'],
    cards: g.cards,
    onPress: (rect: PackOriginRect) => {
      setExpandedOrigin(rect);
      setExpandedMethod(g.method);
    },
  })), [methodGroups, colors]);

  // 공식 북 숨김 여부 맵 (비공개 표시용) — cookbookPacks/리스트 행에서 참조
  const exploreCookbookHiddenMap = useMemo(() => {
    const map = new Map<string, boolean>();
    exploreCookbooks?.forEach(c => map.set(c.name, !!c.hidden));
    return map;
  }, [exploreCookbooks]);

  // 레시피 북 팩: 책마다 1팩, 탭하면 펼침 오버레이
  const cookbookPacks = useMemo<PackBoardItem[]>(() => {
    // 정렬은 공용 cookbooks에서 이미 처리됨 ('없음' 맨 뒤 → 개수순 → 최신순)
    return cookbooks.map(cb => {
      const isUngrouped = cb.name === '레시피 북 없음';
      // 공통 헬퍼: 비었으면 빈 종이, 아니면 레시피 표지(사진/종이). 일러스트 이미지 안 씀.
      const cards = coverCards(cb.items, cb.name);
      const reviewTotal = cb.items.reduce((sum, r) => sum + reviewsOf(r).length, 0);
      return {
        id: `cb_${cb.name}`,
        title: cb.name,
        subtitle: t('group.itemCount', {count: cb.items.length}),
        count: cb.items.length,
        footerLeft: t('group.recipeCountMultiline', {count: cb.items.length}),
        footerRight: t('group.reviewCountMultiline', {count: reviewTotal}),
        icon: IconBookFilled,
        // 책 표지 글씨용: var(0.64 반투명) 대신 솔리드 커스텀 색 (반투명이면 글씨가 비쳐 보임)
        // 미분류는 고정 옐로 표지 위에서 라이트/다크 대비가 뜨지 않도록 fixed 색 사용
        iconColor: isUngrouped
          ? colors['foreground/on-surface-fixed']
          : colors[getCookbookColorKey(cookbookColors[cb.name] || DEFAULT_COOKBOOK_COLOR)],
        cards,
        variant: 'book' as const,
        authors: deriveBookAuthors(cb.items),
        emptyCover: cb.items.length === 0, // 빈 북 → 일러스트 투명 렌더
        hidden: cookbooksAreOfficial ? exploreCookbookHiddenMap.get(cb.name) : undefined,
        onPress: (rect: PackOriginRect) => { setExpandedOrigin(rect); setExpandedMethod(cb.name); },
      };
    });
  }, [cookbooks, cookbookColors, colors, cookbooksAreOfficial, exploreCookbookHiddenMap, t, reviewsOf]);

  // 회고 노트 기준: 실제 작성된 회고가 있는 레시피만 (같은 remakeGroup은 회고 유무 합산 후 최신 회차 하나로 대표)
  // 회고 노트 대상 — 내 레시피 + 내가 회고를 쓴 둘러보기 레시피
  const retrospectiveSource = useMemo(() => {
    const ownIds = new Set(recipes.map(r => r.id));
    // 팁은 회고 대상이 아니다
    return [...recipes, ...(retrospectiveExtraRecipes ?? []).filter(r => !ownIds.has(r.id))]
      .filter(r => r.kind !== 'tip');
  }, [recipes, retrospectiveExtraRecipes]);

  const retrospectives = useMemo(() => {
    const source = retrospectiveSource;
    // 그룹 전체에 회고가 하나라도 있는지 집계
    const groupHasReview = new Map<string, boolean>();
    for (const r of source) {
      const groupKey = r.remakeGroupId ?? r.id;
      // 계정에 보관한 회고까지 센다 — 한쪽만 보면 회고 노트에서 빠진다
      const has = reviewsOf(r).length > 0;
      groupHasReview.set(groupKey, (groupHasReview.get(groupKey) ?? false) || has);
    }
    // 회고가 있는 그룹만, 대표는 최신 회차
    const seenGroups = new Set<string>();
    const result: Recipe[] = [];
    const sorted = [...source].sort((a, b) => parseSession(b.session).current - parseSession(a.session).current);
    for (const r of sorted) {
      const groupKey = r.remakeGroupId ?? r.id;
      if (seenGroups.has(groupKey)) continue;
      if (!groupHasReview.get(groupKey)) continue;
      seenGroups.add(groupKey);
      result.push(r);
    }
    return result;
  }, [retrospectiveSource, reviewsOf]);

  // 회고 노트 팩: 회고들을 하나의 노트 카드에 담아 ‹ ›로 미리보기 페이징 (탭=회고 바텀시트 열기)
  // 만들었어요(스탬프)를 찍었는데 회고가 없는 것만 — 최근 만든 순. 만들기 → 회고가 한 세트다
  const reviewCandidates = useMemo(() => retrospectiveSource
    .filter(r => !!madeAtOf(r) && reviewsOf(r).length === 0)
    .sort((a, b) => (madeAtOf(b) ?? '').localeCompare(madeAtOf(a) ?? '')),
  [retrospectiveSource, madeAtOf, reviewsOf]);

  // 회고가 하나도 없을 때 보여줄 예시 — 둘러보기 레시피 하나(사진 있는 일반 레시피)를 빌려
  // 실제 회고 노트처럼 보이게 한다. 글은 예시 회고 문구, 누르면 레시피 목록으로.
  const {recipes: exploreAll} = useExploreRecipeContext();
  const exampleRecipe = useMemo(
    () => exploreAll.find(r => r.imageUri && r.kind !== 'tip' && !r.hidden) ?? null,
    [exploreAll],
  );

  const retrospectivePacks = useMemo<PackBoardItem[]>(() => {
    // 회고 쓰기 팩 — 회고가 있어도 늘 뒤에 붙인다(만들었거나 최근 추가한, 회고 없는 레시피 3개)
    const writePacks: PackBoardItem[] = reviewCandidates.map(r => ({
      id: `__retro_write_${r.id}`,
      title: r.title,
      subtitle: '',
      variant: 'note' as const,
      photoCard: true,
      cards: [{
        id: r.id,
        imageUrl: r.imageUri,
        title: r.title,
        tags: [r.cookbook, r.method?.trim()].filter((v): v is string => !!v),
        paperPreview: [t('retrospectiveNote.writePrompt'), t('retrospectiveNote.writeAction')],
      }],
      onCardPress: () => setWriteTarget(r),
    }));
    // 레시피(다시 만들기 묶음)마다 노트 팩 하나. 종이에는 회고 내용을, ‹ ›로 회차를 넘긴다.
    // 라벨은 회고를 쓴 회차 / 전체 회차 — 회차마다 회고가 하나라 "1/3 회고".
    const reviewedPacks: PackBoardItem[] = retrospectives.map(recipe => {
      const groupKey = recipe.remakeGroupId ?? recipe.id;
      const sessions = retrospectiveSource
        .filter(r => (r.remakeGroupId ?? r.id) === groupKey)
        .sort((a, b) => parseSession(b.session).current - parseSession(a.session).current);
      const multi = sessions.length > 1;
      const cards = sessions
        .filter(r => reviewsOf(r).length > 0)
        .map(r => ({
          id: r.id,
          imageUrl: r.imageUri ?? recipe.imageUri,
          title: recipe.title,
          // 사진 위 태그 — 레시피북 · 공법 · 회차
          tags: [
            r.cookbook,
            r.method?.trim(),
            multi ? t('reviewLog.sessionLabel', {count: parseSession(r.session).current}) : undefined,
          ].filter((v): v is string => !!v),
          // 날짜 줄 — 만든 날(스탬프)
          dateText: (() => {
            const at = madeAtOf(r);
            const text = at ? shortDate(at) : '-';
            return text === '-' ? undefined : text;
          })(),
          paperPreview: reviewsOf(r).flatMap(rv => [
            rv.evaluation?.trim(),
            rv.improvement?.trim() ? `↳ ${rv.improvement.trim()}` : undefined,
          ]).filter((l): l is string => !!l),
        }));
      return {
        id: `__retro_${groupKey}`,
        title: recipe.title,
        subtitle: '',
        variant: 'note' as const,
        // 사진 카드 — 최근 회차 하나만 보여주고, 누르면 회차 전체
        photoCard: true,
        cards,
        // 썸네일 위 맨 윗줄 — 회고 쓴 회차 / 전체 회차 ("1/1회차")
        metaText: t('reviewLog.reviewSessionRatio', {reviews: cards.length, sessions: sessions.length}),
        // 카드엔 마지막 회차 회고, 누르면 회차별 회고 상세(거기서 회고 줄을 누르면 수정)
        onPress: () => { setRetroTarget(recipe); setShowReviewSheet(true); },
      };
    });
    // 리스트와 같은 순서 — 써야 할 것(회고를 기다려요) 먼저, 쓴 회고 다음
    if (reviewedPacks.length + writePacks.length > 0) return [...writePacks, ...reviewedPacks];
    {
      // 레시피가 하나도 없으면 예시 회고(흐리게) — 누르면 레시피 목록으로
      return [{
        id: '__retro_note__',
        title: t('group.retroNote'),
        subtitle: '',
        variant: 'note' as const,
        photoCard: true,
        example: true,
        cards: [{
          title: exampleRecipe?.title ?? '',
          imageUrl: exampleRecipe?.imageUri,
          tags: exampleRecipe ? [exampleRecipe.cookbook, exampleRecipe.method?.trim()].filter((v): v is string => !!v) : undefined,
          paperPreview: [t('retrospectiveNote.exampleEvaluation'), `↳ ${t('retrospectiveNote.exampleImprovement')}`],
        }],
        onPress: () => onAxisChange('all'),
      }];
    }
  }, [retrospectives, retrospectiveSource, reviewsOf, reviewCandidates, onAxisChange, madeAtOf, t, exampleRecipe]);

  // 활성 축에 따른 팩 목록
  const activePacks = axis === 'cookbook' ? cookbookPacks : axis === 'method' ? methodPacks : retrospectivePacks;
  // 펼침 오버레이용 그룹 (cookbook/method 축만)
  const activeGroups = axis === 'cookbook'
    ? cookbooks.map(c => ({label: c.name, items: c.items}))
    : methodGroups.map(g => ({label: g.method, items: g.items}));

  // 그룹별 통계 (회고 수, 회차 수)
  const retroStats = useMemo(() => {
    const groupMap = new Map<string, Recipe[]>();
    // 회고 노트와 같은 대상 — 둘러보기 레시피에 쓴 회고도 센다
    for (const r of retrospectiveSource) {
      const groupKey = r.remakeGroupId ?? r.id;
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
      groupMap.get(groupKey)!.push(r);
    }
    const stats = new Map<string, {totalReviews: number; totalSessions: number}>();
    for (const [key, group] of groupMap) {
      const totalReviews = group.reduce((sum, r) => sum + reviewsOf(r).length, 0);
      stats.set(key, {totalReviews, totalSessions: group.length});
    }
    return stats;
  }, [retrospectiveSource, reviewsOf]);

  const exploreCookbookColorMap = useMemo(() => {
    const map = new Map<string, string>();
    exploreCookbooks?.forEach(c => map.set(c.name, c.color));
    return map;
  }, [exploreCookbooks]);

  // 둘러보기 레시피 북 (홈 어드민 전용 섹션): 레시피 그룹 + explore_cookbooks의 빈 레시피 북 포함.
  // 둘러보기 화면(cookbooksAreOfficial)은 주 목록이 이미 공식이라 이 섹션은 숨김(중복 방지).
  const exploreGroups = useMemo(() => {
    if (!isAdmin || cookbooksAreOfficial) return [];
    const map = new Map<string, Recipe[]>();
    // explore_cookbooks에 등록된 빈 레시피 북도 포함
    for (const cb of exploreCookbooks ?? []) {
      if (!map.has(cb.name)) map.set(cb.name, []);
    }
    for (const recipe of exploreRecipes ?? []) {
      const key = recipe.cookbook || '공식 레시피 북 없음';
      const list = map.get(key) || [];
      list.push(recipe);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([name, items]) => ({name, items}));
  }, [isAdmin, cookbooksAreOfficial, exploreRecipes, exploreCookbooks]);

  const handleTitlePress = () => {
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
    setShowGroupFilterMenu(prev => !prev);
  };

  const handleGroupFilterSelect = (id: string) => {
    setShowGroupFilterMenu(false);
    setShowItemMenu(false);
    onAxisChange(id as GroupAxis);
  };

  const handleMenuPress = () => {
    setShowGroupFilterMenu(false);
    setShowItemMenu(false);
    setCookbookMenuTarget(null);
    setShowMoreMenu(prev => !prev);
  };

  const handleOverlayPress = () => {
    setShowGroupFilterMenu(false);
    setShowItemMenu(false);
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
    setExploreCookbookMenuTarget(null);
  };

  const positionMenu = (position: {pageX: number; pageY: number; width: number; height: number}) => {
    const screenWidth = Dimensions.get('window').width;
    const menuMinWidth = 200;
    const edgeMargin = Spacing.md;
    const rawRight = screenWidth - (position.pageX + position.width);
    const clampedRight = Math.min(Math.max(rawRight, edgeMargin), screenWidth - menuMinWidth - edgeMargin);
    setCookbookMenuPosition({
      top: position.pageY + position.height + Spacing.xs,
      right: clampedRight,
    });
  };

  const handleCookbookMenuPress = (name: string, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowGroupFilterMenu(false);
    setShowItemMenu(false);
    setShowMoreMenu(false);
    setExploreCookbookMenuTarget(null);
    positionMenu(position);
    setCookbookMenuTarget(prev => (prev === name ? null : name));
  };

  const handleExploreCookbookMenuPress = (name: string, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowGroupFilterMenu(false);
    setShowItemMenu(false);
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
    positionMenu(position);
    setExploreCookbookMenuTarget(prev => (prev === name ? null : name));
  };

  const handleCookbookMenuSelect = (id: string) => {
    const target = cookbookMenuTarget;
    setCookbookMenuTarget(null);
    if (id === 'rename' && target) {
      // 둘러보기(공식 북)면 explore 경로로: isExplore 표시 → 확인 시 Firestore 반영
      setCookbookEditTarget(
        cookbooksAreOfficial
          ? {name: target, color: (cookbookColors[target] || 'orange') as AvatarColor, isExplore: true, hidden: exploreCookbookHiddenMap.get(target)}
          : {name: target, color: cookbookColors[target] || DEFAULT_COOKBOOK_COLOR},
      );
      setShowCookbookDialog(true);
    } else if (id === 'delete' && target) {
      setDeleteTarget(target);
      setDeleteTargetIsExplore(cookbooksAreOfficial);
      setShowDeleteDialog(true);
    } else if (id === 'publishAll' && target) {
      publishAllInBook(target);
    } else {
      onComingSoon();
    }
  };

  const handleExploreCookbookMenuSelect = (id: string) => {
    const target = exploreCookbookMenuTarget;
    setExploreCookbookMenuTarget(null);
    if (id === 'rename' && target) {
      const ecColor = exploreCookbookColorMap.get(target) ?? 'orange';
      setCookbookEditTarget({name: target, color: ecColor as AvatarColor, isExplore: true, hidden: exploreCookbookHiddenMap.get(target)});
      setShowCookbookDialog(true);
    } else if (id === 'delete' && target) {
      setDeleteTarget(target);
      setDeleteTargetIsExplore(true);
      setShowDeleteDialog(true);
    } else if (id === 'publishAll' && target) {
      publishAllInBook(target);
    }
  };

  // ── 팩뷰 확대 오버레이 헤더용: 리스트뷰 앱바와 동일한 편집/삭제 ──
  // 다이얼로그가 오버레이(zIndex 100) 아래로 가려지지 않게 오버레이를 먼저 닫고 띄운다.
  // 둘러보기(주 목록이 공식)면 모든 북이 공식 → 어드민 게이트 + explore 라우팅. 홈이면 exploreGroups(어드민 병합분)만 공식.
  const isExploreCookbookName = (name: string) => cookbooksAreOfficial || exploreGroups.some(g => g.name === name);
  const editCookbookFromOverlay = (name: string, isExplore: boolean) => {
    setExpandedMethod(null);
    setExpandedOrigin(null);
    if (isExplore) {
      // 홈-어드민 경로는 exploreCookbookColorMap, 둘러보기 경로는 cookbookColors(=explore 색맵)에 색이 있다.
      const ecColor = (exploreCookbookColorMap.get(name) ?? cookbookColors[name] ?? 'orange') as AvatarColor;
      setCookbookEditTarget({name, color: ecColor, isExplore: true, hidden: exploreCookbookHiddenMap.get(name)});
    } else {
      setCookbookEditTarget({name, color: cookbookColors[name] || DEFAULT_COOKBOOK_COLOR});
    }
    setShowCookbookDialog(true);
  };
  const deleteCookbookFromOverlay = (name: string, isExplore: boolean) => {
    setExpandedMethod(null);
    setExpandedOrigin(null);
    setDeleteTarget(name);
    setDeleteTargetIsExplore(isExplore);
    setShowDeleteDialog(true);
  };

  const showCookbookSection = axis === 'cookbook';
  const showMethodSection = axis === 'method';
  const showRetrospectiveSection = axis === 'retrospective';
  const anyMenuOpen = showGroupFilterMenu || showMoreMenu || !!cookbookMenuTarget || !!exploreCookbookMenuTarget;

  return (
    <View style={styles.container}>
      <AppBar
        leftIcon={onBack ? IconClose : undefined}
        onLeftPress={onBack}
        titleNode={
          // 레시피 축과 같은 모양: [축 아이콘(축 메뉴)] [항목 ⌄]
          // 레시피북·공법은 '전체'에서 하나를 골라 들어가고, 회고 노트는 고를 항목이 없어 축 이름을 둔다
          <Breadcrumb
            leadingNode={authorBadge}
            axisLabel={axisLabel(t, axis, axisOverrides)}
            axisIcon={groupFilterMenuItems.find(i => i.id === axis)?.icon}
            axisIconColor={groupFilterMenuItems.find(i => i.id === axis)?.iconColor}
            itemLabel={axis === 'retrospective' ? axisLabel(t, axis, axisOverrides) : t('home.all')}
            onAxisPress={() => { setShowItemMenu(false); handleTitlePress(); }}
            onItemPress={() => {
              if (axis === 'retrospective') { handleTitlePress(); return; }
              setShowGroupFilterMenu(false);
              setShowLayoutMenu(false);
              setShowMoreMenu(false);
              setShowItemMenu(prev => !prev);
            }}
          />
        }
        showAddButton={showAddButton && axis !== 'method' && axis !== 'retrospective'}
        showInfoButton={axis === 'method'}
        onInfoPress={onMethodGuidePress}
        onAddPress={() => { setCookbookEditTarget(null); setCookbookInitialOfficial(addAsOfficial); setShowCookbookDialog(true); }}
        onFilterPress={() => {
          setShowMoreMenu(false);
          // 보기가 2개 이하면 메뉴 없이 바로 바꾼다(토글) — 고를 게 둘뿐인데 메뉴를 열 이유가 없다
          if (layoutMenuItems.length <= 2) {
            const next = layoutMenuItems.find(i => i.id !== viewMode)?.id;
            if (next) handleViewModeSelect(next);
            return;
          }
          setShowLayoutMenu(prev => !prev);
        }}
        filterIcon={viewMode === 'pack' ? IconCards : IconList}
        filterMenuOpen={showLayoutMenu}
        onMenuPress={() => { setShowLayoutMenu(false); handleMenuPress(); }}
        menuOpen={showMoreMenu}
        showMenuButton={moreMenuItems.length > 0}
        titleMenu={
          <>
            <Menu
              items={groupFilterMenuItems}
              selectedId={axis}
              visible={showGroupFilterMenu}
              onSelect={handleGroupFilterSelect}
              headerNode={menuHeaderNode}
            />
            {/* 2뎁스: 북·공법을 골라 그 항목으로 들어간다 */}
            <Menu
              items={axis === 'cookbook'
                ? cookbooks.map(c => ({id: c.name, label: c.name}))
                : axis === 'method'
                  ? methodGroups.map(g => ({id: g.method, label: g.method}))
                  : []}
              visible={showItemMenu && axis !== 'retrospective'}
              onSelect={id => {
                setShowItemMenu(false);
                if (axis === 'cookbook') onCookbookPress?.(id);
                else if (axis === 'method') onMethodPress?.(id);
              }}
            />
          </>
        }

        rightMenu={
          <>
            <Menu
              sections={[{
                title: t('recipeList.sectionLayout'),
                // 아이콘 탭 한 줄 — 라벨 목록이면 메뉴가 길어진다(목록·스탬프북과 같은 방식)
                content: (
                  <View style={styles.layoutTabs}>
                    <Tabs
                      variant="icon"
                      size="large"
                      fullWidth
                      tabs={layoutMenuItems.map(i => ({id: i.id, label: '', icon: i.icon}))}
                      selectedId={viewMode}
                      onSelect={handleViewModeSelect}
                    />
                  </View>
                ),
              }]}
              visible={showLayoutMenu}
            />
            <Menu
              items={moreMenuItems}
              visible={showMoreMenu}
              onSelect={(id) => {
                setShowMoreMenu(false);
                if (id === 'cleanup') {
                  if (emptyCookbookNames.length === 0 || !onDeleteCookbook) return;
                  emptyCookbookNames.forEach(name => onDeleteCookbook(name));
                } else if (id === 'downloadPdf') {
                  onDownloadPdf?.();
                } else if (id === 'deleteAll') {
                  onComingSoon();
                }
              }}
            />
          </>
        }
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.pullWrapper}>
          <PullIndicator progress={pullProgress} isRefreshing={isRefreshing} refreshStripProgress={refreshStripProgress} refreshOpacity={refreshOpacity} />

          {viewMode === 'pack' ? (
            (bookCarousel && axis === 'cookbook') || axis === 'retrospective' ? (
              /* 레시피 북·회고 노트 팩뷰: 센터 카드 캐러셀 (하나씩 스와이프, 탭 시 펼침) */
              <CookbookCarousel items={activePacks} />
            ) : (
              /* 그 외 팩뷰: 흩뿌림 캔버스 + 패닝/핀치 줌 */
              <PackCanvas items={activePacks} />
            )
          ) : (
          <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}>
          <RefreshGap height={refreshGapHeight} />
          <ContentContainer style={styles.sections}>
            {/* 레시피 북 섹션 */}
            {viewMode === 'list' && showCookbookSection && (
              <View style={styles.section}>
                <SectionHeader title={axisLabel(t, 'cookbook', axisOverrides)} style={styles.sectionHeader} />
                <View>
                  {(() => {
                      const totalLen = cookbooks.length + exploreGroups.length;
                      return (
                        <>
                          {cookbooks.map((cookbook, idx) => {
                            const isUngrouped = cookbook.name === '레시피 북 없음';
                            const isLast = idx === totalLen - 1;
                            return (
                              <View key={cookbook.name}>
                                <RecipeCard
                                  title={cookbook.name}
                                  cookbook={t('group.recipeCount', {count: cookbook.items.length})}
                                  reviewCount={cookbook.items.reduce((sum, r) => sum + reviewsOf(r).length, 0)}
                                  layout="list"
                                  placeholderIcon={axisOverrides?.cookbook?.icon ?? IconBookFilled}
                                  placeholderIconColor={isUngrouped ? colors['foreground/on-surface-muted'] : colors[getCookbookColorKey(cookbookColors[cookbook.name] || DEFAULT_COOKBOOK_COLOR)]}
                                  onPress={() => onCookbookPress?.(cookbook.name)}
                                  hidden={cookbooksAreOfficial ? exploreCookbookHiddenMap.get(cookbook.name) : undefined}
                                  // 공식 북(둘러보기)은 어드민만 편집·삭제. 개인 북(홈)은 소유자 항상 가능
                                  onMenuPress={isUngrouped || (cookbooksAreOfficial && !isAdmin) ? undefined : (pos) => handleCookbookMenuPress(cookbook.name, pos)}
                                  hideDivider={isLast}
                                />
                              </View>
                            );
                          })}
                          {/* 둘러보기 레시피 북 (어드민 전용) */}
                          {exploreGroups.map((cookbook, idx) => {
                            const ecColor = (exploreCookbookColorMap.get(cookbook.name) || 'orange') as AvatarColor;
                            const isExploreUngrouped = cookbook.name === '공식 레시피 북 없음';
                            const isLast = cookbooks.length + idx === totalLen - 1;
                            return (
                              <View key={`explore-${cookbook.name}`}>
                                <RecipeCard
                                  title={cookbook.name}
                                  cookbook={t('group.recipeCount', {count: cookbook.items.length})}
                                  reviewCount={cookbook.items.reduce((sum: number, r) => sum + reviewsOf(r).length, 0)}
                                  layout="list"
                                  placeholderIcon={IconExprolerBookFilled}
                                  placeholderIconColor={isExploreUngrouped ? colors['foreground/on-surface-muted'] : colors[getCookbookColorKey(ecColor)]}
                                  onPress={() => onExploreCookbookPress?.(cookbook.name)}
                                  hidden={exploreCookbookHiddenMap.get(cookbook.name)}
                                  onMenuPress={isAdmin ? (pos) => handleExploreCookbookMenuPress(cookbook.name, pos) : undefined}
                                  hideDivider={isLast}
                                />
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                  </View>
              </View>
            )}

            {/* 공법 섹션 */}
            {viewMode === 'list' && showMethodSection && (
              <View style={styles.section}>
                <SectionHeader title={t('group.methodSection')} style={styles.sectionHeader} />
                <View>
                  {methodGroups.length > 0 ? methodGroups.map((g, idx) => (
                    <RecipeCard
                      key={g.method}
                      title={g.method}
                      cookbook={t('group.recipeCount', {count: g.items.length})}
                      layout="list"
                      placeholderIcon={IconProcess}
                      placeholderIconColor={colors['custom/lime-var']}
                      onPress={() => onMethodPress?.(g.method)}
                      hideDivider={idx === methodGroups.length - 1}
                    />
                  )) : (
                    <RecipeCard
                      title=""
                      cookbook={t('group.emptyMethods')}
                      layout="list"
                      placeholderIcon={IconProcess}
                      placeholderIconColor={colors['custom/lime-var']}
                      hideDivider
                    />
                  )}
                </View>
              </View>
            )}

            {/* 회고 노트 섹션 */}
            {viewMode === 'list' && showRetrospectiveSection && (
              <View style={styles.section}>
                {/* 레시피북·공법 리스트와 같은 구성 — 머리글 SectionHeader, 행은 RecipeCard.
                    써야 할 것(회고를 기다려요)과 쓴 것(회고 노트)을 구역으로 나눈다 — 한 목록에 섞이면 애매했다 */}
                {/* 팩뷰와 같은 구성: 회고 있는 레시피(최근 회고) → 회고 쓰기 3개 → 둘 다 없으면 예시 */}
                {retrospectives.length + reviewCandidates.length > 0 ? (
                  <View>
                    {(() => {
                      // 회고 행·회고 쓰기 행을 한 함수로 그린다 — 내용(제목·부제목)만 다르고 모양은 늘 같게
                      const rows = [
                        ...retrospectives.map(recipe => {
                          const groupKey = recipe.remakeGroupId ?? recipe.id;
                          const latest = retrospectiveSource
                            .filter(r => (r.remakeGroupId ?? r.id) === groupKey)
                            .sort((a, b) => parseSession(b.session).current - parseSession(a.session).current)
                            .flatMap(r => reviewsOf(r))[0];
                          return {
                            key: recipe.id,
                            recipe,
                            overline: recipe.title as string | undefined,
                            // 마지막 회차에 적은 두 칸 — 평가 / ↳ 개선점
                            title: latest?.evaluation?.trim() || recipe.title,
                            subtitle: latest?.improvement?.trim() || undefined,
                            onPress: () => { setRetroTarget(recipe); setShowReviewSheet(true); },
                            write: false,
                          };
                        }),
                        ...reviewCandidates.map(r => ({
                          key: `write-${r.id}`,
                          recipe: r,
                          // 안 쓴 것은 일반 레시피 행 — 제목 품목명, 메타(레시피북·공법), 오른쪽 [회고 쓰기]
                          overline: undefined as string | undefined,
                          title: r.title,
                          subtitle: undefined as string | undefined,
                          onPress: () => setWriteTarget(r),
                          write: true,
                        })),
                      ];
                      const renderRow = (row: typeof rows[number], idx: number, list: typeof rows) => (
                        <RecipeCard
                          key={row.key}
                          id={row.recipe.id}
                          overline={row.overline}
                          title={row.title}
                          customSubtitle={row.subtitle}
                          subtitleSize="large"
                          subtitleIcon={row.subtitle ? IconCornerDownRight : undefined}
                          // 안 쓴 행: 일반 메타데이터 + 오른쪽 버튼
                          cookbook={row.write ? row.recipe.cookbook : undefined}
                          method={row.write ? row.recipe.method : undefined}
                          trailingAction={row.write ? {label: t('retrospectiveNote.writeBadge'), onPress: row.onPress} : undefined}
                          imageUrl={row.recipe.imageUri}
                          paperPreview={recipePreviewParts(row.recipe)}
                          paperTitle={row.recipe.title}
                          layout="list"
                          onPress={row.onPress}
                          hideDivider={idx === list.length - 1}
                        />
                      );
                      const waiting = rows.filter(r => r.write);
                      const written = rows.filter(r => !r.write);
                      return (
                        <>
                          {waiting.length > 0 && (
                            <>
                              <SectionHeader title={t('retrospectiveNote.waitingTitle')} style={styles.sectionHeader} />
                              {waiting.map((row, idx) => renderRow(row, idx, waiting))}
                            </>
                          )}
                          {written.length > 0 && (
                            <>
                              <SectionHeader title={t('group.retroNote')} style={styles.sectionHeader} />
                              {written.map((row, idx) => renderRow(row, idx, written))}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </View>
                ) : (
                  <>
                  <SectionHeader title={t('group.retroNote')} style={styles.sectionHeader} />
                  <View style={{opacity: 0.5}}>
                    {/* 회고가 없을 때 — 둘러보기 레시피 하나를 빌려 실제 회고 줄처럼(요리명 · 평가 · ↳ 개선점). '예시' 표기는 하지 않는다(흐리게만) */}
                    <RecipeCard
                      overline={exampleRecipe?.title}
                      title={t('retrospectiveNote.exampleEvaluation')}
                      customSubtitle={t('retrospectiveNote.exampleImprovement')}
                      subtitleSize="large"
                      subtitleIcon={IconCornerDownRight}
                      imageUrl={exampleRecipe?.imageUri}
                      layout="list"
                      placeholderIcon={IconChartNoAxesGantt}
                      placeholderIconColor={colors['custom/light-blue-var']}
                      onPress={() => onAxisChange('all')}
                      hideDivider
                    />
                  </View>
                  </>
                )}
              </View>
            )}
          </ContentContainer>
          </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* 오버레이 */}
      <Pressable
        style={styles.overlay}
        onPress={handleOverlayPress}
        pointerEvents={anyMenuOpen ? 'auto' : 'none'}
      />

      {/* 레시피 북 오버플로우 메뉴 */}
      {cookbookMenuTarget ? (
        <Menu
          items={cookbooksAreOfficial && isAdmin ? OFFICIAL_COOKBOOK_MENU_ITEMS : COOKBOOK_MENU_ITEMS}
          visible={!!cookbookMenuTarget}
          onSelect={handleCookbookMenuSelect}
          style={cookbookMenuPosition ? {
            position: 'absolute',
            top: cookbookMenuPosition.top,
            right: cookbookMenuPosition.right,
            zIndex: 50,
          } : undefined}
        />
      ) : null}

      {/* 둘러보기 레시피 북 오버플로우 메뉴 */}
      {exploreCookbookMenuTarget ? (
        <Menu
          items={isAdmin ? OFFICIAL_COOKBOOK_MENU_ITEMS : COOKBOOK_MENU_ITEMS}
          visible={!!exploreCookbookMenuTarget}
          onSelect={handleExploreCookbookMenuSelect}
          style={cookbookMenuPosition ? {
            position: 'absolute',
            top: cookbookMenuPosition.top,
            right: cookbookMenuPosition.right,
            zIndex: 50,
          } : undefined}
        />
      ) : null}

      {/* 레시피 북 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title={t('group.deleteTitle')}
        description={deleteTargetIsExplore
          ? t('group.deleteOfficialConfirm', {name: deleteTarget})
          : t('group.deleteConfirm', {name: deleteTarget})}
        actions={<>
          <Button label={t('group.cancel')} variant="soft" onPress={() => setShowDeleteDialog(false)} />
          <Button label={t('group.delete')} variant="soft" destructive onPress={() => {
            if (deleteTargetIsExplore) {
              onDeleteExploreCookbook?.(deleteTarget);
            } else {
              onDeleteCookbook?.(deleteTarget);
            }
            setShowDeleteDialog(false);
          }} />
        </>}
      />

      {/* 빈 회고 노트에서 '회고 쓰기' — 공통 회고 창(평가·개선점) */}
      <ReviewDialog
        visible={!!writeTarget}
        onClose={() => setWriteTarget(null)}
        // 이미 쓴 회고면 그 내용으로 채워 수정
        value={writeTarget ? reviewOf(writeTarget.id) : undefined}
        onConfirm={review => { if (writeTarget) saveReview(writeTarget.id, review); }}
      />

      {/* 회고 노트 바텀시트 */}
      <ReviewLogSheet
        visible={showReviewSheet}
        onClose={() => { setShowReviewSheet(false); setRetroTarget(null); }}
        writeCandidates={reviewCandidates}
        onWriteReview={r => { setShowReviewSheet(false); setWriteTarget(r); }}
        onEditReview={recipeId => {
          const r = retrospectiveSource.find(x => x.id === recipeId);
          if (!r) return;
          // 시트 두 장을 겹치면 iOS에서 위 시트가 안 뜰 수 있다 — 상세를 닫고 수정 시트를 연다
          setShowReviewSheet(false);
          setWriteTarget(r);
        }}
        selectedRecipe={retroTarget ? {id: retroTarget.id, title: retroTarget.title, imageUri: retroTarget.imageUri} : undefined}
        sessionReviews={retroTarget ? (() => {
          const groupKey = retroTarget.remakeGroupId ?? retroTarget.id;
          const sessions = retrospectiveSource
            .filter(r => (r.remakeGroupId ?? r.id) === groupKey)
            .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current);
          return sessions.map(r => ({
            id: r.id,
            label: sessions.length > 1 ? t('reviewLog.sessionLabel', {count: parseSession(r.session).current}) : r.title,
            reviews: reviewsOf(r),
          }));
        })() : undefined}
        recipes={retrospectives}
        allRecipes={retrospectiveSource}
        onRecipePress={onRecipePress}
      />

      {/* 팩뷰 → 그룹 확대 오버레이 (레시피북/공법 축만) */}
      {expandedMethod && expandedOrigin && axis !== 'retrospective' && (
        <GroupExpandOverlay
          activeLabel={expandedMethod}
          axisLabel={axisLabel(t, axis, axisOverrides)}
          groups={activeGroups}
          allRecipes={axis === 'method' && isAdmin ? [...recipes, ...(exploreRecipes ?? [])] : recipes}
          origin={expandedOrigin}
          onClose={() => { setExpandedMethod(null); setExpandedOrigin(null); }}
          onRecipePress={onRecipePress}
          isAdmin={isAdmin}
          isExploreName={isExploreCookbookName}
          onAddRecipe={axis === 'cookbook' ? onAddRecipeToCookbook : undefined}
          onEditCookbook={axis === 'cookbook' ? editCookbookFromOverlay : undefined}
          onDeleteCookbook={axis === 'cookbook' ? deleteCookbookFromOverlay : undefined}
          onDownloadPdf={axis === 'cookbook' ? onDownloadPdf : undefined}
        />
      )}

      {/* 회고 팩(다회차) → 회차 펼침 */}
      {retroFlow && (
        <SessionFlow
          sessions={retroFlow.sessions}
          origin={retroFlow.origin}
          root={retroFlow.root}
          onSelect={(id) => { setRetroFlow(null); onRecipePress?.(id); }}
          onClose={() => setRetroFlow(null)}
        />
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  layoutTabs: {
    // 메뉴 항목과 좌우 정렬 (GlassContainer 패딩만 적용되도록)
    paddingHorizontal: 0,
    paddingBottom: 4,
  },
  container: {
    flex: 1,
    backgroundColor: colors['surface/dim'],
  },
  safeArea: {
    flex: 1,
  },
  pullWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120,
  },
  sections: {
    gap: Spacing.lg,
  },
  section: {},
  sectionHeader: {
    marginBottom: -Spacing.sm,
  },
  retroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 40,
    paddingHorizontal: Spacing.smd,
  },
  retroHeaderTitle: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
  },
  emptyThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 94, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    height: 68,
  },
  emptyText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },

});
