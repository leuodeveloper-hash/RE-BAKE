import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {StyleSheet, TextStyle, View} from 'react-native';
import {SYMBOL_DOM_SRC} from '@utils/autoSymbols';
import {matchShortcut} from '@constants/shortcuts';
import {EditableChip} from '@components/EditableChip';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';

// 기호 제안 — 앱 웹뷰 편집기와 같은 DOM 함수(문자열 하나를 같이 쓴다)
// eslint-disable-next-line no-new-func
const symbolDom = new Function(`${SYMBOL_DOM_SRC}; return {fixArrowsDom: fixArrowsDom, pendingSymbolDom: pendingSymbolDom, acceptSymbolDom: acceptSymbolDom};`)() as {
  fixArrowsDom: (root: HTMLElement) => boolean;
  pendingSymbolDom: () => {from: string; to: string} | null;
  acceptSymbolDom: () => boolean;
};
import {useColors} from '@contexts/ThemeContext';
import {Typography} from '@constants/typography';
import type {RichEditorHandle, RichEditorProps} from './RichEditor';

/**
 * 웹용 리치 에디터 — contentEditable.
 *
 * react-native-webview는 웹을 지원하지 않으므로, 네이티브가 웹뷰 안에서 하는 일을
 * 여기서는 DOM으로 직접 한다. 이 파일은 웹 전용(.web.tsx)이라 <div>를 그대로 써도
 * 된다 — RN Web은 JSX의 호스트 엘리먼트를 그대로 DOM으로 렌더한다.
 * (예전에 <View>에 DOM 이벤트 props를 넘기려다 실패했는데, View는 그 props를
 *  전달하지 않는다. div를 직접 쓰면 그 문제가 없다.)
 *
 * 동작·저장 형식(마크다운)은 네이티브 구현과 동일하다.
 */

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 마크다운 → DOM용 HTML. 링크는 실제 <a> 노드가 된다. */
function toHtml(src: string): string {
  let out = '', last = 0;
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(src)) !== null) {
    if (m.index > last) out += escapeHtml(src.slice(last, m.index));
    out += `<a data-url="${escapeHtml(m[2])}">${escapeHtml(m[1])}</a>`;
    last = m.index + m[0].length;
  }
  if (last < src.length) out += escapeHtml(src.slice(last));
  return out;
}

/** DOM → 마크다운. 저장값 형식은 네이티브와 같다. */
function toSource(node: Node): string {
  let out = '';
  node.childNodes.forEach(n => {
    if (n.nodeType === 3) out += n.nodeValue ?? '';
    else if (n.nodeName === 'A') {
      out += `[${n.textContent}](${(n as HTMLElement).getAttribute('data-url') ?? ''})`;
    } else if (n.nodeName === 'BR') out += '\n';
    else out += toSource(n);
  });
  return out;
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(function RichEditor(
  {
    value, onChangeText, placeholder = '', style,
    onFocus, onBlur, onSelectionChange, onLinkTap, onSubmit, onBackspaceAtStart,
  },
  ref,
) {
  const colors = useColors();
  const elRef = useRef<HTMLDivElement | null>(null);
  // 우리가 올려보낸 값을 되돌려 쓰지 않는다 (입력 중 커서 튐 방지)
  const lastEmitRef = useRef<string | null>(null);
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const scopeId = useRef(`rich-${Math.random().toString(36).slice(2)}`).current;

  /** 보이는 글자 기준 캐럿 위치 */
  const caretOffset = useCallback(() => {
    const el = elRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount) return {start: 0, end: 0};
    const r = sel.getRangeAt(0);
    const pre = r.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(r.startContainer, r.startOffset);
    const start = pre.toString().length;
    return {start, end: start + r.toString().length};
  }, []);

  const setCaret = useCallback((pos: number) => {
    const el = elRef.current;
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let seen = 0, node: Node | null;
    while ((node = walker.nextNode())) {
      const len = node.nodeValue?.length ?? 0;
      if (seen + len >= pos) {
        const r = document.createRange();
        r.setStart(node, pos - seen);
        r.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
        return;
      }
      seen += len;
    }
    // 끝으로
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }, []);

  // 입력 횟수 — X로 닫은 제안은 다음 입력 전까지만 숨긴다
  const emitCountRef = useRef(0);
  const emit = useCallback(() => {
    const el = elRef.current;
    if (!el) return '';
    // '->'·'-->'는 바로 →(글 마디 안에서 바꾸고 커서는 화살표 바로 뒤)
    symbolDom.fixArrowsDom(el);
    const src = toSource(el);
    lastEmitRef.current = src;
    onChangeText(src);
    return src;
  }, [onChangeText]);

  useImperativeHandle(ref, () => ({
    focus: (caret?: number) => {
      elRef.current?.focus();
      if (caret != null) setCaret(caret);
    },
    blur: () => elRef.current?.blur(),
    setValue: (v: string) => {
      if (elRef.current) elRef.current.innerHTML = toHtml(v);
      lastEmitRef.current = v;
      onChangeText(v);
    },
    applyLink: (nextSource: string) => {
      if (elRef.current) elRef.current.innerHTML = toHtml(nextSource);
      lastEmitRef.current = nextSource;
      onChangeText(nextSource);
    },
  }), [setCaret, onChangeText]);

  // 바깥에서 값이 바뀌면 반영. 마운트 직후에도 반드시 한 번 그린다 —
  // contentEditable은 value prop이 없어 innerHTML을 넣지 않으면 빈 칸이 된다.
  const mountedRef = useRef(false);
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (mountedRef.current) {
      if (value === lastEmitRef.current) return;
      if (toSource(el) === value) return;
    }
    mountedRef.current = true;
    el.innerHTML = toHtml(value ?? '');
  }, [value]);

  // 링크 색·placeholder는 의사 요소가 필요해 <style>로 넣는다
  const css = useMemo(() => `
    [data-rich="${scopeId}"] { outline: none; white-space: pre-wrap; word-break: break-word; }
    [data-rich="${scopeId}"] a {
      /* 보기(RichText linkTextStyle)와 같은 링크 — 바탕 없이 글자 색 그대로 + 보더 색 대시 밑줄 */
      color: inherit;
      text-decoration: underline dashed;
      text-decoration-color: ${colors['border/strong']};
      text-underline-offset: 4px;
      cursor: pointer;
    }
    [data-rich="${scopeId}"]:empty::before {
      content: attr(data-placeholder);
      color: ${colors['foreground/on-surface-muted']};
      pointer-events: none;
    }
  `, [scopeId, colors]);

  // 기호 제안 — '도씨'·'->' 뒤에 커서가 있으면 위에 제안 칩. 엔터·칩 누르기 = 넣기, X = 그대로 두기
  const {t} = useTranslation();
  const [suggest, setSuggest] = useState<{from: string; to: string} | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  // 칩 자리 — 커서(‘도씨’ 끝) 바로 위. 편집 칸을 감싼 틀 기준 좌표
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [chipPos, setChipPos] = useState<{left: number; bottom: number} | null>(null);
  const refreshSuggest = useCallback(() => {
    const p = document.activeElement === elRef.current ? symbolDom.pendingSymbolDom() : null;
    setSuggest(p);
    const sel = window.getSelection();
    const wrap = wrapRef.current;
    if (p && sel && sel.rangeCount && wrap) {
      const rc = sel.getRangeAt(0).getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      setChipPos({left: Math.max(0, rc.left - wr.left), bottom: wr.bottom - rc.top + 4});
    }
  }, []);
  const acceptSuggest = useCallback(() => {
    elRef.current?.focus();
    if (symbolDom.acceptSymbolDom()) { emit(); setSuggest(null); }
  }, [emit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const suggestOn = !!suggest && dismissed !== suggest.from + emitCountRef.current;
    // 한글 조합 중 엔터는 조합 끝내기 — 이때 넣으면 조합이 끝나며 글자가 다시 들어와 칩이 남았다
    const composing = e.nativeEvent.isComposing || e.keyCode === 229;
    if (suggestOn && !composing && !e.shiftKey && matchShortcut('suggestAccept', e)) {
      e.preventDefault();
      e.stopPropagation();
      acceptSuggest();
      return;
    }
    // ESC는 칩만 닫는다 — 입력 빠져나오기·뒤로 가기와 겹치면 엉뚱하게 스크롤됐다
    if (suggestOn && matchShortcut('suggestDismiss', e)) {
      e.preventDefault();
      e.stopPropagation();
      setDismissed(suggest!.from + emitCountRef.current);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // 문단 중간에서 엔터를 누르면 커서 뒤 글자는 새 항목으로 넘긴다.
      // 좌표로 자르지 않는 이유는 네이티브(editorHtml)와 같다 — 마크다운 링크가
      // 있으면 "보이는 글자" 좌표와 소스 좌표가 어긋난다. DOM Range로 나눈다.
      const el = elRef.current;
      const sel = window.getSelection();
      let rest = '';
      if (el && sel && sel.rangeCount) {
        const r = sel.getRangeAt(0);
        const head = r.cloneRange();
        head.selectNodeContents(el);
        head.setEnd(r.startContainer, r.startOffset);
        const tail = r.cloneRange();
        tail.selectNodeContents(el);
        tail.setStart(r.endContainer, r.endOffset);
        const headEl = document.createElement('div');
        headEl.appendChild(head.cloneContents());
        const tailEl = document.createElement('div');
        tailEl.appendChild(tail.cloneContents());
        rest = toSource(tailEl);
        // 커서 앞부분만 남기고 알린다(뒤는 새 항목으로 간다)
        const before = toSource(headEl);
        // 칸 글도 앞부분만 남긴다 — 알리기만 하면 되돌아온 값이 방금 보낸 것과 같아 다시 그리지 않아
        // 뒤 글자가 이 칸에 그대로 남았다(앱 편집기와 같은 처리). 이미 떼어 둔 앞부분(headEl)을 옮겨 담는다
        el.innerHTML = '';
        while (headEl.firstChild) el.appendChild(headEl.firstChild);
        lastEmitRef.current = before;
        onChangeText(before);
        onSubmit?.(rest);
        return;
      }
      emit();
      onSubmit?.('');
      return;
    }
    if (e.key === 'Backspace') {
      const c = caretOffset();
      if (c.start === 0 && c.end === 0) {
        emit();
        onBackspaceAtStart?.();
      }
    }
  }, [emit, onSubmit, onBackspaceAtStart, caretOffset, onChangeText, suggest, dismissed, acceptSuggest]);

  // 링크 태그를 누르면 URL 편집 — 커서 진입 대신
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = elRef.current;
    const a = (e.target as HTMLElement).closest?.('a');
    if (!el || !a) return;
    e.preventDefault();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.setEnd(a, 0);
    const start = r.toString().length;
    onLinkTap?.({
      url: a.getAttribute('data-url') ?? '',
      label: a.textContent ?? '',
      start,
      end: start + (a.textContent?.length ?? 0),
    });
  }, [onLinkTap]);

  const showSuggest = !!suggest && dismissed !== suggest.from + emitCountRef.current;
  return (
    // 편집 칸 + 제안 칩을 한 틀에 — 칩이 이 틀 기준으로 커서 위에 뜬다(틀이 없으면 먼 조상에 붙어 엉뚱한 데 떴다)
    <div ref={wrapRef} style={{position: 'relative', flex: 1, minWidth: 0, width: '100%', display: 'flex'}}>
      <style dangerouslySetInnerHTML={{__html: css}} />
      {showSuggest ? (
        <View style={[styles.suggest, chipPos && {left: chipPos.left, bottom: chipPos.bottom, right: 'auto' as any, marginBottom: 0}]}>
          {/* 누르는 순간 편집 칸 포커스·커서가 빠지면 바꿀 자리를 잃는다 — 마우스다운 기본 동작(포커스 이동)을 막는다 */}
          <div onMouseDown={e => e.preventDefault()}>
            <EditableChip variant="suggest" label={t('symbolSuggest.label', {to: suggest!.to})} onPress={acceptSuggest} onRemove={() => setDismissed(suggest!.from + emitCountRef.current)} />
          </div>
        </View>
      ) : null}
      <div
        ref={elRef}
        data-rich={scopeId}
        data-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        style={{
          fontFamily: (flat?.fontFamily as string) ?? Typography.body.medium.fontFamily,
          fontSize: (flat?.fontSize as number) ?? Typography.body.medium.fontSize,
          lineHeight: `${(flat?.lineHeight as number) ?? Typography.body.medium.lineHeight}px`,
          letterSpacing: '-0.25px',
          color: (flat?.color as string) ?? colors['foreground/on-surface'],
          caretColor: colors['foreground/on-surface'],
          minHeight: (flat?.lineHeight as number) ?? Typography.body.medium.lineHeight,
          width: '100%',
          flex: 1,
        }}
        onInput={() => { emitCountRef.current += 1; emit(); refreshSuggest(); }}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={() => onFocus?.()}
        onBlur={() => { setSuggest(null); onBlur?.(); }}
        onSelect={() => {
          const el = elRef.current;
          if (el) onSelectionChange?.(caretOffset(), toSource(el));
          refreshSuggest();
        }}
      />
    </div>
  );
});

export default RichEditor;

const styles = StyleSheet.create({
  // 제안 칩 — 편집 칸(부모) 바로 위 오른쪽에 떠 있게
  suggest: {position: 'absolute', bottom: '100%', right: 0, marginBottom: Spacing.xs, zIndex: 50},
});
