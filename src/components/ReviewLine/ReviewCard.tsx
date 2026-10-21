import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {Card} from '@components/Container';
import {ListItem, type ListItemElementType} from '@components/ListItem';
import {StepPhotos} from '@components/StepPhotos/StepPhotos';
import {IconCornerDownRight, IconPenTipFilled} from '@components/Icon/IconIndex';
import {normalizeStepPhotos} from '@utils/stepPhotos';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import type {StepPhoto} from '../../types/recipe';

/**
 * 회고 카드 — 상세 회고 칸과 스탬프 시트가 같은 모양.
 * 머리(회고 · 펜촉) / 평가 / ↳ 다음 개선 점 / 사진
 */
export function ReviewCard({evaluation, improvement, photos, onTitlePress, trailing, onPhotoPress, grouped}: {
  evaluation?: string;
  improvement?: string;
  photos?: (string | StepPhoto)[];
  onTitlePress?: () => void;
  trailing?: ListItemElementType;
  onPhotoPress?: (index: number) => void;
  /** 로그인 칸처럼 줄마다 바탕 + 줄 사이 1 틈(묶음 카드), 회고 머리줄 없이 — 스탬프 시트 */
  grouped?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  return (
    <Card group={grouped}>
      {!grouped && (
        <ListItem
          title={t('recipeDetail.tabReview')}
          onPress={onTitlePress}
          leading={{type: 'icon', icon: IconPenTipFilled}}
          trailing={trailing}
        />
      )}
      {evaluation ? (
        <ListItem titleNumberOfLines={0} showDivider={!!improvement}>
          <Text style={styles.text}>{evaluation}</Text>
        </ListItem>
      ) : null}
      {improvement ? (
        <ListItem leading={{type: 'icon', icon: IconCornerDownRight}} titleNumberOfLines={0} showDivider={false}>
          <Text style={styles.text}>{improvement}</Text>
        </ListItem>
      ) : null}
      {/* 회고 사진 — 과정 사진과 같은 형식(탭하면 크게) */}
      {photos && photos.length > 0 ? (
        <ListItem showDivider={false}>
          <StepPhotos photos={normalizeStepPhotos(photos)} mode="view" paddingTop={false} onPhotoPress={onPhotoPress} />
        </ListItem>
      ) : null}
    </Card>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  text: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET + 1,
  },
});
