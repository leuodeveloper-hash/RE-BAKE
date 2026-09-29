import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {AppBar, APPBAR_CONTENT_BOTTOM} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {InlineBanner} from '@components/InlineBanner';
import {EmptyState} from '@components/EmptyState';
import {Menu} from '@components/Menu';
import {ListItem} from '@components/ListItem';
import {Switch} from '@components/Switch';
import {SectionHeader} from '@components/SectionHeader';
import {ReviewDialog} from '@components/Dialog';
import {Stamp} from '@components/Stamp';
import {StampDetailSheet} from '@components/BottomSheet';
import {getColorVarKey} from '@components/ColorPicker';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {useColors} from '@contexts/ThemeContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {TABLET_BREAKPOINT} from '@constants/breakpoints';
import {useTranslation} from '@contexts/LanguageContext';
import {useAuth} from '@contexts/AuthContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useRecipes, DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconClose, IconFilter, IconBookFilled, IconExprolerBookFilled, IconClockFilled, IconList, IconLayoutGrid, IconNoteFilled, IconEyeClosed} from '@components/Icon/IconIndex';
import {parseSession} from '@utils/session';
import type {Recipe} from '../src/types/recipe';

/**
 * 한 줄에 놓을 칸 수 — 화면 너비로 정한다.
 * 플랫폼으로 가르면 모바일 브라우저도 웹이라 8칸이 돼 스탬프가 너무 작아진다.
 */
function columnsFor(width: number): number {
  // 콘텐츠 폭이 800으로 제한돼 더 늘리면 스탬프만 작아진다 — 8이 상한
  return width >= TABLET_BREAKPOINT ? 8 : 6;
}
const GRID_GAP = Spacing.sm;

/**
 * 스탬프 칸 하나. 레시피북의 레시피 하나에 대응한다.
 * 아직 안 만든 칸도 자리를 차지한다 — 쿠폰처럼 "채울 자리"가 보여야 채우고 싶어진다.
 */
interface StampSlot {
  /** 이 칸이 가리키는 레시피(공식 레시피북 기준) */
  recipe: Recipe;
  /** 만든 시각(ISO). 없으면 아직 안 만든 칸 */
  madeAt?: string;
  /** 만든 횟수(회차 포함). 2 이상이면 겹쳐 표시 */
  count: number;
  /** 모은 순번 — 스탬프 모양을 정한다. 안 만든 칸은 의미 없음 */
  order: number;
}

type StampAxis = 'cookbook' | 'date';

/**
 * 방금 찍은 스탬프 등장 — 작게 시작해 살짝 튀어오른다.
 * 어디에 붙었는지 눈이 따라가도록.
 */
function HighlightPop({active, children}: {active: boolean; children: React.ReactNode}) {
  const scale = useRef(new Animated.Value(active ? 0.6 : 1)).current;
  useEffect(() => {
    if (!active) return;
    scale.setValue(0.6);
    Animated.spring(scale, {toValue: 1, friction: 5, tension: 140, useNativeDriver: true}).start();
  }, [active, scale]);
  if (!active) return <>{children}</>;
  return <Animated.View style={{transform: [{scale}]}}>{children}</Animated.View>;
}

/** 리스트 행의 스탬프 크기 */
const LIST_STAMP = 36;

/** 그리드·리스트가 같은 그림을 쓴다 — 채운 칸은 스탬프, 빈 칸은 점 */
function SlotStamp({slot, size, styles, highlight, outline}: {
  slot: StampSlot;
  size: number;
  styles: ReturnType<typeof createStyles>;
  /** 방금 찍은 칸 — 어디에 붙었는지 눈에 띄게 */
  highlight?: boolean;
  /** 점선 윤곽으로 — 한 칸도 못 채운 섹션의 첫 칸만 */
  outline?: boolean;
}) {
  if (!slot.madeAt) {
    // 아직 하나도 없으면 첫 칸만 점선으로 — 점만 늘어놓으면 너무 휑하다
    if (outline) return <Stamp size={size} outline />;
    return <View style={styles.emptyDot} />;
  }
  return (
    <HighlightPop active={!!highlight}>
      {/* 회차가 여럿이면 뒤에 한 장 더 깔아 "여러 번 만들었음"을 보인다 */}
      {slot.count > 1 && (
        <Stamp
          imageUri={slot.recipe.imageUri}
          size={size}
          index={slot.order}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Stamp
        imageUri={slot.recipe.imageUri}
        size={size}
        index={slot.order}
      />
    </HighlightPop>
  );
}

function formatMadeDate(iso: string, t: (k: string, p?: Record<string, unknown>) => string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return t('stamps.shortDate', {month: d.getMonth() + 1, day: d.getDate()});
}

export default function StampsRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  // 방금 찍고 넘어온 경우 — 그 스탬프를 강조하고 회고를 권한다
  const {just} = useLocalSearchParams<{just?: string}>();
  const {t} = useTranslation();
  const {user} = useAuth();
  const {open: openAuthSheet} = useAuthSheet();
  const colors = useColors();
  const {width} = useWindowDimensions();
  const {recipes, setSelectedExploreCookbook, cookbookColors} = useRecipes();
  // 회고는 레시피가 아니라 계정에 — 공식 레시피에도 쓸 수 있어야 한다
  const {saveReview, reviewOf} = useRecipeReviews();
  const {recipes: exploreRecipes, exploreCookbooks} = useExploreRecipeContext();
  const [axis, setAxis] = useState<StampAxis>('cookbook');
  const [axisMenu, setAxisMenu] = useState(false);
  const [selected, setSelected] = useState<StampSlot | null>(null);
  // 회고는 편집 화면까지 가지 않고 이 자리에서 쓴다
  const [reviewTarget, setReviewTarget] = useState<Recipe | null>(null);
  // 그리드가 기본 — 스탬프가 늘어선 모습 자체가 이 화면의 내용이다
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');
  // 빈 칸까지 보이면 길어진다 — 모은 것만 보고 싶을 때
  const [madeOnly, setMadeOnly] = useState(false);

  /**
   * 레시피 하나를 "만들었는지" 판단한다.
   *
   * 둘러보기 레시피는 가져와야 요리할 수 있으므로, 내 레시피 중 sourceId가 그것을
   * 가리키는 것에 스탬프가 있으면 원본 칸도 채워진 것으로 본다.
   * (가져와서 고쳐 만들어도 그 품목을 해낸 것이므로)
   */
  const madeIndex = useMemo(() => {
    const byRecipeId = new Map<string, {madeAt: string; count: number}>();
    const bump = (key: string, madeAt: string) => {
      const prev = byRecipeId.get(key);
      if (!prev) byRecipeId.set(key, {madeAt, count: 1});
      else byRecipeId.set(key, {
        madeAt: madeAt > prev.madeAt ? madeAt : prev.madeAt,
        count: prev.count + 1,
      });
    };
    for (const r of recipes) {
      if (!r.madeAt) continue;
      // 내 레시피 자체로도, 원본(가져온 출처)으로도 센다
      bump(r.remakeGroupId ?? r.id, r.madeAt);
      if (r.sourceId) bump(r.sourceId, r.madeAt);
    }
    return byRecipeId;
  }, [recipes]);

  /** 모은 순번 — 만든 시각 순으로 매긴다(스탬프 모양이 흔들리지 않게) */
  const orderIndex = useMemo(() => {
    const made = recipes.filter(r => r.madeAt);
    const byGroup = new Map<string, string>();
    for (const r of made) {
      const key = r.remakeGroupId ?? r.id;
      const prev = byGroup.get(key);
      if (!prev || r.madeAt! < prev) byGroup.set(key, r.madeAt!);
    }
    const sorted = [...byGroup.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    return new Map(sorted.map(([key], i) => [key, i]));
  }, [recipes]);

  /** 같은 회차 그룹의 내 레시피들 — 시트에서 회차별 회고를 보여준다 */
  const sessionsOf = useCallback((r: Recipe) => {
    const gid = r.remakeGroupId;
    if (!gid) return undefined;
    const group = recipes.filter(x => x.remakeGroupId === gid || x.id === gid);
    return group.length > 1 ? group : undefined;
  }, [recipes]);

  const handleSaveReview = useCallback((review: {evaluation: string; improvement: string}) => {
    if (!reviewTarget) return;
    saveReview(reviewTarget.id, review);
  }, [reviewTarget, saveReview]);

  const slotFor = useCallback((r: Recipe): StampSlot => {
    const key = r.remakeGroupId ?? r.id;
    const hit = madeIndex.get(key) ?? madeIndex.get(r.id);
    return {
      recipe: r,
      madeAt: hit?.madeAt,
      count: hit?.count ?? 0,
      order: orderIndex.get(key) ?? 0,
    };
  }, [madeIndex, orderIndex]);

  // 레시피북별 — 그 북의 레시피 전부가 칸이 된다(안 만든 것 포함)
  /**
   * 레시피북 대표 색 — 공식은 explore_cookbooks에, 내 북은 계정 설정에 있다.
   * 둘러보기·그룹 화면과 같은 색을 써야 어느 북인지 한눈에 이어진다.
   */
  const bookColor = useCallback((name: string) => {
    const official = exploreCookbooks.find(c => c.name === name)?.color;
    const mine = cookbookColors[name];
    const key = getColorVarKey((official as AvatarColor) || mine || DEFAULT_COOKBOOK_COLOR);
    return colors[key.replace('-var', '') as keyof typeof colors] as string;
  }, [exploreCookbooks, cookbookColors, colors]);

  const cookbookSections = useMemo(() => {
    const byBook = new Map<string, Recipe[]>();
    // 회차는 한 칸으로 — 3회차까지 만들어도 품목은 하나다
    const seen = new Set<string>();
    // 공식 레시피북과 내 레시피북을 함께 — 어느 쪽이든 만들면 스탬프가 찍힌다.
    // 가져온 레시피는 원본과 사본이 둘 다 있으므로 sourceId로 중복을 막는다.
    const importedSources = new Set(recipes.map(r => r.sourceId).filter(Boolean) as string[]);
    for (const r of [...exploreRecipes.filter(x => !importedSources.has(x.id)), ...recipes]) {
      const key = r.remakeGroupId ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const book = r.cookbook || '';
      if (!book) continue;
      const list = byBook.get(book);
      if (list) list.push(r); else byBook.set(book, [r]);
    }

    return [...byBook.entries()]
      .map(([book, list]) => {
        const slots = list.map(slotFor);
        const done = slots.filter(s => s.madeAt).length;
        // 공식 레시피북인지 — explore_cookbooks에 등록된 이름이면 공식
        const official = exploreCookbooks.some(c => c.name === book);
        return {key: book, title: book, slots, done, total: slots.length, official};
      })
      // 많이 채운 북이 위로 — 진행 중인 것을 먼저 보여준다
      .sort((a, b) => b.done - a.done || a.title.localeCompare(b.title));
  }, [exploreRecipes, recipes, slotFor, exploreCookbooks]);

  // 날짜별 — 만든 것만 월별로(안 만든 칸은 날짜가 없으니 자리도 없다)
  const dateSections = useMemo(() => {
    const made: StampSlot[] = [];
    const seen = new Set<string>();
    for (const r of recipes) {
      if (!r.madeAt) continue;
      const key = r.remakeGroupId ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      made.push(slotFor(r));
    }
    const byMonth = new Map<string, StampSlot[]>();
    for (const s of made) {
      const key = s.madeAt!.slice(0, 7); // YYYY-MM
      const list = byMonth.get(key);
      if (list) list.push(s); else byMonth.set(key, [s]);
    }
    return [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, slots]) => ({
        key,
        title: t('stamps.monthLabel', {month: Number(key.slice(5, 7))}),
        slots: slots.sort((a, b) => b.madeAt!.localeCompare(a.madeAt!)),
        done: slots.length,
        total: 0, // 날짜 축은 분모가 없다 — 진도 바를 감춘다
        official: false,
      }));
  }, [recipes, slotFor, t]);

  // 방금 찍은 레시피 — 회고가 아직 없을 때만 권유를 띄운다(쓰고 나면 사라진다)
  const justRecipe = useMemo(() => {
    if (!just) return undefined;
    const r = recipes.find(x => x.id === just);
    // 해제했으면 권유도 사라져야 한다 — 찍지도 않은 것에 회고를 권할 이유가 없다
    if (!r?.madeAt) return undefined;
    const rv = reviewOf(r.id);
    const hasReview = !!(rv?.evaluation?.trim() || rv?.improvement?.trim());
    return hasReview ? undefined : r;
  }, [just, recipes, reviewOf]);

  const allSections = axis === 'cookbook' ? cookbookSections : dateSections;
  /**
   * "만든 것만" — 빈 칸을 걷어낸다.
   * 진도(done/total)는 그대로 둬야 몇 개 남았는지 알 수 있다.
   */
  const sections = useMemo(() => {
    if (!madeOnly) return allSections;
    return allSections.map(sec => {
      const made = sec.slots.filter(sl => sl.madeAt);
      // 하나도 못 채운 섹션은 첫 칸(점선)을 남긴다 — 섹션째 사라지면
      // "없다"는 빈 화면이 떠서 무엇을 모으는 곳인지조차 안 보인다
      return {...sec, slots: made.length > 0 ? made : sec.slots.slice(0, 1)};
    });
  }, [allSections, madeOnly]);
  const madeCount = useMemo(() => recipes.filter(r => r.madeAt).length, [recipes]);

  // 화면 폭에 맞춰 칸 크기 산출 — 고정 px이면 넓은 화면에서 성기게 흩어진다
  const columns = columnsFor(width);
  const slotSize = useMemo(() => {
    const maxContent = Math.min(width, 800) - Spacing.md * 2;
    return Math.floor((maxContent - GRID_GAP * (columns - 1)) / columns);
  }, [width, columns]);

  const axisMenuItems = useMemo(() => [
    {id: 'cookbook', label: t('stamps.axisCookbook'), icon: IconBookFilled},
    {id: 'date', label: t('stamps.axisDate'), icon: IconClockFilled},
  ], [t]);

  const layoutMenuItems = useMemo(() => [
    {id: 'list', label: t('stamps.layoutList'), icon: IconList},
    {id: 'grid', label: t('stamps.layoutGrid'), icon: IconLayoutGrid},
  ], [t]);

  return (
    <View style={styles.container}>
      <ReviewDialog
        visible={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        value={reviewTarget ? reviewOf(reviewTarget.id) : undefined}
        onConfirm={handleSaveReview}
      />

      <AppBar
        centered
        title={t('stamps.title')}
        leftIcon={IconClose}
        onLeftPress={() => router.back()}
        rightIcon={IconFilter}
        onRightPress={() => setAxisMenu(v => !v)}
        rightMenu={
          <Menu
            sections={[
              {title: t('stamps.sectionAxis'), items: axisMenuItems, selectedId: axis},
              {title: t('stamps.sectionLayout'), items: layoutMenuItems, selectedId: layout},
              {
                title: t('stamps.sectionFilter'),
                // 켜고 끄는 값이라 스위치 — 행 전체를 눌러도 토글된다(프로필 설정과 같은 방식)
                content: (
                  <ListItem
                    title={t('stamps.filterHideEmpty')}
                    leading={{type: 'icon', icon: IconEyeClosed}}
                    onPress={() => setMadeOnly(v => !v)}
                    trailing={{
                      type: 'custom',
                      element: <Switch value={madeOnly} onValueChange={setMadeOnly} />,
                    }}
                    showDivider={false}
                  />
                ),
              },
            ]}
            visible={axisMenu}
            onSelect={(id) => {
              if (id === 'list' || id === 'grid') setLayout(id);
              else setAxis(id as StampAxis);
              setAxisMenu(false);
            }}
            onClose={() => setAxisMenu(false)}
          />
        }
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* 앱바가 절대위치로 떠 있어 그만큼 콘텐츠를 내린다.
              고정값이면 기기·플랫폼마다 어긋나므로 앱바 실제 높이 + 여백으로 잡는다.
              (상단 인셋은 바깥 SafeAreaView가 이미 밀어줬다) */}
          <View style={{height: APPBAR_CONTENT_BOTTOM + Spacing.sm}} />

          {sections.length === 0 ? (
            <EmptyState
              category="no-recipe"
              title={t('stamps.emptyTitle')}
              subtitle={t('stamps.emptySubtitle')}
            />
          ) : (
            <ContentContainer style={styles.content}>
              <InlineBanner
                icon={IconBookFilled}
                label={t('stamps.banner')}
                color="accent"
                size="medium"
                style={styles.banner}
              />

              {justRecipe && (
                // 방금 찍은 것에만 붙는다 — 예전 스탬프에까지 붙으면 할 일 목록이 된다
                <InlineBanner
                  icon={IconNoteFilled}
                  label={t('stamps.reviewPrompt', {title: justRecipe.title})}
                  color="default"
                  size="medium"
                  action={{
                    label: t('stamps.reviewAction'),
                    onPress: () => setReviewTarget(justRecipe),
                  }}
                  style={styles.banner}
                />
              )}

              {sections.map(section => (
                <View key={section.key} style={styles.section}>
                  <SectionHeader
                    title={section.title}
                    variant="strong"
                    leadingIcon={
                      axis !== 'cookbook' ? undefined
                        // 공식과 내 레시피북은 아이콘이 다르다(둘러보기와 같은 기준)
                        : section.official ? IconExprolerBookFilled : IconBookFilled
                    }
                    leadingIconColor={bookColor(section.key)}
                    progress={{done: section.done, total: section.total}}
                    onPress={axis !== 'cookbook' ? undefined : () => {
                      // 둘러보기는 쿼리 파라미터를 받지 않는다 — 선택 상태를 컨텍스트에
                      // 넣고 이동해야 그 레시피북이 펼쳐진 채로 열린다
                      setSelectedExploreCookbook(section.key);
                      router.push('/(tabs)/explore' as any);
                    }}
                    style={styles.sectionHeader}
                  />

                  {layout === 'grid' ? (
                    <View style={styles.grid}>
                      {section.slots.map((slot, i) => (
                        <Pressable
                          key={slot.recipe.id}
                          onPress={() => { if (!user) { openAuthSheet(); return; } setSelected(slot); }}
                          style={[styles.gridCell, {width: slotSize, height: slotSize}]}>
                          <SlotStamp slot={slot} size={slotSize} styles={styles} highlight={slot.recipe.id === just} outline={section.done === 0 && i === 0} />
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View>
                      {section.slots.map((slot, i) => (
                        <Pressable
                          key={slot.recipe.id}
                          onPress={() => { if (!user) { openAuthSheet(); return; } setSelected(slot); }}
                          style={styles.listRow}>
                          <View style={styles.listThumb}>
                            <SlotStamp slot={slot} size={LIST_STAMP} styles={styles} highlight={slot.recipe.id === just} outline={section.done === 0 && i === 0} />
                          </View>
                          <Text
                            style={[styles.listTitle, !slot.madeAt && styles.listTitleMuted]}
                            numberOfLines={1}>
                            {slot.recipe.title}
                          </Text>
                          <Text style={styles.listDate}>
                            {slot.madeAt ? formatMadeDate(slot.madeAt, t) : t('stamps.notMade')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ContentContainer>
          )}
        </ScrollView>
      </SafeAreaView>

      <StampDetailSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        recipe={selected?.recipe}
        madeAt={selected?.madeAt}
        stampIndex={selected?.order ?? 0}
        sessions={selected ? sessionsOf(selected.recipe) : undefined}
        onOpenRecipe={() => {
          const id = selected?.recipe.id;
          setSelected(null);
          if (id) router.push(`/recipe/${id}` as any);
        }}
        // 시트를 닫지 않는다 — 회고를 쓰고 나면 보던 스탬프로 돌아온다
        onWriteReview={() => { if (selected) setReviewTarget(selected.recipe); }}
      />

    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors['surface/dim']},
  safeArea: {flex: 1},
  scrollView: {flex: 1},
  scrollContent: {paddingBottom: 80},
  // 앱바 아래·화면 끝과 붙지 않게
  content: {paddingVertical: Spacing.sm},
  banner: {marginBottom: Spacing.lg},
  section: {marginBottom: Spacing.xl},
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  listThumb: {
    width: LIST_STAMP,
    height: LIST_STAMP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
    flex: 1,
  },
  listTitleMuted: {
    color: colors['foreground/on-surface-muted'],
  },
  listDate: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['fill/normal'],
  },
});
