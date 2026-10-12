import {PageScrollView} from '@components/Page';
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, StyleSheet, Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {collection, query, orderBy, limit, getDocs, where, Timestamp} from 'firebase/firestore';
import {Image} from 'expo-image';
import {db} from '@config/firebase';
import {Card, ContentContainer} from '@components/Container';
import {EmptyState} from '@components/EmptyState';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {Tabs} from '@components/Tabs';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
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
import {goBackOr} from '@utils/navigation';

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
  reader: '한번에 쓰기 · 값 팝업',
  addSheet: '추가 시트',
};

/** 집계 기간(일) */
const PERIODS = [7, 30] as const;
type Period = typeof PERIODS[number];
/** 한 기간에 불러올 최대 건수 — 집계가 이 안에서 이뤄진다 */
const PERIOD_LIMIT = 1000;

interface Rate {key: string; total: number; failed: number}

/** 묶음별 시도·실패 수 — 실패율 높은 순 */
function groupRates(rows: OcrLogRow[], keyOf: (r: OcrLogRow) => string): Rate[] {
  const map = new Map<string, Rate>();
  rows.forEach(r => {
    const key = keyOf(r);
    const cur = map.get(key) ?? {key, total: 0, failed: 0};
    cur.total += 1;
    if (!r.ok) cur.failed += 1;
    map.set(key, cur);
  });
  return [...map.values()].sort((a, b) => b.failed / b.total - a.failed / a.total || b.total - a.total);
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

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
  const [period, setPeriod] = useState<Period>(7);
  const [viewer, setViewer] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 기간 안의 기록만 — 요약(성공률 등)이 이 범위로 집계된다
      const since = Timestamp.fromMillis(Date.now() - period * 24 * 60 * 60 * 1000);
      const q = query(collection(db, 'ocr_logs'), where('createdAt', '>=', since), orderBy('createdAt', 'desc'), limit(PERIOD_LIMIT));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({...(d.data() as OcrLogInput), id: d.id})));
    } catch {
      showSnackbar(t('adminOcrLogs.loadFailed'), {tone: 'error'});
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, t, period]);

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
  const bySource = groupRates(items, r => r.source);
  const byPlatform = groupRates(items, r => r.platform ?? '-');
  const rateValue = (r: Rate) => t('adminOcrLogs.rateValue', {rate: pct(r.failed, r.total), failed: r.failed, total: r.total});

  return (
    <View style={styles.container}>
      <View style={styles.safe}>
        <PageScrollView>
          <ContentContainer fill style={styles.content}>
          {/* 기간 — 아래 요약과 목록이 모두 이 범위 */}
          <Tabs
            tabs={PERIODS.map(d => ({id: String(d), label: t('adminOcrLogs.period', {days: d})}))}
            selectedId={String(period)}
            onSelect={id => setPeriod(Number(id) as Period)}
            fullWidth
          />

          {items.length > 0 && (
            <>
              {/* 요약 — 성공률, 그리고 어디·어느 플랫폼에서 많이 실패하는지 */}
              <Card style={styles.summary}>
                <ListItem title={t('adminOcrLogs.successRate')} trailingValue={t('adminOcrLogs.successValue', {rate: pct(items.length - failedCount, items.length), ok: items.length - failedCount, total: items.length})} />
                <ListItem title={t('adminOcrLogs.failRate')} trailingValue={t('adminOcrLogs.rateValue', {rate: pct(failedCount, items.length), failed: failedCount, total: items.length})} />
              </Card>
              <SectionHeader title={t('adminOcrLogs.bySource')} />
              <Card style={styles.summary}>
                {bySource.map(r => (
                  <ListItem key={r.key} title={SOURCE_LABEL[r.key] ?? r.key} trailingValue={rateValue(r)} />
                ))}
              </Card>
              <SectionHeader title={t('adminOcrLogs.byPlatform')} />
              <Card style={styles.summary}>
                {byPlatform.map(r => (
                  <ListItem key={r.key} title={r.key} trailingValue={rateValue(r)} />
                ))}
              </Card>
            </>
          )}

          <Tabs
            tabs={[
              {id: 'failed', label: t('adminOcrLogs.failedOnly', {count: failedCount})},
              {id: 'all', label: t('adminOcrLogs.all', {count: items.length})},
            ]}
            selectedId={filter}
            onSelect={id => setFilter(id as 'all' | 'failed')}
            fullWidth
            style={styles.tabs}
          />

          {!loading && shown.length === 0 ? (
            <EmptyState category="no-recipe" title={t('adminOcrLogs.empty')} />
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
          </ContentContainer>
        </PageScrollView>
      </View>

      <FloatingNavBar
        title={t('adminOcrLogs.title')}
        left={<NavPillButton icon={IconClose} onPress={() => goBackOr(router)} />}
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
  // 탭·카드 모두 콘텐츠 너비(최대 폭·좌우 여백) 안에
  content: {gap: Spacing.sm},
  tabs: {marginTop: Spacing.sm},
  summary: {paddingVertical: Spacing.xs},
  item: {padding: Spacing.md, gap: Spacing.sm},
  itemHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  itemInfo: {flex: 1, gap: 2},
  itemTitle: {...Typography.caption.large, color: colors['foreground/on-surface']},
  itemMeta: {...Typography.caption.small, color: colors['foreground/on-surface-muted']},
  error: {...Typography.caption.small, color: colors['custom/red']},
  thumb: {width: '100%', height: 160, borderRadius: Radius['radius-md'], backgroundColor: colors['fill/faint']},
  noImage: {...Typography.caption.small, color: colors['foreground/on-surface-muted']},
});
