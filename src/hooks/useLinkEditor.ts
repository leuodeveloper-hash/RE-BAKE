import {useCallback, useMemo, useRef} from 'react';
import {toDisplay, toSource, shiftLinks, type DisplayLink} from '@utils/richText';

/**
 * 편집 입력에서 링크 URL을 숨기고 표시 텍스트만 보여주기 위한 변환 계층.
 *
 * 저장값은 마크다운([텍스트](url))인데 URL이 길면(쿠팡 링크 등) 편집 중 문장을
 * 알아볼 수 없다. 그래서 입력에는 표시값만 넣고, 변경이 생기면 다시 마크다운으로
 * 되돌려 저장한다. 링크 구간은 텍스트가 바뀔 때마다 shiftLinks가 따라 옮긴다.
 *
 * @param source 저장값(마크다운)
 * @param onChangeSource 저장값이 바뀌었을 때
 */
export function useLinkEditor(source: string, onChangeSource: (v: string) => void) {
  const {text, links} = useMemo(() => toDisplay(source), [source]);
  // 입력 중에는 source가 아직 갱신 전일 수 있어 직전 표시값을 따로 기억한다
  const prevTextRef = useRef(text);
  prevTextRef.current = text;
  const linksRef = useRef<DisplayLink[]>(links);
  linksRef.current = links;

  const onChangeText = useCallback((nextText: string) => {
    const nextLinks = shiftLinks(prevTextRef.current, nextText, linksRef.current);
    onChangeSource(toSource(nextText, nextLinks));
  }, [onChangeSource]);

  return {
    /** 입력에 넣을 값 — URL이 빠진 표시 문자열 */
    value: text,
    /** 입력의 onChangeText에 연결 */
    onChangeText,
    /** 표시 문자열 기준 링크 구간 (하이라이트·툴바 판단용) */
    links,
  };
}
