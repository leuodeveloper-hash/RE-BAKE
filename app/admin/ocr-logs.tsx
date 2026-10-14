import {PageScrollView} from '@components/Page';
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, StyleSheet, Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {collection, query, orderBy, limit, getDocs, where, Timestamp} from 'firebase/firestore';
import {db} from '@config/firebase';
import {Card, ContentContainer} from '@components/Container';
import {EmptyState} from '@components/EmptyState';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {Tabs} from '@components/Tabs';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {SummaryCard} from '@components/SummaryCard';
import {Selector} from '@components/Selector';
import {ListThumbnail} from '@components/Recipe/RecipeCard';
import {Menu} from '@components/Menu';
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
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [period, setPeriod] = useState<Period>(7);
  const [periodMenu, setPeriodMenu] = useState(false);
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

  const shown = filter === 'failed' ? items.filter(i => !i.ok) : filter === 'success' ? items.filter(i => i.ok) : items;
  const failedCount = items.filter(i => !i.ok).length;
  const bySource = groupRates(items, r => r.source);
  const byPlatform = groupRates(items, r => r.platform ?? '-');
  const rateValue = (r: Rate) => t('adminOcrLogs.rateValue', {rate: pct(r.failed, r.total), failed: r.failed, total: r.total});

  return (
    <View style={styles.container}>
      <View style={styles.safe}>
        <PageScrollView>
          <ContentContainer fill style={styles.content}>

          {/* 실패만 / 전체 + 오른쪽 기간 피커 — 기간은 화면 전체(지표·목록)에 적용 */}
          <View style={styles.filterRow}>
            <View style={styles.filterTabs}>
            {(
            <Tabs
              tabs={[
                {id: 'all', label: t('adminOcrLogs.all', {count: items.length})},
                {id: 'success', label: t('adminOcrLogs.successOnly', {count: items.length - failedCount})},
                {id: 'failed', label: t('adminOcrLogs.failedOnly', {count: failedCount})},
              ]}
              selectedId={filter}
              onSelect={id => setFilter(id as 'all' | 'success' | 'failed')}
              size="big"
            />
            )}
            </View>
            <View style={styles.periodWrap}>
              <Selector
                label={t('adminOcrLogs.period', {days: period})}
                showDropdown
                variant="circle"
                size="large"
                onPress={() => setPeriodMenu(v => !v)}
              />
              <Menu
                items={PERIODS.map(d => ({id: String(d), label: t('adminOcrLogs.period', {days: d})}))}
                selectedId={String(period)}
                visible={periodMenu}
                onSelect={id => { setPeriodMenu(false); setPeriod(Number(id) as Period); }}
                style={styles.periodMenu}
              />
            </View>
          </View>

          {filter === 'all' && items.length > 0 && (
            <>
              {/* 지표는 전부 한 줄 카드(넘치면 옆으로 민다): 성공률 · 실패율 · 플랫폼별 · 자리별(실패율 높은 순) */}
              {/* flexGrow 0 — 가로 스크롤도 기본은 남는 높이를 채우려 늘어나서(빈 화면 가운데용 fill 안이라) 카드가 길게 늘어났다 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statScroll} contentContainerStyle={styles.statRow}>
                <View style={styles.statCard}>
                  <SummaryCard
                    title={`${pct(items.length - failedCount, items.length)}%`}
                    subtitle={[t('adminOcrLogs.successRate'), `${items.length - failedCount}/${items.length}`]}
                  />
                </View>
                <View style={styles.statCard}>
                  <SummaryCard
                    title={`${pct(failedCount, items.length)}%`}
                    subtitle={[t('adminOcrLogs.failRate'), `${failedCount}/${items.length}`]}
                  />
                </View>
                {[...byPlatform.map(r => ({...r, label: r.key})), ...bySource.map(r => ({...r, label: SOURCE_LABEL[r.key] ?? r.key}))].map(r => (
                  <View key={r.label} style={styles.statCard}>
                    <SummaryCard
                      title={`${pct(r.failed, r.total)}%`}
                      subtitle={[r.label, `${r.failed}/${r.total}`]}
                    />
                  </View>
                ))}
              </ScrollView>
            </>
          )}


          {/* 기록이 없으면 공통 빈 화면(남은 칸 상하 중앙) — 탭·기간 피커는 그대로, 지표는 숨긴다 */}
          {!loading && shown.length === 0 ? (
            <EmptyState category="no-recipe" title={items.length === 0 ? t('adminOcrLogs.empty') : filter === 'success' ? t('adminOcrLogs.emptySuccess') : t('adminOcrLogs.emptyFailed')} />
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
                    {/* 기존 사진(레시피에 이미 있던 사진)으로 읽었으면 표시 — 없으면 '이미지 없음' */}
                    {/* 이미지 상태 + 실패 사유를 한 줄에 — 사유가 아래 따로 있으면 카드만 길어졌다 */}
                    <Text style={styles.noImage} numberOfLines={1}>
                      {row.fromExisting ? t('adminOcrLogs.existingImage') : !row.imageUrl ? t('adminOcrLogs.noImage') : ''}
                      {row.error ? <Text style={styles.error}>{`${row.fromExisting || !row.imageUrl ? '  ' : ''}${row.error}`}</Text> : null}
                    </Text>
                  </View>
                  {/* 썸네일 — 보여 줄 사진이 있을 때만 오른쪽 정사각. 없으면 비워 둔다. 눌러서 크게 */}
                  {row.imageUrl ? (
                    <Pressable onPress={() => setViewer(row.imageUrl!)}>
                      {/* 공통 목록 썸네일 — 레시피 목록과 같은 라인·그림자 */}
                      <ListThumbnail size={56} imageUrl={row.imageUrl} />
                    </Pressable>
                  ) : null}
                </View>


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
  // 묶음(머리말+카드)은 앞과 더 띄운다 — 기록 카드끼리 간격(8)은 그대로
  group: {marginTop: Spacing.md},
  statRow: {flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start'},
  // 지표 줄과 아래 기록 목록 사이 24(목록 카드끼리 8보다 띄워 묶음이 갈린다)
  statScroll: {flexGrow: 0, marginBottom: Spacing.md},
  // 옆으로 미는 지표 카드 폭 — 이름(한번에 쓰기 등)이 한 줄에 들어가게
  statCard: {width: 160, flexDirection: 'row'},
  // 탭은 내용 폭만큼(허그), 기간 피커는 오른쪽 끝
  filterRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, zIndex: 10},
  filterTabs: {},
  periodWrap: {zIndex: 10},
  periodMenu: {position: 'absolute', top: 48, right: 0},
  item: {padding: Spacing.md, gap: Spacing.sm},
  // 성공·실패 아이콘과 글 사이 16
  itemHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  itemInfo: {flex: 1, gap: 2},
  itemTitle: {...Typography.caption.large, color: colors['foreground/on-surface']},
  itemMeta: {...Typography.caption.small, color: colors['foreground/on-surface-muted']},
  error: {...Typography.caption.small, color: colors['custom/red']},
  thumb: {width: 56, height: 56, borderRadius: Radius['radius-sm'], backgroundColor: colors['fill/faint']},
  noImage: {...Typography.caption.small, color: colors['foreground/on-surface-muted']},
});
