import React from 'react';
import {Dialog} from './Dialog';
import {Button} from '@components/Button/Button';
import {useTranslation} from '@contexts/LanguageContext';
import {useAuth} from '@contexts/AuthContext';
import {Platform} from 'react-native';

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
  const {user} = useAuth();
  // 로그인 전이면 '구독' 대신 '로그인하기' — 로그인하면 구독 여부를 확인해 필요할 때만 플랜이 뜬다
  const guest = !user;
  // 웹은 보상형 광고가 없다 — 광고 버튼은 앱에서만
  const showAd = Platform.OS !== 'web';
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
          <Button label={guest ? t('unlock.login') : t('unlock.subscribe')} variant={showAd ? 'soft' : 'filled'} onPress={onSubscribe ?? onClose} />
          {showAd ? (
            <Button
              label={adLoading ? t('unlock.loading') : t('unlock.watchAd')}
              onPress={onWatchAd}
              disabled={adLoading}
            />
          ) : null}
        </>
      }
    />
  );
}
