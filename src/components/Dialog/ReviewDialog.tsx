import React, {useEffect, useState} from 'react';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {ReviewFields} from './ReviewFields';
import {IconChatStarFilled} from '@components/Icon/IconIndex';
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

  const handleConfirm = () => {
    onConfirm({evaluation: evaluation.trim(), improvement: improvement.trim()});
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={IconChatStarFilled}
      avatarColor="green"
      title={t('review.title')}
      actions={<>
        <Button label={t('review.cancel')} variant="soft" onPress={onClose} />
        <Button label={t('review.save')} variant="filled" onPress={handleConfirm} />
      </>}
    >
      <ReviewFields
        evaluation={evaluation}
        improvement={improvement}
        onChangeEvaluation={setEvaluation}
        onChangeImprovement={setImprovement}
      />
    </Dialog>
  );
}
