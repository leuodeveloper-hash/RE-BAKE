import React, {forwardRef} from 'react';
import {TextInput as RNTextInput} from 'react-native';
import {TextInput} from '@components/TextInput';
import type {TextInputProps} from '@components/TextInput/TextInput';

export type LinkAwareInputProps = TextInputProps;

/**
 * 링크 URL을 숨기고 표시 텍스트만 보여주는 입력.
 *
 * URL 숨김은 이제 공통 TextInput 자체가 처리하므로(모든 입력에 적용되어야 하기에)
 * 이 컴포넌트는 얇은 별칭이다. 기존 호출부 호환을 위해 남겨둔다.
 */
export const LinkAwareInput = forwardRef<RNTextInput, LinkAwareInputProps>(
  function LinkAwareInput(props, ref) {
    return <TextInput ref={ref} {...props} />;
  },
);

export default LinkAwareInput;
