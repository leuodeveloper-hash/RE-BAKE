import React from 'react';
import Svg, {Path} from 'react-native-svg';

export interface PhotoCaptionArrowProps {
  /** 'down' = 캡션→아래 사진을 가리킴, 'up' = 캡션→위 사진을 가리킴 */
  direction: 'down' | 'up';
  color: string;
  size?: number;
}

/**
 * 캡션이 사진을 가리키는 손그림 느낌의 곡선 화살표. (스크린샷 참고)
 * 캡션 텍스트 왼쪽에 놓여, 곡선으로 사진 모서리 방향으로 내려/올려꽂힌다.
 */
export function PhotoCaptionArrow({direction, color, size = 28}: PhotoCaptionArrowProps) {
  // 24x24 뷰박스 기준. down: 우상단에서 좌하단으로 곡선 + 좌하단 화살촉.
  //                    up:   우하단에서 좌상단으로 곡선 + 좌상단 화살촉.
  const isDown = direction === 'down';
  // 곡선 path (2차 베지어)
  const curve = isDown
    ? 'M20 4 C 10 5, 5 10, 5 19'
    : 'M20 20 C 10 19, 5 14, 5 5';
  // 화살촉 (두 획)
  const head = isDown
    ? 'M5 19 L 9 15 M5 19 L 10 20'
    : 'M5 5 L 9 9 M5 5 L 10 4';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={curve} stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Path d={head} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
