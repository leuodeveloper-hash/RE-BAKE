import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TextInput} from '@components/TextInput';
import {ListItem} from '@components/ListItem';
import {Badge} from '@components/Badge';
import {StepPhotos} from '@components/StepPhotos/StepPhotos';
import type {StepPhoto} from '../../types/recipe';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {triggerHaptic} from '@utils/haptics';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

import {circledNumber} from '@utils/stepSummary';
export {circledNumber};


/**
 * 편집 화면 — 과정 묶음 맨 위 요약 줄. 과정 줄과 같은 공통 줄(ListItem)·같은 입력 서체,
 * 앞엔 드래그 손잡이 대신 '요약' 배지. 과정이 요약 뒤에 바뀌었으면 끝에 '확인' 칩(누르면 확인 처리).
 */
export function StepSummaryInput({value, onChangeText, timer, stale, onConfirm, inputStyle, trailingExtra}: {
  value: string;
  onChangeText: (v: string) => void;
  /** 묶음 타이머 — 요약 끝에 자동으로 붙여 보여준다(따로 쓰지 않게) */
  timer?: string;
  stale?: boolean;
  onConfirm?: () => void;
  /** 과정 줄 입력과 같은 서체(편집 화면 cardFieldInput) */
  inputStyle?: any;
  /** 오른쪽 끝 버튼(예: 사진에서 요약 읽기) */
  trailingExtra?: React.ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  return (
    <ListItem
      leading={{type: 'custom', element: <Badge label={t('stepSummary.label')} />}}
      trailing={stale || trailingExtra ? {type: 'custom', element: (
        <View style={styles.trailingRow}>
          {stale ? (
            <Pressable hitSlop={8} style={styles.staleChip} onPress={() => { triggerHaptic('light'); onConfirm?.(); }}>
              <Text style={styles.staleText}>{t('stepSummary.stale')}</Text>
            </Pressable>
          ) : null}
          {trailingExtra}
        </View>
      )} : undefined}
      titleNumberOfLines={0}
      showDivider>
      <View style={styles.inputRow}>
        {/* 여러 줄 — 한 줄이 상세 요약의 번호 하나(화이트보드 한 줄) */}
        <TextInput
          style="ghost"
          bare
          multiline
          inputStyle={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={t('stepSummary.placeholder')}
        />
        {timer ? <Text style={styles.timer}>{`· ${timer}`}</Text> : null}
      </View>
    </ListItem>
  );
}

/** 동그라미 번호 글자 — 요약·한번에 보기 공통. 글 안에 넣으면 글꼴은 따라가고 색·크기(본문 + 2)만 바뀐다 */
export function CircledNumberText({n}: {n: number}) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.numColor}>{`${circledNumber(n)} `}</Text>;
}

/**
 * 상세 '요약 보기' — 요약의 줄마다 ①②③(묶음을 넘어 이어진다). 요약이 빈 묶음은 묶음 이름 한 줄.
 * 묶음 타이머는 그 묶음 마지막 줄 끝에. 줄을 누르면 그 묶음 번호(index)로
 */
export function StepSummaryList({items, onPress, onPhotoPress}: {
  /** photos — 그 묶음 과정들에 붙은 사진(과정 순서대로). 묶음 마지막 줄 아래에 붙는다 */
  items: {title: string; summary?: string; timer?: string; photos?: StepPhoto[]}[];
  onPress?: (groupIndex: number) => void;
  /** 사진 누르면 — 그 묶음 사진 목록과 몇 번째인지 */
  onPhotoPress?: (photos: StepPhoto[], index: number) => void;
}) {
  const styles = useThemedStyles(createStyles);
  let n = 0;
  return (
    <View style={styles.list}>
      {items.map((g, gi) => {
        const ls = (g.summary ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const list = ls.length ? ls : [g.title];
        return (
          <React.Fragment key={gi}>
            {list.map((text, li) => {
              n += 1;
              const timer = li === list.length - 1 ? g.timer : undefined;
              return (
                <Pressable key={li} disabled={!onPress} onPress={() => { triggerHaptic('light'); onPress?.(gi); }} style={styles.line}>
                  <Text style={[styles.num, styles.numColor]}>{circledNumber(n)}</Text>
                  <Text style={styles.lineText}>
                    {text}
                    {timer ? <Text style={styles.lineTimer}>{`  · ${timer}`}</Text> : null}
                  </Text>
                </Pressable>
              );
            })}
            {/* 이 묶음 과정에 붙은 사진 — 과정 순서대로, 번호 글과 줄을 맞춰 */}
            {g.photos?.length ? (
              <View style={styles.photos}>
                <StepPhotos photos={g.photos} mode="view" paddingTop={false} onPhotoPress={onPhotoPress ? i => onPhotoPress(g.photos!, i) : undefined} />
              </View>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/** 과정 글 한 줄 서체 — 요약 보기·한번에(합쳐) 보기가 같은 크기·줄 간격 */
export const stepLineText = (colors: SemanticColors) => ({
  ...Typography.body.medium,
  lineHeight: 24,
  color: colors['foreground/on-surface'],
});

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  inputRow: {flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs},
  trailingRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, overflow: 'visible', zIndex: 1000},
  input: {flex: 1, ...Typography.body.medium, color: colors['foreground/on-surface']},
  timer: {...Typography.body.medium, color: colors['foreground/on-surface-muted']},
  staleChip: {paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius['radius-full'], backgroundColor: colors['custom/yellow-subtle']},
  staleText: {...Typography.caption.large, color: colors['custom/yellow']},
  list: {gap: Spacing.sm},
  line: {flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start'},
  num: {...stepLineText(colors)},
  // 번호도 글씨와 같은 색. ①②③ 글자는 동그라미가 글꼴 칸보다 작게 그려져 본문보다 작아 보인다 — 2 키운다(줄 간격은 그대로)
  numColor: {color: colors['foreground/on-surface'], fontSize: Typography.body.medium.fontSize + 2},
  lineText: {flex: 1, ...stepLineText(colors)},
  lineTimer: {color: colors['foreground/on-surface-muted']},
  photos: {},
});

