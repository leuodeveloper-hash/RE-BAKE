/**
 * 피그마 디자인 시스템의 타이포그래피 상수
 * 피그마 원본 네이밍을 그대로 유지하여 화면 매핑과 1:1로 대응됩니다
 *
 * 네이티브에서는 variable font가 지원되지 않아 weight별 static 폰트 사용:
 * - IBMPlexSans-Regular (400)
 * - IBMPlexSans-Medium (500)
 * - IBMPlexSans-SemiBold (600)
 * - IBMPlexSans-Bold (700)
 */

// Helper function to parse fontSize and lineHeight (remove 'px')
const parseSize = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return parseFloat(value.replace('px', ''));
};

// Helper function to parse letterSpacing (remove 'px' or '%')
const parseLetterSpacing = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const num = parseFloat(value.replace(/px|%/g, ''));
  if (value.includes('%')) {
    return num / 100;
  }
  return num;
};

// Weight → fontFamily 매핑 (네이티브에서 weight별 폰트 파일 선택)
const FONT: Record<number, string> = {
  400: 'IBMPlexSans-Regular',
  500: 'IBMPlexSans-Medium',
  600: 'IBMPlexSans-SemiBold',
  700: 'IBMPlexSans-Bold',
};

// IBM Plex Sans 폰트의 baseline 보정값 (폰트가 위로 올라가 보이는 현상 보정)
export const FONT_BASELINE_OFFSET = 2;

export const Typography = {
  display: {
    large: {
      fontFamily: FONT[600],
      fontSize: parseSize('57px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('-1px'),
      lineHeight: parseSize('64px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: FONT[700],
      fontSize: parseSize('45px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('0%'),
      lineHeight: parseSize('52px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: FONT[700],
      fontSize: parseSize('36px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('0%'),
      lineHeight: parseSize('44px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  headline: {
    large: {
      fontFamily: FONT[700],
      fontSize: parseSize('32px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('0%'),
      lineHeight: parseSize('40px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: FONT[700],
      fontSize: parseSize('28px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('36px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: FONT[600],
      fontSize: parseSize('22px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('28px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  label: {
    'xlarge - semibold': {
      fontFamily: FONT[600],
      fontSize: parseSize('15px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    xlarge: {
      fontFamily: FONT[500],
      fontSize: parseSize('15px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    'large - semibold': {
      fontFamily: FONT[600],
      fontSize: parseSize('14px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    large: {
      fontFamily: FONT[500],
      fontSize: parseSize('14px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    'medium - semibold': {
      fontFamily: FONT[600],
      fontSize: parseSize('12px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('16px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: FONT[600],
      fontSize: parseSize('12px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('16px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: FONT[500],
      fontSize: parseSize('11px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('16px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  title: {
    large: {
      fontFamily: FONT[700],
      fontSize: parseSize('18px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('24px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: FONT[700],
      fontSize: parseSize('16px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: FONT[600],
      fontSize: parseSize('14px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('18px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  body: {
    xxlarge: {
      fontFamily: FONT[500],
      fontSize: parseSize('20px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('28px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    xlarge: {
      fontFamily: FONT[500],
      fontSize: parseSize('18px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('24px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    large: {
      fontFamily: FONT[500],
      fontSize: parseSize('16px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('22px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: FONT[500],
      fontSize: parseSize('15px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: FONT[400],
      fontSize: parseSize('12px'),
      fontWeight: '400' as const,
      letterSpacing: parseLetterSpacing('-0.25%'),
      lineHeight: parseSize('16px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
} as const;

export type TypographyKey = keyof typeof Typography;
export type DisplayKey = keyof typeof Typography.display;
export type HeadlineKey = keyof typeof Typography.headline;
export type LabelKey = keyof typeof Typography.label;
export type TitleKey = keyof typeof Typography.title;
export type BodyKey = keyof typeof Typography.body;
