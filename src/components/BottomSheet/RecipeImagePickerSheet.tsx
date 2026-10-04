import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View, useWindowDimensions} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import {BottomSheet, sheetTileWidth} from './BottomSheet';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {IconThumbnail} from '@components/Thumbnail';
import {IconButton} from '@components/IconButton';
import {IconNoteFilled, IconSearch} from '@components/Icon/IconIndex';
import {TextInput} from '@components/TextInput';
import {AppIcon} from '@components/Icon/AppIcon';
import {EmptyState} from '@components/EmptyState';
import {useColors} from '@contexts/ThemeContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import type {Recipe} from '../../types/recipe';

export interface RecipeImagePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 내 레시피 */
  myRecipes?: Recipe[];
  /** 둘러보기 레시피 */
  exploreRecipes?: Recipe[];
  /** 고른 사진 — 레시피의 여러 장 중 하나 */
  onPick: (uri: string) => void;
  /** 시트가 완전히 내려간 뒤 */
  onDismissed?: () => void;
  /**
   * 이 레시피의 사진만 바로 보여준다(레시피 고르기 생략) — 편집 화면처럼 이미 그 레시피일 때.
   * 아직 올리지 않은 기기 안 사진도 고를 수 있다.
   */
  fixedRecipe?: Pick<Recipe, 'title' | 'imageUri' | 'imageUris'>;
}

/**
 * 레시피의 상단 사진들(대표 + 추가).
 * 다른 레시피는 기기 안 경로(file://)를 뺀다 — 다른 기기에서 올린 사진이면 이 기기엔 없다.
 */
function recipeImages(r: Pick<Recipe, 'imageUri' | 'imageUris'>, allowLocal = false): string[] {
  return [r.imageUri, ...(r.imageUris ?? [])].filter((u): u is string => !!u && (allowLocal || !u.startsWith('file://')));
}

/** 사진을 가져온 레시피 — 최근 순 */
const RECENT_IMAGE_RECIPES_KEY = '@bakle_recent_image_recipes';

/**
 * 기존 레시피 사진에서 글자 읽기 — 요리를 고르면 그 레시피 사진들이 펼쳐지고, 그중 한 장을 고른다.
 * [+] → 이미지 → 기존 레시피, 편집 화면 입력 툴바(이 레시피 사진, fixedRecipe)에서 쓴다.
 */
export function RecipeImagePickerSheet({visible, onClose, myRecipes, exploreRecipes, onPick, onDismissed, fixedRecipe}: RecipeImagePickerSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const colors = useColors();
  const [picked, setPicked] = useState<Recipe | null>(null);
  // 검색어가 없으면 최근 가져온 레시피 3개, 있으면 전체에서 이름·레시피북으로 찾는다(링크 넣기와 같은 방식)
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    if (!visible) { setPicked(null); setQuery(''); return; }
    AsyncStorage.getItem(RECENT_IMAGE_RECIPES_KEY)
      .then(raw => setRecentIds(raw ? JSON.parse(raw) : []))
      .catch(() => setRecentIds([]));
  }, [visible]);
  const pickRecipe = (r: Recipe) => {
    const next = [r.id, ...recentIds.filter(x => x !== r.id)].slice(0, 10);
    setRecentIds(next);
    AsyncStorage.setItem(RECENT_IMAGE_RECIPES_KEY, JSON.stringify(next)).catch(() => {});
    setPicked(r);
  };
  const recipe = fixedRecipe ?? picked;
  const images = recipe ? recipeImages(recipe, !!fixedRecipe) : [];

  // 사진이 있는 레시피만 — 내 레시피 먼저, 둘러보기(팁 제외) 다음
  const sections = useMemo(() => {
    const mine = (myRecipes ?? []).filter(r => recipeImages(r).length > 0);
    const explore = (exploreRecipes ?? []).filter(r => r.kind !== 'tip' && recipeImages(r).length > 0);
    const q = query.trim().toLowerCase();
    if (q) {
      const match = (r: Recipe) => r.title.toLowerCase().includes(q) || (r.cookbook ?? '').toLowerCase().includes(q);
      return [
        {key: 'mine', title: t('recipeImagePicker.mine'), items: mine.filter(match)},
        {key: 'explore', title: t('recipeImagePicker.explore'), items: explore.filter(match)},
      ].filter(s => s.items.length > 0);
    }
    // 최근 가져온 레시피 3개 — 모자라면 최근 만든 내 레시피로 채운다(처음엔 비어 보이지 않게)
    const byId = new Map([...mine, ...explore].map(r => [r.id, r]));
    const recent = recentIds.map(id => byId.get(id)).filter((r): r is Recipe => !!r);
    const time = (r: Recipe) => (r.createdAt ? new Date(r.createdAt).getTime() : 0);
    const rest = [...mine].filter(r => !recent.includes(r)).sort((a, b) => time(b) - time(a));
    const items = [...recent, ...rest].slice(0, 3);
    return items.length ? [{key: 'recent', title: t('recipeImagePicker.recent'), items}] : [];
  }, [myRecipes, exploreRecipes, query, recentIds, t]);

  // 사진 칸 3열 — 다른 시트 칸과 같은 방식(숫자 폭)
  const {width: windowWidth} = useWindowDimensions();
  const cellW = sheetTileWidth(windowWidth, 3, GRID_PADDING, GRID_GAP);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={recipe ? recipe.title || t('recipeImagePicker.title') : t('recipeImagePicker.title')}
      // 라벨 가운데 헤더 — 첫 단계는 좌측 닫기, 다음 단계는 좌측 뒤로가기만
      headerType="center"
      // 사진 고르기 단계 — 공통 시트 헤더의 뒤로가기(레시피 목록으로)
      onBack={recipe && !fixedRecipe ? () => setPicked(null) : undefined}>
      {recipe ? (
        <View style={styles.grid}>
          {images.map(uri => (
            <Pressable key={uri} style={[styles.cell, {width: cellW, height: cellW * 1.3}]} onPress={() => onPick(uri)}>
              <ExpoImage source={{uri}} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            </Pressable>
          ))}
        </View>
      ) : (
        <>
        <View style={styles.search}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('recipeImagePicker.search')}
            leadingIcon={<AppIcon icon={IconSearch} size="xs" color={colors['foreground/on-surface-muted']} />}
            clearable
          />
        </View>
        {sections.length === 0 && query.trim() ? (
          // 통합 검색과 같은 빈 결과 — 그림 없이 검색어를 넣은 문구
          <EmptyState variant="simple" title={t('searchCommandBar.emptyRecipes', {query: query.trim()})} />
        ) : null}
        {sections.map(sec => (
          <View key={sec.key}>
            <SectionHeader title={sec.title} />
            {sec.items.map((r, i) => (
              <ListItem
                key={r.id}
                title={r.title}
                description={r.cookbook || undefined}
                leading={{type: 'custom', element: (
                  <View style={styles.thumbSlot}>
                    <IconThumbnail size={44} icon={IconNoteFilled}>
                      <ExpoImage source={{uri: recipeImages(r)[0]}} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
                    </IconThumbnail>
                  </View>
                )}}
                trailingValue={recipeImages(r).length > 1 ? String(recipeImages(r).length) : undefined}
                onPress={() => pickRecipe(r)}
                showDivider={i < sec.items.length - 1}
              />
            ))}
          </View>
        ))}
        </>
      )}
    </BottomSheet>
  );
}

const GRID_PADDING = Spacing.sm;
const GRID_GAP = Spacing.sm;

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    paddingBottom: Spacing.sm,
  },
  cell: {
    borderRadius: Radius['radius-md'],
    overflow: 'hidden',
    backgroundColor: colors['fill/subtle'],
    flexGrow: 0,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  search: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  thumbSlot: {
    marginRight: Spacing.xs,
  },
});
