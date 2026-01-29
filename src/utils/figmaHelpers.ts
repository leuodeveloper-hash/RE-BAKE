/**
 * 피그마 디자인 값을 React Native 스타일로 변환하는 헬퍼 함수들
 */

/**
 * 피그마의 픽셀 값을 React Native의 숫자로 변환
 * @param figmaValue 피그마에서 가져온 픽셀 값 (예: "16px")
 * @returns React Native에서 사용할 숫자 값
 */
export const parseFigmaSize = (figmaValue: string | number): number => {
  if (typeof figmaValue === 'number') {
    return figmaValue;
  }
  return parseFloat(figmaValue.replace('px', ''));
};

/**
 * 피그마의 색상 값을 React Native 색상 문자열로 변환
 * @param figmaColor 피그마 색상 객체 또는 hex 문자열
 * @returns React Native 색상 문자열 (예: "#FF0000" 또는 "rgba(255, 0, 0, 1)")
 */
export const parseFigmaColor = (figmaColor: any): string => {
  if (typeof figmaColor === 'string') {
    return figmaColor;
  }

  if (figmaColor.r !== undefined) {
    // RGB/RGBA 객체
    const r = Math.round(figmaColor.r * 255);
    const g = Math.round(figmaColor.g * 255);
    const b = Math.round(figmaColor.b * 255);
    const a = figmaColor.a !== undefined ? figmaColor.a : 1;

    if (a === 1) {
      return `#${r.toString(16).padStart(2, '0')}${g
        .toString(16)
        .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return '#000000'; // 기본값
};

/**
 * 피그마의 폰트 웨이트를 React Native 폰트 웨이트로 변환
 * @param figmaWeight 피그마 폰트 웨이트 (예: "Regular", "Bold", 400, 700)
 * @returns React Native 폰트 웨이트 문자열
 */
export const parseFigmaFontWeight = (figmaWeight: string | number): string => {
  if (typeof figmaWeight === 'number') {
    if (figmaWeight <= 300) return '300';
    if (figmaWeight <= 400) return '400';
    if (figmaWeight <= 500) return '500';
    if (figmaWeight <= 600) return '600';
    return '700';
  }

  const weightMap: Record<string, string> = {
    Thin: '100',
    'Extra Light': '200',
    Light: '300',
    Regular: '400',
    Medium: '500',
    'Semi Bold': '600',
    Bold: '700',
    'Extra Bold': '800',
    Black: '900',
  };

  return weightMap[figmaWeight] || '400';
};

/**
 * 피그마의 그림자 스타일을 React Native 스타일로 변환
 * @param shadow 피그마 그림자 객체
 * @returns React Native shadow 스타일 객체
 */
export const parseFigmaShadow = (shadow: any) => {
  return {
    shadowColor: parseFigmaColor(shadow.color || '#000000'),
    shadowOffset: {
      width: shadow.x || 0,
      height: shadow.y || 0,
    },
    shadowOpacity: shadow.color?.a !== undefined ? shadow.color.a : 0.25,
    shadowRadius: shadow.blur || 0,
    elevation: shadow.blur ? Math.ceil(shadow.blur / 2) : 0, // Android
  };
};
