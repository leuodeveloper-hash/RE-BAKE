import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef} from 'react';
import {StyleSheet, TextStyle} from 'react-native';
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

  const emit = useCallback(() => {
    const el = elRef.current;
    if (!el) return '';
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
      background: ${colors['custom/yellow-var']}33;
      color: inherit;
      border-radius: 3px;
      padding: 1px 2px;
      cursor: pointer;
    }
    [data-rich="${scopeId}"]:empty::before {
      content: attr(data-placeholder);
      color: ${colors['foreground/on-surface-muted']};
      pointer-events: none;
    }
  `, [scopeId, colors]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      emit();
      onSubmit?.();
      return;
    }
    if (e.key === 'Backspace') {
      const c = caretOffset();
      if (c.start === 0 && c.end === 0) {
        emit();
        onBackspaceAtStart?.();
      }
    }
  }, [emit, onSubmit, onBackspaceAtStart, caretOffset]);

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

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: css}} />
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
        onInput={() => emit()}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={() => onFocus?.()}
        onBlur={() => onBlur?.()}
        onSelect={() => {
          const el = elRef.current;
          if (el) onSelectionChange?.(caretOffset(), toSource(el));
        }}
      />
    </>
  );
});

export default RichEditor;
