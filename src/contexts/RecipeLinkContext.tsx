import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Image as ExpoImage} from 'expo-image';
import {BottomSheet} from '@components/BottomSheet';
import {RichText} from '@components/RichText/RichText';
import {withoutSecret} from '@utils/richText';
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
  // https://recipe/id — 예전에 https가 잘못 붙어 저장된 링크도 앱 안 링크로 읽는다
  const m = url.match(/^(?:bakle:\/\/|https?:\/\/)?\/?recipe\/([^/?#]+)/);
  return m ? m[1] : null;
}

/**
 * 링크 종류 — 그리는 모양과 여는 방법이 갈린다.
 *  - external: 바깥 주소(밑줄 + 화살표, 브라우저)
 *  - tip: 팁(밑줄만, 바텀시트)
 *  - recipe: 앱 안 레시피(밑줄만, 상세 위에 상세)
 *  - dead: 가리키는 레시피가 없거나 공개되지 않음 → 링크가 없는 것처럼 글자만
 */
export type RecipeLinkKind = 'external' | 'tip' | 'recipe' | 'dead';

interface RecipeLinkValue {
  /** 본문 링크 열기 — 팁은 바텀시트, 레시피는 앱 안 상세(위에 상세), 그 밖은 브라우저 */
  openLink: (url: string) => void;
  linkKind: (url: string) => RecipeLinkKind;
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

  // 앱 안 링크가 가리키는 레시피 — 내 것 또는 둘러보기. 숨김(비공개)이면 없는 것으로 본다(어드민도 사용자와 같게)
  const findTarget = useCallback((id: string): Recipe | undefined => {
    const target = recipes.find(r => r.id === id) ?? exploreRecipes.find(r => r.id === id);
    return target && !target.hidden ? target : undefined;
  }, [recipes, exploreRecipes]);

  const linkKind = useCallback((url: string): RecipeLinkKind => {
    const id = internalRecipeId(url);
    if (!id) return 'external';
    const target = findTarget(id);
    if (!target) return 'dead';
    return target.kind === 'tip' ? 'tip' : 'recipe';
  }, [findTarget]);

  const openLink = useCallback((url: string) => {
    const id = internalRecipeId(url);
    if (id) {
      const target = findTarget(id);
      if (!target) return; // 비공개·없는 레시피 — 열지 않는다(글자만 보인다)
      if (target.kind === 'tip') { setTip(target); return; }
      router.push(`/recipe/${id}` as any);
      return;
    }
    Linking.openURL(withoutSecret(url)).catch(() => { /* 열 수 없는 주소는 무시 */ });
  }, [findTarget, router]);

  const value = useMemo(() => ({openLink, linkKind}), [openLink, linkKind]);
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
    linkKind: (url: string) => (internalRecipeId(url) ? 'recipe' : 'external'),
    openLink: (url: string) => {
      const id = internalRecipeId(url);
      if (id) router.push(`/recipe/${id}` as any);
      else Linking.openURL(url).catch(() => {});
    },
  };
}

/** 팁 바텀시트 — 사진, 준비물(재료·도구), 내용(과정 설명 + 팁·주의), 조언. 있는 것만 */
function TipSheet({tip, onClose}: {tip: Recipe | null; onClose: () => void}) {
  const styles = useThemedStyles(createStyles);
  const content = useMemo(() => {
    if (!tip) return null;
    const steps = (tip.stepGroups?.length ? tip.stepGroups.flatMap(g => g.steps) : (tip.steps ?? []))
      .filter(s => s.description?.trim());
    const ingredients = (tip.ingredientGroups?.length ? tip.ingredientGroups.flatMap(g => g.ingredients) : [])
      .filter(i => i.name?.trim());
    const tools = (tip.toolGroups?.length ? tip.toolGroups.flatMap(g => g.tools) : (tip.tools ?? []))
      .filter(x => x.name?.trim());
    return {steps, ingredients, tools};
  }, [tip]);
  return (
    <BottomSheet visible={!!tip} onClose={onClose} title={tip?.title ?? ''} headerType="center">
      {tip && content && (
        <View style={styles.body}>
          {!!tip.imageUri && (
            <ExpoImage source={{uri: tip.imageUri}} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
          )}
          {content.ingredients.length > 0 && (
            <View style={styles.item}>
              {content.ingredients.map((ing, i) => (
                <RichText key={i} style={styles.text}>{`• ${ing.name}${ing.amount ? ` ${ing.amount}` : ''}`}</RichText>
              ))}
            </View>
          )}
          {content.tools.length > 0 && (
            <RichText style={styles.note}>{content.tools.map(x => x.name).join(', ')}</RichText>
          )}
          {content.steps.map((s, i) => (
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
