import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {HomeScreen} from '@screens/HomeScreen';
import {AuthorBadge} from '@components/AuthorBadge';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useAuthor} from '@hooks/useAuthor';
import {useTranslation} from '@contexts/LanguageContext';
import {useColors} from '@contexts/ThemeContext';
import {resolveAuthorHandle} from '../../src/types/author';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

/**
 * 작성자 홈 — URL은 항상 @handle 기반(/u/{handle}). 핸들=주소가 일치한다.
 * handle로 실제 authorId(레시피 소유의 불변 키)를 찾아 데이터를 필터링한다.
 * 홈(HomeScreen)과 동일한 구조. 차이는 (1) 이 작성자로 필터, (2) 닫기(X) 버튼.
 */
export default function AuthorHomeRoute() {
  const {handle: routeHandle} = useLocalSearchParams<{handle: string}>();
  const router = useRouter();
  const {recipes: exploreRecipes} = useExploreRecipeContext();

  // URL handle → authorId 해석. 둘러보기 레시피에 박제된 표시 handle과 매칭.
  const authorId = useMemo(() => {
    if (!routeHandle) return undefined;
    const match = exploreRecipes.find(
      r => r.authorId && resolveAuthorHandle(r.authorId, r.authorHandle) === routeHandle,
    );
    // 못 찾으면 slug 자체를 authorId로 폴백(구 링크/직접 입력 호환).
    return match?.authorId ?? routeHandle;
  }, [routeHandle, exploreRecipes]);

  const {author} = useAuthor(authorId);
  const {t} = useTranslation();
  const colors = useColors();

  const authorRecipes = useMemo(
    () => exploreRecipes.filter(r => r.authorId === authorId && !r.hidden),
    [exploreRecipes, authorId],
  );

  // 이 작성자의 레시피 북 종류 수(고유 cookbook 이름)
  const cookbookCount = useMemo(
    () => new Set(authorRecipes.map(r => r.cookbook).filter(Boolean)).size,
    [authorRecipes],
  );

  const snapshot = authorRecipes[0];
  const handle = resolveAuthorHandle(authorId, author?.handle ?? snapshot?.authorHandle) ?? routeHandle ?? 'guest';
  const avatarSeed = author?.avatarSeed ?? snapshot?.authorAvatarSeed ?? authorId ?? handle;

  const authorBadge = (
    <AuthorBadge
      authorId={authorId}
      displayName={`@${handle}`}
      handle={handle}
      avatarSeed={avatarSeed}
      recipeCount={authorRecipes.length}
      bare
    />
  );

  // 축 셀렉터 메뉴 최상단: 아바타 + (1줄 @핸들 / 2줄 "레시피 북 N · 레시피 M")
  const menuHeaderNode = (
    <>
      {/* 아바타는 앱바 셀렉터에 이미 있어 메뉴 헤더엔 텍스트만(@핸들 / 레시피북·레시피수). */}
      <View style={styles.menuHeader}>
        <View style={styles.menuHeaderText}>
          <Text style={styles.menuHeaderHandle} numberOfLines={1}>@{handle}</Text>
          <Text style={styles.menuHeaderMeta} numberOfLines={1}>
            {t('authorHome.cookbookCount', {count: cookbookCount})}
            {'  ·  '}
            {t('authorHome.recipeCount', {count: authorRecipes.length})}
          </Text>
        </View>
      </View>
      <View style={[styles.menuHeaderDivider, {backgroundColor: colors['border/muted']}]} />
    </>
  );

  // X: 이전 화면이 있으면 back, 없으면(딥링크·직접진입) 둘러보기 홈으로.
  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/explore' as any);
  };

  return (
    <HomeScreen
      authorId={authorId}
      onBack={handleClose}
      authorBadge={authorBadge}
      menuHeaderNode={menuHeaderNode}
    />
  );
}

const styles = StyleSheet.create({
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
  },
  menuHeaderText: {
    flex: 1,
    gap: 1,
  },
  menuHeaderHandle: {
    fontFamily: Typography.body.large.fontFamily,
    fontSize: Typography.body.large.fontSize,
    fontWeight: Typography.body.large.fontWeight as '500',
    lineHeight: Typography.body.large.lineHeight,
  },
  menuHeaderMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  menuHeaderDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
});
