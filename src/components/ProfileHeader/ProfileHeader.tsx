import React from 'react';
import {SvgProps} from 'react-native-svg';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar} from '@components/Avatar';
import {Button} from '@components/Button';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {triggerHaptic} from '@utils/haptics';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface ProfileStat {
  value: number;
  label: string;
}

export interface ProfileHeaderProps {
  name: string;
  /** '@핸들' 줄 — 없으면 이름만 */
  handle?: string;
  avatarSeed: string | number;
  /** 아래 한 줄 숫자(레시피 · 공개 등) */
  stats?: ProfileStat[];
  /** 아바타·이름을 눌렀을 때 */
  onPress?: () => void;
  /** 맨 아래 꽉 찬 버튼(예: 프로필 편집 / 로그인) */
  action?: {label: string; onPress: () => void};
  /** 프로필 줄 맨 오른쪽 아이콘 버튼(예: 설정 톱니) */
  iconAction?: {icon: React.FC<SvgProps>; onPress: () => void};
}

/**
 * 프로필 머리말 — [아바타 · 이름 / @핸들 · 숫자] / 꽉 찬 버튼.
 * 내 홈 맨 위. 작성자 홈 등 프로필이 필요한 곳은 같은 모양으로 이걸 쓴다.
 */
export function ProfileHeader({name, handle, avatarSeed, stats, onPress, action, iconAction}: ProfileHeaderProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.identity}
        disabled={!onPress}
        onPress={onPress ? () => { triggerHaptic('light'); onPress(); } : undefined}>
        <Avatar type="random" size="large" shape="circle" seed={avatarSeed} />
        <View style={styles.names}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {/* @핸들 오른쪽에 숫자 — 점 없이 간격(8)으로 구분 */}
          <View style={styles.subRow}>
            {handle ? <Text style={styles.handle} numberOfLines={1}>@{handle}</Text> : null}
            {stats?.map(st => (
              <Text key={st.label} style={styles.handle} numberOfLines={1}>
                <Text style={styles.statValue}>{st.value}</Text>{` ${st.label}`}
              </Text>
            ))}
          </View>
        </View>
        {/* 프로필 줄 맨 오른쪽 아이콘 버튼(설정 등) — 외곽선·사각, 정사각 */}
        {iconAction ? <Button icon={iconAction.icon} label="" variant="outlined" onPress={iconAction.onPress} /> : null}
      </Pressable>
      {action ? <Button label={action.label} variant="outlined" shape="square" onPress={action.onPress} style={styles.actionMain} /> : null}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  wrap: {
    gap: Spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  names: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...Typography.title.medium,
    color: colors['foreground/on-surface'],
  },
  handle: {
    ...Typography.caption.large,
    color: colors['foreground/on-surface-muted'],
  },
  statValue: {
    ...Typography.caption.large,
    color: colors['foreground/on-surface'],
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: Spacing.sm,
  },
  actionMain: {
    alignSelf: 'stretch',
  },

});
