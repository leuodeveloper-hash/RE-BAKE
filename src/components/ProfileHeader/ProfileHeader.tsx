import React from 'react';
import {SvgProps} from 'react-native-svg';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar} from '@components/Avatar';
import {IconButton} from '@components/IconButton';
import {navPillStyle} from '@components/Navigation';
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
  /** 프로필 줄 맨 오른쪽 아이콘 버튼들(예: 공유, 설정) — 보조 고스트 아이콘 버튼(48), 붙여서 나란히 */
  iconActions?: {icon: React.FC<SvgProps>; onPress: () => void}[];
}

/**
 * 프로필 머리말 — [아바타 · 이름 / @핸들 · 숫자 · (오른쪽) 아이콘 버튼들].
 * 내 홈 맨 위. 작성자 홈 등 프로필이 필요한 곳은 같은 모양으로 이걸 쓴다.
 */
export function ProfileHeader({name, handle, avatarSeed, stats, onPress, iconActions}: ProfileHeaderProps) {
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
        {/* 프로필 줄 맨 오른쪽 아이콘 버튼들(공유·설정) — 고스트 */}
        {iconActions?.length ? (
          <View style={styles.iconActions}>
            {iconActions.map((a, i) => (
              // 앱바 알약 안 버튼과 같은 크기(40)·간격(2) — 위 앱바 버튼들과 같은 간격으로 붙는다
              <IconButton key={i} icon={a.icon} variant="ghost-secondary" size="medium" onPress={a.onPress} />
            ))}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  wrap: {
    gap: Spacing.md,
    // 위아래 숨 쉴 여백 — 앱바·목록과 붙어 보이지 않게
    paddingVertical: Spacing.sm,
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
  // 고스트 버튼은 테두리가 없어 칸 자체가 여백 — 간격을 더 주면 서로 멀어 보였다
  iconActions: {
    flexDirection: 'row',
    gap: navPillStyle.gap,
  },

});
