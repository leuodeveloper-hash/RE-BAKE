import React from 'react';
import {Dialog} from './Dialog';
import {Button} from '@components/Button/Button';
import {useTranslation} from '@contexts/LanguageContext';
import {IconArrowDownToLine} from '@components/Icon/IconIndex';

interface UpdateDialogProps {
  visible: boolean;
  /** 스토어로 이동(웹은 새로고침) */
  onUpdate: () => void;
  /** 권장 업데이트면 닫기(나중에) — 없으면 강제(닫을 수 없음) */
  onLater?: () => void;
}

/**
 * 업데이트 다이얼로그.
 * - 강제(onLater 없음): 구버전이 서버와 맞지 않을 때. 닫기 버튼도 배경 탭도 막는다.
 * - 권장(onLater 있음): 새 버전이 나왔을 때 접속하면 한 번 띄운다. [나중에]로 닫을 수 있다.
 *   (스낵바는 금방 사라져 지나치기 쉬웠다)
 */
export function UpdateDialog({visible, onUpdate, onLater}: UpdateDialogProps) {
  const {t} = useTranslation();
  const optional = !!onLater;
  return (
    <Dialog
      visible={visible}
      onClose={onLater ?? (() => {})}
      blurBackdrop
      enableBackdropDismiss={optional}
      icon={IconArrowDownToLine}
      showCloseButton={false}
      title={optional ? t('update.availableTitle') : t('update.requiredTitle')}
      description={optional ? t('update.availableDescription') : t('update.requiredDescription')}
      actions={
        <>
          {optional ? <Button label={t('update.later')} variant="soft" onPress={onLater} /> : null}
          <Button label={t('update.action')} onPress={onUpdate} />
        </>
      }
    />
  );
}
