import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {AppBar} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {InlineBanner} from '@components/InlineBanner';
import {EmptyState} from '@components/EmptyState';
import {Menu} from '@components/Menu';
import {Stamp} from '@components/Stamp';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {useRecipes} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useExploreMade} from '@hooks/useExploreMade';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconArrowLeft, IconFilter, IconBookFilled, IconClockFilled} from '@components/Icon/IconIndex';
import {parseSession} from '@utils/session';
import type {Recipe} from '../src/types/recipe';

/** 한 줄에 놓을 우표 수 */
const COLUMNS = 4;
const GRID_GAP = Spacing.sm;

/** 우표 하나 = 만든 레시피 하나. 회차는 묶어서 겹쳐 보여준다. */
interface StampEntry {
  /** 대표(최신) 레시피 */
  recipe: Recipe;
  /** 만든 시각 — 정렬·날짜 표시용 */
  madeAt: string;
  /** 같은 회차 그룹에서 만든 횟수(2 이상이면 겹쳐 표시) */
  count: number;
}

type StampAxis = 'cookbook' | 'date';

export default function StampsRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {t} = useTranslation();
  const {width} = useWindowDimensions();
  const {recipes} = useRecipes();
  const {recipes: exploreRecipes} = useExploreRecipeContext();
  const {made: exploreMade} = useExploreMade();
  const [axis, setAxis] = useState<StampAxis>('cookbook');
  const [axisMenu, setAxisMenu] = useState(false);

  // 만든 레시피만 모은다. 둘러보기는 레시피 바깥(계정)에 기록이 있어 따로 합친다.
  const entries = useMemo<StampEntry[]>(() => {
    const byGroup = new Map<string, StampEntry>();

    const add = (r: Recipe, madeAt: string) => {
      // 회차(remakeGroup)는 한 자리에 겹쳐 쌓는다 — 대표는 최신 회차
      const key = r.remakeGroupId ?? r.id;
      const prev = byGroup.get(key);
      if (!prev) {
        byGroup.set(key, {recipe: r, madeAt, count: 1});
        return;
      }
      const newer = parseSession(r.session).current > parseSession(prev.recipe.session).current;
      byGroup.set(key, {
        recipe: newer ? r : prev.recipe,
        madeAt: madeAt > prev.madeAt ? madeAt : prev.madeAt,
        count: prev.count + 1,
      });
    };

    for (const r of recipes) if (r.madeAt) add(r, r.madeAt);
    for (const r of exploreRecipes) {
      const at = exploreMade[r.id];
      if (at) add(r, at);
    }
    return [...byGroup.values()].sort((a, b) => b.madeAt.localeCompare(a.madeAt));
  }, [recipes, exploreRecipes, exploreMade]);

  // 섹션: 레시피북별(진도 표시) 또는 만든 월별
  const sections = useMemo(() => {
    if (axis === 'date') {
      const byMonth = new Map<string, StampEntry[]>();
      for (const e of entries) {
        const key = e.madeAt.slice(0, 7); // YYYY-MM
        (byMonth.get(key) ?? byMonth.set(key, []).get(key)!).push(e);
      }
      return [...byMonth.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, items]) => ({
          key,
          title: t('stamps.monthLabel', {month: Number(key.slice(5, 7))}),
          progress: undefined as string | undefined,
          items,
        }));
    }

    // 레시피북별 — 분모는 그 북의 레시피 수(회차는 1개로 묶어 센다)
    const totalOf = (cookbook: string) => {
      const groups = new Set<string>();
      for (const r of [...recipes, ...exploreRecipes]) {
        if ((r.cookbook || '') !== cookbook) continue;
        groups.add(r.remakeGroupId ?? r.id);
      }
      return groups.size;
    };

    const byBook = new Map<string, StampEntry[]>();
    for (const e of entries) {
      const key = e.recipe.cookbook || '';
      (byBook.get(key) ?? byBook.set(key, []).get(key)!).push(e);
    }
    return [...byBook.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([key, items]) => ({
        key: key || '__none__',
        title: key || t('stamps.noCookbook'),
        progress: `${items.length}/${totalOf(key)}`,
        items,
      }));
  }, [axis, entries, recipes, exploreRecipes, t]);

  // 화면 폭에 맞춰 우표 크기 산출 — 고정 px이면 넓은 화면에서 성기게 흩어진다
  const stampSize = useMemo(() => {
    const maxContent = Math.min(width, 800) - Spacing.md * 2;
    return Math.floor((maxContent - GRID_GAP * (COLUMNS - 1)) / COLUMNS);
  }, [width]);

  const handleStampPress = useCallback((entry: StampEntry) => {
    router.push(`/recipe/${entry.recipe.id}` as any);
  }, [router]);

  const axisMenuItems = useMemo(() => [
    {id: 'cookbook', label: t('stamps.axisCookbook'), icon: IconBookFilled},
    {id: 'date', label: t('stamps.axisDate'), icon: IconClockFilled},
  ], [t]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          {entries.length === 0 ? (
            <EmptyState
              category="no-recipe"
              title={t('stamps.emptyTitle')}
              subtitle={t('stamps.emptySubtitle')}
            />
          ) : (
            <ContentContainer>
              <InlineBanner
                icon={IconBookFilled}
                label={t('stamps.banner')}
                color="warning"
                size="medium"
                style={styles.banner}
              />

              {sections.map(section => (
                <View key={section.key} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.progress && (
                      <Text style={styles.sectionProgress}>{section.progress}</Text>
                    )}
                  </View>
                  <View style={styles.grid}>
                    {section.items.map((entry, i) => (
                      <Pressable
                        key={entry.recipe.id}
                        onPress={() => handleStampPress(entry)}
                        style={{width: stampSize, height: stampSize}}>
                        {/* 회차가 여럿이면 뒤에 한 장 더 깔아 "여러 번 만들었음"을 보인다 */}
                        {entry.count > 1 && (
                          <Stamp
                            imageUri={entry.recipe.imageUri}
                            size={stampSize}
                            rotate={-6}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        <Stamp
                          imageUri={entry.recipe.imageUri}
                          size={stampSize}
                          // 붙인 느낌 — 규칙적이면 인쇄물처럼 보여 살짝씩 다르게 준다
                          rotate={((i * 37) % 9) - 4}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ContentContainer>
          )}
        </ScrollView>
      </SafeAreaView>

      <AppBar
        centered
        title={t('stamps.title')}
        leftIcon={IconArrowLeft}
        onLeftPress={() => router.back()}
        rightIcon={IconFilter}
        onRightPress={() => setAxisMenu(v => !v)}
        rightMenu={
          <Menu
            items={axisMenuItems}
            selectedId={axis}
            visible={axisMenu}
            onSelect={(id) => { setAxis(id as StampAxis); setAxisMenu(false); }}
            onClose={() => setAxisMenu(false)}
          />
        }
      />
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors['surface/dim']},
  safeArea: {flex: 1},
  scrollView: {flex: 1},
  scrollContent: {paddingBottom: 80},
  banner: {marginBottom: Spacing.md},
  section: {marginBottom: Spacing.xl},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.smd,
  },
  sectionTitle: {
    ...Typography.label.large,
    color: colors['foreground/on-surface-muted'],
  },
  sectionProgress: {
    ...Typography.label.large,
    color: colors['foreground/on-surface-muted'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
});
