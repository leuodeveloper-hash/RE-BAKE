/**
 * V2 Typography — Figma 동기화 (Pretendard 기반)
 * Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd
 *
 * 한글 최적화를 위해 IBM Plex Sans → Pretendard 로 전환.
 * 정적 weight 파일을 plat. 별로 등록하여 사용:
 * - Pretendard-Regular (400)
 * - Pretendard-Medium (500)
 * - Pretendard-SemiBold (600)
 * - Pretendard-Bold (700)
 *
 * 램프 (Figma `measurement` 컬렉션):
 * - display 1/2/3, headline 1/2/3, subhead 1/2, body 1/2/3, caption 1/2/3
 */

const BASE = {
  includeFontPadding: false,
  textTransform: 'none' as const,
  textDecoration: 'none' as const,
};

// Weight → fontFamily 매핑 (네이티브 weight별 폰트 파일 선택)
export const FONT_V2: Record<number, string> = {
  400: 'Pretendard-Regular',
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
};

// ---- Letter spacing tokens ----

export const LetterSpacingV2 = {
  'minus-large': -0.6,
  'minus-medium': -0.4,
  'minus-small': -0.2,
  none: 0,
  'plus-small': 0.2,
} as const;

// ---- Paragraph spacing tokens ----

export const ParagraphSpacingV2 = {
  none: 0,
  'body-1': 12,
  'body-2': 10,
  'body-3': 8,
  'caption-1': 6,
  'caption-2': 4,
} as const;

// ---- Typography ramp ----
// 각 프리셋은 기본 weight를 가짐. 필요 시 fontFamily/fontWeight override 가능.

export const TypographyV2 = {
  display: {
    1: {
      fontFamily: FONT_V2[700],
      fontSize: 56,
      fontWeight: '700' as const,
      lineHeight: 64,
      letterSpacing: LetterSpacingV2['minus-large'],
      ...BASE,
    },
    2: {
      fontFamily: FONT_V2[700],
      fontSize: 40,
      fontWeight: '700' as const,
      lineHeight: 48,
      letterSpacing: LetterSpacingV2['minus-medium'],
      ...BASE,
    },
    3: {
      fontFamily: FONT_V2[700],
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
      letterSpacing: LetterSpacingV2['minus-medium'],
      ...BASE,
    },
  },
  headline: {
    1: {
      fontFamily: FONT_V2[700],
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: LetterSpacingV2['minus-medium'],
      ...BASE,
    },
    2: {
      fontFamily: FONT_V2[700],
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 30,
      letterSpacing: LetterSpacingV2['minus-medium'],
      ...BASE,
    },
    3: {
      fontFamily: FONT_V2[600],
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: LetterSpacingV2['minus-medium'],
      ...BASE,
    },
  },
  subhead: {
    1: {
      fontFamily: FONT_V2[600],
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 26,
      letterSpacing: LetterSpacingV2['minus-small'],
      ...BASE,
    },
    2: {
      fontFamily: FONT_V2[600],
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: LetterSpacingV2['minus-small'],
      ...BASE,
    },
  },
  body: {
    1: {
      fontFamily: FONT_V2[400],
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
      letterSpacing: LetterSpacingV2['minus-small'],
      ...BASE,
    },
    2: {
      fontFamily: FONT_V2[400],
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: LetterSpacingV2['minus-small'],
      ...BASE,
    },
    3: {
      fontFamily: FONT_V2[400],
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 18,
      letterSpacing: LetterSpacingV2.none,
      ...BASE,
    },
  },
  caption: {
    1: {
      fontFamily: FONT_V2[500],
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: LetterSpacingV2.none,
      ...BASE,
    },
    2: {
      fontFamily: FONT_V2[500],
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 14,
      letterSpacing: LetterSpacingV2['plus-small'],
      ...BASE,
    },
    3: {
      fontFamily: FONT_V2[500],
      fontSize: 10,
      fontWeight: '500' as const,
      lineHeight: 12,
      letterSpacing: LetterSpacingV2['plus-small'],
      ...BASE,
    },
  },
} as const;

// ---- Weight override 헬퍼 ----
// 같은 사이즈/라인 높이에서 weight만 다르게 쓰고 싶을 때 사용.
//
// const semibold = withWeightV2(TypographyV2.body[1], 600);

export function withWeightV2<T extends {fontFamily: string; fontWeight: string}>(
  preset: T,
  weight: 400 | 500 | 600 | 700,
): T {
  return {
    ...preset,
    fontFamily: FONT_V2[weight],
    fontWeight: String(weight) as T['fontWeight'],
  };
}
