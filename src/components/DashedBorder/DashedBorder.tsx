import React from 'react';
import Svg, {Rect} from 'react-native-svg';

interface DashedBorderProps {
  /** 테두리를 그릴 영역 크기 (정사각형이 아니면 width/height 각각) */
  width: number;
  height?: number;
  /** 모서리 반경 (Figma radius/lg = 16) */
  radius?: number;
  /** 선 두께 */
  strokeWidth?: number;
  color: string;
  /**
   * 대시 길이 / 간격.
   * Figma는 `1px dashed`(대시 길이 미지정 = 브라우저 기본)이라 촘촘한 3:3이 아니라
   * 선 두께의 약 3배 대시 + 3배 간격으로 그려진다. 그 기본을 따른다.
   */
  dash?: number;
  gap?: number;
}

/**
 * 점선 테두리 — RN `borderStyle:'dashed'`는 대시 길이·간격을 지정할 수 없어
 * 플랫폼마다(iOS/Android/web) 대시 너비가 제각각으로 그려진다.
 * Figma 값(촘촘한 대시)과 맞추려면 SVG stroke-dasharray로 직접 그려야 한다.
 *
 * 부모에 absolute로 깔아 쓰고, 부모는 borderWidth 없이 배경만 준다.
 */
export const DashedBorder: React.FC<DashedBorderProps> = ({
  width,
  height,
  radius = 16,
  strokeWidth = 1,
  color,
  dash,
  gap,
}) => {
  const h = height ?? width;
  // 미지정이면 CSS `dashed` 기본에 맞춰 선 두께에 비례(3배).
  const d = dash ?? strokeWidth * 3;
  const g = gap ?? strokeWidth * 3;
  // stroke가 경계 중앙에 그려지므로 half만큼 안쪽으로 넣어야 잘리지 않는다.
  const half = strokeWidth / 2;
  return (
    <Svg width={width} height={h} style={{position: 'absolute', top: 0, left: 0}} pointerEvents="none">
      <Rect
        x={half}
        y={half}
        width={Math.max(0, width - strokeWidth)}
        height={Math.max(0, h - strokeWidth)}
        rx={Math.max(0, radius - half)}
        ry={Math.max(0, radius - half)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${d},${g}`}
      />
    </Svg>
  );
};

export default DashedBorder;
