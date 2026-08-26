import React from 'react';
import ArrowTop from '../../../assets/images/arrow_caption_top.svg';
import ArrowBottom from '../../../assets/images/arrow_caption_bottom.svg';

export interface PhotoCaptionArrowProps {
  /** 'down' = 위 캡션에서 아래 사진을 가리킴, 'up' = 아래 캡션에서 위 사진을 가리킴 */
  direction: 'down' | 'up';
  /** 화살표 색 — SVG fill(currentColor)을 덮어씀. muted 등 alpha 포함 색 권장 */
  color?: string;
  /** 세로 길이(px). 원본 27.68×49 비율 유지해 가로 자동. 기본 49(원본) */
  size?: number;
}

// Figma 원본 뷰박스 (둘 다 동일): 27.6816 × 49
const W = 27.6816;
const H = 49;

/**
 * 캡션이 사진을 가리키는 곡선 화살표. Figma 원본 SVG(arrow_caption_top/bottom, 둘 다 27.68×49).
 * - down(위 캡션): bottom SVG — 곡선이 아래쪽, 위에서 아래 사진으로 내려꽂힘.
 * - up(아래 캡션): top SVG — 곡선이 위쪽, 아래에서 위 사진으로 올려꽂힘.
 */
export function PhotoCaptionArrow({direction, color, size = H}: PhotoCaptionArrowProps) {
  const Arrow = direction === 'down' ? ArrowBottom : ArrowTop;
  const height = size;
  const width = Math.round((height * W) / H);
  return <Arrow width={width} height={height} color={color} />;
}
