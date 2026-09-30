import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Button} from '@components/Button';
import {AutoGrowInput} from '@components/AutoGrowInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';

export interface PasteRecipeSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
}

/**
 * 마크다운으로 정리해 둔 레시피를 통째로 붙여넣는다.
 *
 * 묶음별 "한 번에 쓰기"는 그 묶음만 고치지만 이건 레시피 전체를 덮어쓴다 —
 * 덮어쓴다는 사실을 설명에 밝혀 두고, 빈 칸이면 버튼이 눌리지 않게 한다.
 */
export function PasteRecipeSheet({visible, onClose, onApply}: PasteRecipeSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [text, setText] = useState('');

  // 열 때마다 비운다 — 이전 내용이 남아 있으면 잘못 덮어쓴다
  useEffect(() => { if (visible) setText(''); }, [visible]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('recipeEdit.pasteMarkdown')}
      description={t('recipeEdit.pasteDescription')}
      bottomAction={
        <Button
          label={t('recipeEdit.pasteApply')}
          onPress={() => { onApply(text); onClose(); }}
          disabled={text.trim().length === 0}
          style={{flex: 1}}
        />
      }>
      <View style={styles.body}>
        <View style={styles.inputWrap}>
          <AutoGrowInput
            style={styles.input}
            placeholder={t('recipeEdit.pastePlaceholder')}
            value={text}
            onChangeText={setText}
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.hint}>{t('recipeEdit.pasteHint')}</Text>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  inputWrap: {
    borderRadius: Radius['radius-lg'],
    backgroundColor: colors['fill/faint'],
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    minHeight: 200,
  },
  input: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
  },
  hint: {
    ...Typography.label.small,
    color: colors['foreground/on-surface-muted'],
  },
});

export default PasteRecipeSheet;
