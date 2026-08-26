import React, {forwardRef} from 'react';
import {StyleProp, TextInput as RNTextInput, TextInputProps as RNTextInputProps, TextStyle} from 'react-native';
import {TextInput} from '@components/TextInput';

export interface AutoGrowInputProps extends Omit<RNTextInputProps, 'multiline' | 'style'> {
  /** 인풋 스타일 (폰트/색 등). 높이는 내부에서 자동 관리하므로 height 지정 금지. */
  style?: StyleProp<TextStyle>;
}

/**
 * 여러 줄 자동 확장 입력 — 라벨·테두리 없는 "입력 그 자체".
 *
 * 실제 구현은 공통 TextInput 하나로 통일돼 있고, 이 컴포넌트는 그 위의 얇은 별칭이다.
 * 차이는 style 하나뿐:
 *  - TextInput.style  → 'outlined' | 'ghost' 배리언트(라벨·테두리 포함 폼 UI)
 *  - AutoGrowInput.style → 스타일 객체(폰트·색을 호출부가 직접 지정)
 *
 * 편집화면처럼 각 입력이 제각각 폰트를 쓰는 곳은 이걸 쓰고,
 * 라벨/아이콘/에러가 필요한 폼은 TextInput을 직접 쓴다.
 */
export const AutoGrowInput = forwardRef<RNTextInput, AutoGrowInputProps>(function AutoGrowInput(
  {style, ...rest},
  ref,
) {
  return (
    <TextInput
      ref={ref}
      // ghost = 테두리·배경 없음. 폰트/색은 inputStyle로 호출부 값이 덮어쓴다.
      style="ghost"
      multiline
      // 컨테이너 없이 입력만 — 기존 AutoGrowInput과 동일하게 부모 레이아웃에 영향 없음
      bare
      // ghost의 baseline 마진은 폼 필드용이라 여기선 해제한다(호출부가 직접 정렬).
      // 안 그러면 기존 AutoGrowInput 대비 텍스트가 아래로 밀린다.
      inputStyle={[{marginTop: 0}, style]}
      {...rest}
    />
  );
});
