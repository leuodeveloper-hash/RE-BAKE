import React, {useEffect, useMemo, useState} from 'react';
import {Dimensions, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppBar} from '@components/Navigation';
import {ContentContainer, GlassContainer} from '@components/Container';
import {SectionHeader} from '@components/SectionHeader';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {PackCanvas, CookbookCarousel, GroupExpandOverlay, SessionFlow, type SessionFlowItem, type PackBoardItem, type PackOriginRect} from '@components/PackBoard';
import {Menu, type MenuItemData} from '@components/Menu';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {ReviewLogSheet} from '@components/BottomSheet';
import {getColorVarKey} from '@components/ColorPicker';
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
import {IconTrash, IconTrashTwotone, IconEdit, IconBookFilled, IconExprolerBookFilled, IconChartNoAxesGantt, IconChevronRight, IconSparkle, IconProcess, IconCards, IconCardsFilled, IconArrowDownToLine, IconList} from '@components/Icon/IconIndex';
import {parseSession} from '@utils/session';
import {buildPaperPreview} from '@utils/recipePaperPreview';
import {coverCards, recipeCoverCards, emptyCoverCard} from '@utils/cookbookCards';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';
import {axisLabel, DEFAULT_AXES, useAxisMenuItems, type AxisOverrides, type GroupAxis} from '@components/RecipeGroups/groupAxis';

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
  /** 둘러보기 레시피 (어드민 전용) */
  exploreRecipes?: Recipe[];
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
  onDownloadPdf?: () => void;
  /** 팩뷰 확대 오버레이 헤더의 +추가 — 해당 레시피 북으로 레시피 추가 (리스트뷰 앱바와 공통) */
  onAddRecipeToCookbook?: (cookbook: string) => void;
}

const VIEW_MODE_STORAGE_KEY = '@bakle_group_view_mode';
type ViewMode = 'list' | 'pack';

export function GroupScreen({recipes, cookbookColors, axis, onAxisChange, onComingSoon, onDeleteCookbook, onCookbookPress, onMethodPress, exploreRecipes, exploreCookbooks, isAdmin, onExploreCookbookPress, onDeleteExploreCookbook, onRefresh, onRecipePress, availableAxes = DEFAULT_AXES, axisOverrides, showAddButton = true, bookCarousel = false, addAsOfficial = false, cookbooksAreOfficial = false, onDownloadPdf, onAddRecipeToCookbook}: GroupScreenProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const colors = useColors();
  const COOKBOOK_MENU_ITEMS = useMemo(() => [
    {id: 'rename', label: t('group.edit'), icon: IconEdit},
    {id: 'delete', label: t('group.delete'), icon: IconTrash, destructive: true},
  ], [t]);
  const {setShowCookbookDialog, setCookbookEditTarget, setCookbookInitialOfficial} = useAddSheet();
  const {pullProgress, isRefreshing, refreshStripProgress, refreshOpacity, refreshGapHeight, handleScroll} = usePullProgress(onRefresh);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showGroupFilterMenu, setShowGroupFilterMenu] = useState(false);
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
      .sort((a, b) => {
        const aUngrouped = a.name === '레시피 북 없음';
        const bUngrouped = b.name === '레시피 북 없음';
        if (aUngrouped !== bUngrouped) return aUngrouped ? 1 : -1;
        if (b.items.length !== a.items.length) return b.items.length - a.items.length;
        return latestTime(b.items) - latestTime(a.items);
      });
  }, [recipes, cookbookColors]);

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
      return {method, items, subtitle: `${cookbookLabel} · ${t('group.itemCount', {count: items.length})}`, cards};
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
      const reviewTotal = cb.items.reduce((sum, r) => sum + (r.reviewCount ?? r.reviews?.length ?? 0), 0);
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
          : colors[getColorVarKey(cookbookColors[cb.name] || DEFAULT_COOKBOOK_COLOR).replace('-var', '') as keyof typeof colors],
        cards,
        variant: 'book' as const,
        emptyCover: cb.items.length === 0, // 빈 북 → 일러스트 투명 렌더
        hidden: cookbooksAreOfficial ? exploreCookbookHiddenMap.get(cb.name) : undefined,
        onPress: (rect: PackOriginRect) => { setExpandedOrigin(rect); setExpandedMethod(cb.name); },
      };
    });
  }, [cookbooks, cookbookColors, colors, cookbooksAreOfficial, exploreCookbookHiddenMap, t]);

  // 회고 노트 기준: 실제 작성된 회고가 있는 레시피만 (같은 remakeGroup은 회고 유무 합산 후 최신 회차 하나로 대표)
  const retrospectives = useMemo(() => {
    // 그룹 전체에 회고가 하나라도 있는지 집계
    const groupHasReview = new Map<string, boolean>();
    for (const r of recipes) {
      const groupKey = r.remakeGroupId ?? r.id;
      const has = (r.reviews?.length ?? 0) > 0;
      groupHasReview.set(groupKey, (groupHasReview.get(groupKey) ?? false) || has);
    }
    // 회고가 있는 그룹만, 대표는 최신 회차
    const seenGroups = new Set<string>();
    const result: Recipe[] = [];
    const sorted = [...recipes].sort((a, b) => parseSession(b.session).current - parseSession(a.session).current);
    for (const r of sorted) {
      const groupKey = r.remakeGroupId ?? r.id;
      if (seenGroups.has(groupKey)) continue;
      if (!groupHasReview.get(groupKey)) continue;
      seenGroups.add(groupKey);
      result.push(r);
    }
    return result;
  }, [recipes]);

  // 회고 노트 팩: 회고들을 하나의 노트 카드에 담아 ‹ ›로 미리보기 페이징 (탭=회고 바텀시트 열기)
  const retrospectivePacks = useMemo<PackBoardItem[]>(() => {
    if (retrospectives.length === 0) {
      return [{
        id: '__retro_note__',
        title: t('group.retroNote'),
        subtitle: '',
        variant: 'note' as const,
        emptyCover: true,
        cards: [],
        onPress: () => setShowReviewSheet(true),
      }];
    }
    const cards = retrospectives.map(recipe => ({
      title: recipe.title,
      paperPreview: buildPaperPreview(recipe),
    }));
    return [{
      id: '__retro_note__',
      title: t('group.retroNote'),
      subtitle: '',
      variant: 'note' as const,
      count: retrospectives.length,
      cards,
      onPress: () => setShowReviewSheet(true),
    }];
  }, [retrospectives, t]);

  // 활성 축에 따른 팩 목록
  const activePacks = axis === 'cookbook' ? cookbookPacks : axis === 'method' ? methodPacks : retrospectivePacks;
  // 펼침 오버레이용 그룹 (cookbook/method 축만)
  const activeGroups = axis === 'cookbook'
    ? cookbooks.map(c => ({label: c.name, items: c.items}))
    : methodGroups.map(g => ({label: g.method, items: g.items}));

  // 그룹별 통계 (회고 수, 회차 수)
  const retroStats = useMemo(() => {
    const groupMap = new Map<string, Recipe[]>();
    for (const r of recipes) {
      const groupKey = r.remakeGroupId ?? r.id;
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
      groupMap.get(groupKey)!.push(r);
    }
    const stats = new Map<string, {totalReviews: number; totalSessions: number}>();
    for (const [key, group] of groupMap) {
      const totalReviews = group.reduce((sum, r) => sum + (r.reviews?.length ?? 0), 0);
      stats.set(key, {totalReviews, totalSessions: group.length});
    }
    return stats;
  }, [recipes]);

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
    onAxisChange(id as GroupAxis);
  };

  const handleMenuPress = () => {
    setShowGroupFilterMenu(false);
    setCookbookMenuTarget(null);
    setShowMoreMenu(prev => !prev);
  };

  const handleOverlayPress = () => {
    setShowGroupFilterMenu(false);
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
    setShowMoreMenu(false);
    setExploreCookbookMenuTarget(null);
    positionMenu(position);
    setCookbookMenuTarget(prev => (prev === name ? null : name));
  };

  const handleExploreCookbookMenuPress = (name: string, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowGroupFilterMenu(false);
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
        title={axisLabel(t, axis, axisOverrides)}
        titleIcon={groupFilterMenuItems.find(i => i.id === axis)?.icon}
        titleIconColor={groupFilterMenuItems.find(i => i.id === axis)?.iconColor}
        showDropdown
        showAddButton={showAddButton}
        onTitlePress={handleTitlePress}
        onAddPress={() => { setCookbookEditTarget(null); setCookbookInitialOfficial(addAsOfficial); setShowCookbookDialog(true); }}
        onFilterPress={() => { setShowMoreMenu(false); setShowLayoutMenu(prev => !prev); }}
        filterIcon={viewMode === 'pack' ? IconCards : IconList}
        filterMenuOpen={showLayoutMenu}
        onMenuPress={() => { setShowLayoutMenu(false); handleMenuPress(); }}
        menuOpen={showMoreMenu}
        showMenuButton={moreMenuItems.length > 0}
        titleMenu={
          <Menu
            items={groupFilterMenuItems}
            selectedId={axis}
            visible={showGroupFilterMenu}
            onSelect={handleGroupFilterSelect}
          />
        }
        rightMenu={
          <>
            <Menu
              items={layoutMenuItems}
              selectedId={viewMode}
              visible={showLayoutMenu}
              onSelect={handleViewModeSelect}
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
                                  reviewCount={cookbook.items.reduce((sum, r) => sum + (r.reviews?.length ?? 0), 0)}
                                  layout="list"
                                  placeholderIcon={axisOverrides?.cookbook?.icon ?? IconBookFilled}
                                  placeholderIconColor={isUngrouped ? colors['foreground/on-surface-muted'] : colors[getColorVarKey(cookbookColors[cookbook.name] || DEFAULT_COOKBOOK_COLOR)]}
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
                                  reviewCount={cookbook.items.reduce((sum: number, r) => sum + (r.reviews?.length ?? 0), 0)}
                                  layout="list"
                                  placeholderIcon={IconExprolerBookFilled}
                                  placeholderIconColor={isExploreUngrouped ? colors['foreground/on-surface-muted'] : colors[getColorVarKey(ecColor)]}
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
                <Pressable style={[styles.sectionHeader, styles.retroHeader]} onPress={() => setShowReviewSheet(true)}>
                  <Text style={styles.retroHeaderTitle}>{t('group.retroNote')}</Text>
                  <IconChevronRight width={14} height={14} color={colors['foreground/on-surface-muted']} />
                </Pressable>
                {retrospectives.length > 0 ? (
                  <View>
                    {retrospectives.map((recipe, idx) => {
                      const groupKey = recipe.remakeGroupId ?? recipe.id;
                      const stats = retroStats.get(groupKey) ?? {totalReviews: 0, totalSessions: 1};
                      return (
                        <RecipeCard
                          key={recipe.id}
                          title={recipe.title}
                          cookbook={recipe.cookbook}
                          method={t('group.sessionCount', {count: stats.totalSessions})}
                          imageUrl={recipe.imageUri}
                          layout="list"
                          placeholderIcon={IconChartNoAxesGantt}
                          placeholderIconColor={colors['custom/light-blue-var']}
                          onPress={() => {
                            const targetId = recipe.remakeGroupId
                              ? recipes
                                  .filter(r => r.remakeGroupId === recipe.remakeGroupId || r.id === recipe.remakeGroupId)
                                  .sort((a, b) => parseSession(b.session).current - parseSession(a.session).current)[0]?.id ?? recipe.id
                              : recipe.id;
                            onRecipePress?.(targetId);
                          }}
                          hideDivider={idx === retrospectives.length - 1}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <RecipeCard
                    title=""
                    cookbook={t('group.emptyRetro')}
                    layout="list"
                    placeholderIcon={IconChartNoAxesGantt}
                    placeholderIconColor={colors['custom/light-blue-var']}
                    hideDivider
                  />
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
          items={COOKBOOK_MENU_ITEMS}
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
          items={COOKBOOK_MENU_ITEMS}
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

      {/* 회고 노트 바텀시트 */}
      <ReviewLogSheet
        visible={showReviewSheet}
        onClose={() => setShowReviewSheet(false)}
        recipes={retrospectives}
        allRecipes={recipes}
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
          onDownloadPdf={onDownloadPdf}
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
