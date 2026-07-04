/**
 * 피그마 디자인 시스템의 Elevation(그림자) 토큰
 * Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd, effect styles
 *
 * RN 0.76+ `boxShadow` 프롭으로 iOS/Android 동일 렌더링.
 * Figma multiple shadow + spread radius 그대로 표현.
 *
 * 매핑:
 * - subtle: 카드/리스트 아이템 미세 그림자
 * - normal: 일반 카드/스낵바 (멀티 섀도우)
 * - strong: 떠있는 액션 버튼/팝오버
 * - heavy: 모달/시트 강조
 */

import {ViewStyle} from 'react-native';

type Shadow = {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
};

const SHADOW_COLOR = '#0E0E0D'; // neutral/4 (Figma effect color)

const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const toBoxShadow = (shadows: Shadow[]): ViewStyle => ({
  boxShadow: shadows
    .map(s => `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`)
    .join(', '),
});

// ---- Figma 매칭 그림자 ----

const SHADOW_SUBTLE: Shadow[] = [
  {offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: rgba(SHADOW_COLOR, 0.06)},
];

const SHADOW_NORMAL: Shadow[] = [
  {offsetX: 0, offsetY: 3, blur: 24, spread: 0, color: rgba(SHADOW_COLOR, 0.07)},
  {offsetX: 0, offsetY: 0, blur: 2, spread: 0, color: rgba(SHADOW_COLOR, 0.05)},
];

const SHADOW_STRONG: Shadow[] = [
  {offsetX: 0, offsetY: 8, blur: 16, spread: -4, color: rgba(SHADOW_COLOR, 0.12)},
];

const SHADOW_HEAVY: Shadow[] = [
  {offsetX: 0, offsetY: 16, blur: 32, spread: 8, color: rgba('#0D0E10', 0.16)},
];

// ---- Light Mode (Figma 기본값) ----

export const ElevationLight = {
  subtle: toBoxShadow(SHADOW_SUBTLE),
  normal: toBoxShadow(SHADOW_NORMAL),
  strong: toBoxShadow(SHADOW_STRONG),
  heavy: toBoxShadow(SHADOW_HEAVY),
  // 숫자 키 alias (백워드 호환 — '1'~'5' 사용처용)
  '1': toBoxShadow(SHADOW_SUBTLE),
  '2': toBoxShadow(SHADOW_NORMAL),
  '3': toBoxShadow(SHADOW_STRONG),
  '4': toBoxShadow(SHADOW_STRONG),
  '5': toBoxShadow(SHADOW_HEAVY),
} as const;

// ---- Dark Mode ----
// Figma 의 effect style 은 모드 분기가 없으므로 동일 값 사용.
// 다크 배경에서 더 잘 보이도록 alpha 만 살짝 키움 (0.06→0.20 등).

const SHADOW_SUBTLE_DARK: Shadow[] = [
  {offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: rgba('#000000', 0.20)},
];

const SHADOW_NORMAL_DARK: Shadow[] = [
  {offsetX: 0, offsetY: 2, blur: 20, spread: 0, color: rgba('#000000', 0.32)},
  {offsetX: 0, offsetY: 0, blur: 2, spread: 0, color: rgba('#000000', 0.24)},
];

const SHADOW_STRONG_DARK: Shadow[] = [
  {offsetX: 0, offsetY: 8, blur: 16, spread: -4, color: rgba('#000000', 0.40)},
];

const SHADOW_HEAVY_DARK: Shadow[] = [
  {offsetX: 0, offsetY: 16, blur: 32, spread: 8, color: rgba('#000000', 0.48)},
];

export const ElevationDark = {
  subtle: toBoxShadow(SHADOW_SUBTLE_DARK),
  normal: toBoxShadow(SHADOW_NORMAL_DARK),
  strong: toBoxShadow(SHADOW_STRONG_DARK),
  heavy: toBoxShadow(SHADOW_HEAVY_DARK),
  '1': toBoxShadow(SHADOW_SUBTLE_DARK),
  '2': toBoxShadow(SHADOW_NORMAL_DARK),
  '3': toBoxShadow(SHADOW_STRONG_DARK),
  '4': toBoxShadow(SHADOW_STRONG_DARK),
  '5': toBoxShadow(SHADOW_HEAVY_DARK),
} as const;

export type ElevationLightKey = keyof typeof ElevationLight;
export type ElevationDarkKey = keyof typeof ElevationDark;

// ---- Background blur (BlurView intensity) ----
// Figma: elevation/blur/normal=16, strong=48
// React Native BlurView 의 `intensity` prop 에 적용.

export const BlurIntensity = {
  normal: 16,
  strong: 48,
} as const;

// ---- Helper ----

export const getElevation = (
  level: ElevationLightKey,
  theme: 'light' | 'dark' = 'light',
): ViewStyle => (theme === 'light' ? ElevationLight[level] : ElevationDark[level]);
