import React, {useEffect, useState} from 'react';
import {MAX_RECIPE_VERSIONS} from '@utils/recipeHistory';
import {StyleSheet, View} from 'react-native';
import {collection, getDocs, limit, orderBy, query} from 'firebase/firestore';
import {db} from '@config/firebase';
import {BottomSheet} from './BottomSheet';
import {ListItem} from '@components/ListItem';
import {EmptyState} from '@components/EmptyState';
import {IconClockFilled} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {dateTime} from '@utils/dateLabel';
import type {Recipe} from '../../types/recipe';

export interface RecipeVersionsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 버전 기록이 있는 레시피 문서 경로 — 내 레시피 user_recipes/{uid}/recipes/{id}, 공식 explore_recipes/{id} */
  docPath: string | null;
  onPick: (version: Recipe) => void;
}

type Version = Recipe & {savedAt?: string};

/**
 * 이전 버전 가져오기 — 저장할 때마다 덮이기 전 판이 history에 남는다(최근 3개). 고르면 그 판을 불러온다.
 */
export function RecipeVersionsSheet({visible, onClose, docPath, onPick}: RecipeVersionsSheetProps) {
  const {t} = useTranslation();
  const [versions, setVersions] = useState<Version[] | null>(null);
  useEffect(() => {
    if (!visible || !docPath) return;
    setVersions(null);
    getDocs(query(collection(db, `${docPath}/history`), orderBy('savedAt', 'desc'), limit(MAX_RECIPE_VERSIONS)))
      .then(snap => setVersions(snap.docs.map(d => d.data() as Version)))
      .catch(() => setVersions([]));
  }, [visible, docPath]);

  return (
    <BottomSheet visible={visible} onClose={onClose} headerType="center" title={t('recipeEdit.versionsTitle')}>
      <View style={styles.body}>
        {versions && versions.length === 0 ? (
          <EmptyState variant="simple" title={t('recipeEdit.versionsEmpty')} />
        ) : (versions ?? []).map((v, i, arr) => (
          <ListItem
            key={i}
            leading={{type: 'icon', icon: IconClockFilled}}
            content={{type: 'text', title: v.savedAt ? dateTime(v.savedAt) : '-', description: v.title}}
            showDivider={i < arr.length - 1}
            onPress={() => { onPick(v); onClose(); }}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
});
