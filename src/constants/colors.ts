/**
 * 피그마 디자인 시스템의 색상 상수
 * 피그마에서 추출한 색상 값을 여기에 정의하세요
 */

export const Colors = {
  // Primary Colors
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#5AC8FA',

  // Secondary Colors
  secondary: '#5856D6',
  secondaryDark: '#3634A3',
  secondaryLight: '#AF52DE',

  // Neutral Colors
  black: '#000000',
  white: '#FFFFFF',
  gray: '#8E8E93',
  grayLight: '#C7C7CC',
  grayDark: '#636366',

  // Semantic Colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',

  // Background Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  backgroundTertiary: '#FFFFFF',

  // Text Colors
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
};

export type ColorKey = keyof typeof Colors;
