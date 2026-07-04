import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, navPillStyle} from '@components/Navigation';
import {GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {Selector} from '@components/Selector';
import {Menu} from '@components/Menu';
import {Avatar} from '@components/Avatar';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import {type ExamType} from '@constants/examTypes';
import {fetchAllSchedules, type ExamSchedule} from '@utils/examSchedules';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconClose, IconArrowTopRight, IconDotFilled, IconCircleCheckFilled, IconCircleDot} from '@components/Icon/IconIndex';

// 큐넷 기능사 정기 시험일정 페이지
const QNET_SCHEDULE_URL = 'https://www.q-net.or.kr/crf021.do?id=crf02101&scheType=04';

/** 자격증 그룹 (Firestore examType의 접두사와 매칭) */
type CertGroup = 'pastry' | 'baking';
const CERT_BASE: {id: CertGroup; name: string}[] = [
  {id: 'pastry', name: '제과기능사'},
  {id: 'baking', name: '제빵기능사'},
];

/** examType → 실기/필기 */
function kindLabel(examType: ExamType): string {
  return examType.endsWith('practical') ? '실기' : '필기';
}

/** 회차 라벨에서 연도 접두사 제거 ('2026년 3회' → '3회') */
function cleanRound(round: string): string {
  return round.replace(/^\d{4}\s*년?\s*/, '').trim();
}

/** ISO date → 'M월 D일' */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
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
 * 일정의 D-day 라벨 — 푸시 알림과 동일하게 "가장 가까운 다가오는 마일스톤" 기준.
 * 접수 전이면 접수까지, 접수 후~시험 전이면 시험까지, 그 뒤면 발표까지 남은 일수.
 * 모두 지났으면 가장 최근 마일스톤 기준(D+N), 유효 날짜가 없으면 TBD.
 */
function ddayLabel(s: ExamSchedule): string {
  const diffs = [s.registrationStart, s.examDate, s.resultDate]
    .map(daysUntil)
    .filter((d): d is number => d !== null);
  if (diffs.length === 0) return 'TBD';
  const upcoming = diffs.filter(d => d >= 0);
  const diff = upcoming.length ? Math.min(...upcoming) : Math.max(...diffs);
  return formatDday(diff);
}

/** 일정이 지난 시험인지 (시험일이 오늘 이전) */
function isPastSchedule(s: ExamSchedule): boolean {
  const d = daysUntil(s.examDate);
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

/** 타임존 + 오늘 날짜/시간 라벨 (예: 'GMT+9 · Aug 20 2026 · 14:05') */
function dateTimeLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${gmtLabel(d)} · ${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} · ${hh}:${mm}`;
}

export default function ExamScheduleRoute() {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [cert, setCert] = useState<CertGroup>('pastry');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [schedules, setSchedules] = useState<ExamSchedule[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    fetchAllSchedules()
      .then(list => { if (alive) setSchedules(list); })
      .catch(() => { if (alive) setSchedules([]); });
    return () => { alive = false; };
  }, []);

  // 우측 상단 시계 (분 단위 갱신)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // 선택 자격증 일정 (examType 접두사 매칭), fetch에서 시험일 오름차순 정렬됨
  const shown = useMemo(
    () => (schedules ?? []).filter(s => s.examType.startsWith(cert)),
    [schedules, cert],
  );

  const year = useMemo(() => scheduleYear(shown), [shown]);
  const certLabel = `${CERT_BASE.find(c => c.id === cert)!.name} ${year}`;

  // 지난 / 다가오는 일정 분리
  const {past, upcoming} = useMemo(() => {
    const p: ExamSchedule[] = [];
    const u: ExamSchedule[] = [];
    shown.forEach(s => (isPastSchedule(s) ? p : u).push(s));
    return {past: p, upcoming: u};
  }, [shown]);

  // 지난 일정은 기본 닫힘, 펼치면 전체 표시
  const pastShown = pastExpanded ? past : [];
  const hasPastToggle = past.length > 0;

  // 표시 순서: 지난(오래된→최근) → 다가오는. 그라데이션 번호는 이 순서대로 순차 배정
  const display = [...pastShown, ...upcoming];
  const currentId = upcoming[0]?.id;

  const handleSelectCert = useCallback((id: string) => {
    setCert(id as CertGroup);
    setMenuOpen(false);
    setPastExpanded(false);
  }, []);

  const certItems = CERT_BASE.map(c => ({id: c.id, label: `${c.name} ${year}`}));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 64}} />

          {/* 섹션 헤더: 자격증 셀렉트 + 오늘 날짜 (셀렉트에서 메뉴 드롭) */}
          <View style={styles.sectionHeader}>
            <View style={styles.selectorWrap}>
              <Selector
                label={certLabel}
                showDropdown
                variant="circle"
                forcePressed={menuOpen}
                onPress={() => setMenuOpen(prev => !prev)}
                style={styles.selectorAnchor}
              />
              {menuOpen && (
                <View style={styles.menuWrap}>
                  <Menu
                    items={certItems}
                    selectedId={cert}
                    onSelect={handleSelectCert}
                    onClose={() => setMenuOpen(false)}
                    visible={menuOpen}
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
            <Text style={styles.empty}>시험 일정이 없어요.</Text>
          ) : (
            <View style={styles.timeline}>
              {/* 지난 일정 펼치기/접기 토글 */}
              {hasPastToggle && (
                <Pressable
                  style={styles.toggleRow}
                  onPress={() => setPastExpanded(prev => !prev)}>
                  <View style={styles.rail}>
                    {/* 접힌 지난 일정 표시: 점선 레일 */}
                    <View style={[styles.railLineDashed, styles.railLineTop]} />
                    <View style={[styles.railLineDashed, styles.railLineBottom]} />
                    <View style={styles.toggleCapsule} />
                  </View>
                  <Text style={styles.toggleText}>
                    지난 일정 {past.length}개 {pastExpanded ? '접기' : '펼치기'}
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
                    />
                  );
                });
              })()}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        left={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton icon={IconClose} onPress={() => router.back()} variant="ghost-primary" size="medium" />
          </GlassContainer>
        }
        right={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconArrowTopRight}
              onPress={() => Linking.openURL(QNET_SCHEDULE_URL)}
              variant="ghost-primary"
              size="medium"
            />
          </GlassContainer>
        }
      />

      {/* 앱바 가운데 타이틀 (플로팅 핀 사이) */}
      <View pointerEvents="none" style={[styles.barTitle, {top: insets.top + Spacing.smd}]}>
        <Text style={styles.barTitleText}>시험일정</Text>
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
  colors: SemanticColorsV2;
}

function PeriodItem({schedule: s, gradientIndex, isFirst, isLast, variant, styles, colors}: PeriodItemProps) {
  const isPast = variant === 'past';
  const title = `${cleanRound(s.round)} ${kindLabel(s.examType)}`.trim();

  return (
    <View style={[styles.item, variant === 'current' && styles.itemCurrent]}>
      {/* 레일: 위/아래 라인 + 노드 아이콘 */}
      <View style={styles.rail}>
        {!isFirst && <View style={[styles.railLine, styles.railLineTop]} />}
        {!isLast && <View style={[styles.railLine, styles.railLineBottom]} />}
        {variant === 'current' ? (
          // 현재: 라디오(circle-dot) 아이콘 — 과거/예정과 동일하게 railNode(20)+아이콘(16) 구조
          <View style={styles.railNode}>
            <IconCircleDot width={16} height={16} color={colors['foreground/on-surface']} />
          </View>
        ) : isPast ? (
          // 지난: check-circle-filled (12, 흐리게)
          <View style={styles.railNode}>
            <IconCircleCheckFilled width={16} height={16} color={colors['foreground/on-surface-var']} />
          </View>
        ) : (
          // 예정: dot-filled (12)
          <View style={styles.railNode}>
            <IconDotFilled width={12} height={12} color={colors['foreground/on-surface']} />
          </View>
        )}
      </View>

      {/* D-day 아바타 */}
      <Avatar
        size="large"
        shape="rounded"
        type="gradient"
        gradientIndex={gradientIndex}
        monogram={ddayLabel(s)}
        style={isPast ? styles.avatarPast : undefined}
      />

      {/* 내용 */}
      <View style={styles.content}>
        <Text style={[styles.periodName, isPast && styles.periodNamePast]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.dates, isPast && styles.datesPast]} numberOfLines={1}>
          접수: {shortDate(s.registrationStart)}
          {'  ·  '}시험: {shortDate(s.examDate)}
          {'  ·  '}발표: {shortDate(s.resultDate)}
        </Text>
      </View>
    </View>
  );
}

const RAIL_WIDTH = 20;

const createStyles = (colors: SemanticColorsV2) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/normal'],
    },
    safeArea: {flex: 1},
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: 100},

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
      left: Spacing.smd,
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
    // 지난 일정 토글 마커: 접힌 스택을 나타내는 둥근 캡슐 (디자인: 10×24, surface/container-high, border/normal)
    toggleCapsule: {
      width: 10,
      height: 24,
      borderRadius: 999,
      backgroundColor: colors['surface/container-high'],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors['border/normal'],
    },
    toggleText: {
      ...Typography.label['xlarge - semibold'],
      color: colors['foreground/on-surface-muted'],
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
    railLine: {
      position: 'absolute',
      width: 1,
      left: RAIL_WIDTH / 2 - 0.5,
      backgroundColor: colors['border/normal'],
    },
    railLineTop: {top: 0, height: '50%'},
    railLineBottom: {bottom: 0, height: '50%'},
    // 접힌(지난) 구간 점선 레일 — 배경 대신 dashed border
    railLineDashed: {
      position: 'absolute',
      width: 0,
      left: RAIL_WIDTH / 2 - 1,
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
      ...Typography.label.medium,
      color: colors['foreground/on-surface-muted'],
      marginTop: 4,
    },
    datesPast: {
      color: colors['foreground/on-surface-disabled'],
    },
  });
