import {useCallback, useEffect, useRef, useState} from 'react';
import {NativeSyntheticEvent, Platform, TextInputContentSizeChangeEventData} from 'react-native';

/**
 * 여러 줄 입력의 자동 높이 확장 — 네이티브/웹 처리를 한 곳에 모은다.
 *
 * 이전엔 TextInput과 AutoGrowInput이 같은 문제를 각자 다르게 풀고 있었다.
 * 로직이 갈리면 한쪽만 고쳐지는 버그가 반복되므로 여기로 통합한다.
 *
 * 다루는 함정:
 *  - iOS는 `multiline`+`numberOfLines={1}`을 "최대 1줄"로 해석해 클립한다
 *    → numberOfLines를 넘기지 말 것.
 *  - 줄이 줄어들 때 재측정되게 onChangeText에서 높이를 리셋해야 한다
 *    (안 하면 컨테이너가 옛 높이에 갇혀 축소가 안 됨).
 *  - 웹은 onContentSizeChange가 신뢰스럽지 않아 scrollHeight로 직접 잰다.
 */
export function useAutoGrow(enabled: boolean, inputRef: React.RefObject<any>) {
  const [height, setHeight] = useState<number | undefined>(undefined);
  // 웹 리사이즈가 최신 enabled를 보도록
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  /** 웹: textarea의 scrollHeight로 실제 높이를 잰다 */
  const resizeWeb = useCallback(() => {
    if (!enabledRef.current || Platform.OS !== 'web') return;
    const node = inputRef.current;
    if (!node) return;
    const el = (node as any)?._node ?? node;
    const textarea = el?.tagName === 'TEXTAREA' ? el : el?.querySelector?.('textarea');
    if (!textarea) return;
    // 웹에서는 높이를 state로 관리하지 않는다.
    // RN이 렌더할 때마다 인라인 height를 덮어써서 측정값과 싸우고, 그 결과 잘못된
    // 높이에 갇히거나(내용 잘림) 0이 되어 사라진다.
    // 대신 textarea가 내용만큼 늘어나도록 인라인 높이를 풀고 scrollHeight를 그대로 준다.
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
    const h = textarea.scrollHeight;
    if (h > 0) textarea.style.height = h + 'px';
  }, [inputRef]);

  // 웹은 마운트 직후에도 한 번 재야 초기 높이가 맞는다
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;
    const frame = requestAnimationFrame(resizeWeb);
    return () => cancelAnimationFrame(frame);
  }, [enabled, resizeWeb]);

  /** 입력이 바뀌면 호출 — 줄어들 때 재측정되도록 높이를 푼다 */
  const onTextChanged = useCallback(() => {
    if (!enabled) return;
    // 웹은 textarea가 스스로 늘어나므로 state를 건드리지 않는다 (resizeWeb이 DOM만 손댄다)
    if (Platform.OS === 'web') requestAnimationFrame(resizeWeb);
    else setHeight(undefined);
  }, [enabled, resizeWeb]);

  /** 네이티브: RN이 알려주는 콘텐츠 높이를 반영 */
  const onContentSize = useCallback((e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    if (!enabled || Platform.OS === 'web') return;
    const h = Math.ceil(e.nativeEvent.contentSize.height);
    setHeight(prev => (prev === h ? prev : h));
  }, [enabled]);

  return {height, onTextChanged, onContentSize};
}
