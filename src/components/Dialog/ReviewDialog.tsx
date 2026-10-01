import React, {useEffect, useState} from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {StepPhotos} from '@components/StepPhotos';
import {IconPhoto} from '@components/Icon/IconIndex';
import {ensureImagePermission} from '@utils/imagePermission';
import {getPersistentUri} from '@utils/imageUpload';
import {dismissKeyboardAndWait} from '@utils/keyboard';
import {normalizeStepPhotos} from '@utils/stepPhotos';
import {useColors} from '@contexts/ThemeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {Typography} from '@constants/typography';
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
  // 회고 사진 — 최대 3장(과정 사진과 같은 수)
  const [photos, setPhotos] = useState<string[]>([]);
  const colors = useColors();
  const {showSnackbar} = useSnackbar();

  useEffect(() => {
    if (visible) {
      setEvaluation(value?.evaluation ?? '');
      setImprovement(value?.improvement ?? '');
      setPhotos(value?.photos ?? []);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // 이미 쓴 회고가 있을 때만 지울 수 있다
  const hasExisting = !!(value?.evaluation?.trim() || value?.improvement?.trim() || value?.photos?.length);

  const addPhotos = async () => {
    // 키보드가 떠 있으면 iOS가 사진첩을 무시한다 — 먼저 내리고 연다
    await dismissKeyboardAndWait();
    const ok = await ensureImagePermission('mediaLibrary', {
      deniedMessage: t('recipeEdit.photoPermissionNeeded'),
      showSnackbar,
      settingsTitle: t('permission.photoTitle'),
      settingsBody: t('permission.photoBody'),
      settingsConfirmLabel: t('permission.openSettings'),
      settingsCancelLabel: t('permission.cancel'),
    });
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.8, base64: Platform.OS === 'web',
      allowsMultipleSelection: true, selectionLimit: Math.max(1, MAX_REVIEW_PHOTOS - photos.length),
    });
    if (result.canceled || result.assets.length === 0) return;
    const uris = await Promise.all(result.assets.map(a => getPersistentUri(a.uri, a.base64)));
    setPhotos(prev => [...prev, ...uris].slice(0, MAX_REVIEW_PHOTOS));
  };
  const handleDelete = () => {
    // 두 칸을 비워 저장하면 회고가 지워진다(useRecipeReviews.saveReview)
    onConfirm({evaluation: '', improvement: '', photos: []});
    onClose();
  };

  const handleConfirm = () => {
    onConfirm({evaluation: evaluation.trim(), improvement: improvement.trim(), photos});
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
        {/* 사진 — 썸네일(X로 삭제) + 3장 미만이면 추가 버튼 */}
        <View style={styles.photoRow}>
          {photos.length > 0 && (
            <StepPhotos
              photos={normalizeStepPhotos(photos)}
              mode="edit"
              paddingTop={false}
              onRemove={i => setPhotos(prev => prev.filter((_, k) => k !== i))}
            />
          )}
          {photos.length < MAX_REVIEW_PHOTOS && (
            <Pressable onPress={addPhotos} style={[styles.addPhoto, {backgroundColor: colors['fill/subtle']}]} hitSlop={4}>
              <IconPhoto width={18} height={18} color={colors['foreground/on-surface-muted']} />
              <Text style={[styles.addPhotoText, {color: colors['foreground/on-surface-muted']}]}>{`${photos.length}/${MAX_REVIEW_PHOTOS}`}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

/** 회고 사진 최대 수 — 과정 사진과 같다 */
const MAX_REVIEW_PHOTOS = 3;

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  addPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: {
    ...Typography.label.small,
  },
  body: {
    paddingHorizontal: Spacing.smd,
  },
  action: {
    flex: 1,
  },
});
