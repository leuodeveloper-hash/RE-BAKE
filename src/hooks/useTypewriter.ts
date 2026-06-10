import {useEffect, useState} from 'react';

/**
 * 타겟 문자열을 한 글자씩 점진적으로 노출하는 훅.
 * OCR 결과를 입력 필드에 타자기 효과로 채울 때 사용.
 *
 * - `target`이 바뀌면 자동으로 처음부터 다시 타이핑
 * - 빈 문자열로 리셋하면 즉시 클리어
 */
export function useTypewriter(target: string, options?: {
  speedMs?: number;
  /** 타이핑 완료 시 콜백 */
  onComplete?: () => void;
  /** false면 타이핑 안 하고 즉시 풀 문자열 */
  enabled?: boolean;
}): {value: string; isTyping: boolean} {
  const speedMs = options?.speedMs ?? 35;
  const enabled = options?.enabled ?? true;
  const [value, setValue] = useState(enabled ? '' : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    if (!target) {
      setValue('');
      return;
    }
    setValue(target.slice(0, 1));
    let i = 1;
    const id = setInterval(() => {
      i += 1;
      setValue(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(id);
        options?.onComplete?.();
      }
    }, speedMs);
    return () => clearInterval(id);
  }, [target, speedMs, enabled]);

  return {value, isTyping: enabled && value.length < target.length};
}
