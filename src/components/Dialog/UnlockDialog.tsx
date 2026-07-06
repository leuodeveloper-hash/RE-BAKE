import React from 'react';
import {Dialog} from './Dialog';
import {Button} from '@components/Button/Button';
import {useTranslation} from '@contexts/LanguageContext';

const unlockImage = require('../../../assets/images/dialog/unlock.png');

interface UnlockDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe?: () => void;
  onWatchAd?: () => void;
  adLoading?: boolean;
}

export function UnlockDialog({visible, onClose, onSubscribe, onWatchAd, adLoading = false}: UnlockDialogProps) {
  const {t} = useTranslation();
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      blurBackdrop
      headerImage={unlockImage}
      title={t('unlock.title')}
      description={t('unlock.description')}
      actions={
        <>
          <Button label={t('unlock.subscribe')} variant="soft" onPress={onSubscribe ?? onClose} />
          <Button
            label={adLoading ? t('unlock.loading') : t('unlock.watchAd')}
            onPress={onWatchAd}
            disabled={adLoading}
          />
        </>
      }
    />
  );
}
