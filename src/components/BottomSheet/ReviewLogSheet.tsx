import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {TextInput as StyledTextInput} from '@components/TextInput';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {EmptyState} from '@components/EmptyState';
import {emptyRetrospectiveMessage} from '@components/RecipeGroups/groupAxis';
import {AppIcon} from '@components/Icon/AppIcon';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import type {Recipe} from '../../types/recipe';
import type {ReviewData} from '@components/Dialog/ReviewDialog';
import {parseSession} from '@utils/session';
import {
  IconChartNoAxesGantt,
  IconCornerDownRight,
  IconSearch,
} from '@components/Icon/IconIndex';

export interface ReviewLogSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Depth 1용: 회고가 있는 레시피 목록 */
  recipes?: Recipe[];
  /** 다회차 그룹 계산용 전체 레시피 */
  allRecipes?: Recipe[];
  /** Depth 2 직접 진입용: 선택된 레시피 정보 */
  selectedRecipe?: {id: string; title: string; imageUri?: string};
  /** Depth 2 직접 진입용: 미리 계산된 세션별 회고 */
  sessionReviews?: {id: string; label: string; reviews: ReviewData[]}[];
  /** 회고가 없을 때 보여줄 '만들었는데 회고 없는' 레시피 — 누르면 onWriteReview */
  writeCandidates?: Recipe[];
  onWriteReview?: (recipe: Recipe) => void;
  /** 상세(회차별 회고)에서 회고 줄을 누르면 — 그 회차 레시피 id로 수정 시트를 연다 */
  onEditReview?: (recipeId: string) => void;
  /** 레시피 프레스 콜백 (GroupScreen에서 상세로 이동) */
  onRecipePress?: (recipeId: string) => void;
}

export function ReviewLogSheet({
  visible,
  onClose,
  recipes,
  allRecipes,
  selectedRecipe: selectedRecipeProp,
  sessionReviews: sessionReviewsProp,
  writeCandidates,
  onWriteReview,
  onEditReview,
  onRecipePress,
}: ReviewLogSheetProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  // 회고는 계정에 저장된다 — 레시피의 reviews만 세면 새 회고가 빠진다
  const {reviewsOf} = useRecipeReviews();

  // 모드: selectedRecipeProp 있으면 detail로 시작
  const [mode, setMode] = useState<'list' | 'detail'>(selectedRecipeProp ? 'detail' : 'list');
  const [selectedRetro, setSelectedRetro] = useState<Recipe | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<any>(null);

  // visible 변경 시 상태 초기화
  useEffect(() => {
    if (visible) {
      setMode(selectedRecipeProp ? 'detail' : 'list');
      setSelectedRetro(null);
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [visible, selectedRecipeProp]);

  // 그룹별 통계 (회고 수, 회차 수)
  const retroStats = useMemo(() => {
    if (!allRecipes) return new Map<string, {totalReviews: number; totalSessions: number}>();
    const groupMap = new Map<string, Recipe[]>();
    for (const r of allRecipes) {
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
  }, [allRecipes, reviewsOf]);

  // --- Depth 2: 세션별 회고 계산 ---

  // GroupScreen에서 진입: selectedRetro 기반으로 세션 회고 계산
  const computedSessionReviews = useMemo(() => {
    if (!selectedRetro || !allRecipes) return [];
    if (selectedRetro.remakeGroupId) {
      const group = allRecipes
        .filter(r => r.remakeGroupId === selectedRetro.remakeGroupId || r.id === selectedRetro.remakeGroupId)
        .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current);
      if (group.length >= 2) {
        return group.map(r => ({
          id: r.id,
          label: t('reviewLog.sessionLabel', {count: parseSession(r.session).current}),
          reviews: reviewsOf(r),
        }));
      }
    }
    return [{
      id: selectedRetro.id,
      label: selectedRetro.title,
      reviews: reviewsOf(selectedRetro),
    }];
  }, [selectedRetro, allRecipes, t, reviewsOf]);

  // 최종 sessionReviews: prop 우선, 아니면 계산값
  const sessionReviews = sessionReviewsProp ?? computedSessionReviews;

  // 모든 세션의 회고를 합친 flat 리스트
  const allReviews = useMemo(() =>
    sessionReviews.flatMap(s => s.reviews),
  [sessionReviews]);

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return allReviews;
    const q = searchQuery.trim().toLowerCase();
    return allReviews.filter(rv =>
      rv.evaluation?.toLowerCase().includes(q) ||
      rv.improvement?.toLowerCase().includes(q),
    );
  }, [allReviews, searchQuery]);

  // Depth 1: 레시피 검색
  const filteredRecipes = useMemo(() => {
    if (!recipes || !searchQuery.trim()) return recipes ?? [];
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter(r => r.title.toLowerCase().includes(q));
  }, [recipes, searchQuery]);

  // 현재 표시 중인 레시피 이미지 (썸네일 폴백용)
  const currentImageUri = selectedRecipeProp?.imageUri ?? selectedRetro?.imageUri;

  // --- 핸들러 ---

  const handleRetroPress = useCallback((recipe: Recipe) => {
    setSelectedRetro(recipe);
    setMode('detail');
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedRetro(null);
    setMode('list');
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleToggleSearch = useCallback(() => {
    setShowSearch(prev => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      return !prev;
    });
    setSearchQuery('');
  }, []);

  const handleCancelSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  // 현재 레시피 제목 (헤더용)
  const currentTitle = selectedRecipeProp?.title ?? selectedRetro?.title ?? '';
  // 뒤로가기 가능 여부 (GroupScreen에서 진입했을 때만)
  const canGoBack = !selectedRecipeProp && mode === 'detail';

  const headerNode = (
    <View style={styles.header}>
      {showSearch ? (
        <View style={styles.searchBar}>
          <StyledTextInput
            ref={searchInputRef}
            placeholder={mode === 'list' ? t('reviewLog.searchRecipePlaceholder') : t('reviewLog.searchReviewPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style="ghost"
            size="small"
            autoFocus
            leadingIcon={<AppIcon icon={IconSearch} size="xs" color={colors['foreground/on-surface-muted']} />}
          />
          <Pressable onPress={handleCancelSearch} hitSlop={8}>
            <Text style={styles.cancelText}>{t('reviewLog.cancel')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.titleRow}>
            <AppIcon icon={IconChartNoAxesGantt} size="xs" color={colors['foreground/on-surface-muted']} />
            {mode === 'detail' ? (
              <>
                {canGoBack ? (
                  <Pressable onPress={handleBackToList}>
                    <Text style={styles.titleMuted}>{t('reviewLog.title')}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.titleMuted}>회고 노트</Text>
                )}
                <Text style={styles.titleSlash}>/</Text>
                <Text style={styles.title} numberOfLines={1}>{currentTitle}</Text>
              </>
            ) : (
              <Text style={styles.title}>{t('reviewLog.title')}</Text>
            )}
          </View>
          <Pressable onPress={handleToggleSearch} hitSlop={8}>
            <AppIcon icon={IconSearch} size="xs" color={colors['foreground/on-surface-muted']} />
          </Pressable>
        </>
      )}
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} header={headerNode}>
      {mode === 'list' ? (
        /* ---- Depth 1: 레시피 목록 ---- */
        <View style={styles.content}>
          {filteredRecipes.length > 0 ? (
            // 목록 자체가 회고 내용이다 — 레시피 이름만 늘어놓으면 한 번 더 눌러야 뭘 썼는지 안다.
            // 회고 하나가 한 줄. 같은 레시피 묶음(다시 만들기)은 최근 회차부터.
            filteredRecipes.flatMap(recipe => {
              const groupKey = recipe.remakeGroupId ?? recipe.id;
              const groupRecipes = (allRecipes ?? []).filter(r => (r.remakeGroupId ?? r.id) === groupKey);
              const sessions = (groupRecipes.length > 0 ? groupRecipes : [recipe])
                .sort((a, b) => parseSession(b.session).current - parseSession(a.session).current);
              return sessions.flatMap(r => reviewsOf(r).map((rv, j) => {
                const evaluation = rv.evaluation?.trim();
                const improvement = rv.improvement?.trim();
                return (
                  <RecipeCard
                    key={`${r.id}-${j}`}
                    title={evaluation || improvement || ''}
                    customSubtitle={evaluation && improvement ? improvement : undefined}
                    subtitleIcon={evaluation && improvement ? IconCornerDownRight : undefined}
                    subtitleNumberOfLines={2}
                    imageUrl={rv.photos?.[0] ?? r.imageUri ?? recipe.imageUri}
                    layout="list"
                    size="small"
                    placeholderIcon={IconChartNoAxesGantt}
                    placeholderIconColor={colors['custom/light-blue-var']}
                    onPress={() => handleRetroPress(recipe)}
                  />
                );
              }));
            })
          ) : (
            <View style={styles.empty}>
              {searchQuery.trim() ? (
                <EmptyState
                  variant="simple"
                  title={t('reviewLog.noRecipeSearchResult', {query: searchQuery.trim()})}
                />
              ) : writeCandidates && writeCandidates.length > 0 ? (
                // 팩뷰 빈 노트와 같은 안내 — 만든 레시피로 바로 회고 쓰기
                <View style={styles.writeList}>
                  <Text style={styles.writePrompt}>{t('retrospectiveNote.writePrompt')}</Text>
                  {writeCandidates.map(r => (
                    <RecipeCard
                      key={r.id}
                      title={r.title}
                      customSubtitle={t('retrospectiveNote.writeAction')}
                      imageUrl={r.imageUri}
                      layout="list"
                      size="small"
                      placeholderIcon={IconChartNoAxesGantt}
                      placeholderIconColor={colors['custom/light-blue-var']}
                      onPress={() => onWriteReview?.(r)}
                    />
                  ))}
                </View>
              ) : (
                // 만든 레시피가 없으면 예시 회고 — 어떤 걸 남기는 곳인지 보여준다
                <View style={styles.writeList}>
                  <Text style={styles.writePrompt}>{t('retrospectiveNote.emptyGuide')}</Text>
                  <View style={styles.exampleCard}>
                    <RecipeCard
                      title={t('retrospectiveNote.exampleEvaluation')}
                      customSubtitle={t('retrospectiveNote.exampleImprovement')}
                      subtitleIcon={IconCornerDownRight}
                      layout="list"
                      size="small"
                      placeholderIcon={IconChartNoAxesGantt}
                      placeholderIconColor={colors['custom/light-blue-var']}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        /* ---- Depth 2: 회차별 회고 목록 ---- */
        <View style={styles.content}>
          {searchQuery.trim() ? (
            filteredReviews.length > 0 ? (
              filteredReviews.map((rv, j) => (
                <RecipeCard
                  key={j}
                  title={rv.evaluation || ''}
                  customSubtitle={rv.improvement || undefined}
                  subtitleIcon={rv.improvement ? IconCornerDownRight : undefined}
                  imageUrl={rv.photos?.[0] ?? currentImageUri}
                  layout="list"
                  size="small"
                  leadingNumber={j + 1}
                  placeholderIcon={IconChartNoAxesGantt}
                  placeholderIconColor={colors['custom/light-blue-var']}
                />
              ))
            ) : (
              <View style={styles.empty}>
                <EmptyState
                  variant="simple"
                  title={t('reviewLog.noReviewSearchResult', {query: searchQuery.trim()})}
                />
              </View>
            )
          ) : sessionReviews.length > 0 ? (
            sessionReviews.map((session) => {
              const isMulti = sessionReviews.length > 1;
              const sessionNum = parseInt(session.label);
              return (
                <View key={session.id}>
                  {session.reviews.length > 0 ? (
                    session.reviews.map((rv, j) => (
                      <RecipeCard
                        key={`${session.id}-${j}`}
                        title={rv.evaluation || ''}
                        customSubtitle={rv.improvement || undefined}
                        subtitleIcon={rv.improvement ? IconCornerDownRight : undefined}
                        imageUrl={rv.photos?.[0] ?? currentImageUri}
                        layout="list"
                        size="small"
                        leadingNumber={isMulti ? sessionNum : j + 1}
                        placeholderIcon={IconChartNoAxesGantt}
                        placeholderIconColor={colors['custom/light-blue-var']}
                        // 회고 줄을 누르면 그 회차 회고 수정(없으면 예전처럼 여러 회차일 때 그 레시피로)
                        onPress={onEditReview
                          ? () => onEditReview(session.id)
                          : isMulti ? () => { onClose(); onRecipePress?.(session.id); } : undefined}
                      />
                    ))
                  ) : (
                    <RecipeCard
                      title=""
                      customSubtitle={t('reviewLog.noReviewWritten')}
                      imageUrl={currentImageUri}
                      layout="list"
                      size="small"
                      leadingNumber={sessionNum}
                      placeholderIcon={IconChartNoAxesGantt}
                      placeholderIconColor={colors['custom/light-blue-var']}
                      onPress={() => { onClose(); onRecipePress?.(session.id); }}
                    />
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <EmptyState variant="simple" title={t('reviewLog.emptyReviews')} />
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  writeList: {
    alignSelf: 'stretch',
    gap: Spacing.xs,
  },
  writePrompt: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
    paddingHorizontal: Spacing.smd,
    paddingBottom: Spacing.xs,
  },
  // 예시 회고 — 흐리게
  exampleCard: {
    opacity: 0.5,
  },
  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: '600',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface'],
    flexShrink: 1,
    marginTop: FONT_BASELINE_OFFSET,
  },
  titleMuted: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: '600',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  titleSlash: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: '600',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cancelText: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
    marginTop: FONT_BASELINE_OFFSET,
  },

  // 콘텐츠
  content: {
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.lg,
  },

  // 빈 상태
  empty: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.smd,
  },
});
