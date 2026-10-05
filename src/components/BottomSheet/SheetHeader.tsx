import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconClose, IconArrowLeft} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {NavPillButton} from '@components/Navigation/NavPillButton';
import {Avatar, AvatarColor} from '@components/Avatar/Avatar';
import {useThemedStyles} from '@hooks/useThemedStyles';

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
  /** 타이틀 우측 슬롯(예: 레이아웃 전환 버튼). center 모드의 빈 자리를 채운다 */
  headerRight?: React.ReactNode;
  /** 다음 단계 화면일 때 — 타이틀 왼쪽에 뒤로가기 */
  onBack?: () => void;
}

export function SheetHeader({title, description, onClose, icon, avatarColor, headerGraphic, headerType = 'default', headerRight, onBack}: SheetHeaderProps) {
  const styles = useThemedStyles(createStyles);

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
                  // 한 단계 크게(36→48) — 다이얼로그·시트 머리 아이콘이 제목에 비해 작아 보였다
                  size="large"
                  color={avatarColor}
                />
              )
            )}
            {onClose && (
              <IconButton
                icon={IconClose}
                variant="tonal"
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
          {/* 중앙 정렬 — 앱바와 같은 떠 있는 헤더: 왼쪽 유리 알약(닫기/뒤로), 가운데 제목, 오른쪽 슬롯(NavPillGroup으로 묶음).
              다음 단계(onBack)면 왼쪽은 뒤로가기만(닫기 없음) */}
          <View style={styles.centerRow}>
            {/* 제목은 줄 전체 기준 정가운데에 따로 둔다(앱바와 같은 방식) — 양옆 버튼 개수·폭과 상관없이 늘 가운데 */}
            <View pointerEvents="none" style={styles.centerTitleLayer}>
              <Text style={styles.titleCenter} numberOfLines={1}>{title}</Text>
            </View>
            <View style={styles.centerSide}>
              {onBack ? (
                <NavPillButton icon={IconArrowLeft} onPress={onBack} />
              ) : onClose ? (
                <NavPillButton icon={IconClose} onPress={onClose} />
              ) : null}
            </View>
            <View style={[styles.centerSide, styles.centerSideRight]}>
              {headerRight}
            </View>
          </View>
          {description && (
            // 라벨이 가운데면 설명도 가운데 — 왼쪽 정렬이면 제목과 선이 어긋나 보인다
            <View style={styles.descriptionRow}>
              <Text style={[styles.description, styles.descriptionCenter]}>{description}</Text>
            </View>
          )}
        </>
      ) : (
        <>
          {/* 그래픽 없음: 타이틀 + 닫기 같은 라인 */}
          <View style={styles.titleRow}>
            {onBack && <IconButton icon={IconArrowLeft} variant="tonal" size="medium" onPress={onBack} />}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
            {headerRight}
            {onClose && (
              <IconButton
                icon={IconClose}
                variant="tonal"
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

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
    paddingBottom: Spacing.smd,
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
  centerTitleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // 양옆 버튼 자리와 겹치지 않을 만큼만 — 길면 말줄임
    paddingHorizontal: 96,
  },
  centerSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerSideRight: {
    justifyContent: 'flex-end',
  },
  titleCenter: {
    ...Typography.title.medium,
    fontWeight: Typography.title.medium.fontWeight as '700',
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET,
    textAlign: 'center' as const,
  },
  descriptionCenter: {
    textAlign: 'center',
  },
  description: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-muted'],
    marginTop: Spacing.sm,
  },
});
