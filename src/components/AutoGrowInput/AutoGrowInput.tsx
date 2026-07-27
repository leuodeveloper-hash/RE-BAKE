import React, {forwardRef, useCallback, useState} from 'react';
import {
  NativeSyntheticEvent,
  StyleProp,
  TextInput,
  TextInputContentSizeChangeEventData,
  TextInputProps,
  TextStyle,
} from 'react-native';
import {useColors} from '@contexts/ThemeContext';

export interface AutoGrowInputProps extends Omit<TextInputProps, 'multiline'> {
  /** 인풋 스타일 (폰트/색 등). 높이는 내부에서 자동 관리하므로 height 지정 금지. */
  style?: StyleProp<TextStyle>;
}

/**
 * 여러 줄 자동 확장 입력 — 편집화면의 모든 인라인 텍스트 입력 공통.
 *
 * 반드시 이 컴포넌트로 통일한다(개별 화면에서 TextInput+onContentSizeChange 직접 조립 금지).
 * 여기서 한 곳 관리하는 이유:
 *  - iOS는 `multiline`+`numberOfLines={1}`을 "최대 1줄"로 해석해 한 줄로 클립된다
 *    → numberOfLines를 절대 넘기지 않는다(멀티라인 확장을 막음).
 *  - onContentSizeChange로 높이를 잡되, 줄이 줄어들 때 재측정되도록 onChangeText에서
 *    저장된 높이를 리셋한다(안 하면 컨테이너가 옛 높이에 갇혀 축소가 안 됨).
 *  - blurOnSubmit=false로 개행이 submit로 처리되지 않게 한다.
 */
export const AutoGrowInput = forwardRef<TextInput, AutoGrowInputProps>(function AutoGrowInput(
  {style, onChangeText, onContentSizeChange, placeholderTextColor, selectionColor, ...rest},
  ref,
) {
  const colors = useColors();
  const [height, setHeight] = useState<number | null>(null);

  const handleContentSize = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const h = Math.ceil(e.nativeEvent.contentSize.height);
      setHeight(prev => (prev === h ? prev : h));
      onContentSizeChange?.(e);
    },
    [onContentSizeChange],
  );

  const handleChangeText = useCallback(
    (v: string) => {
      // 줄 수가 줄어들 때 재측정되도록 고정 높이 해제 (안 하면 축소 안 됨)
      setHeight(null);
      onChangeText?.(v);
    },
    [onChangeText],
  );

  return (
    <TextInput
      ref={ref}
      style={[style, height != null && {height}]}
      multiline
      blurOnSubmit={false}
      onChangeText={handleChangeText}
      onContentSizeChange={handleContentSize}
      placeholderTextColor={placeholderTextColor ?? colors['foreground/on-surface-muted']}
      selectionColor={selectionColor ?? colors['foreground/on-surface']}
      {...rest}
    />
  );
});
