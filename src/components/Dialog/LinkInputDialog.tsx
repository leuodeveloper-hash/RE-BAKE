import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
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

  // 열릴 때마다 현재 값으로 초기화
  useEffect(() => {
    if (visible) { setUrl(initialUrl); setLabel(initialLabel); }
  }, [visible, initialUrl, initialLabel]);

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
    </Dialog>
  );
}

const createStyles = (_colors: SemanticColors) => StyleSheet.create({
  body: {
    gap: Spacing.md,
  },
});

export default LinkInputDialog;
