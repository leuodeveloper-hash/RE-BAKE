import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Button} from '@components/Button';
import {AutoGrowInput} from '@components/AutoGrowInput';
import {BulkTypingOverlay, TYPING_CONCEAL} from '@components/RainbowText';
import {SkeletonLine} from '@components/SkeletonLine';
import {writingRuleRows} from '@components/WritingRules';
import {FloatingPanel} from '@components/FloatingPanel';
import {ShortcutList} from '@components/ShortcutList';
import {IconKeyboard, IconScanText} from '@components/Icon/IconIndex';
import {NavPillGroup} from '@components/Navigation';
import {Menu, type MenuItemData} from '@components/Menu';
import {IconButton} from '@components/IconButton';
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
  /**
   * 이미지로 읽기 — 헤더 맨 오른쪽 버튼 메뉴(촬영·앨범·기존 레시피). 고르면 부르는 쪽이 시트를 닫고 읽은 뒤 다시 연다.
   * (iOS는 시트가 떠 있는 동안 사진 고르기 창을 못 띄운다)
   */
  readImageItems?: MenuItemData[];
  onReadImage?: (sourceId: string) => void;
}

/**
 * 마크다운으로 정리해 둔 레시피를 통째로 붙여넣는다.
 *
 * 묶음별 "한 번에 쓰기"는 그 묶음만 고치지만 이건 레시피 전체를 덮어쓴다 —
 * 덮어쓴다는 사실을 설명에 밝혀 두고, 빈 칸이면 버튼이 눌리지 않게 한다.
 */

export function PasteRecipeSheet({visible, onClose, onApply, initialText, loading, animateInitial, readImageItems, onReadImage}: PasteRecipeSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [text, setText] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [scanMenuOpen, setScanMenuOpen] = useState(false);
  const {width: winW} = useWindowDimensions();

  // 열 때마다 비운다 — 이전 내용이 남아 있으면 잘못 덮어쓴다
  useEffect(() => { if (visible) setText(initialText ?? ''); }, [visible, initialText]);
  // 단축키 패널 — 처음 자리는 헤더 키보드 버튼 바로 아래(메뉴처럼). 열 때마다 버튼 위치를 잰다
  const rulesBtnRef = useRef<View>(null);
  const [rulesAnchor, setRulesAnchor] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const openRules = useCallback(() => {
    setScanMenuOpen(false);
    const node = rulesBtnRef.current;
    if (!node) { setRulesOpen(true); return; }
    node.measureInWindow((x, y, width, height) => {
      setRulesAnchor(width ? {x, y, width, height} : null);
      setRulesOpen(true);
    });
  }, []);
  // 시트를 열면 단축키 패널도 기본으로 열린다 — 시트가 자리 잡은 뒤(페이드인 후) 버튼 위치를 재서
  useEffect(() => {
    if (!visible) { setRulesOpen(false); setScanMenuOpen(false); return; }
    const timer = setTimeout(openRules, 260);
    return () => clearTimeout(timer);
  }, [visible, openRules]);
  // 읽은 글이 들어오면 타이핑이 끝날 때까지 입력 글자를 숨기고 무지개 오버레이만 보인다
  const [typing, setTyping] = useState(false);
  useEffect(() => { setTyping(!!(visible && animateInitial && initialText)); }, [visible, animateInitial, initialText]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      // 공통 시트 헤더 — 라벨 가운데(다른 시트와 같게)
      headerType="center"
      // 단축키 패널 열고 닫기 — 시트 헤더 오른쪽 아이콘 자리
      // 오른쪽 — 앱바처럼 유리 알약 하나에 묶음: 단축키 · 이미지로 읽기(맨 오른쪽)
      headerRight={
        <View ref={rulesBtnRef} collapsable={false}>
          <NavPillGroup>
            <IconButton icon={IconKeyboard} variant="ghost-primary" forcePressed={rulesOpen} size="medium" onPress={() => (rulesOpen ? setRulesOpen(false) : openRules())} />
            {onReadImage && readImageItems?.length ? (
              <IconButton icon={IconScanText} variant="ghost-primary" forcePressed={scanMenuOpen} size="medium" onPress={() => { setRulesOpen(false); setScanMenuOpen(v => !v); }} />
            ) : null}
          </NavPillGroup>
        </View>
      }
      floating={
        <>
          <FloatingPanel visible={rulesOpen} anchor={rulesAnchor}>
            <ShortcutList rows={writingRuleRows(['title', 'meta', 'section', 'subgroup', 'ingredient', 'step', 'tip', 'caution'], t)} />
          </FloatingPanel>
          {/* 이미지로 읽기 메뉴 — 헤더 알약 바로 아래, 오른쪽 끝 맞춤(메뉴처럼) */}
          {scanMenuOpen && readImageItems && onReadImage ? (
            <View style={[styles.scanMenuWrap, rulesAnchor ? {top: rulesAnchor.y + rulesAnchor.height + 4, right: Math.max(8, winW - (rulesAnchor.x + rulesAnchor.width))} : null]}>
              <Menu
                items={readImageItems}
                visible
                onSelect={id => { setScanMenuOpen(false); onReadImage(id); }}
                onClose={() => setScanMenuOpen(false)}
              />
            </View>
          ) : null}
        </>
      }
      title={t('recipeEdit.pasteMarkdown')}
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
            style={[styles.input, typing && TYPING_CONCEAL]}
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
      </View>
    </BottomSheet>
  );
}

const INPUT_MAX_HEIGHT = 320;

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 다른 시트 본문과 같게 — 좌우·상하 8
  body: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  inputWrap: {
    borderRadius: Radius['radius-lg'],
    backgroundColor: colors['fill/faint'],
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    minHeight: 200,
    // 칸은 최대 320까지만 — 넘치면 칸 안에서 스크롤(키보드가 올라와도 커서가 보이게)
    maxHeight: INPUT_MAX_HEIGHT,
  },
  input: {
    ...Typography.body.medium,
    maxHeight: INPUT_MAX_HEIGHT - Spacing.sm * 2,
    color: colors['foreground/on-surface'],
  },
  // 오버레이를 입력 글자 자리에 겹친다 — inputWrap 안쪽 여백과 같게
  inputPad: {
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
  },
  scanMenuWrap: {
    position: 'absolute',
    top: 64,
    right: Spacing.sm,
  },
  hint: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
  },
});

export default PasteRecipeSheet;
