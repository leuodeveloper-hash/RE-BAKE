import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconClose} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Avatar, AvatarColor} from '@components/Avatar/Avatar';
import {useThemedStylesV2} from '@hooks/useThemedStyles';

export interface SheetHeaderProps {
  title: string;
  /** 타이틀 아래 설명 텍스트 (문자열 또는 인라인 Text 노드) */
  description?: React.ReactNode;
  onClose?: () => void;
  /** 아바타 아이콘 (타이틀 좌측, 같은 줄) */
  icon?: React.FC<SvgProps>;
  /** 아바타 색상 */
  avatarColor?: AvatarColor;
  /** 상단 중앙 커스텀 그래픽 (타이틀 위 세로 배치) */
  headerGraphic?: React.ReactNode;
  /** 헤더 레이아웃: 'default' (좌측 정렬) | 'center' (중앙 정렬) */
  headerType?: 'default' | 'center';
}

export function SheetHeader({title, description, onClose, icon, avatarColor, headerGraphic, headerType = 'default'}: SheetHeaderProps) {
  const styles = useThemedStylesV2(createStyles);

  const hasGraphic = headerGraphic || icon;

  return (
    <View>
      {hasGraphic ? (
        <>
          {/* 그래픽 + 닫기 버튼: 같은 라인 */}
          <View style={styles.graphicRow}>
            {headerGraphic || (
              icon && (
                <Avatar
                  type="icon"
                  icon={icon}
                  shape="circle"
                  size="medium"
                  color={avatarColor}
                />
              )
            )}
            {onClose && (
              <IconButton
                icon={IconClose}
                variant="ghost-secondary"
                size="medium"
                onPress={onClose}
              />
            )}
          </View>
          {/* 타이틀: 그래픽 아래 좌측 정렬 */}
          <View style={styles.titleBelowGraphic}>
            <Text style={styles.titleLarge}>{title}</Text>
            {description && <Text style={styles.description}>{description}</Text>}
          </View>
        </>
      ) : headerType === 'center' ? (
        <>
          {/* 중앙 정렬: 닫기 좌측, 타이틀 가운데 */}
          <View style={styles.centerRow}>
            {onClose ? (
              <IconButton
                icon={IconClose}
                variant="ghost-secondary"
                size="medium"
                onPress={onClose}
              />
            ) : <View style={styles.centerPlaceholder} />}
            <Text style={styles.titleCenter}>{title}</Text>
            <View style={styles.centerPlaceholder} />
          </View>
          {description && (
            <View style={styles.descriptionRow}>
              <Text style={styles.description}>{description}</Text>
            </View>
          )}
        </>
      ) : (
        <>
          {/* 그래픽 없음: 타이틀 + 닫기 같은 라인 */}
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
            {onClose && (
              <IconButton
                icon={IconClose}
                variant="ghost-secondary"
                size="medium"
                onPress={onClose}
              />
            )}
          </View>
          {description && (
            <View style={styles.descriptionRow}>
              <Text style={styles.description}>{description}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  graphicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  titleBelowGraphic: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.smd,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.smd,
    paddingBottom: Spacing.lg,
  },
  descriptionRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: 20,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: 26,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  titleLarge: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: 20,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: 26,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  centerPlaceholder: {
    width: 28,
    height: 28,
  },
  titleCenter: {
    ...Typography.title.medium,
    fontWeight: Typography.title.medium.fontWeight as '700',
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET,
    textAlign: 'center' as const,
  },
  description: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-muted'],
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
});
