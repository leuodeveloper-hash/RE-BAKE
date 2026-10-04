import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppBar, APPBAR_CONTENT_BOTTOM} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {TimelineItem, type TimelineVariant} from '@components/Timeline';
import {DdaySheet} from '@components/BottomSheet';
import {IconClose, IconAdd, IconEllipsisVertical, IconEdit, IconTrash} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Menu} from '@components/Menu';
import {EmptyState} from '@components/EmptyState';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {shortDate} from '@utils/dateLabel';
import {goBackOr} from '@utils/navigation';
import {syncDdayWidget} from '@utils/examWidgetSync';
import {
  CustomDday, MAX_CUSTOM_DDAYS, ddayDays, ddayLabel, nextDdayDate,
  pullCustomDdaysFromAccount, saveCustomDdays,
} from '@utils/customDdays';

/**
 * 내 D-day — 시험과 상관없이 아무 일정(이름 + 날짜) 최대 5개.
 * 시험 일정과 같은 타임라인 줄(TimelineItem). 가장 가까운 다가오는 날이 '지금'으로 강조된다.
 * 위젯 편집에서 이 중 하나를 골라 홈 화면에 띄울 수 있다.
 */
export default function DdaysRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const [ddays, setDdays] = useState<CustomDday[]>([]);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<CustomDday | null>(null);
  // 줄 오른쪽 ⋮ 메뉴가 열린 D-day
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => { pullCustomDdaysFromAccount().then(list => { setDdays(list); syncDdayWidget(list); }); }, []);
  const save = useCallback(async (next: CustomDday[]) => {
    const saved = await saveCustomDdays(next);
    setDdays(saved);
    syncDdayWidget(saved);
  }, []);

  // 날짜 순(반복은 다음 회차 기준) — 다가오는 것 중 가장 가까운 날이 '지금'
  const sorted = useMemo(() => ddays
    .map(d => ({...d, next: nextDdayDate(d)}))
    .sort((a, b) => a.next.localeCompare(b.next)), [ddays]);
  const currentId = sorted.find(d => ddayDays(d.next) >= 0)?.id;
  const full = ddays.length >= MAX_CUSTOM_DDAYS;

  return (
    <View style={styles.container}>
      {/* 앱바 아래(상태바 높이 포함) + 8, 목록 자체도 상하 8 */}
      <ScrollView contentContainerStyle={{paddingTop: insets.top + APPBAR_CONTENT_BOTTOM + Spacing.sm, paddingBottom: 100}}>
        <ContentContainer horizontalPadding={false} style={styles.list}>
          {sorted.length === 0 ? (
            // 비었을 때 — 공통 빈 상태(아이콘 · 제목 · 만들기 버튼)
            <View style={styles.emptyWrap}>
              <EmptyState
                // 다른 빈 화면과 같은 꽃 일러스트
                category="no-recipe"
                title={t('dday.emptyTitle')}
                subtitle={t('dday.emptySubtitle')}
                actionLabel={t('dday.emptyAction')}
                onAction={() => { setEditing(null); setSheet(true); }}
                actionVariant="soft"
              />
            </View>
          ) : (
            sorted.map((d, i) => {
              const days = ddayDays(d.next);
              const variant: TimelineVariant = days < 0 ? 'past' : d.id === currentId ? 'current' : 'upcoming';
              return (
                // 메뉴가 열린 줄은 아래 줄보다 위로(드롭다운이 가려지지 않게)
                <View key={d.id} style={menuId === d.id ? styles.rowRaised : undefined}>
                <TimelineItem
                  isFirst={i === 0}
                  isLast={i === sorted.length - 1}
                  variant={variant}
                  monogram={ddayLabel(days)}
                  gradientIndex={variant === 'current' ? 3 : 4 + (i % 3)}
                  title={d.title}
                  // 날짜 · 반복 — 점 구분은 공통 MetaLine(타임라인 안)
                  subtitle={[
                    shortDate(d.next),
                    d.repeat && d.repeat !== 'none' && t(`dday.repeat${d.repeat[0].toUpperCase()}${d.repeat.slice(1)}`),
                  ]}
                  onPress={() => { setEditing(d); setSheet(true); }}
                  trailing={
                    <View>
                      <IconButton icon={IconEllipsisVertical} variant="ghost-secondary" size="medium" onPress={() => setMenuId(id => (id === d.id ? null : d.id))} />
                      {menuId === d.id && (
                        <View style={styles.menuWrap}>
                          <Menu
                            visible
                            items={[
                              {id: 'edit', label: t('dday.edit'), icon: IconEdit},
                              {id: 'delete', label: t('dday.delete'), icon: IconTrash, destructive: true},
                            ]}
                            onSelect={id => {
                              setMenuId(null);
                              const src = ddays.find(x => x.id === d.id) ?? null;
                              if (id === 'edit') { setEditing(src); setSheet(true); } else save(ddays.filter(x => x.id !== d.id));
                            }}
                            onClose={() => setMenuId(null)}
                          />
                        </View>
                      )}
                    </View>
                  }
                />
                </View>
              );
            })
          )}
        </ContentContainer>
      </ScrollView>

      <DdaySheet
        visible={sheet}
        onClose={() => setSheet(false)}
        editing={editing}
        onSave={({title, date, repeat}) => save(editing
          ? ddays.map(d => (d.id === editing.id ? {...d, title, date, repeat} : d))
          : [...ddays, {id: `dday_${Date.now()}`, title, date, repeat}])}
        onDelete={editing ? () => save(ddays.filter(d => d.id !== editing.id)) : undefined}
      />

      <AppBar
        centered
        title={t('dday.screenTitle')}
        leftIcon={IconClose}
        onLeftPress={() => goBackOr(router)}
        // 5개가 차면 추가 버튼을 감춘다
        rightIcon={full ? undefined : IconAdd}
        onRightPress={full ? undefined : () => { setEditing(null); setSheet(true); }}
      />
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/normal'],
    },
    list: {
      paddingVertical: Spacing.sm,
    },
    rowRaised: {
      zIndex: 10,
      elevation: 10,
    },
    menuWrap: {
      position: 'absolute',
      top: 44,
      right: 0,
      zIndex: 100,
      elevation: 100,
    },
    emptyWrap: {
      paddingTop: Spacing.xxl,
    },
  });
