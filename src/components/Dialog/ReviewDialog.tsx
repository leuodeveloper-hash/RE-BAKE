import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomSheet} from '@components/BottomSheet/BottomSheet';
import {Button} from '@components/Button';
import {ReviewFields} from './ReviewFields';
import {Spacing} from '@constants/spacing';
import {useTranslation} from '@contexts/LanguageContext';

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

/**
 * 회고 쓰기 — 바텀시트. 이름은 기존 호출부를 그대로 두려고 유지한다
 * (회고 노트·스탬프북·스탬프 상세가 같이 쓴다). 입력은 공통 ReviewFields.
 */
export function ReviewDialog({visible, onClose, value, onConfirm}: ReviewDialogProps) {
  const {t} = useTranslation();
  const [evaluation, setEvaluation] = useState('');
  const [improvement, setImprovement] = useState('');

  useEffect(() => {
    if (visible) {
      setEvaluation(value?.evaluation ?? '');
      setImprovement(value?.improvement ?? '');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // 이미 쓴 회고가 있을 때만 지울 수 있다
  const hasExisting = !!(value?.evaluation?.trim() || value?.improvement?.trim());
  const handleDelete = () => {
    // 두 칸을 비워 저장하면 회고가 지워진다(useRecipeReviews.saveReview)
    onConfirm({evaluation: '', improvement: ''});
    onClose();
  };

  const handleConfirm = () => {
    onConfirm({evaluation: evaluation.trim(), improvement: improvement.trim()});
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('review.title')}
      headerType="center"
      bottomAction={<>
        {hasExisting ? (
          <Button label={t('review.delete')} variant="soft" destructive onPress={handleDelete} style={styles.action} />
        ) : (
          <Button label={t('review.cancel')} variant="soft" onPress={onClose} style={styles.action} />
        )}
        <Button label={t('review.save')} variant="filled" onPress={handleConfirm} style={styles.action} />
      </>}
    >
      <View style={styles.body}>
        <ReviewFields
          variant="group"
          evaluation={evaluation}
          improvement={improvement}
          onChangeEvaluation={setEvaluation}
          onChangeImprovement={setImprovement}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.smd,
  },
  action: {
    flex: 1,
  },
});
