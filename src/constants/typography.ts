/**
 * 피그마 디자인 시스템의 타이포그래피 상수
 * Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd, local text styles (28개)
 *
 * Figma 텍스트 스타일 구조: {scale} - {size} / {weight}
 *   display-large/medium/small × bold/regular
 *   headline-large/medium/small × bold/regular
 *   title-large/medium × bold/regular
 *   body-large/medium/small × bold/regular
 *   caption-large/medium/small × bold/regular
 *
 * 코드의 V1 ramp (display/headline/title/label/body) 구조는 그대로 유지하면서,
 * 값(size/lineHeight/letterSpacing)을 Figma 정의와 1:1 매칭.
 *
 * weight (Pretendard):
 * - Regular (400)
 * - Medium (500)
 * - SemiBold (600)
 * - Bold (700)
 */

const parseSize = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return parseFloat(value.replace('px', ''));
};

const parseLetterSpacing = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const num = parseFloat(value.replace(/px|%/g, ''));
  if (typeof value === 'string' && value.includes('%')) return num / 100;
  return num;
};

// Weight → fontFamily 매핑 (네이티브에서 weight별 폰트 파일 선택)
const FONT: Record<number, string> = {
  400: 'Pretendard-Regular',
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
};

// 모든 Typography preset에 공통 적용 (Android에서 텍스트 내려앉는 현상 방지)
const BASE = {
  includeFontPadding: false,
  textTransform: 'none' as const,
  // RN Web은 축약형 textDecoration을 거부한다 ("Please use long-form properties").
  // 이 BASE는 모든 텍스트·입력이 쓰므로, 거부되면 스타일이 통째로 무시돼
  // 입력이 화면에서 사라진다. 반드시 long-form으로 둘 것.
  textDecorationLine: 'none' as const,
};

// Pretendard 는 정상 베이스라인 메트릭. 별도 보정 불필요.
export const FONT_BASELINE_OFFSET = 0;

// ---- Figma 매칭 Typography ramp ----
// 각 레벨은 Figma 의 'bold' variant 을 기본 weight 로 사용.
// 'regular' variant 은 동일 size/lineHeight/letterSpacing 에서 fontWeight/fontFamily 만 변경.

export const Typography = {
  display: {
    // Figma: display-large/bold (Pretendard Bold 56/64 -0.6)
    large: {
      fontFamily: FONT[700],
      fontSize: parseSize('56px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('-0.6px'),
      lineHeight: parseSize('64px'),
      ...BASE,
    },
    // Figma: display-medium/bold (Bold 40/48 -0.6)
    medium: {
      fontFamily: FONT[700],
      fontSize: parseSize('40px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('-0.6px'),
      lineHeight: parseSize('48px'),
      ...BASE,
    },
    // Figma: display-small/bold (Bold 36/44 -0.4)
    small: {
      fontFamily: FONT[700],
      fontSize: parseSize('36px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('-0.4px'),
      lineHeight: parseSize('44px'),
      ...BASE,
    },
  },
  headline: {
    // Figma: headline-large/bold (Bold 28/36 -0.4)
    large: {
      fontFamily: FONT[700],
      fontSize: parseSize('28px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('-0.4px'),
      lineHeight: parseSize('36px'),
      ...BASE,
    },
    // Figma: headline-medium/bold (Bold 24/30 -0.4)
    medium: {
      fontFamily: FONT[700],
      fontSize: parseSize('24px'),
      fontWeight: '700' as const,
      letterSpacing: parseLetterSpacing('-0.4px'),
      lineHeight: parseSize('30px'),
      ...BASE,
    },
    // Figma: headline-small/bold (SemiBold 22/28 -0.2)
    small: {
      fontFamily: FONT[600],
      fontSize: parseSize('22px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('-0.2px'),
      lineHeight: parseSize('28px'),
      ...BASE,
    },
  },
  title: {
    // Figma: title-large/bold (SemiBold 20/26 -0.2)
    large: {
      fontFamily: FONT[600],
      fontSize: parseSize('20px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('-0.2px'),
      lineHeight: parseSize('26px'),
      ...BASE,
    },
    // Figma: title-medium/bold (SemiBold 16/22 0)
    medium: {
      fontFamily: FONT[600],
      fontSize: parseSize('16px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('22px'),
      ...BASE,
    },
    // Figma 에는 title-small 없음 — body-small/bold (SemiBold 14/18 0.2) 매핑
    small: {
      fontFamily: FONT[600],
      fontSize: parseSize('14px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('18px'),
      ...BASE,
    },
  },
  // V1 호환: label.* 은 컴팩트 라벨/액션 텍스트용. Figma body-medium/small + caption 와 매핑.
  label: {
    // Figma: body-medium/bold (SemiBold 15/20 0.2)
    'xlarge - semibold': {
      fontFamily: FONT[600],
      fontSize: parseSize('15px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('20px'),
      ...BASE,
    },
    // Figma: body-medium/regular @ Medium weight (15/20 0.2)
    xlarge: {
      fontFamily: FONT[500],
      fontSize: parseSize('15px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('20px'),
      ...BASE,
    },
    // Figma: body-small/bold (SemiBold 14/18 0.2)
    'large - semibold': {
      fontFamily: FONT[600],
      fontSize: parseSize('14px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('18px'),
      ...BASE,
    },
    // Figma: body-small @ Medium (14/18 0.2)
    large: {
      fontFamily: FONT[500],
      fontSize: parseSize('14px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('18px'),
      ...BASE,
    },
    // Figma: caption-large/bold (SemiBold 12/16 0.2)
    'medium - semibold': {
      fontFamily: FONT[600],
      fontSize: parseSize('12px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('16px'),
      ...BASE,
    },
    // Figma: caption-large/bold (동일)
    medium: {
      fontFamily: FONT[600],
      fontSize: parseSize('12px'),
      fontWeight: '600' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('16px'),
      ...BASE,
    },
    // Figma: caption-medium @ Medium (11/14 0.2)
    small: {
      fontFamily: FONT[500],
      fontSize: parseSize('11px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('14px'),
      ...BASE,
    },
  },
  body: {
    // Figma: title-large/regular @ Medium (20/26 -0.2)
    xxlarge: {
      fontFamily: FONT[500],
      fontSize: parseSize('20px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('-0.2px'),
      lineHeight: parseSize('26px'),
      ...BASE,
    },
    // Figma: title-medium/regular @ Medium (18/24 0)
    xlarge: {
      fontFamily: FONT[500],
      fontSize: parseSize('18px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('24px'),
      ...BASE,
    },
    // Figma: body-large @ Medium (16/22 0)
    large: {
      fontFamily: FONT[500],
      fontSize: parseSize('16px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0px'),
      lineHeight: parseSize('22px'),
      ...BASE,
    },
    // Figma: body-medium/regular @ Medium (15/20 0.2)
    medium: {
      fontFamily: FONT[500],
      fontSize: parseSize('15px'),
      fontWeight: '500' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('20px'),
      ...BASE,
    },
    // Figma: body-small/regular (Regular 14/18 0.2)
    small: {
      fontFamily: FONT[400],
      fontSize: parseSize('14px'),
      fontWeight: '400' as const,
      letterSpacing: parseLetterSpacing('0.2px'),
      lineHeight: parseSize('18px'),
      ...BASE,
    },
  },
} as const;

export type TypographyKey = keyof typeof Typography;
export type DisplayKey = keyof typeof Typography.display;
export type HeadlineKey = keyof typeof Typography.headline;
export type LabelKey = keyof typeof Typography.label;
export type TitleKey = keyof typeof Typography.title;
export type BodyKey = keyof typeof Typography.body;
