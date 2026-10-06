import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {IconButton} from '@components/IconButton';
import {IconChevronLeft, IconChevronRight} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface CalendarPickerProps {
  /** 고른 날 'YYYY-MM-DD' */
  value: string | null;
  onChange: (date: string) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * 달력에서 날짜 고르기 — 한 달씩 넘기며 날짜를 누른다.
 * 네이티브 날짜 선택 모듈 없이 웹·앱 똑같이 동작한다(새 모듈은 빌드가 필요하고 웹이 따로 논다).
 */
export function CalendarPicker({value, onChange}: CalendarPickerProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
  const start = value ? value.split('-').map(Number) : [today.getFullYear(), today.getMonth() + 1];
  const [view, setView] = useState({y: start[0], m: start[1] - 1});

  // 6주 칸 — 앞뒤 달 칸은 비운다
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return Array.from({length: 42}, (_, i) => {
      const d = i - first + 1;
      return d >= 1 && d <= days ? d : null;
    });
  }, [view]);
  const rows = Math.ceil((new Date(view.y, view.m, 1).getDay() + new Date(view.y, view.m + 1, 0).getDate()) / 7);

  const move = (delta: number) => setView(v => {
    const d = new Date(v.y, v.m + delta, 1);
    return {y: d.getFullYear(), m: d.getMonth()};
  });

  return (
    <View>
      <View style={styles.header}>
        <IconButton icon={IconChevronLeft} variant="ghost-secondary" size="medium" onPress={() => move(-1)} />
        <Text style={styles.month}>{/* 달 표기는 언어와 상관없이 2026-11 형식 */}{`${view.y}-${pad(view.m + 1)}`}</Text>
        <IconButton icon={IconChevronRight} variant="ghost-secondary" size="medium" onPress={() => move(1)} />
      </View>
      <View style={styles.week}>
        {[0, 1, 2, 3, 4, 5, 6].map(w => (
          <Text key={w} style={[styles.weekday, w === 0 && styles.sunday]}>{t(`examschedule.weekday${w}`)}</Text>
        ))}
      </View>
      {Array.from({length: rows}, (_, r) => (
        <View key={r} style={styles.week}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const iso = toIso(view.y, view.m, d);
            const selected = iso === value;
            return (
              <Pressable key={i} style={styles.cell} onPress={() => onChange(iso)}>
                <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                  <Text style={[
                    styles.day,
                    iso === todayIso && styles.today,
                    i === 0 && styles.sunday,
                    selected && styles.daySelected,
                  ]}>{d}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  month: {
    ...Typography.title.small,
    color: colors['foreground/on-surface'],
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...Typography.caption.small,
    color: colors['foreground/on-surface-muted'],
    paddingVertical: Spacing.xs,
    // 영어 요일은 대문자(SUN MON …) — 한글엔 영향 없음
    textTransform: 'uppercase',
  },
  // 칸 높이는 고정 — 가로 폭에 맞춘 정사각형이면 넓은 시트에서 칸이 65까지 커져 달력이 너무 컸다
  cell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: Radius['radius-full'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors['foreground/on-surface'],
  },
  day: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
  },
  today: {
    textDecorationLine: 'underline',
  },
  // 일요일 — 빨간색 대신 옅은 글자(muted)
  sunday: {
    color: colors['foreground/on-surface-muted'],
  },
  daySelected: {
    color: colors['surface/bright'],
  },
});
