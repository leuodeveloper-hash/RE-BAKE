/**
 * 아이콘 컴포넌트 예시
 * 
 * 피그마에서 SVG로 내보낸 아이콘을 이 형식으로 변환하세요
 * 
 * 변환 방법:
 * 1. 피그마에서 아이콘 선택 → 우클릭 → "Copy as SVG" 또는 "Export as SVG"
 * 2. SVG 코드에서 <svg> 태그의 viewBox와 내부 요소들을 복사
 * 3. 아래 예시처럼 컴포넌트로 변환
 */

import React from 'react';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import {Icon, IconProps} from './Icon';

/**
 * 예시: Home 아이콘
 * 실제 피그마 아이콘의 SVG 경로로 교체하세요
 */
export const IconHome: React.FC<IconProps> = ({size = 24, color = '#000000', ...props}) => {
  return (
    <Icon size={size} color={color} {...props}>
      {/* 피그마에서 복사한 SVG 경로를 여기에 넣으세요 */}
      <Path
        d="M12 2L2 7L2 20L9 20L9 14L15 14L15 20L22 20L22 7L12 2Z"
        fill={color}
      />
    </Icon>
  );
};

/**
 * 예시: Circle 아이콘
 */
export const IconCircle: React.FC<IconProps> = ({size = 24, color = '#000000', ...props}) => {
  return (
    <Icon size={size} color={color} {...props}>
      <Circle cx="12" cy="12" r="10" fill={color} />
    </Icon>
  );
};

/**
 * 예시: Square 아이콘
 */
export const IconSquare: React.FC<IconProps> = ({size = 24, color = '#000000', ...props}) => {
  return (
    <Icon size={size} color={color} {...props}>
      <Rect x="4" y="4" width="16" height="16" fill={color} />
    </Icon>
  );
};
