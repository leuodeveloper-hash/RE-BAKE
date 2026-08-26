import {useCallback, useRef} from 'react';
import {useLinkTarget} from '@contexts/LinkTargetContext';

/**
 * 입력 컴포넌트를 "선택한 텍스트에 링크" 기능에 연결한다.
 *
 * 툴바의 링크 버튼은 현재 포커스된 입력의 선택 구간을 알아야 하는데,
 * 입력 컴포넌트마다 이 배선을 복사하면 한쪽만 빠져 링크 버튼이 비활성되는
 * 문제가 생긴다(실제로 그랬다). 그래서 훅 하나로 모은다.
 *
 * Provider가 없는 화면에서는 아무 일도 하지 않는다.
 */
export function useLinkTargetBinding(
  value: string | undefined,
  onChangeText: ((v: string) => void) | undefined,
  onSelectionChange?: (e: any) => void,
  onBlur?: (e: any) => void,
  /** 표시값 기준 선택 → 저장값 기준으로 옮기는 변환 (URL 숨김 입력용) */
  mapSelection?: (sel: {start: number; end: number}) => {start: number; end: number},
) {
  const linkCtx = useLinkTarget();
  // 콜백이 항상 최신 값을 보도록 ref로 유지
  const valueRef = useRef(value ?? '');
  valueRef.current = value ?? '';
  const onChangeRef = useRef(onChangeText);
  onChangeRef.current = onChangeText;
  const mapSelectionRef = useRef(mapSelection);
  mapSelectionRef.current = mapSelection;

  const handleSelectionChange = useCallback((e: any) => {
    // 읽기 전용 입력(onChangeText 없음)은 링크 대상이 될 수 없다
    if (linkCtx && onChangeRef.current) {
      linkCtx.report({
        getValue: () => valueRef.current,
        setValue: (v: string) => onChangeRef.current?.(v),
        selection: mapSelectionRef.current
          ? mapSelectionRef.current(e.nativeEvent.selection)
          : e.nativeEvent.selection,
      });
    }
    onSelectionChange?.(e);
  }, [linkCtx, onSelectionChange]);

  // blur에서 대상을 비우지 않는다.
  // 링크 버튼을 누르면 다이얼로그가 열리면서 입력이 blur되는데, 여기서 report(null)을
  // 하면 URL을 확인하는 시점엔 적용할 대상이 사라진다(링크가 안 걸리던 원인).
  // 대상은 다음 입력이 포커스될 때 자연히 교체된다.
  const handleBlur = useCallback((e: any) => {
    onBlur?.(e);
  }, [onBlur]);

  return {handleSelectionChange, handleBlur};
}
