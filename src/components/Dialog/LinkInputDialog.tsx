import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {IconButton} from '@components/IconButton';
import {ListItem} from '@components/ListItem';
import {IconAdd, IconClose, IconBookFilled, IconExprolerBookFilled} from '@components/Icon/IconIndex';
import {useRecipes} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {IconLink} from '@components/Icon/IconIndex';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {useTranslation} from '@contexts/LanguageContext';

export interface LinkInputDialogProps {
  visible: boolean;
  /** 이미 링크인 구간을 편집할 때 기존 URL */
  initialUrl?: string;
  /** 링크로 보일 텍스트 (선택 구간의 글자) */
  initialLabel?: string;
  onClose: () => void;
  /** URL이 빈 문자열이면 링크 해제 (라벨 수정은 그대로 반영) */
  onConfirm: (url: string, label: string) => void;
}

/**
 * 링크 URL 입력 — Android 폴백용.
 * 모든 플랫폼에서 이 다이얼로그를 쓴다.
 * (웹 window.prompt는 브라우저가 차단하거나 모양이 제각각이라 신뢰할 수 없다)
 */
export function LinkInputDialog({
  visible, initialUrl = '', initialLabel = '', onClose, onConfirm,
}: LinkInputDialogProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [url, setUrl] = useState(initialUrl);
  const [label, setLabel] = useState(initialLabel);
  // 주소 칸 뒤 [+] — 다른 레시피를 골라 링크로 건다(앱 안에서 그 레시피로 이동)
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const {recipes} = useRecipes();
  const {recipes: exploreRecipes} = useExploreRecipeContext();

  // 열릴 때마다 현재 값으로 초기화
  useEffect(() => {
    if (visible) { setUrl(initialUrl); setLabel(initialLabel); setPicking(false); setQuery(''); }
  }, [visible, initialUrl, initialLabel]);

  // 내 레시피 + 둘러보기(공식) — 이름으로 찾는다
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [
      ...recipes.map(r => ({recipe: r, official: false})),
      ...exploreRecipes.filter(r => !r.hidden).map(r => ({recipe: r, official: true})),
    ];
    return (q ? all.filter(({recipe}) => recipe.title.toLowerCase().includes(q)) : all).slice(0, 30);
  }, [recipes, exploreRecipes, query]);

  const pickRecipe = (id: string, title: string) => {
    setUrl(`recipe/${id}`);
    if (!label.trim()) setLabel(title);
    setPicking(false);
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={IconLink}
      avatarColor="lime"
      title={t('recipeEdit.linkTitle')}
      description={t('recipeEdit.linkMessage')}
      actions={<>
        <Button label={t('common.cancel')} variant="soft" onPress={onClose} />
        <Button label={t('common.confirm')} variant="filled" onPress={() => onConfirm(url, label)} />
      </>}
    >
      <View style={styles.body}>
        {/* 표시 텍스트도 여기서 고친다 — 링크를 풀고 다시 걸 필요 없이 */}
        <TextInput
          label={t('recipeEdit.linkLabel')}
          value={label}
          onChangeText={setLabel}
          placeholder={t('recipeEdit.linkLabelPlaceholder')}
          clearable
        />
        <View style={styles.urlRow}>
          <View style={styles.urlInput}>
            <TextInput
              label={t('recipeEdit.linkUrl')}
              value={url}
              onChangeText={setUrl}
              placeholder="https://"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              clearable
            />
          </View>
          <IconButton
            icon={picking ? IconClose : IconAdd}
            variant="soft"
            size="medium"
            onPress={() => setPicking(p => !p)}
          />
        </View>
        {/* 레시피 고르기 — 고르면 주소가 recipe/id로 채워진다 */}
        {picking && (
          <View style={styles.picker}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('recipeEdit.linkRecipeSearch')}
              clearable
              autoFocus
            />
            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {candidates.map(({recipe, official}, i) => (
                <ListItem
                  key={`${official ? 'e' : 'm'}-${recipe.id}`}
                  title={recipe.title}
                  leading={{type: 'icon', icon: official ? IconExprolerBookFilled : IconBookFilled}}
                  showDivider={i < candidates.length - 1}
                  onPress={() => pickRecipe(recipe.id, recipe.title)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Dialog>
  );
}

const createStyles = (_colors: SemanticColors) => StyleSheet.create({
  body: {
    gap: Spacing.md,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  urlInput: {
    flex: 1,
  },
  picker: {
    gap: Spacing.sm,
  },
  pickerList: {
    maxHeight: 240,
  },
});

export default LinkInputDialog;
