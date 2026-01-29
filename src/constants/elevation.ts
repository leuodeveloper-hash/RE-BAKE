/**
 * 피그마 디자인 시스템의 Elevation(그림자) 토큰
 * 피그마 원본 네이밍을 그대로 유지하여 화면 매핑과 1:1로 대응됩니다
 * 
 * React Native에서 그림자는 iOS와 Android에서 다르게 처리됩니다:
 * - iOS: shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * - Android: elevation (숫자)
 */

import {ViewStyle} from 'react-native';

// Helper function to parse pixel values
const parsePx = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return parseFloat(value.replace('px', ''));
};

// Helper function to parse color with opacity (e.g., "#0000000f" -> rgba)
const parseColor = (color: string): {color: string; opacity: number} => {
  // Format: #RRGGBBAA or #RRGGBB
  if (color.length === 9) {
    // #RRGGBBAA format
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const a = parseInt(color.slice(7, 9), 16) / 255;
    return {
      color: `rgba(${r}, ${g}, ${b}, ${a})`,
      opacity: a,
    };
  } else if (color.length === 7) {
    // #RRGGBB format
    return {color, opacity: 1};
  }
  return {color: '#000000', opacity: 0};
};

// Convert Figma shadow array to React Native shadow style
const convertShadowToRN = (
  shadows: Array<{
    offsetX: string | number;
    offsetY: string | number;
    blur: string | number;
    spread: string | number;
    color: string;
  }>,
): ViewStyle => {
  // React Native doesn't support multiple shadows natively
  // We'll use the largest/most prominent shadow
  let maxBlur = 0;
  let maxShadow = shadows[0];

  shadows.forEach(shadow => {
    const blur = parsePx(shadow.blur);
    if (blur > maxBlur) {
      maxBlur = blur;
      maxShadow = shadow;
    }
  });

  const {color: shadowColor, opacity} = parseColor(maxShadow.color);
  const offsetX = parsePx(maxShadow.offsetX);
  const offsetY = parsePx(maxShadow.offsetY);
  const blur = parsePx(maxShadow.blur);

  // For Android elevation, approximate based on blur
  // elevation roughly equals blur / 4
  const elevation = Math.max(1, Math.round(blur / 4));

  return {
    shadowColor: shadowColor,
    shadowOffset: {
      width: offsetX,
      height: offsetY,
    },
    shadowOpacity: opacity,
    shadowRadius: blur / 2, // React Native shadowRadius is half of CSS blur
    elevation, // Android
  };
};

// Light Mode Elevation
export const ElevationLight = {
  '1': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '0px',
      blur: '3px',
      spread: '0px',
      color: '#0000000f',
    },
    {
      offsetX: '0px',
      offsetY: '0px',
      blur: '2px',
      spread: '0px',
      color: '#0000000f',
    },
  ]),
  '2': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '2px',
      blur: '6px',
      spread: '2px',
      color: '#0000000f',
    },
    {
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
      spread: '0px',
      color: '#0000000f',
    },
  ]),
  '3': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '2px',
      blur: '14px',
      spread: '0px',
      color: '#00000014',
    },
  ]),
  '4': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '6px',
      blur: '16px',
      spread: '0px',
      color: '#0000000a',
    },
  ]),
  '5': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '0px',
      blur: '32px',
      spread: '0px',
      color: '#0000001f',
    },
  ]),
} as const;

// Dark Mode Elevation
export const ElevationDark = {
  '1': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
      spread: '0px',
      color: '#0000004d',
    },
    {
      offsetX: '0px',
      offsetY: '1px',
      blur: '3px',
      spread: '1px',
      color: '#00000026',
    },
  ]),
  '2': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
      spread: '0px',
      color: '#0000004d',
    },
    {
      offsetX: '0px',
      offsetY: '2px',
      blur: '6px',
      spread: '2px',
      color: '#00000026',
    },
  ]),
  '3': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '1px',
      blur: '3px',
      spread: '0px',
      color: '#0000004d',
    },
    {
      offsetX: '0px',
      offsetY: '4px',
      blur: '8px',
      spread: '3px',
      color: '#00000026',
    },
  ]),
  '4': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '2px',
      blur: '3px',
      spread: '0px',
      color: '#0000004d',
    },
    {
      offsetX: '0px',
      offsetY: '6px',
      blur: '10px',
      spread: '4px',
      color: '#00000026',
    },
  ]),
  '5': convertShadowToRN([
    {
      offsetX: '0px',
      offsetY: '4px',
      blur: '4px',
      spread: '0px',
      color: '#0000004d',
    },
    {
      offsetX: '0px',
      offsetY: '8px',
      blur: '12px',
      spread: '6px',
      color: '#00000026',
    },
  ]),
} as const;

export type ElevationLightKey = keyof typeof ElevationLight;
export type ElevationDarkKey = keyof typeof ElevationDark;

// Helper function to get elevation based on theme
export const getElevation = (
  level: '1' | '2' | '3' | '4' | '5',
  theme: 'light' | 'dark' = 'light',
): ViewStyle => {
  return theme === 'light' ? ElevationLight[level] : ElevationDark[level];
};
