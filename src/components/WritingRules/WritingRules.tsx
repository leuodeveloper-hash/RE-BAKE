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
} as const;

export type WritingRuleKey = keyof typeof RULES;

/** 쓰는 곳별 규칙 묶음 — 텍스트 시트(레시피 전체) / 한번에 쓰기(재료 칸·과정 칸) */
export const WRITING_RULES: Record<'recipe' | 'ingredients' | 'tools' | 'steps', WritingRuleKey[]> = {
  recipe: ['title', 'meta', 'section', 'subgroup', 'ingredient', 'step', 'note'],
  ingredients: ['group', 'ingredientComma'],
  tools: ['toolComma'],
  steps: ['group', 'step', 'note'],
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

/** 규칙들을 "뜻 · 기호" 줄로 — 규칙 모음 패널(Cheatsheet)용 */
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
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
  },
});
