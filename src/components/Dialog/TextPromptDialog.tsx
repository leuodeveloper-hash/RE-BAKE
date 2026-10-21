import React, {useEffect, useState} from 'react';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {useTranslation} from '@contexts/LanguageContext';

export interface TextPromptDialogProps {
  visible: boolean;
  title: string;
  /** 처음 값 — 열 때마다 이 값으로 */
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

/**
 * 글 한 줄 받기 — 이름 정하기 등. 공통 시트 헤더(라벨 가운데 · X) + 입력 + 취소/확인.
 * 빈 값이면 확인을 막는다
 */
export function TextPromptDialog({visible, title, initialValue = '', placeholder, confirmLabel, onClose, onConfirm}: TextPromptDialogProps) {
  const {t} = useTranslation();
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (visible) setValue(initialValue); }, [visible, initialValue]);
  const submit = () => { if (!value.trim()) return; onConfirm(value.trim()); onClose(); };
  return (
    <Dialog
      position="top"
      visible={visible}
      onClose={onClose}
      headerType="center"
      title={title}
      actions={<>
        <Button label={t('time.cancel')} variant="soft" onPress={onClose} />
        <Button label={confirmLabel ?? t('time.confirm')} variant="filled" disabled={!value.trim()} onPress={submit} />
      </>}>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} autoFocus selectTextOnFocus onSubmitEditing={submit} returnKeyType="done" />
    </Dialog>
  );
}
