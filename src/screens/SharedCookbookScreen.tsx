import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {collection, getDocs, query, where} from 'firebase/firestore';
import {AppBar} from '@components/Navigation';
import {RecipePackView} from '@components/RecipeGroups/RecipePackView';
import {IconArrowLeft} from '@components/Icon/IconIndex';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useColors} from '@contexts/ThemeContext';
import {db} from '@config/firebase';
import {goBackOr} from '@utils/navigation';
import {putSharedRecipes} from '@utils/sharedRecipeCache';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {Recipe} from '../types/recipe';

export interface SharedCookbookScreenProps {
  name: string;
  /** 있으면 이 사용자가 공개한 개인 북, 없으면 둘러보기 공식 북 */
  ownerUid?: string;
}

/**
 * 레시피북 공유 링크로 연 화면 — 기존 북 팩뷰 그대로.
 * 개인 북은 공개(public_cookbooks)된 동안만 읽힌다. 해제되면 '볼 수 없음'.
 */
export function SharedCookbookScreen({name, ownerUid}: SharedCookbookScreenProps) {
  const router = useRouter();
  const colors = useColors();
  const {t} = useTranslation();
  const {recipes: exploreRecipes} = useExploreRecipeContext();
  const [owned, setOwned] = useState<Recipe[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!ownerUid) return;
    // 규칙이 cookbook == 이름 제약을 보고 허용하므로 꼭 where로 거른다
    getDocs(query(collection(db, 'user_recipes', ownerUid, 'recipes'), where('cookbook', '==', name)))
      .then(snap => {
        const list = snap.docs.map(d => ({...(d.data() as Recipe), id: d.id}));
        if (list.length === 0) { setMissing(true); return; }
        putSharedRecipes(list);
        setOwned(list);
      })
      .catch(() => setMissing(true));
  }, [ownerUid, name]);

  const recipes = useMemo(
    () => ownerUid ? owned ?? [] : exploreRecipes.filter(r => r.cookbook === name && !r.hidden),
    [ownerUid, owned, exploreRecipes, name],
  );

  return (
    <View style={[styles.container, {backgroundColor: colors['background/surface']}]}>
      <RecipePackView
        recipes={recipes}
        onRecipePress={id => router.push(`/recipe/${id}?from=${ownerUid ? 'shared' : 'explore'}` as any)}
      />
      {missing && (
        <View style={styles.empty} pointerEvents="none">
          <Text style={[Typography.body.large, styles.emptyText, {color: colors['foreground/on-surface-muted']}]}>
            {t('sharedCookbook.expired')}
          </Text>
        </View>
      )}
      <AppBar centered title={name} leftIcon={IconArrowLeft} onLeftPress={() => goBackOr(router, '/explore')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  empty: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},
  emptyText: {textAlign: 'center'},
});
