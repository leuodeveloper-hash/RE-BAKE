import {PageScrollView} from '@components/Page';
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {collection, query, where, getCountFromServer} from 'firebase/firestore';
import {db} from '@config/firebase';
import {Card, ContentContainer} from '@components/Container';
import {EmptyState} from '@components/EmptyState';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {IconClose, IconRefresh} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';
import {goBackOr} from '@utils/navigation';

/** n일 전 날짜(YYYY-MM-DD, 기기 시간 기준) — activity.ts의 lastDay와 같은 형식 */
const dayAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * 어드민 전용 — 활성 사용자(DAU·WAU·MAU, 기기 기준)와 가입자 수.
 * activeDevices는 이 기능이 들어간 빌드부터 쌓인다(이전 기록 없음).
 */
export default function AdminStatsRoute() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const {isAdmin} = useAuth();
  const {showSnackbar} = useSnackbar();
  const [stats, setStats] = useState<{key: string; value: number | null}[]>([]);

  const load = useCallback(async () => {
    const active = collection(db, 'activeDevices');
    const rows: [string, Promise<number>][] = [
      ['dau', getCountFromServer(query(active, where('lastDay', '>=', dayAgo(0)))).then(s => s.data().count)],
      ['wau', getCountFromServer(query(active, where('lastDay', '>=', dayAgo(6)))).then(s => s.data().count)],
      ['mau', getCountFromServer(query(active, where('lastDay', '>=', dayAgo(29)))).then(s => s.data().count)],
      ['devices', getCountFromServer(active).then(s => s.data().count)],
      ['users', getCountFromServer(collection(db, 'users')).then(s => s.data().count)],
    ];
    const settled = await Promise.allSettled(rows.map(([, p]) => p));
    if (settled.some(r => r.status === 'rejected')) showSnackbar(t('adminStats.loadFailed'), {tone: 'error'});
    setStats(rows.map(([key], i) => ({key, value: settled[i].status === 'fulfilled' ? (settled[i] as PromiseFulfilledResult<number>).value : null})));
  }, [showSnackbar, t]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <EmptyState title={t('adminSubmissions.accessDenied')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageScrollView>
        <ContentContainer fill style={styles.content}>
          {stats.map(s => (
            <Card key={s.key} style={styles.item}>
              <Text style={styles.label}>{t(`adminStats.${s.key}`)}</Text>
              <Text style={styles.value}>{s.value ?? '-'}</Text>
            </Card>
          ))}
          <Text style={styles.note}>{t('adminStats.note')}</Text>
        </ContentContainer>
      </PageScrollView>
      <FloatingNavBar
        title={t('adminStats.title')}
        left={<NavPillButton icon={IconClose} onPress={() => goBackOr(router)} />}
        right={<NavPillButton icon={IconRefresh} onPress={load} />}
      />
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: colors['surface/normal']},
    content: {gap: Spacing.md},
    item: {padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    label: {fontSize: Typography.body.large.fontSize, color: colors['foreground/on-surface']},
    value: {fontSize: Typography.body.large.fontSize, fontWeight: '600', color: colors['foreground/on-surface']},
    note: {fontSize: Typography.body.medium.fontSize, color: colors['foreground/on-surface-muted']},
  });
