import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Image as ExpoImage} from 'expo-image';
import {BottomSheet} from '@components/BottomSheet';
import {RichText} from '@components/RichText/RichText';
import {useRecipes} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {Recipe} from '../types/recipe';

/** 앱 안 레시피 링크 — recipe/{id}, /recipe/{id}, bakle://recipe/{id} */
export function internalRecipeId(url: string): string | null {
  const m = url.match(/^(?:bakle:\/\/)?\/?recipe\/([^/?#]+)/);
  return m ? m[1] : null;
}

interface RecipeLinkValue {
  /** 본문 링크 열기 — 팁은 바텀시트, 레시피는 앱 안 상세(위에 상세), 그 밖은 브라우저 */
  openLink: (url: string) => void;
  /** 팁을 가리키는 링크인지 — 팁 링크는 밑줄만(화살표·색 없이) 그린다 */
  isTipLink: (url: string) => boolean;
}

const RecipeLinkContext = createContext<RecipeLinkValue | null>(null);

/**
 * 본문 링크를 종류별로 연다.
 * 팁은 짧아서 그 자리에서 바텀시트로 보고 닫는다. 시트는 이 Provider가 놓인 곳에 그려지므로,
 * 요리모드처럼 이미 전체화면 창(Modal) 안이면 그 안에도 Provider를 둬야 시트가 그 위에 뜬다(iOS).
 */
export function RecipeLinkProvider({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const {recipes} = useRecipes();
  const {recipes: exploreRecipes} = useExploreRecipeContext();
  const [tip, setTip] = useState<Recipe | null>(null);

  const openLink = useCallback((url: string) => {
    const id = internalRecipeId(url);
    if (id) {
      const target = recipes.find(r => r.id === id) ?? exploreRecipes.find(r => r.id === id);
      if (target?.kind === 'tip') { setTip(target); return; }
      router.push(`/recipe/${id}` as any);
      return;
    }
    Linking.openURL(url).catch(() => { /* 열 수 없는 주소는 무시 */ });
  }, [recipes, exploreRecipes, router]);

  const isTipLink = useCallback((url: string) => {
    const id = internalRecipeId(url);
    if (!id) return false;
    return (recipes.find(r => r.id === id) ?? exploreRecipes.find(r => r.id === id))?.kind === 'tip';
  }, [recipes, exploreRecipes]);

  const value = useMemo(() => ({openLink, isTipLink}), [openLink, isTipLink]);
  return (
    <RecipeLinkContext.Provider value={value}>
      {children}
      <TipSheet tip={tip} onClose={() => setTip(null)} />
    </RecipeLinkContext.Provider>
  );
}

/** Provider 밖이면 예전처럼 — 레시피는 상세로, 그 밖은 브라우저 */
export function useRecipeLink(): RecipeLinkValue {
  const ctx = useContext(RecipeLinkContext);
  const router = useRouter();
  return ctx ?? {
    isTipLink: () => false,
    openLink: (url: string) => {
      const id = internalRecipeId(url);
      if (id) router.push(`/recipe/${id}` as any);
      else Linking.openURL(url).catch(() => {});
    },
  };
}

/** 팁 바텀시트 — 사진, 내용(과정 설명), 덧붙임(팁·주의), 조언 */
function TipSheet({tip, onClose}: {tip: Recipe | null; onClose: () => void}) {
  const styles = useThemedStyles(createStyles);
  const lines = useMemo(() => {
    if (!tip) return [];
    const steps = tip.stepGroups?.length ? tip.stepGroups.flatMap(g => g.steps) : (tip.steps ?? []);
    return steps.filter(s => s.description?.trim());
  }, [tip]);
  return (
    <BottomSheet visible={!!tip} onClose={onClose} title={tip?.title ?? ''}>
      {tip && (
        <View style={styles.body}>
          {!!tip.imageUri && (
            <ExpoImage source={{uri: tip.imageUri}} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
          )}
          {lines.map((s, i) => (
            <View key={i} style={styles.item}>
              <RichText style={styles.text}>{s.description}</RichText>
              {!!s.tip?.trim() && <RichText style={styles.note}>{s.tip}</RichText>}
              {!!s.caution?.trim() && <RichText style={[styles.note, styles.caution]}>{s.caution}</RichText>}
            </View>
          ))}
          {!!tip.advice?.trim() && <RichText style={styles.text}>{tip.advice}</RichText>}
        </View>
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius['radius-lg'],
  },
  item: {
    gap: Spacing.xs,
  },
  text: {
    ...Typography.body.large,
    color: colors['foreground/on-surface'],
  },
  note: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-muted'],
  },
  caution: {
    color: colors['custom/yellow-var'],
  },
});
