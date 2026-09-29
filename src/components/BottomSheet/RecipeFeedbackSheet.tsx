import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Button} from '@components/Button';
import {OptionTile} from '@components/OptionTile';
import {AutoGrowInput} from '@components/AutoGrowInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {FeedbackKind} from '@utils/recipeFeedback';

const KINDS: FeedbackKind[] = ['amount', 'step', 'typo', 'etc'];

export interface RecipeFeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 대상 레시피 제목 — 무엇에 대한 의견인지 보여준다 */
  recipeTitle?: string;
  onSubmit: (kind: FeedbackKind, message: string) => void;
}

/**
 * 레시피 의견 보내기.
 *
 * 종류를 먼저 고르게 하는 이유: 자유 입력만 두면 대부분 "맛있었어요"가 되고,
 * 정작 고쳐야 할 분량·과정 오류가 묻힌다.
 */
export function RecipeFeedbackSheet({
  visible,
  onClose,
  recipeTitle,
  onSubmit,
}: RecipeFeedbackSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [kind, setKind] = useState<FeedbackKind>('amount');
  const [message, setMessage] = useState('');

  // 열 때마다 비운다 — 이전 내용이 남아 있으면 잘못 보낸다
  useEffect(() => {
    if (visible) {
      setKind('amount');
      setMessage('');
    }
  }, [visible]);

  const canSend = message.trim().length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('feedback.title')}
      description={recipeTitle}
      bottomAction={
        <Button
          label={t('feedback.send')}
          onPress={() => { onSubmit(kind, message.trim()); onClose(); }}
          disabled={!canSend}
          style={{flex: 1}}
        />
      }>
      <View style={styles.body}>
        <Text style={styles.sectionLabel}>{t('feedback.kindLabel')}</Text>
        <View style={styles.kinds}>
          {KINDS.map(k => (
            <OptionTile
              key={k}
              label={t(`feedback.kind.${k}`)}
              selected={kind === k}
              onPress={() => setKind(k)}
              style={styles.kindTile}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('feedback.messageLabel')}</Text>
        <View style={styles.inputWrap}>
          <AutoGrowInput
            style={styles.input}
            placeholder={t('feedback.placeholder')}
            value={message}
            onChangeText={setMessage}
          />
        </View>
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
  sectionLabel: {
    ...Typography.label.large,
    color: colors['foreground/on-surface-muted'],
  },
  kinds: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  kindTile: {
    flex: 1,
    height: 56,
  },
  inputWrap: {
    borderRadius: Radius['radius-lg'],
    backgroundColor: colors['fill/faint'],
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    minHeight: 120,
  },
  input: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
  },
});

export default RecipeFeedbackSheet;
