import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AuthorAvatar} from './AuthorAvatar';
import {Popover} from '@components/Popover';
import {GlassContainer} from '@components/Container';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';

export interface AuthorBadgeProps {
  /** 작성자 id — 공식(bakey)이면 심볼 로고 아바타 */
  authorId?: string;
  displayName: string;
  handle: string;
  /** 랜덤 아바타 시드 (일반 유저용) */
  avatarSeed: string | number;
  recipeCount: number;
  /** 자체 유리 알약을 그리지 않고 아바타만 렌더(셀렉터 등 다른 알약 안에 넣을 때). */
  bare?: boolean;
}

/**
 * 앱바에 플로팅으로 얹는 작성자 배지 — 동그란 아바타 하나.
 * 탭하면 아바타 아래로 팝오버가 떠서 이름·@handle·레시피 수를 보여준다.
 * 자족적(상태 자체 관리)이라 앱바 titleLeadingNode로 그대로 넘기면 된다.
 */
export function AuthorBadge({authorId, displayName, handle, avatarSeed, recipeCount, bare = false}: AuthorBadgeProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.anchor}>
      {/* bare: 셀렉터 등 다른 알약 안에 넣을 때는 자체 알약 없이 아바타만. */}
      {bare ? (
        <Pressable onPress={() => setOpen(v => !v)} hitSlop={6}>
          <AuthorAvatar authorId={authorId} seed={avatarSeed} size="medium" />
        </Pressable>
      ) : (
        /* X·셀렉터와 같은 유리 알약 톤으로 맞춤 (아바타만 붕 뜨지 않게) */
        <GlassContainer contentStyle={styles.pill}>
          <Pressable onPress={() => setOpen(v => !v)} hitSlop={6}>
            <AuthorAvatar authorId={authorId} seed={avatarSeed} size="medium" />
          </Pressable>
        </GlassContainer>
      )}

      <Popover
        visible={open}
        onClose={() => setOpen(false)}
        minWidth={200}
        style={styles.popover}>
        <View style={styles.card}>
          <AuthorAvatar authorId={authorId} seed={avatarSeed} size="large" />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.count}>{t('authorHome.recipeCount', {count: recipeCount})}</Text>
          </View>
        </View>
      </Popover>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    anchor: {
      position: 'relative',
    },
    // NavPillButton과 동일 규격(높이 44, padding 2) — X·셀렉터 알약과 톤/높이 일치
    pill: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    },
    popover: {
      position: 'absolute',
      top: 44,
      left: 0,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.xs,
    },
    info: {
      flexShrink: 1,
      gap: 2,
    },
    name: {
      fontFamily: Typography.title.medium.fontFamily,
      fontSize: Typography.title.medium.fontSize,
      fontWeight: Typography.title.medium.fontWeight as '700',
      color: colors['foreground/on-surface'],
    },
    handle: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      color: colors['foreground/on-surface-muted'],
    },
    count: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      color: colors['foreground/on-surface-muted'],
    },
  });
