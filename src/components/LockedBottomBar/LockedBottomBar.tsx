import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTranslation} from '@contexts/LanguageContext';
import {ContentMask} from '@components/Container';
import {Button} from '@components/Button/Button';
import {IconUnlockFilled} from '@components/Icon/IconIndex';

interface LockedBottomBarProps {
  onUnlock?: () => void;
  disabled?: boolean;
  bottomOffset?: number;
}

/** 잠금 해제 하단 바: 블러 배경 + 해제 버튼 세트 */
export function LockedBottomBar({onUnlock, disabled, bottomOffset = 134}: LockedBottomBarProps) {
  const {t} = useTranslation();
  return (
    <>
      <ContentMask topHeight={0} bottomHeight={450} />
      <View style={[styles.buttonContainer, {bottom: bottomOffset}]}>
        <Button
          label={t('lockedBottomBar.unlockRecipe')}
          icon={IconUnlockFilled}
          gradientShadow
          disabled={disabled}
          onPress={onUnlock}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});