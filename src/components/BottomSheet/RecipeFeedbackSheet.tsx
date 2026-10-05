import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Button} from '@components/Button';
import {Tabs} from '@components/Tabs';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
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
      // 문의(Support) 시트와 같은 구성 — 공통 시트 헤더(라벨 가운데), 종류는 Tabs, 내용은 공통 TextInput
      headerType="center"
      // 제목은 어떤 레시피에 대한 의견인지(레시피 이름) — 없으면 기본 제목
      title={recipeTitle || t('feedback.title')}
      bottomAction={
        <Button
          label={t('feedback.send')}
          onPress={() => { onSubmit(kind, message.trim()); onClose(); }}
          disabled={!canSend}
          style={{flex: 1}}
        />
      }>
      <View style={styles.body}>
        <Tabs
          tabs={KINDS.map(k => ({id: k, label: t(`feedback.kind.${k}`)}))}
          selectedId={kind}
          onSelect={id => setKind(id as FeedbackKind)}
          fullWidth
        />
        <TextInput
          label={t('feedback.messageLabel')}
          placeholder={t('feedback.placeholder')}
          value={message}
          onChangeText={setMessage}
          multiline
        />
      </View>
    </BottomSheet>
  );
}

const createStyles = (_colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
});

export default RecipeFeedbackSheet;
