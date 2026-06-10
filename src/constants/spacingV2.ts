/**
 * V2 Spacing & Sizing — Figma 동기화
 * Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd, `measurement` 컬렉션
 *
 * Figma 는 두 카테고리를 분리:
 * - SpacingV2: 외부 간격 (margin, gap, padding)
 * - SizingV2: 내부 크기 (width, height, icon size)
 *
 * Responsive: `over-360` / `under-360` 모드.
 * 거의 모든 값이 두 모드 동일 — 차이 있는 것만 별도 처리.
 */

// ---- Spacing (외부 간격) ----

export const SpacingV2 = {
  none: 0,
  // xsmall
  'xsmall-1': 1,
  'xsmall-2': 2,
  'xsmall-3': 3,
  'xsmall-4': 4,
  // small
  'small-5': 5,
  'small-6': 6,
  'small-7': 7,
  'small-8': 8,
  'small-9': 9,
  'small-10': 10,
  'small-12': 12,
  // medium
  'medium-13': 13,
  'medium-14': 14,
  'medium-16': 16,
  'medium-20': 20,
  'medium-24': 24,
  // large
  'large-28': 28,
  'large-32': 32,
  'large-36': 36,
  'large-40': 40,
  'large-48': 48,
  'large-52': 52,
  // xlarge
  'xlarge-60': 60,
  'xlarge-64': 64,
  // xxlarge
  'xxlarge-70': 70,
  'xxlarge-76': 76,
  'xxlarge-80': 80,
} as const;

export type SpacingV2Key = keyof typeof SpacingV2;

// ---- Sizing (내부 크기 — width/height/icon) ----

export const SizingV2 = {
  // xsmall
  'xsmall-1': 1,
  'xsmall-2': 2,
  'xsmall-4': 4,
  // small
  'small-6': 6,
  'small-8': 8,
  'small-12': 12,
  // medium
  'medium-16': 16,
  'medium-20': 20,
  'medium-22': 22,
  'medium-24': 24,
  // large
  'large-28': 28,
  'large-32': 32,
  'large-36': 36,
  'large-40': 40,
  // xlarge
  'xlarge-44': 44,
  'xlarge-48': 48,
  'xlarge-50': 50,
  'xlarge-52': 52,
  'xlarge-56': 56,
  'xlarge-60': 60,
  // xxlarge
  'xxlarge-64': 64,
  'xxlarge-66': 66,
  'xxlarge-68': 68,
  'xxlarge-88': 88,
  'xxlarge-96': 96,
  'xxlarge-100': 100,
  // xxxlarge
  'xxxlarge-120': 120,
  'xxxlarge-128': 128,
  'xxxlarge-160': 160,
  'xxxlarge-168': 168,
  'xxxlarge-180': 180,
  'xxxlarge-192': 192,
  'xxxlarge-260': 260,
  'xxxlarge-272': 272,
  'xxxlarge-304': 304,
  'xxxlarge-360': 360,
} as const;

export type SizingV2Key = keyof typeof SizingV2;

// ---- Layout (responsive: over-360 vs under-360) ----
// 사용처에서 Dimensions.get('window').width >= 360 으로 분기.

export const LayoutV2 = {
  width: 393,
  height: 852,
  marginBaseOver360: 16,
  marginBaseUnder360: 8,
} as const;
