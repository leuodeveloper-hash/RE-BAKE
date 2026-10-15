import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {RulerSlider} from '@components/Navigation/RulerSlider';
import {Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {scaleAmount, scaleLabel} from '@utils/scaleAmount';

const STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export interface IngredientScaleSheetProps {
  visible: boolean;
  onClose: () => void;
  groups: {title?: string; ingredients: {name: string; amount: string}[]}[];
}

/**
 * 재료 비율 조정 — 눈금 슬라이더로 배율을 고르면(탭·끌기) 아래 재료 분량이 그 비율로 바로 바뀌어 보인다.
 * 보기용 — 레시피 원래 분량은 그대로(저장 안 함). 열 때마다 ×1부터.
 */
export function IngredientScaleSheet({visible, onClose, groups}: IngredientScaleSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [factor, setFactor] = useState(1);
  useEffect(() => { if (visible) setFactor(1); }, [visible]);
  const items = useMemo(() => STEPS.map(v => ({id: String(v), label: scaleLabel(v)})), []);
  const shown = groups.filter(g => g.ingredients.length > 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('ingredientScale.title')} headerType="center">
      <View style={styles.body}>
        <View style={styles.slider}>
          <RulerSlider
            items={items}
            selectedId={String(factor)}
            onSelect={id => setFactor(parseFloat(id))}
            onLiveChange={id => setFactor(parseFloat(id))}
          />
        </View>
        {shown.map((g, gi) => (
          <View key={gi}>
            {shown.length > 1 && g.title ? <SectionHeader title={g.title} /> : null}
            <Card>
              {g.ingredients.map((ing, i) => (
                <ListItem
                  key={i}
                  showDivider={i < g.ingredients.length - 1}
                  content={{type: 'custom', element: (
                    <View style={styles.row}>
                      <Text style={styles.name} numberOfLines={2}>{ing.name}</Text>
                      <Text style={styles.amount}>{scaleAmount(ing.amount, factor)}</Text>
                    </View>
                  )}}
                />
              ))}
            </Card>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  slider: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
    flex: 1,
  },
  amount: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
    fontVariant: ['tabular-nums'],
  },
});
