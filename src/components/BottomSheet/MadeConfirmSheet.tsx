import React, {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {SlideToConfirm} from '@components/SlideToConfirm/SlideToConfirm';
import {Stamp} from '@components/Stamp';
import {IconButton} from '@components/IconButton';
import {IconClose} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

const STAMP_SIZE = 160;

export interface MadeConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 우표에 들어갈 사진(레시피 대표 이미지). 없으면 빈 우표 */
  imageUri?: string;
  /** 이번에 찍힐 우표가 몇 번째인지 — 프리뷰와 실제 모양이 같아야 한다 */
  stampIndex?: number;
  /** 밀어서 확정 — 우표가 찍힌다 */
  onConfirm: () => void;
}

/**
 * "직접 만들었어요" 확인 시트 — 요리모드 마지막과 레시피 오버플로우 메뉴가 공용으로 쓴다.
 *
 * 탭이 아니라 밀어서 확정하는 건 오탭 방지가 아니라 "실제로 만들었다"는 확인이라서다.
 * 해제는 여기서 하지 않는다 — 메뉴에서 바로 풀린다(확인이 필요한 건 찍을 때뿐).
 *
 * 우표를 미리 보여주는 이유: 무엇이 모이는지 눈으로 알려야 모을 이유가 생긴다.
 */
export function MadeConfirmSheet({
  visible,
  onClose,
  imageUri,
  stampIndex = 0,
  onConfirm,
}: MadeConfirmSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  return (
    <BottomSheet visible={visible} onClose={onClose} hideHandle>
      <View style={styles.body}>
        <View style={styles.closeRow}>
          <IconButton icon={IconClose} size="medium" variant="soft" onPress={onClose} />
        </View>

        <View style={styles.stampWrap}>
          {/* 기울이지 않는다 — 하나만 크게 보여주는 자리라 반듯한 쪽이 낫다 */}
          <Stamp imageUri={imageUri} size={STAMP_SIZE} index={stampIndex} />
        </View>

        <Text style={styles.title}>{t('madeSheet.title')}</Text>
        <Text style={styles.description}>{t('madeSheet.description')}</Text>

        <View style={styles.slideWrap}>
          <SlideToConfirm
            label={t('madeSheet.slideLabel')}
            confirmedLabel={t('madeSheet.slideConfirmed')}
            onConfirm={handleConfirm}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeRow: {
    alignItems: 'flex-start',
    paddingTop: Spacing.xs,
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
});

export default MadeConfirmSheet;
