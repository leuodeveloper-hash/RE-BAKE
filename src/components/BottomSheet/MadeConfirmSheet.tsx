import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {SlideToConfirm} from '@components/SlideToConfirm/SlideToConfirm';
import {Stamp} from '@components/Stamp';
import {Button} from '@components/Button';
import {AutoGrowInput} from '@components/AutoGrowInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

const STAMP_SIZE = 160;

export interface MadeConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 스탬프에 들어갈 사진(레시피 대표 이미지). 없으면 빈 스탬프 */
  imageUri?: string;
  /** 이번에 찍힐 스탬프가 몇 번째인지 — 미리보기와 실제 모양이 같아야 한다 */
  stampIndex?: number;
  /** 밀어서 확정 — 스탬프가 찍힌다 */
  onConfirm: () => void;
  /** 찍은 뒤 이어서 남기는 회고. 없으면 회고 단계를 건너뛴다 */
  onSaveReview?: (review: {evaluation: string; improvement: string}) => void;
}

/**
 * "직접 만들었어요" 확인 시트 — 요리모드 마지막과 오버플로우 메뉴가 공용으로 쓴다.
 *
 * 탭이 아니라 밀어서 확정하는 건 오탭 방지가 아니라 "실제로 만들었다"는 확인이라서다.
 * 해제는 여기서 하지 않는다 — 메뉴에서 바로 풀린다(확인이 필요한 건 찍을 때뿐).
 *
 * 찍고 나면 같은 시트에서 회고를 이어 쓴다 — 방금 만든 기억이 가장 선명할 때다.
 * 건너뛰어도 되도록 "나중에"를 둔다(요리 직후엔 손이 바쁘다).
 */
export function MadeConfirmSheet({
  visible,
  onClose,
  imageUri,
  stampIndex = 0,
  onConfirm,
  onSaveReview,
}: MadeConfirmSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [stamped, setStamped] = useState(false);
  const [evaluation, setEvaluation] = useState('');

  // 열 때마다 처음부터 — 이전에 쓰던 내용이 남으면 엉뚱한 레시피에 붙는다
  useEffect(() => {
    if (visible) {
      setStamped(false);
      setEvaluation('');
    }
  }, [visible]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    if (!onSaveReview) {
      // 회고를 받지 않는 자리면 완료 문구를 잠깐 보여주고 닫는다
      setTimeout(onClose, 600);
      return;
    }
    setTimeout(() => setStamped(true), 600);
  }, [onConfirm, onClose, onSaveReview]);

  const handleSave = useCallback(() => {
    const text = evaluation.trim();
    if (text) onSaveReview?.({evaluation: text, improvement: ''});
    onClose();
  }, [evaluation, onSaveReview, onClose]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.stampWrap}>
          {/* 기울이지 않는다 — 하나만 크게 보여주는 자리라 반듯한 쪽이 낫다 */}
          <Stamp imageUri={imageUri} size={STAMP_SIZE} index={stampIndex} imageScale={2} />
        </View>

        <Text style={styles.title}>
          {stamped ? t('madeSheet.reviewTitle') : t('madeSheet.title')}
        </Text>
        <Text style={styles.description}>
          {stamped ? t('madeSheet.reviewDescription') : t('madeSheet.description')}
        </Text>

        {stamped ? (
          <>
            <View style={styles.inputWrap}>
              <AutoGrowInput
                style={styles.input}
                placeholder={t('madeSheet.reviewPlaceholder')}
                value={evaluation}
                onChangeText={setEvaluation}
              />
            </View>
            <View style={styles.actions}>
              <Button label={t('madeSheet.later')} variant="soft" onPress={onClose} style={{flex: 1}} />
              <Button
                label={t('madeSheet.saveReview')}
                onPress={handleSave}
                disabled={!evaluation.trim()}
                style={{flex: 1}}
              />
            </View>
          </>
        ) : (
          <View style={styles.slideWrap}>
            <SlideToConfirm
              label={t('madeSheet.slideLabel')}
              confirmedLabel={t('madeSheet.slideConfirmed')}
              onConfirm={handleConfirm}
            />
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  stampWrap: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.title.medium,
    color: colors['foreground/on-surface'],
    textAlign: 'center',
  },
  description: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    paddingTop: Spacing.sm,
  },
  slideWrap: {
    paddingTop: Spacing.xl,
  },
  inputWrap: {
    marginTop: Spacing.lg,
    borderRadius: Radius['radius-lg'],
    backgroundColor: colors['fill/faint'],
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    minHeight: 96,
  },
  input: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
});

export default MadeConfirmSheet;
