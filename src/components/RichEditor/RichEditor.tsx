import React, {forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {StyleProp, StyleSheet, TextStyle, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {useColors} from '@contexts/ThemeContext';
import {Typography} from '@constants/typography';
import {buildEditorHtml, EDITOR_MSG, type EditorTheme} from './editorHtml';

export interface RichEditorHandle {
  focus: (caret?: number) => void;
  blur: () => void;
  /** 마크다운 원문을 그대로 밀어넣는다 (OCR·실행취소 등) */
  setValue: (v: string) => void;
  /** 선택 구간에 링크 적용 — 결과 마크다운을 통째로 반영한다 */
  applyLink: (nextSource: string) => void;
}

export interface RichEditorProps {
  /** 저장값(마크다운) */
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  onFocus?: () => void;
  onBlur?: () => void;
  /** 표시 텍스트 기준 선택 구간 */
  onSelectionChange?: (sel: {start: number; end: number}, value: string) => void;
  /** 링크 태그를 눌렀을 때 — URL 편집 다이얼로그로 */
  onLinkTap?: (info: {url: string; label: string; start: number; end: number}) => void;
  /** 엔터 — 보통 "다음 행 추가" */
  onSubmit?: () => void;
  /** 맨 앞에서 백스페이스 — 보통 "이전 행과 병합" */
  onBackspaceAtStart?: () => void;
}

/**
 * 링크를 태그처럼 보여주는 입력.
 *
 * contentEditable 웹뷰라 링크가 실제 DOM 노드다. 글 사이에 자연스럽게 섞여 흐르고,
 * 링크 글자에서만 탭이 잡히며(빈 곳은 커서 진입), 정렬이 어긋날 여지가 없다.
 * RN TextInput으로는 이 셋을 동시에 만족할 수 없어 웹뷰를 쓴다.
 *
 * 저장값은 여전히 마크다운([텍스트](url))이므로 스키마·보기 화면은 그대로다.
 */
export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(function RichEditor(
  {
    value, onChangeText, placeholder = '', style,
    onFocus, onBlur, onSelectionChange, onLinkTap, onSubmit, onBackspaceAtStart,
  },
  ref,
) {
  const colors = useColors();
  const webRef = useRef<WebView>(null);
  const [height, setHeight] = useState(Typography.body.medium.lineHeight);
  // 웹뷰가 준비되기 전에 온 명령은 모아뒀다 ready 때 흘려보낸다
  const readyRef = useRef(false);
  const pendingRef = useRef<string[]>([]);
  // 되먹임 방지 — 웹뷰가 올려보낸 값을 다시 내려보내지 않는다
  const lastFromWebRef = useRef<string | null>(null);

  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const theme: EditorTheme = useMemo(() => ({
    text: (flat?.color as string) ?? colors['foreground/on-surface'],
    placeholder: colors['foreground/on-surface-muted'],
    linkBg: colors['custom/yellow-var'] + '33',
    caret: colors['foreground/on-surface'],
    selection: colors['custom/yellow-var'] + '40',
    fontSize: (flat?.fontSize as number) ?? Typography.body.medium.fontSize,
    lineHeight: (flat?.lineHeight as number) ?? Typography.body.medium.lineHeight,
    fontFamily: (flat?.fontFamily as string) ?? Typography.body.medium.fontFamily,
  }), [colors, flat?.color, flat?.fontSize, flat?.lineHeight, flat?.fontFamily]);

  // 테마·폰트가 바뀌면 문서를 다시 만든다. value는 브릿지로 넣으므로 여기 넣지 않는다
  // (넣으면 타이핑마다 웹뷰가 새로 로드된다).
  const html = useMemo(() => buildEditorHtml(theme, placeholder), [theme, placeholder]);

  const send = useCallback((type: string, payload: object) => {
    const msg = JSON.stringify({type, payload});
    if (!readyRef.current) { pendingRef.current.push(msg); return; }
    webRef.current?.injectJavaScript(`window.__editorApply(${JSON.stringify(msg)}); true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    focus: (caret?: number) => send(EDITOR_MSG.setFocus, {focus: true, caret}),
    blur: () => send(EDITOR_MSG.setFocus, {focus: false}),
    setValue: (v: string) => send(EDITOR_MSG.setValue, {value: v}),
    applyLink: (nextSource: string) => send(EDITOR_MSG.applyLink, {value: nextSource}),
  }), [send]);

  // 바깥에서 value가 바뀌면 웹뷰에 반영 (웹뷰가 올려보낸 값은 제외)
  React.useEffect(() => {
    if (value === lastFromWebRef.current) return;
    send(EDITOR_MSG.setValue, {value});
  }, [value, send]);

  const handleMessage = useCallback((e: any) => {
    let msg: any;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    const {type, payload} = msg;

    switch (type) {
      case EDITOR_MSG.ready:
        readyRef.current = true;
        send(EDITOR_MSG.setValue, {value});
        pendingRef.current.forEach(m =>
          webRef.current?.injectJavaScript(`window.__editorApply(${JSON.stringify(m)}); true;`));
        pendingRef.current = [];
        break;
      case EDITOR_MSG.change:
        lastFromWebRef.current = payload.value;
        onChangeText(payload.value);
        if (payload.submit) onSubmit?.();
        if (payload.backspaceAtStart) onBackspaceAtStart?.();
        break;
      case EDITOR_MSG.focus: onFocus?.(); break;
      case EDITOR_MSG.blur: onBlur?.(); break;
      case EDITOR_MSG.selection: onSelectionChange?.(payload.selection, payload.value); break;
      case EDITOR_MSG.linkTap: onLinkTap?.(payload); break;
      case EDITOR_MSG.height: setHeight(Math.max(payload.height, theme.lineHeight)); break;
    }
  }, [value, send, onChangeText, onSubmit, onBackspaceAtStart, onFocus, onBlur, onSelectionChange, onLinkTap, theme.lineHeight]);

  return (
    <View style={{height}}>
      <WebView
        ref={webRef}
        source={{html}}
        onMessage={handleMessage}
        style={styles.web}
        // iOS 전용 props — 타입 정의에 없어 캐스팅으로 넘긴다.
        // opaque=false: 배경을 비워 앱 테마가 그대로 비치게 (없으면 흰 판이 깔린다)
        // hideKeyboardAccessoryView: 웹뷰 기본 완료 바를 숨겨 앱 키보드 툴바와 겹치지 않게
        {...({opaque: false, hideKeyboardAccessoryView: true} as any)}
        scrollEnabled={false}
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        // 문서 안에서만 동작한다 — 바깥으로 나가는 이동은 막는다
        originWhitelist={['about:*']}
        onShouldStartLoadWithRequest={req => req.url === 'about:blank' || req.url.startsWith('data:')}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default RichEditor;
