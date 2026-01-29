/**
 * 피그마 디자인 시스템의 타이포그래피 상수
 * 피그마 원본 네이밍을 그대로 유지하여 화면 매핑과 1:1로 대응됩니다
 * 
 * 폰트 이름 참고:
 * - React Native에서는 폰트 파일의 PostScript 이름을 사용합니다
 * - IBM Plex Sans의 경우 보통 'IBMPlexSans' 또는 'IBMPlexSans-Regular'입니다
 * - 폰트가 적용되지 않으면 폰트 파일을 열어서 실제 PostScript 이름을 확인하세요
 * - fontWeight를 사용하면 React Native가 자동으로 적절한 폰트 파일을 선택합니다
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
  // If it was a percentage, convert to relative value (React Native uses relative values)
  if (value.includes('%')) {
    return num / 100;
  }
  return num;
};

// Helper function to convert fontWeight number to React Native format
const parseFontWeight = (weight: number | string): string => {
  if (typeof weight === 'string') return weight;
  return weight.toString();
};

export const Typography = {
  display: {
    large: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('57px'),
      fontWeight: parseFontWeight(600) as const,
      letterSpacing: parseLetterSpacing('-1px'),
      lineHeight: parseSize('64px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('45px'),
      fontWeight: parseFontWeight(700) as const,
      letterSpacing: parseLetterSpacing('0%'),
      lineHeight: parseSize('52px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('36px'),
      fontWeight: parseFontWeight(700) as const,
      letterSpacing: parseLetterSpacing('0%'),
      lineHeight: parseSize('44px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  headline: {
    large: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('32px'),
      fontWeight: parseFontWeight(700) as const,
      letterSpacing: parseLetterSpacing('0%'),
      lineHeight: parseSize('40px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('28px'),
      fontWeight: parseFontWeight(700) as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('36px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('22px'),
      fontWeight: parseFontWeight(600) as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('28px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  label: {
    'large - semibold': {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('14px'),
      fontWeight: parseFontWeight(600) as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    large: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('14px'),
      fontWeight: parseFontWeight(500) as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    'medium - semibold': {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('12px'),
      fontWeight: parseFontWeight(600) as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('16px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('12px'),
      fontWeight: parseFontWeight(600) as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('16px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('11px'),
      fontWeight: parseFontWeight(500) as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('16px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  title: {
    large: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('18px'),
      fontWeight: parseFontWeight(700) as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('24px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('16px'),
      fontWeight: parseFontWeight(700) as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('14px'),
      fontWeight: parseFontWeight(600) as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('18px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
  },
  body: {
    large: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('16px'),
      fontWeight: parseFontWeight(500) as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('22px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    medium: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('15px'),
      fontWeight: parseFontWeight(500) as const,
      letterSpacing: parseLetterSpacing('-0.25px'),
      lineHeight: parseSize('20px'),
      textTransform: 'none' as const,
      textDecoration: 'none' as const,
    },
    small: {
      fontFamily: 'IBMPlexSans', // 폰트가 적용되지 않으면 'IBMPlexSans-Regular'로 시도하세요
      fontSize: parseSize('12px'),
      fontWeight: parseFontWeight(400) as const,
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
