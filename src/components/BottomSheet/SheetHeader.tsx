import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconClose} from '@components/Icon/IconIndex';
import {IconButton} from '@components/Layout/IconButton';
import {Avatar, AvatarColor} from '@components/Avatar/Avatar';
import {useThemedStyles} from '@hooks/useThemedStyles';

export interface SheetHeaderProps {
  title: string;
  onClose?: () => void;
  /** 아바타 아이콘 (타이틀 좌측, 같은 줄) */
  icon?: React.FC<SvgProps>;
  /** 아바타 색상 */
  avatarColor?: AvatarColor;
  /** 상단 중앙 커스텀 그래픽 (타이틀 위 세로 배치) */
  headerGraphic?: React.ReactNode;
}

export function SheetHeader({title, onClose, icon, avatarColor, headerGraphic}: SheetHeaderProps) {
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
                  size="large"
                  color={avatarColor}
                />
              )
            )}
            {onClose && (
              <IconButton
                icon={IconClose}
                variant="soft"
                size="small"
                onPress={onClose}
              />
            )}
          </View>
          {/* 타이틀: 그래픽 아래 좌측 정렬 */}
          <View style={styles.titleBelowGraphic}>
            <Text style={styles.titleLarge}>{title}</Text>
          </View>
        </>
      ) : (
        /* 그래픽 없음: 타이틀 + 닫기 같은 라인 */
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
          {onClose && (
            <IconButton
              icon={IconClose}
              variant="soft"
              size="small"
              onPress={onClose}
            />
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  graphicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  titleBelowGraphic: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    color: colors['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  titleLarge: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: 20,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: 26,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: colors['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
});
