import React from 'react';
import {Dialog} from './Dialog';
import {Button} from '@components/Button/Button';
import {useTranslation} from '@contexts/LanguageContext';
import {IconArrowDownToLine} from '@components/Icon/IconIndex';

interface UpdateDialogProps {
  visible: boolean;
  /** 스토어로 이동 */
  onUpdate: () => void;
}

/**
 * 강제 업데이트 다이얼로그. 구버전이 서버와 맞지 않을 때만 띄운다.
 * 닫을 수 없다 — 닫기 버튼도, 배경 탭도 막는다(그래서 onClose는 no-op).
 * 권장 업데이트는 스낵바로 안내한다(무시 가능).
 */
export function UpdateDialog({visible, onUpdate}: UpdateDialogProps) {
  const {t} = useTranslation();
  return (
    <Dialog
      visible={visible}
      onClose={() => {}}
      blurBackdrop
      enableBackdropDismiss={false}
      icon={IconArrowDownToLine}
      showCloseButton={false}
      title={t('update.requiredTitle')}
      description={t('update.requiredDescription')}
      actions={<Button label={t('update.action')} onPress={onUpdate} />}
    />
  );
}
