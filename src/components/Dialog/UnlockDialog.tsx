import React from 'react';
import {Dialog} from './Dialog';
import {Button} from '@components/Button/Button';

const unlockImage = require('../../../assets/images/dialog/unlock.png');

interface UnlockDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe?: () => void;
  onWatchAd?: () => void;
  adLoading?: boolean;
}

export function UnlockDialog({visible, onClose, onSubscribe, onWatchAd, adLoading = false}: UnlockDialogProps) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      blurBackdrop
      headerImage={unlockImage}
      title="레시피 잠금 해제"
      description={'광고를 보면 1회 열람이 가능하고,\n구독 시 모든 레시피를 자유롭게\n볼 수 있어요.'}
      actions={
        <>
          <Button label="구독하기" variant="soft" onPress={onSubscribe ?? onClose} />
          <Button
            label={adLoading ? '불러오는 중...' : '광고보기'}
            onPress={onWatchAd}
            disabled={adLoading}
          />
        </>
      }
    />
  );
}
