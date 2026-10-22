import React from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {Badge} from '@components/Badge';
import {ListItem} from '@components/ListItem';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

/** 쓰기 규칙 한 줄 — 기호(회색 뱃지)와 뜻. 기호가 'recipeEdit.'로 시작하면 번역 키 */
const RULES = {
  title: {marks: ['#'], label: 'recipeEdit.pasteRule.title'},
  meta: {marks: ['recipeEdit.pasteMark.meta'], label: 'recipeEdit.pasteRule.meta'},
  section: {marks: ['##'], label: 'recipeEdit.pasteRule.group'},
  subgroup: {marks: ['###'], label: 'recipeEdit.pasteRule.subgroup'},
  group: {marks: ['##'], label: 'recipeEdit.pasteRule.subgroup'},
  ingredient: {marks: ['-'], label: 'recipeEdit.pasteRule.ingredient'},
  ingredientComma: {marks: [','], label: 'recipeEdit.pasteRule.ingredientComma'},
  toolComma: {marks: [','], label: 'recipeEdit.pasteRule.tool'},
  step: {marks: ['1.'], label: 'recipeEdit.pasteRule.step'},
  note: {marks: ['recipeEdit.pasteMark.tip', 'recipeEdit.pasteMark.caution'], label: 'recipeEdit.pasteRule.note'},
  tip: {marks: ['recipeEdit.pasteMark.tip'], label: 'recipeEdit.pasteRule.tip'},
  caution: {marks: ['recipeEdit.pasteMark.caution'], label: 'recipeEdit.pasteRule.caution'},
  // 과정 묶음 타이머 — 묶음 이름(## / ###) 아래 한 줄
  timer: {marks: ['recipeEdit.pasteMark.timer'], label: 'recipeEdit.pasteRule.timer'},
  // 과정 묶음 요약 — 묶음 이름 아래, 한 줄 = 상세 요약 번호 하나
  summary: {marks: ['recipeEdit.pasteMark.summary'], label: 'recipeEdit.pasteRule.summary'},
} as const;

export type WritingRuleKey = keyof typeof RULES;

/** 쓰는 곳별 규칙 묶음 — 텍스트 시트(레시피 전체) / 한번에 쓰기(재료 칸·과정 칸) */
export const WRITING_RULES: Record<'recipe' | 'ingredients' | 'tools' | 'steps', WritingRuleKey[]> = {
  // 팁·주의는 따로 — 한 칸에 묶으면 두 표시 뒤에 설명이 한꺼번에 붙어 무엇이 무엇인지 헷갈렸다
  // 재료·도구는 한 줄에 쉼표로(한번에 쓰기 칸과 같은 규칙) — ',' 항목 구분 하나로
  recipe: ['title', 'meta', 'section', 'subgroup', 'ingredientComma', 'step', 'tip', 'caution', 'timer', 'summary'],
  ingredients: ['group', 'ingredientComma'],
  tools: ['group', 'toolComma'],
  steps: ['group', 'step', 'tip', 'caution', 'timer', 'summary'],
};

export type WritingRulesKind = keyof typeof WRITING_RULES;

export interface WritingRulesProps {
  /** 쓰는 곳 — recipe(텍스트 시트 전체) / ingredients·tools·steps(한번에 쓰기 칸) */
  kind: WritingRulesKind;
  /**
   * 카드 안 한 줄로 놓을 때(한번에 쓰기 칸 아래) — 공통 목록 줄로 감싸고
   * 왼쪽 시작을 칸 글자(안쪽 여백 16)와 맞춘다. 시트처럼 그냥 놓으면 false.
   */
  asRow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** 규칙들을 "뜻 · 기호" 줄로 — 단축키 목록(ShortcutList)용 */
export function writingRuleRows(keys: WritingRuleKey[], t: (k: string) => string): {label: string; keys: string[]}[] {
  return keys.map(key => {
    const r = RULES[key];
    return {label: t(r.label), keys: r.marks.map(m => (m.startsWith('recipeEdit.') ? t(m) : m))};
  });
}

/**
 * 쓰기 규칙 안내 — 기호는 회색 뱃지, 뜻은 옆 글자.
 * 텍스트 시트와 한번에 쓰기 칸이 같은 규칙(recipeMarkdown)을 쓰므로 안내도 이 하나로 보여준다.
 */
export function WritingRules({kind, asRow = false, style}: WritingRulesProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const rules = WRITING_RULES[kind];
  const body = (
    <View style={[styles.rules, style]}>
      {rules.map(key => {
        const r = RULES[key];
        return (
          <View key={key} style={styles.rule}>
            {r.marks.map(m => <Badge key={m} label={m.startsWith('recipeEdit.') ? t(m) : m} />)}
            <Text style={styles.label}>{t(r.label)}</Text>
          </View>
        );
      })}
    </View>
  );
  // 줄 여백 8 + 목록 줄 글 영역 여백 8 = 16 — 한번에 쓰기 칸 글자와 같은 자리에서 시작
  return asRow ? <ListItem showDivider={false} padding={Spacing.sm}>{body}</ListItem> : body;
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  rules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.smd,
    rowGap: Spacing.xs,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...Typography.caption.medium,
    color: colors['foreground/on-surface-muted'],
  },
});
