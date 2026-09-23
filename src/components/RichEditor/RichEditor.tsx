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
  /**
   * 엔터. rest = 커서 뒤에 있던 글자(문단 중간에서 눌렀을 때).
   * 호출부는 이걸 새로 만드는 항목의 초기값으로 쓰면 된다.
   */
  onSubmit?: (rest?: string) => void;
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
  // ready 시점에 넣을 값은 항상 "지금" 값이어야 한다. handleMessage가 캡처한 value는
  // 웹뷰 마운트 당시 값(대개 빈 문자열)이라, 데이터가 늦게 도착하면 영영 반영되지 않는다.
  const valueRef = useRef(value);
  valueRef.current = value;

  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  // 호출부가 준 레이아웃 속성만 컨테이너로 넘긴다(폰트·색은 웹뷰 CSS가 처리).
  const layoutStyle = useMemo(() => {
    if (!flat) return undefined;
    const {flex, flexGrow, flexShrink, flexBasis, alignSelf, minWidth, maxWidth, width, marginTop, marginBottom, marginLeft, marginRight} = flat as any;
    return {flex, flexGrow, flexShrink, flexBasis, alignSelf, minWidth, maxWidth, width, marginTop, marginBottom, marginLeft, marginRight};
  }, [flat]);
  const theme: EditorTheme = useMemo(() => ({
    text: (flat?.color as string) ?? colors['foreground/on-surface'],
    placeholder: colors['foreground/on-surface-muted'],
    surface: colors['surface/bright'],
    linkBg: colors['custom/yellow-var'] + '33',
    linkColor: colors['custom/yellow-var'],
    linkUnderline: colors['border/normal'],
    caret: colors['foreground/on-surface'],
    selection: colors['custom/yellow-var'] + '40',
    fontSize: (flat?.fontSize as number) ?? Typography.body.medium.fontSize,
    lineHeight: (flat?.lineHeight as number) ?? Typography.body.medium.lineHeight,
    fontFamily: (flat?.fontFamily as string) ?? Typography.body.medium.fontFamily,
  }), [colors, flat?.color, flat?.fontSize, flat?.lineHeight, flat?.fontFamily]);

  // 테마·폰트가 바뀌면 문서를 다시 만든다. value는 브릿지로 넣으므로 여기 넣지 않는다
  // (넣으면 타이핑마다 웹뷰가 새로 로드된다).
  // 초기값은 문서에 직접 심는다 — ready/setValue 브릿지에만 의존하면 그 경로가 한 번이라도
  // 어긋날 때 칸이 빈 채로 남는다(iOS에서 재료 이름이 안 보이던 회귀).
  // 마운트 시점 값만 고정해 쓰므로 타이핑마다 문서가 다시 만들어지지 않는다.
  const initialValueRef = useRef(value);
  const html = useMemo(
    () => buildEditorHtml(theme, placeholder, initialValueRef.current),
    [theme, placeholder],
  );

  const send = useCallback((type: string, payload: object) => {
    const msg = JSON.stringify({type, payload});
    if (!readyRef.current) { pendingRef.current.push(msg); return; }
    // 객체 리터럴로 주입한다. 예전엔 JSON 문자열을 다시 stringify해 넘겼는데(이중 인코딩),
    // 값에 따옴표·개행·유니코드가 섞이면 iOS WKWebView에서 주입 스크립트가 깨져
    // setValue가 통째로 씹혔다(재료 이름이 빈 칸으로 남는 회귀).
    webRef.current?.injectJavaScript(`window.__editorApply(${msg}); true;`);
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
        console.log('[RichEditor] ready, value=', JSON.stringify(valueRef.current));
        send(EDITOR_MSG.setValue, {value: valueRef.current});
        pendingRef.current.forEach(m =>
          webRef.current?.injectJavaScript(`window.__editorApply(${m}); true;`));
        pendingRef.current = [];
        break;
      case EDITOR_MSG.change:
        lastFromWebRef.current = payload.value;
        onChangeText(payload.value);
        if (payload.submit) onSubmit?.(payload.rest ?? '');
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
    // style은 폰트 계산에만 쓰고 컨테이너엔 적용하지 않았다 → 호출부의 flex:1이 사라져
    // row 레이아웃(재료 행: 이름 + 분량)에서 폭이 0이 되어 글자가 통째로 안 보였다.
    // (도구·과정은 세로 레이아웃이라 폭이 자동으로 채워져 증상이 없었다.)
    // 레이아웃 속성만 넘긴다 — 폰트/색은 웹뷰 안 CSS가 담당한다.
    <View style={[{height}, layoutStyle]}>
      <WebView
        ref={webRef}
        source={{html}}
        onMessage={handleMessage}
        style={[styles.web, {backgroundColor: colors['surface/bright']}]}
        // 로드 실패를 조용히 넘기면 ready가 안 와 setValue도 못 하고 칸이 통째로 빈다.
        // (iOS에서 재료 이름만 안 보이던 회귀) — 원인을 남기고, 프로세스가 죽으면 되살린다.
        // ready 메시지가 유실돼도(iOS에서 문서 로드 직후 postMessage가 묻히는 경우가 있다)
        // 값이 안 들어가면 칸이 빈 채로 남는다. 문서 로드가 끝나면 한 번 더 밀어넣는다.
        onLoadEnd={() => {
          readyRef.current = true;
          const msg = JSON.stringify({type: EDITOR_MSG.setValue, payload: {value: valueRef.current}});
          webRef.current?.injectJavaScript(`window.__editorApply && window.__editorApply(${msg}); true;`);
        }}
        onError={e => console.warn('[RichEditor] load error', e.nativeEvent)}
        onHttpError={e => console.warn('[RichEditor] http error', e.nativeEvent)}
        onContentProcessDidTerminate={() => {
          readyRef.current = false;
          webRef.current?.reload();
        }}
        // iOS 전용 props — 타입 정의에 없어 캐스팅으로 넘긴다.
        // opaque=false: 배경을 비워 앱 테마가 그대로 비치게 (없으면 흰 판이 깔린다)
        // hideKeyboardAccessoryView: 웹뷰 기본 완료 바를 숨겨 앱 키보드 툴바와 겹치지 않게
        // opaque=false(투명 웹뷰)는 iOS에서 컨텐츠가 아예 안 그려지는 경우가 있어
        // 재료 칸이 빈 채 높이만 남았다. 불투명으로 두고 배경색을 앱 테마와 맞춘다.
        {...({hideKeyboardAccessoryView: true} as any)}
        scrollEnabled={false}
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        // 문서 안에서만 동작한다 — 바깥으로 나가는 "이동"만 막는다.
        //
        // 주의: originWhitelist로 origin을 통째로 막으면 iOS는 source={{html}}의 메인
        // 문서 로드까지 차단해 웹뷰가 통째로 빈다(안드로이드는 통과). 그러면 ready가
        // 안 와 setValue도 못 하고, 재료 이름 칸이 전부 빈 채로 남는다.
        // navigationType으로 최초 로드를 구분하는 것도 기기/버전마다 값이 달라 위험하다.
        // 링크 탭은 JS에서 linkTap 메시지로 처리하므로(브라우저 이동을 쓰지 않는다),
        // 여기서는 http(s) 같은 바깥 스킴만 거르면 충분하다.
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={req =>
          !/^https?:/i.test(req.url)
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  web: {
    flex: 1,
  },
});

export default RichEditor;
