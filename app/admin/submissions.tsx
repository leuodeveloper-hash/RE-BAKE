import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, StyleSheet, Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {collection, query, where, orderBy, getDocs, doc, setDoc, updateDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {Avatar} from '@components/Avatar';
import {Button} from '@components/Button';
import {Card} from '@components/Container';
import {EmptyState} from '@components/EmptyState';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {IconClose} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';
import type {Submission} from '../../src/types/submission';

/**
 * 어드민 전용 — 유저의 둘러보기 공개 신청 검토.
 * pending 신청을 나열, 승인하면 explore_recipes로 이동(작성자=유저 본인 유지), 반려하면 상태만 변경.
 */
export default function AdminSubmissionsRoute() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const {isAdmin} = useAuth();
  const {showSnackbar} = useSnackbar();

  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'submissions'),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc'),
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({...(d.data() as Submission), id: d.id})));
    } catch {
      showSnackbar(t('adminSubmissions.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, t]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const approve = useCallback(async (s: Submission) => {
    setBusyId(s.id);
    try {
      // explore_recipes로 이동 — 작성자(authorId=유저)는 그대로 유지. 검토 상태 필드는 제거.
      const {status: _st, submittedAt: _sb, reviewedAt: _rv, rejectReason: _rr, sourceRecipeId: _sr, id: _id, ...recipeData} = s;
      const exploreId = `explore_${Date.now()}`;
      await setDoc(doc(db, 'explore_recipes', exploreId), {
        ...recipeData,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'submissions', s.id), {status: 'approved', reviewedAt: new Date().toISOString()});
      setItems(prev => prev.filter(x => x.id !== s.id));
      showSnackbar(t('adminSubmissions.approved'));
    } catch {
      showSnackbar(t('adminSubmissions.actionFailed'));
    } finally {
      setBusyId(null);
    }
  }, [showSnackbar, t]);

  const reject = useCallback(async (s: Submission) => {
    setBusyId(s.id);
    try {
      await updateDoc(doc(db, 'submissions', s.id), {status: 'rejected', reviewedAt: new Date().toISOString()});
      setItems(prev => prev.filter(x => x.id !== s.id));
      showSnackbar(t('adminSubmissions.rejected'));
    } catch {
      showSnackbar(t('adminSubmissions.actionFailed'));
    } finally {
      setBusyId(null);
    }
  }, [showSnackbar, t]);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <EmptyState title={t('adminSubmissions.accessDenied')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {!loading && items.length === 0 ? (
          <EmptyState title={t('adminSubmissions.empty')} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {items.map(s => (
            <Card key={s.id} style={styles.item}>
              <Pressable
                style={styles.itemHeader}
                onPress={() => router.push(`/recipe/${s.sourceRecipeId ?? s.id}` as any)}
              >
                <Avatar size="small" type="random" seed={s.authorAvatarSeed ?? s.authorId} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.itemAuthor} numberOfLines={1}>{s.authorDisplayName ?? s.authorHandle ?? s.authorId}</Text>
                </View>
              </Pressable>
              <View style={styles.actions}>
                <Button
                  label={t('adminSubmissions.reject')}
                  variant="soft"
                  onPress={() => reject(s)}
                  disabled={busyId === s.id}
                />
                <Button
                  label={t('adminSubmissions.approve')}
                  variant="soft"
                  onPress={() => approve(s)}
                  disabled={busyId === s.id}
                />
              </View>
            </Card>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <FloatingNavBar
        title={t('adminSubmissions.title')}
        left={<NavPillButton icon={IconClose} onPress={() => router.back()} />}
      />
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: colors['surface/normal']},
    safe: {flex: 1},
    // FloatingNavBar(오버레이)에 가리지 않게 상단 여백
    scrollContent: {padding: Spacing.md, paddingTop: 56, gap: Spacing.md},
    item: {padding: Spacing.md, gap: Spacing.md},
    itemHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
    itemInfo: {flex: 1},
    itemTitle: {fontSize: Typography.body.large.fontSize, fontWeight: '600', color: colors['foreground/on-surface']},
    itemAuthor: {fontSize: Typography.body.medium.fontSize, color: colors['foreground/on-surface-muted']},
    actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm},
  });
