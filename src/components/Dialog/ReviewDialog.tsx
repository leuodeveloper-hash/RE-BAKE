import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput as RNTextInput, View} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import type {SemanticColorsV2} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconChatStarFilled} from '@components/Icon/IconIndex';

export interface ReviewData {
  evaluation: string;
  improvement: string;
  /** 회고 사진 URI (최대 3장) */
  photos?: string[];
}

export interface ReviewDialogProps {
  visible: boolean;
  onClose: () => void;
  value?: ReviewData;
  onConfirm: (review: ReviewData) => void;
}

export function ReviewDialog({visible, onClose, value, onConfirm}: ReviewDialogProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const [evaluation, setEvaluation] = useState('');
  const [improvement, setImprovement] = useState('');

  useEffect(() => {
    if (visible) {
      setEvaluation(value?.evaluation ?? '');
      setImprovement(value?.improvement ?? '');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    onConfirm({evaluation: evaluation.trim(), improvement: improvement.trim()});
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={IconChatStarFilled}
      avatarColor="green"
      title="회고"
      actions={<>
        <Button label="취소" variant="soft" onPress={onClose} />
        <Button label="저장" variant="filled" onPress={handleConfirm} />
      </>}
    >
      <View style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>평가</Text>
          <View style={styles.inputContainer}>
            <RNTextInput
              style={[styles.input, {color: colors['foreground/on-surface']}]}
              value={evaluation}
              onChangeText={setEvaluation}
              placeholder="이번 결과에 대한 평가를 입력하세요."
              placeholderTextColor={colors['foreground/on-surface-muted']}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>다음 개선 점</Text>
          <View style={styles.inputContainer}>
            <RNTextInput
              style={[styles.input, {color: colors['foreground/on-surface']}]}
              value={improvement}
              onChangeText={setImprovement}
              placeholder="다음에 개선할 점을 입력하세요."
              placeholderTextColor={colors['foreground/on-surface-muted']}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    marginTop: FONT_BASELINE_OFFSET,
    paddingHorizontal: Spacing.xs,
  },
  inputContainer: {
    backgroundColor: colors['surface/container'],
    borderRadius: Radius['radius-md'],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    minHeight: 80,
  },
  input: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    outlineStyle: 'none',
  } as any,
});
