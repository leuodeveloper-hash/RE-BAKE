/**
 * SVG 파일을 TypeScript에서 import할 수 있도록 타입 정의
 */
declare module '*.svg' {
  import React from 'react';
  import {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
