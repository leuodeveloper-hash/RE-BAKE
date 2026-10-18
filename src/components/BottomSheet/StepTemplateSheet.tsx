import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import {BottomSheet} from './BottomSheet';
import {Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {Button} from '@components/Button';
import {IconStarFilled, IconTrash} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {useStepTemplates, type StepTemplate} from '@hooks/useStepTemplates';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface StepTemplateSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 고르면 — 지금 과정 아래 새 과정으로 넣는다 */
  onPick: (tpl: StepTemplate) => void;
  /** 지금 커서가 있는 과정을 저장 — 비어 있으면 버튼이 꺼진다 */
  onSaveCurrent?: () => void;
  canSaveCurrent?: boolean;
}

/** 자주 쓰는 과정 — 저장해 둔 과정(설명·팁·주의·사진)을 골라 넣고, 지금 과정을 저장한다 */
export function StepTemplateSheet({visible, onClose, onPick, onSaveCurrent, canSaveCurrent}: StepTemplateSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const {templates, removeTemplate} = useStepTemplates();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('stepTemplate.title')}
      headerType="center"
      bottomAction={onSaveCurrent ? (
        <Button label={t('stepTemplate.saveCurrent')} variant="filled" onPress={onSaveCurrent} disabled={!canSaveCurrent} style={{flex: 1}} />
      ) : undefined}>
      <View style={styles.body}>
        {templates.length === 0 ? (
          <Text style={styles.empty}>{t('stepTemplate.empty')}</Text>
        ) : (
          <Card>
            {templates.map((tpl, i) => {
              const sub = [tpl.tip, tpl.caution].filter(Boolean).join(' · ');
              const thumb = tpl.photos?.[0]?.uri;
              return (
                <ListItem
                  key={tpl.id}
                  title={tpl.description || t('stepTemplate.photoOnly')}
                  description={sub || (tpl.photos?.length ? t('stepTemplate.photoCount', {count: tpl.photos.length}) : undefined)}
                  leading={thumb
                    ? {type: 'custom', element: <ExpoImage source={{uri: thumb}} style={styles.thumb} contentFit="cover" />}
                    : {type: 'icon', icon: IconStarFilled}}
                  trailing={{type: 'iconButton', icon: IconTrash, variant: 'ghost-secondary', onPress: () => removeTemplate(tpl.id)}}
                  onPress={() => onPick(tpl)}
                  showDivider={i < templates.length - 1}
                />
              );
            })}
          </Card>
        )}
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm},
  empty: {...Typography.body.medium, color: colors['foreground/on-surface-muted'], textAlign: 'center', paddingVertical: Spacing.lg},
  thumb: {width: 40, height: 40, borderRadius: Radius['radius-sm']},
});
