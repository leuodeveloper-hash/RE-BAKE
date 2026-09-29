import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, StyleSheet, Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {collection, query, orderBy, limit, getDocs} from 'firebase/firestore';
import {Image} from 'expo-image';
import {db} from '@config/firebase';
import {Card} from '@components/Container';
import {EmptyState} from '@components/EmptyState';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {Tabs} from '@components/Tabs';
import {PhotoViewer} from '@components/PhotoViewer';
import {IconClose, IconCircleCheckFilled, IconCircleAlertFilled} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';
import type {OcrLogInput} from '@utils/ocrLog';

interface OcrLogRow extends OcrLogInput {
  id: string;
  platform?: string;
  createdAt?: {seconds: number};
}

/** 자리 라벨 — 어디서 인식을 시도했는지 한눈에 */
const SOURCE_LABEL: Record<string, string> = {
  'edit.title': '편집 · 제목',
  'edit.ingredients': '편집 · 재료',
  'edit.tools': '편집 · 도구',
  'edit.steps': '편집 · 과정',
  inputBar: '입력바',
  cookingMode: '요리모드',
};

/**
 * 어드민 전용 — 이미지 인식(OCR) 시도 기록.
 *
 * 실패해도 사용자에겐 "인식할 수 없어요" 한 줄만 뜬다. 어떤 이미지를 어디에
 * 넣었길래 실패했는지 봐야 파서를 고칠 수 있다.
 */
export default function AdminOcrLogsRoute() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  const {isAdmin} = useAuth();
  const {showSnackbar} = useSnackbar();

  const [items, setItems] = useState<OcrLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  // 실패만 보는 일이 대부분이다 — 고칠 거리가 거기 있다
  const [filter, setFilter] = useState<'all' | 'failed'>('failed');
  const [viewer, setViewer] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'ocr_logs'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({...(d.data() as OcrLogInput), id: d.id})));
    } catch {
      showSnackbar(t('adminOcrLogs.loadFailed'), {tone: 'error'});
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, t]);

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <EmptyState title={t('adminSubmissions.accessDenied')} />
      </View>
    );
  }

  const shown = filter === 'failed' ? items.filter(i => !i.ok) : items;
  const failedCount = items.filter(i => !i.ok).length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Tabs
            tabs={[
              {id: 'failed', label: t('adminOcrLogs.failedOnly', {count: failedCount})},
              {id: 'all', label: t('adminOcrLogs.all', {count: items.length})},
            ]}
            selectedId={filter}
            onSelect={id => setFilter(id as 'all' | 'failed')}
            style={styles.tabs}
          />

          {!loading && shown.length === 0 ? (
            <EmptyState title={t('adminOcrLogs.empty')} />
          ) : (
            shown.map(row => (
              <Card key={row.id} style={styles.item}>
                <View style={styles.itemHeader}>
                  {/* 성공·실패는 색만으로 가르지 않는다 — 아이콘도 함께 */}
                  {row.ok
                    ? <IconCircleCheckFilled width={18} height={18} color={colors['custom/green']} />
                    : <IconCircleAlertFilled width={18} height={18} color={colors['custom/red']} />}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {SOURCE_LABEL[row.source] ?? row.source}
                      {row.field && !SOURCE_LABEL[row.source]?.includes('·') ? ` · ${row.field}` : ''}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {t('adminOcrLogs.meta', {
                        chars: row.textLength ?? 0,
                        items: row.itemCount ?? 0,
                        platform: row.platform ?? '-',
                      })}
                    </Text>
                  </View>
                </View>

                {row.error ? (
                  <Text style={styles.error} numberOfLines={2}>{row.error}</Text>
                ) : null}

                {row.imageUrl ? (
                  // 무엇을 넣었는지 봐야 왜 실패했는지 안다 — 눌러서 크게
                  <Pressable onPress={() => setViewer(row.imageUrl!)}>
                    <Image
                      source={{uri: row.imageUrl}}
                      style={styles.thumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                  </Pressable>
                ) : (
                  <Text style={styles.noImage}>{t('adminOcrLogs.noImage')}</Text>
                )}
              </Card>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        title={t('adminOcrLogs.title')}
        left={<NavPillButton icon={IconClose} onPress={() => router.back()} />}
      />

      {viewer && (
        <PhotoViewer
          photos={[{uri: viewer}]}
          index={0}
          onIndexChange={() => {}}
          onClose={() => setViewer(null)}
        />
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors['surface/dim']},
  safe: {flex: 1},
  scrollContent: {padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm},
  tabs: {marginBottom: Spacing.xs},
  item: {padding: Spacing.md, gap: Spacing.sm},
  itemHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  itemInfo: {flex: 1, gap: 2},
  itemTitle: {...Typography.label.large, color: colors['foreground/on-surface']},
  itemMeta: {...Typography.label.small, color: colors['foreground/on-surface-muted']},
  error: {...Typography.label.small, color: colors['custom/red']},
  thumb: {width: '100%', height: 160, borderRadius: Radius['radius-md'], backgroundColor: colors['fill/faint']},
  noImage: {...Typography.label.small, color: colors['foreground/on-surface-muted']},
});
