import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {SlideToConfirm} from '@components/SlideToConfirm/SlideToConfirm';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';

export interface MadeConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 대상 레시피 제목 — 시트 설명에 보여준다 */
  recipeTitle?: string;
  /** 이미 "만들었어요"로 표시된 상태 → 반대로 밀어 해제 */
  isMade?: boolean;
  /** 밀어서 확정 (표시 또는 해제) */
  onConfirm: (made: boolean) => void;
}

/**
 * "만들었어요" 확인 시트 — 요리모드 마지막과 레시피 오버플로우 메뉴가 공용으로 쓴다.
 *
 * 탭이 아니라 밀어서 확정하는 이유는 오탭 방지가 아니라 "실제로 만들었다"는 확인이라서다.
 * 되돌리기도 같은 시트에서 반대로 밀어 처리한다(SlideToConfirm의 undo).
 */
export function MadeConfirmSheet({
  visible,
  onClose,
  recipeTitle,
  isMade = false,
  onConfirm,
}: MadeConfirmSheetProps) {
  const {t} = useTranslation();

  // 확정/해제 후엔 시트를 닫는다 — 결과는 카드의 점으로 확인된다
  const handleConfirm = useCallback(() => {
    onConfirm(true);
    onClose();
  }, [onConfirm, onClose]);

  const handleUndo = useCallback(() => {
    onConfirm(false);
    onClose();
  }, [onConfirm, onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t(isMade ? 'madeSheet.titleMade' : 'madeSheet.title')}
      description={recipeTitle}>
      <View style={styles.body}>
        <SlideToConfirm
          label={t('madeSheet.slideLabel')}
          confirmedLabel={t('madeSheet.slideConfirmed')}
          confirmed={isMade}
          onConfirm={handleConfirm}
          onUndo={handleUndo}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
});

export default MadeConfirmSheet;
