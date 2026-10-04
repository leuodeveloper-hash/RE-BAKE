import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Button} from '@components/Button';
import {AutoGrowInput} from '@components/AutoGrowInput';
import {BulkTypingOverlay} from '@components/RainbowText';
import {SkeletonLine} from '@components/SkeletonLine';
import {WritingRules} from '@components/WritingRules';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';

export interface PasteRecipeSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
  /** 처음 채워 둘 글 — 사진 글자 인식 결과처럼 확인 후 적용할 때 */
  initialText?: string;
  /** 사진 글자를 읽는 중 — 입력칸에 스켈레톤 */
  loading?: boolean;
  /** initialText를 무지개 타이핑으로 채운다(편집 화면 OCR과 같은 공통 애니메이션) */
  animateInitial?: boolean;
}

/**
 * 마크다운으로 정리해 둔 레시피를 통째로 붙여넣는다.
 *
 * 묶음별 "한 번에 쓰기"는 그 묶음만 고치지만 이건 레시피 전체를 덮어쓴다 —
 * 덮어쓴다는 사실을 설명에 밝혀 두고, 빈 칸이면 버튼이 눌리지 않게 한다.
 */

export function PasteRecipeSheet({visible, onClose, onApply, initialText, loading, animateInitial}: PasteRecipeSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [text, setText] = useState('');

  // 열 때마다 비운다 — 이전 내용이 남아 있으면 잘못 덮어쓴다
  useEffect(() => { if (visible) setText(initialText ?? ''); }, [visible, initialText]);
  // 읽은 글이 들어오면 타이핑이 끝날 때까지 입력 글자를 숨기고 무지개 오버레이만 보인다
  const [typing, setTyping] = useState(false);
  useEffect(() => { setTyping(!!(visible && animateInitial && initialText)); }, [visible, animateInitial, initialText]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('recipeEdit.pasteMarkdown')}
      description={t('recipeEdit.pasteDescription')}
      bottomAction={
        <Button
          label={t('recipeEdit.pasteApply')}
          onPress={() => { onApply(text); onClose(); }}
          disabled={text.trim().length === 0 || !!loading || typing}
          style={{flex: 1}}
        />
      }>
      <View style={styles.body}>
        <View style={styles.inputWrap}>
          <AutoGrowInput
            style={[styles.input, typing && styles.inputHidden]}
            placeholder={t('recipeEdit.pastePlaceholder')}
            value={text}
            onChangeText={setText}
            autoCapitalize="none"
            editable={!loading && !typing}
          />
          {loading && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inputPad]}>
              <SkeletonLine lines={4} lineHeight={14} />
            </View>
          )}
          {typing && !!text && (
            <BulkTypingOverlay text={text} textStyle={styles.input} containerStyle={styles.inputPad} onDone={() => setTyping(false)} />
          )}
        </View>
        {/* 쓰는 규칙 — 기호는 회색 뱃지로, 뜻은 옆 글자로 */}
        <WritingRules kind="recipe" />
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  inputWrap: {
    borderRadius: Radius['radius-lg'],
    backgroundColor: colors['fill/faint'],
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    minHeight: 200,
  },
  input: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
  },
  // 오버레이를 입력 글자 자리에 겹친다 — inputWrap 안쪽 여백과 같게
  inputHidden: {
    color: 'transparent',
  },
  inputPad: {
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
  },
  hint: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
  },
});

export default PasteRecipeSheet;
