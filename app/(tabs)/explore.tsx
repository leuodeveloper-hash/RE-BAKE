import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {doc, updateDoc, deleteField, deleteDoc} from 'firebase/firestore';
import {ExploreScreen} from '@screens/ExploreScreen';
import {PlanSheet} from '@components/PlanSheet';
import {PdfPreviewDialog} from '@components/Dialog';
import {generateRecipeListHtml} from '@utils/generateRecipeHtml';
import {useRecipes} from '@contexts/RecipeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useColors} from '@contexts/ThemeContext';
import {useAuth} from '@contexts/AuthContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useOnlineStatus} from '@hooks/useOnlineStatus';
import {useSubscription} from '@contexts/SubscriptionContext';
import {useTranslation} from '@contexts/LanguageContext';
import {db} from '@config/firebase';
import type {Recipe} from '../../src/types/recipe';

export default function ExploreRoute() {
  const router = useRouter();
  const colors = useColors();
  const {recipes, setRecipes} = useRecipes();
  const {showSnackbar} = useSnackbar();
  const {isAdmin, user} = useAuth();
  const isOnline = useOnlineStatus();
  const {recipes: exploreRecipes, exploreCookbooks, isLoading: exploreLoading, reload: exploreReload} = useExploreRecipeContext();
  const {isPro} = useSubscription();
  const {open: openAuthSheet} = useAuthSheet();
  const {t} = useTranslation();
  const isFreeUser = !isAdmin && !isPro;
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');

  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (prevOnlineRef.current && !isOnline) {
      showSnackbar(t('explore.networkDisconnected'));
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, showSnackbar, t]);

  const myRecipeSourceIds = useMemo(() => recipes.map(r => r.sourceId ?? r.id), [recipes]);

  const handleImportRecipe = useCallback((recipe: Recipe) => {
    if (!user) {
      setShowPlanSheet(true);
      return;
    }
    const copied: Recipe = {
      ...recipe,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
      // 둘러보기 원본 출처 박제 — 복사/회차로 내 것이 돼도 "원본: @작성자" 표시 유지
      sourceHandle: recipe.authorHandle,
      sourceAuthorId: recipe.authorId,
      createdAt: new Date().toISOString(),
    };
    setRecipes(prev => [...prev, copied]);
    showSnackbar(t('explore.savedToMyRecipes'), {
      label: t('explore.goTo'),
      onPress: () => router.navigate('/'),
    });
  }, [user, setRecipes, showSnackbar, router, t]);

  const handleRecipePress = useCallback((recipe: Recipe, locked?: boolean) => {
    const params = locked ? 'from=explore&locked=1' : 'from=explore';
    router.push(`/recipe/${recipe.id}?${params}` as any);
  }, [router]);

  const handleEditRecipe = useCallback((recipe: Recipe) => {
    router.push(`/recipe/edit/${recipe.id}?target=explore` as any);
  }, [router]);

  const handleAddRecipe = useCallback((cookbook?: string) => {
    const params = cookbook
      ? `target=explore&cookbook=${encodeURIComponent(cookbook)}`
      : 'target=explore';
    router.push(`/recipe/edit?${params}` as any);
  }, [router]);

  const handleDeleteRecipe = useCallback(async (recipe: Recipe) => {
    try {
      await updateDoc(doc(db, 'explore_recipes', recipe.id), {
        deletedAt: new Date().toISOString(),
      });
      showSnackbar(t('explore.recipeDeleted', {title: recipe.title}), {
        action: {
          label: t('explore.undo'),
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'explore_recipes', recipe.id), {
                deletedAt: deleteField(),
              });
            } catch {
              showSnackbar(t('explore.restoreFailed'));
            }
          },
        },
      });
    } catch {
      showSnackbar(t('explore.deleteFailed'));
    }
  }, [showSnackbar, t]);

  const handleComingSoon = useCallback(() => {
    showSnackbar(t('explore.comingSoon'));
  }, [showSnackbar, t]);

  // 공식 레시피 북 삭제 (어드민 전용): Firestore 문서 삭제 후 목록 재조회
  const handleDeleteExploreCookbook = useCallback(async (name: string) => {
    try {
      await deleteDoc(doc(db, 'explore_cookbooks', name));
      showSnackbar(t('explore.officialCookbookDeleted', {name}));
      await exploreReload();
    } catch {
      showSnackbar(t('explore.deleteFailed'));
    }
  }, [showSnackbar, exploreReload, t]);

  // 둘러보기 리스트 PDF 익스포트 (기존 리스트 HTML + PdfPreviewDialog 재사용)
  // cookbook이 주어지면(북 펼침 오버레이의 ⋮) 그 북 레시피만, 없으면 전체.
  const runListPdf = useCallback((cookbook?: string) => {
    const source = cookbook
      ? exploreRecipes.filter(r => r.cookbook === cookbook)
      : exploreRecipes;
    if (source.length === 0) {
      showSnackbar(t('explore.noRecipesToExport'));
      return;
    }
    const pdfData = source.map(r => ({
      title: r.title,
      cookbook: r.cookbook,
      method: r.method,
      reviewCount: r.reviewCount,
      time: r.time,
      servings: r.servings,
      session: r.session,
      ingredientGroups: r.ingredientGroups ?? [],
      tools: r.tools ?? [],
      steps: r.steps,
      stepGroups: r.stepGroups,
    }));
    setPdfHtml(generateRecipeListHtml(pdfData));
    setShowPdfPreview(true);
  }, [exploreRecipes, showSnackbar, t]);

  // 게스트면 로그인 유도 → 성공 시 PDF, 로그인 상태면 바로 PDF.
  // cookbook 인자가 있으면 해당 북만 출력.
  const handleDownloadPdf = useCallback((cookbook?: string) => {
    if (!user) {
      openAuthSheet({onSuccess: () => setTimeout(() => runListPdf(cookbook), 300)});
      return;
    }
    runListPdf(cookbook);
  }, [user, openAuthSheet, runListPdf]);

  return (
    <View style={[styles.container, {backgroundColor: colors['surface/dim']}]}>
      <ExploreScreen
        data={exploreRecipes}
        loading={exploreLoading}
        isAdmin={isAdmin}
        isOnline={isOnline}
        myRecipeIds={myRecipeSourceIds}
        onImportRecipe={handleImportRecipe}
        onRecipePress={handleRecipePress}
        onEditRecipe={isAdmin ? handleEditRecipe : undefined}
        onDeleteRecipe={isAdmin ? handleDeleteRecipe : undefined}
        onAddRecipe={isAdmin ? handleAddRecipe : undefined}
        onComingSoon={handleComingSoon}
        onRefresh={exploreReload}
        exploreCookbooks={exploreCookbooks}
        isFreeUser={isFreeUser}
        onDownloadPdf={handleDownloadPdf}
        onDeleteExploreCookbook={isAdmin ? handleDeleteExploreCookbook : undefined}
      />
      <PlanSheet
        visible={showPlanSheet}
        onClose={() => setShowPlanSheet(false)}
        isPro={isPro}
      />
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        html={pdfHtml}
        filename={t('explore.officialCookbook')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
