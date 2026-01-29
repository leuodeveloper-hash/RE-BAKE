import React from 'react';
import Svg, {SvgProps} from 'react-native-svg';
import {ViewStyle} from 'react-native';

export interface IconProps extends SvgProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/**
 * 피그마에서 내보낸 SVG 아이콘을 사용하는 기본 컴포넌트
 * 
 * 사용 방법:
 * 1. 피그마에서 아이콘을 SVG로 내보내기
 * 2. assets/icons/ 폴더에 SVG 파일 저장
 * 3. 아이콘 컴포넌트 생성 (예: IconHome.tsx)
 * 4. 이 컴포넌트를 확장하여 사용
 */
export const Icon: React.FC<IconProps> = ({
  size = 24,
  color = '#000000',
  style,
  children,
  ...svgProps
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      {...svgProps}>
      {children}
    </Svg>
  );
};
