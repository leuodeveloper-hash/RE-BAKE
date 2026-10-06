import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {Selector} from '@components/Selector';
import {Menu, MenuItem} from '@components/Menu';
import {Avatar} from '@components/Avatar';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation, type TranslateFn} from '@contexts/LanguageContext';
import {type ScheduleExamType} from '@constants/examTypes';
import {fetchAllSchedules, type ExamSchedule} from '@utils/examSchedules';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconClose, IconArrowTopRight, IconDotFilled, IconCircleCheckFilled, IconCircleDot, IconChevronDown, IconCursor, IconCursorFilled} from '@components/Icon/IconIndex';
import {shortDate} from '@utils/dateLabel';
import {goBackOr} from '@utils/navigation';
import {BottomSheet} from '@components/BottomSheet';
import {TimelineItem} from '@components/Timeline';
import {IconButton} from '@components/IconButton';
import {syncExamWidget} from '@utils/examWidgetSync';
import {
  canChooseExamDate, chosenDateKey, effectiveExamDate, examPeriodDays,
  pullChosenDatesFromAccount, setChosenDate, type ExamChosenDates,
} from '@utils/examChosenDate';

// 큐넷 기능사 정기 시험일정 페이지
const QNET_SCHEDULE_URL = 'https://www.q-net.or.kr/crf021.do?id=crf02101&scheType=04';

/** examType → 실기/필기 */
function kindLabel(examType: ScheduleExamType, t: TranslateFn): string {
  return examType.endsWith('practical') ? t('examschedule.kindPractical') : t('examschedule.kindWritten');
}

/** 시험일 표시: 실기(examEndDate 있음)는 기간 'M월 D일~M월 D일', 필기는 단일일 */
function examPeriod(s: ExamSchedule): string {
  if (s.examEndDate) return `${shortDate(s.examDate)}~${shortDate(s.examEndDate)}`;
  return shortDate(s.examDate);
}

/** 회차 라벨에서 연도 접두사 제거 ('2026년 3회' → '3회') */
function cleanRound(round: string): string {
  return round.replace(/^\d{4}\s*년?\s*/, '').trim();
}



/** ISO date → 오늘 자정 기준 남은 일수 (시각 무시, 로컬). 파싱 실패 시 null */
function daysUntil(iso: string): number | null {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(target) - startOfDay(new Date())) / 86400000);
}

/** 일수 → D-day 라벨. 당일=D-DAY, 미래=D-N(99 초과 D-99+), 지남=D+N */
function formatDday(diffDays: number): string {
  if (diffDays === 0) return 'D-DAY';
  if (diffDays > 0) return diffDays > 99 ? 'D-99+' : `D-${diffDays}`;
  return `D+${-diffDays}`;
}

/**
 * 일정의 D-day 라벨 — 시험 시작일(examDate) 기준으로 남은 일수.
 * (접수/발표가 아니라 "시험까지 며칠"을 보여준다. 실기는 examDate=시작일.)
 * examDate 없으면 시험일 대체 불가 → 접수/발표 순으로 폴백, 그것도 없으면 TBD.
 */
function ddayLabel(s: ExamSchedule, chosen: ExamChosenDates): string {
  // 필기처럼 기간이 있으면 내가 고른 날 기준
  const iso = (s.examDate ? effectiveExamDate(s, chosen) : undefined) ?? s.registrationStart ?? s.resultDate;
  const diff = iso ? daysUntil(iso) : null;
  if (diff === null) return 'TBD';
  return formatDday(diff);
}

/**
 * 일정이 지난 시험인지 — 마지막 마일스톤 기준.
 * 발표일(resultDate)이 있으면 그날까지, 없으면 시험 종료일(examEndDate/examDate)까지.
 * → 시험이 끝나도 발표 전이면 '다가오는' 일정에 유지된다.
 */
function isPastSchedule(s: ExamSchedule): boolean {
  const lastIso = s.resultDate ?? s.examEndDate ?? s.examDate;
  const d = daysUntil(lastIso);
  return d !== null && d < 0;
}

/** 일정 목록에서 대표 연도 추출 (첫 유효 시험일 기준, 없으면 올해) */
function scheduleYear(list: ExamSchedule[]): number {
  const first = list.find(s => !Number.isNaN(new Date(s.examDate).getTime()));
  return first ? new Date(first.examDate).getFullYear() : new Date().getFullYear();
}

/** 로컬 타임존 GMT 오프셋 라벨 (예: 'GMT+9', 'GMT-3:30') */
function gmtLabel(d: Date): string {
  const totalMin = -d.getTimezoneOffset(); // UTC 대비 분(동쪽 +)
  const sign = totalMin >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(totalMin) / 60);
  const m = Math.abs(totalMin) % 60;
  return `GMT${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/** 타임존 + 오늘 날짜 라벨 (예: 'GMT+9 · Aug 20 2026') — 시:분은 표시하지 않음 */
function dateTimeLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${gmtLabel(d)}  ${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

export default function ExamScheduleRoute() {
  const {t} = useTranslation();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pastExpanded, setPastExpanded] = useState(false);
  const [schedules, setSchedules] = useState<ExamSchedule[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [refreshing, setRefreshing] = useState(false);
  const loadSchedules = useCallback(async () => {
    try {
      const list = await fetchAllSchedules();
      setSchedules(list);
    } catch {
      setSchedules(prev => prev ?? []);
    }
  }, []);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // 내가 고른 시험일(필기 기간 중 하루) — 계정 값을 이어받아 온다
  const [chosen, setChosen] = useState<ExamChosenDates>({});
  useEffect(() => { pullChosenDatesFromAccount().then(setChosen); }, []);
  const [pickTarget, setPickTarget] = useState<ExamSchedule | null>(null);

  const handlePickDate = useCallback(async (iso: string | null) => {
    const target = pickTarget;
    setPickTarget(null);
    if (!target) return;
    setChosen(await setChosenDate(chosenDateKey(target), iso));
    // 위젯도 고른 날 기준으로
    syncExamWidget();
  }, [pickTarget]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  }, [loadSchedules]);

  // 상단 날짜 갱신 — 시:분은 안 보이므로 자정 경계(날짜 바뀜)만 반영하면 됨. 1분 간격.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // 필기/실기 전환 — 회차가 많아 한 종류씩만 표시(필기 41 / 실기 24).
  const [kind, setKind] = useState<'written' | 'practical'>('written');
  const [kindMenuOpen, setKindMenuOpen] = useState(false);
  // 종목(제과/제빵) 통합 + 선택한 필기/실기만
  const shown = useMemo(
    () => (schedules ?? []).filter(s => (kind === 'practical' ? s.examType.endsWith('practical') : s.examType.endsWith('written'))),
    [schedules, kind],
  );

  const year = useMemo(() => scheduleYear(shown), [shown]);
  const certLabel = t(kind === 'practical' ? 'examschedule.certPractical' : 'examschedule.certWritten', {year});

  // 지난 / 다가오는 일정 분리
  const {past, upcoming} = useMemo(() => {
    const p: ExamSchedule[] = [];
    const u: ExamSchedule[] = [];
    shown.forEach(s => (isPastSchedule(s) ? p : u).push(s));
    return {past: p, upcoming: u};
  }, [shown]);

  // 지난 일정은 기본 닫힘, 펼치면 표시 — 현재 기준 최신(가까운)부터 역순으로.
  const pastShown = pastExpanded ? [...past].reverse() : [];
  const hasPastToggle = past.length > 0;

  // 표시 순서: 지난(최신→오래된) → 다가오는. 전체 ~65개라 지연 로드 없이 전부 렌더(성능 문제 없음).
  const display = [...pastShown, ...upcoming];
  // 녹색(current) 강조 = "다음 접수일" 기준. 접수 파악이 가장 중요하므로
  // 오늘 이후 접수 시작일(registrationStart)이 가장 가까운 시험을 강조한다.
  // (접수일이 다 지났으면 가장 최근 접수 기준으로 폴백)
  const currentId = useMemo(() => {
    const withReg = upcoming
      .map(s => ({id: s.id, d: daysUntil(s.registrationStart)}))
      .filter((x): x is {id: string; d: number} => x.d !== null);
    const future = withReg.filter(x => x.d >= 0).sort((a, b) => a.d - b.d);
    const fallback = [...withReg].sort((a, b) => b.d - a.d); // 다 지났으면 가장 최근
    return (future[0] ?? fallback[0])?.id ?? upcoming[0]?.id;
  }, [upcoming]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={{height: 64}} />

          {/* 다른 페이지처럼 최대폭 제한 (태블릿에서 화면 끝까지 퍼지지 않게).
              항목별 좌우 패딩은 유지하고 폭만 제한하므로 horizontalPadding=false */}
          <ContentContainer horizontalPadding={false}>
          {/* 섹션 헤더: '기능사 {연도}' 고정 라벨 (종목 통합 — 드롭다운 없음) + 오늘 날짜 */}
          <View style={styles.sectionHeader}>
            <View style={styles.selectorWrap}>
              <Selector
                label={certLabel}
                variant="circle"
                showDropdown
                forcePressed={kindMenuOpen}
                onPress={() => setKindMenuOpen(prev => !prev)}
                style={styles.selectorAnchor}
              />
              {kindMenuOpen && (
                <View style={styles.menuWrap}>
                  <Menu
                    items={[
                      {id: 'written', label: t('examschedule.certWritten', {year})},
                      {id: 'practical', label: t('examschedule.certPractical', {year})},
                    ]}
                    selectedId={kind}
                    onSelect={(id) => { setKind(id as 'written' | 'practical'); setKindMenuOpen(false); setPastExpanded(false); }}
                    onClose={() => setKindMenuOpen(false)}
                    visible={kindMenuOpen}
                  />
                </View>
              )}
            </View>
            <Text style={styles.dateLabel}>{dateTimeLabel(now)}</Text>
          </View>

          {/* 타임라인 */}
          {schedules === null ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors['foreground/on-surface-muted']} />
            </View>
          ) : display.length === 0 ? (
            <Text style={styles.empty}>{t('examschedule.emptySchedules')}</Text>
          ) : (
            <View style={styles.timeline}>
              {/* 지난 일정 펼치기/접기 토글 */}
              {hasPastToggle && (
                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setPastExpanded(prev => !prev)}>
                  <View style={styles.rail}>
                    {/* 접힌 지난 일정: [점선 세그][캡슐(타원)][점선 세그] */}
                    <View style={styles.railSegDashed} />
                    <View style={styles.toggleCapsule} />
                    <View style={styles.railSegDashed} />
                  </View>
                  <Text style={styles.toggleText}>
                    {pastExpanded
                      ? t('examschedule.pastCollapse', {count: past.length})
                      : t('examschedule.pastExpand', {count: past.length})}
                  </Text>
                </Pressable>
              )}

              {(() => {
                // 그라디언트 배정: 활성=3번 고정, 나머지는 4·5·6 순환
                let rotate = 0;
                return display.map((s, i) => {
                  const past = isPastSchedule(s);
                  const variant = past ? 'past' : s.id === currentId ? 'current' : 'upcoming';
                  const gradientIndex = variant === 'current' ? 3 : 4 + (rotate++ % 3);
                  return (
                    <PeriodItem
                      key={s.id}
                      schedule={s}
                      gradientIndex={gradientIndex}
                      isFirst={i === 0 && !hasPastToggle}
                      isLast={i === display.length - 1}
                      variant={variant}
                      styles={styles}
                      colors={colors}
                      chosen={chosen}
                      onPickDate={!past && canChooseExamDate(s) ? () => setPickTarget(s) : undefined}
                    />
                  );
                });
              })()}
            </View>
          )}
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      {/* 내 시험일 고르기 — 필기 기간 중 하루 */}
      <BottomSheet
        visible={!!pickTarget}
        onClose={() => setPickTarget(null)}
        // 공통 시트 헤더 — 라벨 가운데
        headerType="center"
        // 제목은 어떤 시험인지(30회 필기)
        title={pickTarget ? `${cleanRound(pickTarget.round)} ${kindLabel(pickTarget.examType, t)}` : t('examschedule.pickDateTitle')}
        >
        {pickTarget && (() => {
          const current = chosen[chosenDateKey(pickTarget)];
          return (
            // 고르기 목록은 공통 MenuItem(선택 표시 포함). 좌우·상하 8은 D-day 시트 본문과 같게
            <View style={styles.pickList}>
              <MenuItem id="none" label={t('examschedule.pickDateNone')} selected={!current} onPress={() => handlePickDate(null)} />
              {examPeriodDays(pickTarget).map(iso => (
                <MenuItem key={iso} id={iso} label={shortDate(iso)} selected={current === iso} onPress={() => handlePickDate(iso)} />
              ))}
            </View>
          );
        })()}
      </BottomSheet>

      <FloatingNavBar
        left={<NavPillButton icon={IconClose} onPress={() => goBackOr(router)} />}
        right={<NavPillButton icon={IconArrowTopRight} onPress={() => Linking.openURL(QNET_SCHEDULE_URL)} />}
      />

      {/* 앱바 가운데 타이틀 (플로팅 핀 사이) */}
      <View pointerEvents="none" style={[styles.barTitle, {top: insets.top + Spacing.smd}]}>
        <Text style={styles.barTitleText}>{t('examschedule.title')}</Text>
      </View>
    </View>
  );
}

interface PeriodItemProps {
  schedule: ExamSchedule;
  gradientIndex: number;
  isFirst: boolean;
  isLast: boolean;
  variant: 'past' | 'current' | 'upcoming';
  styles: ReturnType<typeof createStyles>;
  colors: SemanticColors;
  chosen: ExamChosenDates;
  /** 필기 기간 중 내 시험일 고르기 — 고를 수 있는 일정에만 */
  onPickDate?: () => void;
}

function PeriodItem({schedule: s, gradientIndex, isFirst, isLast, variant, styles, colors, chosen, onPickDate}: PeriodItemProps) {
  const picked = chosen[chosenDateKey(s)];
  const {t} = useTranslation();
  const title = `${cleanRound(s.round)} ${kindLabel(s.examType, t)}`.trim();

  return (
    <TimelineItem
      isFirst={isFirst}
      isLast={isLast}
      variant={variant}
      monogram={ddayLabel(s, chosen)}
      gradientIndex={gradientIndex}
      title={title}
      subtitle={[
        `${t('examschedule.labelRegistration')}: ${shortDate(s.registrationStart)}`,
        `${t('examschedule.labelExam')}: ${examPeriod(s)}`,
        // 필기는 시험종료 즉시 발표라 발표 항목 생략, 실기만 발표일 표시
        !s.examType.endsWith('written') && `${t('examschedule.labelResult')}: ${shortDate(s.resultDate)}`,
        picked && t('examschedule.myExamDate', {date: shortDate(picked)}),
      ]}
      // 내 시험일 고르기는 줄 오른쪽 아이콘 버튼으로 — 글 링크는 지저분했다. 고른 날은 부제목 끝에 붙는다
      trailing={onPickDate ? (
        <IconButton icon={picked ? IconCursorFilled : IconCursor} variant={picked ? 'tonal' : 'ghost-secondary'} size="medium" onPress={onPickDate} />
      ) : undefined}
    />
  );
}

const RAIL_WIDTH = 20;

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/normal'],
    },
    safeArea: {flex: 1},
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: 100},
    pickList: {paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm},

    // 앱바 가운데 타이틀
    barTitle: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 11,
    },
    barTitleText: {
      ...Typography.title.medium,
      color: colors['foreground/on-surface'],
    },

    // 섹션 헤더 (셀렉트 + 날짜)
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, // 좌우 16 (item/toggle과 동일)
      paddingVertical: Spacing.sm, // 상하 8 (대칭)
      zIndex: 20,
    },
    selectorWrap: {
      position: 'relative',
      zIndex: 30,
    },
    selectorAnchor: {
      alignSelf: 'flex-start',
    },
    menuWrap: {
      position: 'absolute',
      top: 44,
      left: 0, // 셀렉터 왼쪽과 정렬 (기존 Spacing.smd 들여쓰기 제거)
      zIndex: 100,
    },
    dateLabel: {
      ...Typography.body.small,
      color: colors['foreground/on-surface-muted'],
      textAlign: 'right',
    },

    loading: {
      paddingVertical: Spacing.xxl,
      alignItems: 'center',
    },
    empty: {
      ...Typography.body.medium,
      color: colors['foreground/on-surface-muted'],
      paddingVertical: Spacing.xxl,
      textAlign: 'center',
    },

    timeline: {
      // Figma: 좌우 16, 현재 항목 하이라이트는 전체폭이므로 항목 자체에 패딩
    },

    // 지난 일정 토글
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72,
      paddingHorizontal: Spacing.md,
    },
    // 지난 일정 토글 마커: 접힌 스택을 나타내는 둥근 캡슐(타원) — 배경 bright
    toggleCapsule: {
      width: 10,
      height: 24,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors['border/normal'],
    },
    toggleText: {
      ...Typography.body['medium - semibold'],
      color: colors['foreground/on-surface-var'],
      flex: 1,
    },

    // 타임라인 항목
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72, // 아바타48 + 상하12 = 72 (패딩 대신 minHeight로 레일이 행 전체를 채우게)
      paddingHorizontal: Spacing.md,
    },
    itemCurrent: {
      backgroundColor: colors['fill/subtle'],
    },
    rail: {
      width: RAIL_WIDTH,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.smd,
    },
    // 레일 = flex 컬럼 스택: [상단 세그(flex)] · [노드 20] · [하단 세그(flex)]
    // → 노드가 자연히 세로 중앙에 오고, 라인은 노드 위/아래로만 그어져 아이콘과 안 겹침(absolute 관통 제거)
    railSeg: {
      flex: 1,
      width: 1,
    },
    railSegLine: {
      backgroundColor: colors['border/normal'],
    },
    railSegDashed: {
      flex: 1,
      width: 0,
      borderLeftWidth: 2,
      borderColor: colors['border/normal'],
      borderStyle: 'dashed',
    },
    railNode: {
      // 마커 공통 20px 컨테이너 (글리프 크기만 다름). 배경 없이 아이콘만 (흰 원 제거)
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarPast: {
      opacity: 0.55,
    },
    railNodePast: {
      opacity: 0.4,
    },
    content: {
      flex: 1,
      marginLeft: Spacing.smd,
    },
    periodName: {
      ...Typography.body.medium,
      color: colors['foreground/on-surface'],
    },
    periodNamePast: {
      color: colors['foreground/on-surface-muted'],
    },
    dates: {
      ...Typography.caption.medium,
      color: colors['foreground/on-surface-muted'],
      marginTop: 4,
    },
    pickDate: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 2,
      marginTop: Spacing.xs,
    },
    pickDateText: {
      ...Typography.caption.medium,
      color: colors['foreground/on-surface'],
      textDecorationLine: 'underline',
    },
    datesPast: {
      color: colors['foreground/on-surface-disabled'],
    },
  });
