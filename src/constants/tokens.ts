/**
 * Figma 디자인 토큰 — 단일 파일 (색상 + Radius + Opacity + Effect + OS)
 *
 * 이 파일 하나에 V1/V2 토큰이 모두 들어있습니다. (구 tokensV2.ts 통합됨)
 * - V1: BaseColors / PrimitiveColors / SemanticColorsLight·Dark / Radius / withOpacity
 * - V2: PrimitiveColors / SemanticColorsLight·Dark / RadiusV2 / OpacityV2 / EffectV2 / OSV2
 *   (V2 심볼은 전부 `V2` 접미사 — V1과 이름 충돌 없음)
 *
 * Figma 변수 이름을 최대한 유지해서, 디자인과 코드가 1:1로 매칭되도록 구성했습니다.
 */

// ---- Helper: 베이스 컬러에 투명도 적용 ----

/**
 * Hex 컬러에 투명도를 적용하여 rgba 문자열 반환
 * @param hex - 6자리 hex 컬러 (예: '#80A109')
 * @param opacity - 0~1 사이의 투명도 값
 */
export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---- Primitive color tokens (base) ----

export const BaseColors = {
  // Greys
  'color-base-black': '#000000',
  'color-base-white': '#FFFFFF',
  'color-base-grey-2': '#FDFDFE',
  'color-base-grey-5': '#FCFCFD',
  'color-base-grey-8': '#F7F7FA',
  'color-base-grey-10': '#F3F4F6',
  'color-base-grey-20': '#ECEEF2',
  'color-base-grey-30': '#E3E5EA',
  'color-base-grey-40': '#D6D8E0',
  'color-base-grey-50': '#C2C4CF',
  'color-base-grey-60': '#A5A7B5',
  'color-base-grey-70': '#8B8E9C',
  'color-base-grey-80': '#6E7280',
  'color-base-grey-90': '#4E525E',
  'color-base-grey-95': '#3B3F48',
  'color-base-grey-96': '#2F333A',
  'color-base-grey-98': '#1F2126',
  'color-base-grey-99': '#121318',

  // Warm grey (미세 웜톤 — 무채색 대비 R≥G≥B 1~2 차이)
  'color-base-warmgrey-2': '#FEFEFD',
  'color-base-warmgrey-5': '#FDFCFC',
  'color-base-warmgrey-8': '#F9F9F8',
  'color-base-warmgrey-10': '#F5F5F3',
  'color-base-warmgrey-20': '#EFEEEC',
  'color-base-warmgrey-30': '#E7E6E4',
  'color-base-warmgrey-40': '#DCDBD9',
  'color-base-warmgrey-50': '#C8C7C5',
  'color-base-warmgrey-60': '#AFAEAC',
  'color-base-warmgrey-70': '#939291',
  'color-base-warmgrey-80': '#777675',
  'color-base-warmgrey-90': '#575655',
  'color-base-warmgrey-95': '#424140',
  'color-base-warmgrey-96': '#373635',
  'color-base-warmgrey-98': '#242322',
  'color-base-warmgrey-99': '#161514',

  // Grey brown
  'color-base-greybrown-5': '#FDFDFC',
  'color-base-greybrown-10': '#FAF9F8',
  'color-base-greybrown-20': '#F1F0EC',
  'color-base-greybrown-30': '#EAE7E2',
  'color-base-greybrown-40': '#E2DFD8',
  'color-base-greybrown-50': '#DAD5CB',
  'color-base-greybrown-60': '#CFC8BB',
  'color-base-greybrown-70': '#BCB3A2',
  'color-base-greybrown-80': '#948A78',
  'color-base-greybrown-90': '#877E6E',
  'color-base-greybrown-95': '#6A6457',
  'color-base-greybrown-99': '#2C2A26',

  // Brown
  'color-base-brown-5': '#FAF7F4',
  'color-base-brown-10': '#F2EBE3',
  'color-base-brown-20': '#E0D0BB',
  'color-base-brown-30': '#CDB593',
  'color-base-brown-40': '#BB9A6B',
  'color-base-brown-50': '#A87F43',
  'color-base-brown-60': '#956B2B',
  'color-base-brown-70': '#835D21',
  'color-base-brown-80': '#7C5727',
  'color-base-brown-90': '#644620',
  'color-base-brown-95': '#4C3518',
  'color-base-brown-99': '#332410',

  // Dark red
  'color-base-darkred-5': '#FAF5F6',
  'color-base-darkred-10': '#F2E6E8',
  'color-base-darkred-20': '#DFC2C7',
  'color-base-darkred-30': '#CC9EA6',
  'color-base-darkred-40': '#B97A85',
  'color-base-darkred-50': '#A65664',
  'color-base-darkred-60': '#933243',
  'color-base-darkred-70': '#7A2234',
  'color-base-darkred-80': '#61131B',
  'color-base-darkred-90': '#4E0F16',
  'color-base-darkred-95': '#3B0B11',
  'color-base-darkred-99': '#28080B',

  // Red
  'color-base-red-5': '#FEF6F5',
  'color-base-red-10': '#FCE8E6',
  'color-base-red-20': '#F7C4BF',
  'color-base-red-30': '#F2A098',
  'color-base-red-40': '#ED7C71',
  'color-base-red-50': '#E8584A',
  'color-base-red-60': '#D4402F',
  'color-base-red-70': '#C23829',
  'color-base-red-80': '#BB332A',
  'color-base-red-90': '#962922',
  'color-base-red-95': '#711F19',
  'color-base-red-99': '#4B1511',

  // Orange
  'color-base-orange-5': '#FEF8F4',
  'color-base-orange-10': '#FCEEE3',
  'color-base-orange-20': '#F8D4B8',
  'color-base-orange-30': '#F4BA8D',
  'color-base-orange-40': '#F0A062',
  'color-base-orange-50': '#EC8637',
  'color-base-orange-60': '#E86C0C',
  'color-base-orange-70': '#D65E00',
  'color-base-orange-80': '#CA5100',
  'color-base-orange-90': '#A24100',
  'color-base-orange-95': '#7A3100',
  'color-base-orange-99': '#512000',

  // Lime
  'color-base-lime-5': '#FDFCF5',
  'color-base-lime-10': '#FAF8E6',
  'color-base-lime-20': '#F3EFC2',
  'color-base-lime-30': '#ECE69E',
  'color-base-lime-40': '#E5DD7A',
  'color-base-lime-50': '#DED456',
  'color-base-lime-60': '#D7CB32',
  'color-base-lime-70': '#CFC219',
  'color-base-lime-80': '#BFAC27',
  'color-base-lime-90': '#998A1F',
  'color-base-lime-95': '#736717',
  'color-base-lime-99': '#4D4510',

  // Yellow
  'color-base-yellow-5': '#FEFBF7',
  'color-base-yellow-10': '#FDF5EA',
  'color-base-yellow-20': '#F9E7CA',
  'color-base-yellow-30': '#F5D9AA',
  'color-base-yellow-40': '#F1CB8A',
  'color-base-yellow-50': '#EDBD6A',
  'color-base-yellow-60': '#E9AF4A',
  'color-base-yellow-70': '#E5A13A',
  'color-base-yellow-80': '#DBA04C',
  'color-base-yellow-90': '#B0803D',
  'color-base-yellow-95': '#84602E',
  'color-base-yellow-99': '#58401E',

  // Green
  'color-base-green-5': '#F9FCF4',
  'color-base-green-10': '#F0F7E3',
  'color-base-green-20': '#DAEDB8',
  'color-base-green-30': '#C4E38D',
  'color-base-green-40': '#AED962',
  'color-base-green-50': '#98CF37',
  'color-base-green-60': '#8CC50C',
  'color-base-green-70': '#86B509',
  'color-base-green-80': '#80A109',
  'color-base-green-90': '#668107',
  'color-base-green-95': '#4D6105',
  'color-base-green-99': '#334104',

  // Teal
  'color-base-teal-5': '#F5FCFB',
  'color-base-teal-10': '#E6F7F5',
  'color-base-teal-20': '#C2ECE8',
  'color-base-teal-30': '#9EE1DB',
  'color-base-teal-40': '#7AD6CE',
  'color-base-teal-50': '#56CBC1',
  'color-base-teal-60': '#32C0B4',
  'color-base-teal-70': '#2BB0A5',
  'color-base-teal-80': '#29A195',
  'color-base-teal-90': '#218178',
  'color-base-teal-95': '#19615A',
  'color-base-teal-99': '#11403C',

  // Blue
  'color-base-blue-5': '#F5F8FC',
  'color-base-blue-10': '#E6EEF7',
  'color-base-blue-20': '#C2D4EB',
  'color-base-blue-30': '#9EBADF',
  'color-base-blue-40': '#7AA0D3',
  'color-base-blue-50': '#5686C7',
  'color-base-blue-60': '#326CBB',
  'color-base-blue-70': '#2559A5',
  'color-base-blue-80': '#1C4387',
  'color-base-blue-90': '#16366C',
  'color-base-blue-95': '#112851',
  'color-base-blue-99': '#0B1B36',

  // Light blue
  'color-base-lightblue-5': '#FAFBFE',
  'color-base-lightblue-10': '#F2F4FD',
  'color-base-lightblue-20': '#DCE1FB',
  'color-base-lightblue-30': '#C6CEF9',
  'color-base-lightblue-40': '#B0BBF7',
  'color-base-lightblue-50': '#9AA8F5',
  'color-base-lightblue-60': '#8495F3',
  'color-base-lightblue-70': '#7E8CF1',
  'color-base-lightblue-80': '#7C88EF',
  'color-base-lightblue-90': '#636DBF',
  'color-base-lightblue-95': '#4A528F',
  'color-base-lightblue-99': '#32375F',

  // Purple
  'color-base-purple-5': '#F9F6FC',
  'color-base-purple-10': '#F0E9F7',
  'color-base-purple-20': '#D9C7EB',
  'color-base-purple-30': '#C2A5DF',
  'color-base-purple-40': '#AB83D3',
  'color-base-purple-50': '#9461C7',
  'color-base-purple-60': '#7D3FBB',
  'color-base-purple-70': '#6E34A8',
  'color-base-purple-80': '#60329A',
  'color-base-purple-90': '#4D287B',
  'color-base-purple-98': '#3A1E5C',
  'color-base-purple-99': '#27143E',

  // Lavender
  'color-base-lavender-5': '#FCF9FD',
  'color-base-lavender-10': '#F7F0F9',
  'color-base-lavender-20': '#EAD9F1',
  'color-base-lavender-30': '#DDC2E9',
  'color-base-lavender-40': '#D0ABE1',
  'color-base-lavender-50': '#C394D9',
  'color-base-lavender-60': '#B67DD1',
  'color-base-lavender-70': '#AF76C7',
  'color-base-lavender-80': '#A370BA',
  'color-base-lavender-90': '#825A95',
  'color-base-lavender-98': '#624370',
  'color-base-lavender-99': '#412D4A',
} as const;

export type BaseColorKey = keyof typeof BaseColors;

// ---- Derived primitive scales (primary / neutral / accent / error) ----


export type PrimitiveColorKey = keyof typeof PrimitiveColors;

// ---- Semantic tokens: Light mode ----


export type SemanticLightKey = keyof typeof SemanticColorsLight;

// ---- Semantic tokens: Dark mode ----


export type SemanticDarkKey = keyof typeof SemanticColorsDark;

// ---- Measurements: radius ----

export const Radius = {
  'radius-xs': 4,
  'radius-sm': 8,
  'radius-md': 12,
  'radius-lg': 16,
  'radius-xl': 24,
  'radius-full': 999,
} as const;

export type RadiusKey = keyof typeof Radius;



// ============================================================
// V2 Design Tokens — Figma 동기화 (2-tier: Primitive → Semantic)
// Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd
// (구 tokensV2.ts 통합 — 색/Radius/Opacity/Effect/OS 전부 이 파일 하나)
// ============================================================
// ---- Helper ----

export function withOpacityV2(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---- Primitive colors (Figma `primitive` collection, single mode) ----

export const PrimitiveColors = {
  // Mono
  'mono/0': '#000000',
  'mono/100': '#FFFFFF',

  // Neutral (mono-tone grey)
  'neutral/4': '#0E0E0D',
  'neutral/8': '#191817',
  'neutral/12': '#21201F',
  'neutral/16': '#292827',
  'neutral/20': '#31302E',
  'neutral/30': '#484745',
  'neutral/40': '#5F5E5C',
  'neutral/50': '#787775',
  'neutral/60': '#92918F',
  'neutral/70': '#ACABA9',
  'neutral/80': '#C7C6C4',
  'neutral/90': '#E3E2E0',
  'neutral/94': '#EFEEEC',
  'neutral/95': '#F2F1EF', // surface/dim 살짝 밝힌 웜그레이
  'neutral/96': '#F4F3F1',
  'neutral/98': '#FAF9F7',

  // Grey-brown (warm grey)
  // 웜톤 조정: 전체 램프 hue +10° (와인색 유지하며 더 따뜻하게)
  'burgundy/4': '#5B1A20',
  'burgundy/8': '#74252C',
  'burgundy/12': '#862D34',
  'burgundy/16': '#97353E',
  'burgundy/20': '#A43D45',
  'burgundy/30': '#C05D65',
  'burgundy/40': '#CD848A',
  'burgundy/50': '#D79DA2',
  'burgundy/60': '#E1B7BA',
  'burgundy/70': '#EACCCF',
  'burgundy/80': '#F0DBDC',
  'burgundy/90': '#F6EAEB',
  'burgundy/94': '#F9F1F2',
  'burgundy/96': '#FAF5F5',
  'burgundy/98': '#FCF8F8',

  // Brown
  'brown/4': '#120E07',
  'brown/8': '#21180C',
  'brown/12': '#2B2010',
  'brown/16': '#362814',
  'brown/20': '#413018',
  'brown/30': '#5F4724',
  'brown/40': '#7D5E30',
  'brown/50': '#9E773D',
  'brown/60': '#B5915A',
  'brown/70': '#C6AB80',
  'brown/80': '#D9C6A8',
  'brown/90': '#ECE2D1',
  'brown/94': '#F4EEE3',
  'brown/96': '#F7F3EA',
  'brown/98': '#FCF9F3',

  // Cream (Claude 미색 — 따뜻한 아이보리/미색, 저채도 warm hue)
  'cream/4': '#14110A',
  'cream/8': '#211C11',
  'cream/12': '#2C2617',
  'cream/16': '#37301D',
  'cream/20': '#423A24',
  'cream/30': '#625636',
  'cream/40': '#83744B',
  'cream/50': '#A49166',
  'cream/60': '#BFAE88',
  'cream/70': '#D3C6A9',
  'cream/80': '#E3DAC5',
  'cream/90': '#EFE9DB',
  'cream/94': '#F5F1E7',
  'cream/96': '#F8F5ED',
  'cream/98': '#FBF9F3', // = Claude 메인 배경 미색

  // Red
  'red/4': '#15090A',
  'red/8': '#260E11',
  'red/12': '#321217',
  'red/16': '#3E1515',
  'red/20': '#521719',
  'red/30': '#772122',
  'red/40': '#9F2B2C',
  'red/50': '#C93839',
  'red/60': '#ED4B49',
  'red/70': '#F17E78',
  'red/80': '#F4A9A5',
  'red/90': '#F9D2D3',
  'red/94': '#FBE2E5',
  'red/96': '#FCEAEE',
  'red/98': '#FDF4F8',

  // Orange
  'orange/4': '#1A0A00',
  'orange/8': '#2E1200',
  'orange/12': '#3B1800',
  'orange/16': '#4A1E00',
  'orange/20': '#572300',
  'orange/30': '#7F3300',
  'orange/40': '#A94400',
  'orange/50': '#D45500',
  'orange/60': '#EC6D18',
  'orange/70': '#FF9249',
  'orange/80': '#FFB889',
  'orange/90': '#FFDDC6',
  'orange/94': '#FFE9DB',
  'orange/96': '#FFF1E8',
  'orange/98': '#FFF8F3',

  // Yellow — 채도 아주 약간 낮춤 (전체 램프 ×0.95)
  'yellow/4': '#3C2202',
  'yellow/8': '#4E2E02',
  'yellow/12': '#5C3702',
  'yellow/16': '#674003',
  'yellow/20': '#724803',
  'yellow/30': '#946104',
  'yellow/40': '#B37905',
  'yellow/50': '#D79406',
  'yellow/60': '#ECAF1B',
  'yellow/70': '#FAC742',
  'yellow/80': '#FCDA79',
  'yellow/90': '#FDE9AA',
  'yellow/94': '#FEF0C4',
  'yellow/96': '#FEF6D8',
  'yellow/98': '#FEFBEB',

  // Lime (브랜드 액센트 컬러)
  'lime/4': '#0B1400',
  'lime/8': '#131F00',
  'lime/12': '#131F00',
  'lime/16': '#1B2A00',
  'lime/20': '#243600',
  'lime/30': '#364E00',
  'lime/40': '#496800',
  'lime/50': '#5C8300',
  'lime/60': '#729E11',
  'lime/70': '#8CBA31',
  'lime/80': '#AED369',
  'lime/90': '#C9F082',
  'lime/94': '#DCF8A5',
  'lime/96': '#E8FBBF',
  'lime/98': '#F5FEDC',

  // Green
  'green/4': '#0A1009',
  'green/8': '#111A11',
  'green/12': '#112317',
  'green/16': '#102D1E',
  'green/20': '#103822',
  'green/30': '#155136',
  'green/40': '#196C49',
  'green/50': '#1E875F',
  'green/60': '#21A56B',
  'green/70': '#40C184',
  'green/80': '#75D9A2',
  'green/90': '#ACEEC1',
  'green/94': '#C6F7D2',
  'green/96': '#D8FADD',
  'green/98': '#ECFBEB',

  // Light-blue
  'light-blue/4': '#080F13',
  'light-blue/8': '#0C1A20',
  'light-blue/12': '#08222D',
  'light-blue/16': '#0D2B3A',
  'light-blue/20': '#00344C',
  'light-blue/30': '#004C6C',
  'light-blue/40': '#00658E',
  'light-blue/50': '#007FB1',
  'light-blue/60': '#009BD6',
  'light-blue/70': '#3FB5F2',
  'light-blue/80': '#83CFFF',
  'light-blue/90': '#C6E7FF',
  'light-blue/94': '#DEF0FF',
  'light-blue/96': '#E9F5FF',
  'light-blue/98': '#F6FAFF',

  // Blue
  'blue/4': '#0B0D11',
  'blue/8': '#121620',
  'blue/12': '#141D2F',
  'blue/16': '#15233F',
  'blue/20': '#162B52',
  'blue/30': '#183E7F',
  'blue/40': '#1E54A8',
  'blue/50': '#296ACE',
  'blue/60': '#4784EC',
  'blue/70': '#78A0EF',
  'blue/80': '#A4BDF2',
  'blue/90': '#D2DCF6',
  'blue/94': '#E5E8F8',
  'blue/96': '#EFF0F9',
  'blue/98': '#F9F7FA',

  // Purple
  'purple/4': '#1D0934',
  'purple/8': '#1D1327',
  'purple/12': '#261A32',
  'purple/16': '#311D43',
  'purple/20': '#3F2458',
  'purple/30': '#5E3087',
  'purple/40': '#7D42B1',
  'purple/50': '#9857D6',
  'purple/60': '#B471F2',
  'purple/70': '#C896F5',
  'purple/80': '#DCB9F7',
  'purple/90': '#EFDBFB',
  'purple/94': '#F6E9FC',
  'purple/96': '#FBF1FD',
  'purple/98': '#FEF7FD',
} as const;

export type PrimitiveColorV2Key = keyof typeof PrimitiveColors;

// ---- Semantic colors: Light mode ----

const P = PrimitiveColors;

export const SemanticColorsLight = {
  // Background
  'background/primary': P['neutral/4'],
  'background/primary-container': withOpacityV2(P['neutral/4'], 0.16),
  'background/accent': P['lime/70'],
  'background/accent-container': withOpacityV2(P['lime/70'], 0.16),
  'background/negative': P['red/50'],
  'background/negative-container': withOpacityV2(P['red/50'], 0.16),
  'background/secondary': P['green/40'],
  'background/secondary-container': withOpacityV2(P['green/20'], 0.16),

  // Surface
  'surface/normal': P['neutral/98'],
  'surface/dim': P['neutral/95'],
  'surface/bright': P['mono/100'],
  'surface/container': P['neutral/96'],
  'surface/container-high': P['neutral/94'],
  'surface/container-highest': P['neutral/90'],
  'surface/inverse': P['neutral/8'],

  // Foreground
  'foreground/on-primary': P['neutral/98'],
  'foreground/accent': P['lime/60'],
  'foreground/on-accent': P['lime/16'],
  'foreground/on-accent-container': P['lime/40'],
  'foreground/negative': P['red/50'],
  'foreground/on-negative': P['red/98'],
  'foreground/on-negative-container': P['red/50'],
  'foreground/positive': P['lime/50'],
  'foreground/on-positive': P['lime/98'],
  'foreground/on-positive-container': P['lime/40'],
  'foreground/secondary': P['green/30'],
  'foreground/on-secondary': P['green/98'],
  'foreground/on-surface': P['neutral/4'],
  'foreground/on-surface-fixed': P['neutral/4'],
  'foreground/on-surface-var': withOpacityV2(P['neutral/4'], 0.52),
  'foreground/on-surface-muted': withOpacityV2(P['neutral/4'], 0.32),
  'foreground/on-surface-disabled': withOpacityV2(P['neutral/4'], 0.16),
  'foreground/on-surface-inverse': P['neutral/98'],
  'foreground/on-surface-inverse-var': withOpacityV2(P['neutral/98'], 0.52),
  'foreground/on-surface-inverse-muted': withOpacityV2(P['neutral/98'], 0.32),
  'foreground/on-surface-inverse-disabled': withOpacityV2(P['neutral/98'], 0.16),
  'foreground/on-image': P['neutral/98'],
  'foreground/on-image-var': withOpacityV2(P['neutral/98'], 0.52),
  'foreground/on-image-muted': withOpacityV2(P['neutral/98'], 0.32),
  'foreground/on-image-disabled': withOpacityV2(P['neutral/98'], 0.16),

  // Fill
  'fill/faint': withOpacityV2(P['neutral/4'], 0.03),
  'fill/subtle': withOpacityV2(P['neutral/4'], 0.06),
  'fill/subtle-inverse': withOpacityV2(P['neutral/98'], 0.06),
  'fill/normal': withOpacityV2(P['neutral/4'], 0.08),
  'fill/strong': withOpacityV2(P['neutral/4'], 0.12),
  'fill/accent': withOpacityV2(P['lime/60'], 0.12),
  'fill/negative': withOpacityV2(P['red/50'], 0.12),
  'fill/glass-normal': 'rgba(255, 255, 255, 0.72)',

  // State
  'state/hover': withOpacityV2(P['neutral/4'], 0.06),
  'state/pressed': withOpacityV2(P['neutral/4'], 0.08),
  'state/accent': withOpacityV2(P['lime/70'], 0.12),
  'state/negative': withOpacityV2(P['red/50'], 0.12),

  // Border
  'border/strong': P['neutral/50'],
  'border/normal': withOpacityV2(P['neutral/50'], 0.24),
  'border/muted': withOpacityV2(P['neutral/50'], 0.10),
  'border/subtle': withOpacityV2(P['neutral/50'], 0.16),
  'border/negative': P['red/50'],
  'border/negative-subtle': withOpacityV2(P['red/50'], 0.12),
  'border/accent': P['lime/60'],
  'border/accent-subtle': withOpacityV2(P['lime/60'], 0.12),
  'border/success': P['green/50'],

  // Custom hue (12 hues × 5 variants). on-container = subtle 배경 위 글씨용 진한 색(/70).
  'custom/green': P['green/50'],
  'custom/green-var': withOpacityV2(P['green/50'], 0.64),
  'custom/green-subtle': withOpacityV2(P['green/50'], 0.16),
  'custom/green-border': withOpacityV2(P['green/50'], 0.12),
  'custom/green-on-container': P['green/70'],
  'custom/lime': P['lime/60'],
  'custom/lime-var': withOpacityV2(P['lime/60'], 0.64),
  'custom/lime-subtle': withOpacityV2(P['lime/60'], 0.16),
  'custom/lime-border': withOpacityV2(P['lime/60'], 0.12),
  'custom/lime-on-container': P['lime/70'],
  'custom/orange': P['orange/50'],
  'custom/orange-var': withOpacityV2(P['orange/50'], 0.64),
  'custom/orange-subtle': withOpacityV2(P['orange/50'], 0.16),
  'custom/orange-border': withOpacityV2(P['orange/50'], 0.12),
  'custom/orange-on-container': P['orange/70'],
  'custom/yellow': P['yellow/50'],
  'custom/yellow-var': withOpacityV2(P['yellow/50'], 0.64),
  'custom/yellow-subtle': withOpacityV2(P['yellow/50'], 0.16),
  'custom/yellow-border': withOpacityV2(P['yellow/50'], 0.12),
  'custom/yellow-on-container': P['yellow/70'],
  'custom/burgundy': P['burgundy/20'],
  'custom/burgundy-var': withOpacityV2(P['burgundy/20'], 0.64),
  'custom/burgundy-subtle': withOpacityV2(P['burgundy/20'], 0.16),
  'custom/burgundy-border': withOpacityV2(P['burgundy/20'], 0.12),
  'custom/burgundy-on-container': P['burgundy/70'],
  'custom/light-blue': P['light-blue/50'],
  'custom/light-blue-var': withOpacityV2(P['light-blue/50'], 0.64),
  'custom/light-blue-subtle': withOpacityV2(P['light-blue/50'], 0.16),
  'custom/light-blue-border': withOpacityV2(P['light-blue/50'], 0.12),
  'custom/light-blue-on-container': P['light-blue/70'],
  'custom/brown': P['brown/40'],
  'custom/brown-var': withOpacityV2(P['brown/40'], 0.64),
  'custom/brown-subtle': withOpacityV2(P['brown/40'], 0.16),
  'custom/brown-border': withOpacityV2(P['brown/40'], 0.12),
  'custom/brown-on-container': P['brown/70'],
  'custom/red': P['red/50'],
  'custom/red-var': withOpacityV2(P['red/50'], 0.64),
  'custom/red-subtle': withOpacityV2(P['red/50'], 0.16),
  'custom/red-border': withOpacityV2(P['red/50'], 0.12),
  'custom/red-on-container': P['red/70'],
  'custom/purple': P['purple/40'],
  'custom/purple-var': withOpacityV2(P['purple/40'], 0.64),
  'custom/purple-subtle': withOpacityV2(P['purple/40'], 0.16),
  'custom/purple-border': withOpacityV2(P['purple/40'], 0.12),
  'custom/purple-on-container': P['purple/70'],
  'custom/blue': P['blue/40'],
  'custom/blue-var': withOpacityV2(P['blue/40'], 0.64),
  'custom/blue-subtle': withOpacityV2(P['blue/40'], 0.16),
  'custom/blue-border': withOpacityV2(P['blue/40'], 0.12),
  'custom/blue-on-container': P['blue/70'],
  'custom/grey': P['neutral/40'],
  'custom/grey-var': withOpacityV2(P['neutral/40'], 0.64),
  'custom/grey-subtle': withOpacityV2(P['neutral/40'], 0.16),
  'custom/grey-border': withOpacityV2(P['neutral/40'], 0.12),
  'custom/grey-on-container': P['neutral/70'],
  'custom/cream': P['cream/50'],
  'custom/cream-var': withOpacityV2(P['cream/50'], 0.64),
  'custom/cream-subtle': withOpacityV2(P['cream/50'], 0.16),
  'custom/cream-border': withOpacityV2(P['cream/50'], 0.12),
  'custom/cream-on-container': P['cream/70'],

  // Overlay
  'overlay/subtle': withOpacityV2(P['neutral/4'], 0.16),
  'overlay/strong': withOpacityV2(P['neutral/4'], 0.32),
} as const;

export type SemanticV2LightKey = keyof typeof SemanticColorsLight;

// ---- Semantic colors: Dark mode ----

export const SemanticColorsDark = {
  // Background
  'background/primary': P['neutral/98'],
  'background/primary-container': withOpacityV2(P['neutral/98'], 0.16),
  'background/accent': P['lime/70'],
  'background/accent-container': withOpacityV2(P['lime/70'], 0.16),
  'background/negative': P['red/50'],
  'background/negative-container': withOpacityV2(P['red/50'], 0.16),
  'background/secondary': P['green/90'],
  'background/secondary-container': withOpacityV2(P['green/40'], 0.16),

  // Surface
  'surface/normal': P['neutral/8'],
  'surface/dim': P['neutral/4'],
  'surface/bright': P['neutral/12'],
  'surface/container': P['neutral/12'],
  'surface/container-high': P['neutral/16'],
  'surface/container-highest': P['neutral/20'],
  'surface/inverse': P['neutral/96'],

  // Foreground
  'foreground/on-primary': P['neutral/4'],
  'foreground/accent': P['lime/60'],
  'foreground/on-accent': P['lime/16'],
  'foreground/on-accent-container': P['lime/70'],
  'foreground/negative': P['red/50'],
  'foreground/on-negative': P['red/98'],
  'foreground/on-negative-container': P['red/60'],
  'foreground/positive': P['lime/70'],
  'foreground/on-positive': P['lime/98'],
  'foreground/on-positive-container': P['lime/80'],
  'foreground/secondary': P['green/40'],
  'foreground/on-secondary': P['green/98'],
  'foreground/on-surface': P['neutral/98'],
  'foreground/on-surface-fixed': P['neutral/4'],
  'foreground/on-surface-var': withOpacityV2(P['neutral/98'], 0.52),
  'foreground/on-surface-muted': withOpacityV2(P['neutral/98'], 0.32),
  'foreground/on-surface-disabled': withOpacityV2(P['neutral/98'], 0.16),
  'foreground/on-surface-inverse': P['neutral/4'],
  'foreground/on-surface-inverse-var': withOpacityV2(P['neutral/4'], 0.52),
  'foreground/on-surface-inverse-muted': withOpacityV2(P['neutral/4'], 0.32),
  'foreground/on-surface-inverse-disabled': withOpacityV2(P['neutral/4'], 0.16),
  'foreground/on-image': P['neutral/98'],
  'foreground/on-image-var': withOpacityV2(P['neutral/98'], 0.52),
  'foreground/on-image-muted': withOpacityV2(P['neutral/98'], 0.32),
  'foreground/on-image-disabled': withOpacityV2(P['neutral/98'], 0.16),

  // Fill
  'fill/faint': withOpacityV2(P['neutral/98'], 0.03),
  'fill/subtle': withOpacityV2(P['neutral/98'], 0.06),
  'fill/subtle-inverse': withOpacityV2(P['neutral/4'], 0.06),
  'fill/normal': withOpacityV2(P['neutral/98'], 0.08),
  'fill/strong': withOpacityV2(P['neutral/98'], 0.12),
  'fill/accent': withOpacityV2(P['lime/60'], 0.16),
  'fill/negative': withOpacityV2(P['red/50'], 0.16),
  'fill/glass-normal': 'rgba(255, 255, 255, 0.04)',

  // State
  'state/hover': withOpacityV2(P['neutral/98'], 0.06),
  'state/pressed': withOpacityV2(P['neutral/98'], 0.08),
  'state/accent': withOpacityV2(P['lime/70'], 0.16),
  'state/negative': withOpacityV2(P['red/50'], 0.16),

  // Border
  'border/strong': P['neutral/50'],
  'border/normal': withOpacityV2(P['neutral/50'], 0.24),
  'border/muted': withOpacityV2(P['neutral/50'], 0.10),
  'border/subtle': withOpacityV2(P['neutral/50'], 0.16),
  'border/negative': P['red/50'],
  'border/negative-subtle': withOpacityV2(P['red/50'], 0.12),
  'border/accent': P['lime/60'],
  'border/accent-subtle': withOpacityV2(P['lime/60'], 0.12),
  'border/success': P['green/50'],

  // Custom hue (Dark variants). on-container = subtle 배경 위 글씨용. 다크는 밝은 단계(/30).
  'custom/green': P['green/60'],
  'custom/green-var': withOpacityV2(P['green/60'], 0.64),
  'custom/green-subtle': withOpacityV2(P['green/60'], 0.20),
  'custom/green-border': withOpacityV2(P['green/60'], 0.16),
  'custom/green-on-container': P['green/30'],
  'custom/lime': P['lime/70'],
  'custom/lime-var': withOpacityV2(P['lime/70'], 0.64),
  'custom/lime-subtle': withOpacityV2(P['lime/70'], 0.20),
  'custom/lime-border': withOpacityV2(P['lime/70'], 0.12),
  'custom/lime-on-container': P['lime/30'],
  'custom/orange': P['orange/50'],
  'custom/orange-var': withOpacityV2(P['orange/50'], 0.64),
  'custom/orange-subtle': withOpacityV2(P['orange/50'], 0.20),
  'custom/orange-border': withOpacityV2(P['orange/50'], 0.12),
  'custom/orange-on-container': P['orange/30'],
  'custom/yellow': P['yellow/50'],
  'custom/yellow-var': withOpacityV2(P['yellow/50'], 0.64),
  'custom/yellow-subtle': withOpacityV2(P['yellow/50'], 0.20),
  'custom/yellow-border': withOpacityV2(P['yellow/50'], 0.12),
  'custom/yellow-on-container': P['yellow/30'],
  'custom/burgundy': P['burgundy/20'],
  'custom/burgundy-var': withOpacityV2(P['burgundy/20'], 0.64),
  'custom/burgundy-subtle': withOpacityV2(P['burgundy/20'], 0.20),
  'custom/burgundy-border': withOpacityV2(P['burgundy/20'], 0.12),
  'custom/burgundy-on-container': P['burgundy/40'],
  'custom/light-blue': P['light-blue/50'],
  'custom/light-blue-var': withOpacityV2(P['light-blue/50'], 0.64),
  'custom/light-blue-subtle': withOpacityV2(P['light-blue/50'], 0.20),
  'custom/light-blue-border': withOpacityV2(P['light-blue/50'], 0.12),
  'custom/light-blue-on-container': P['light-blue/30'],
  'custom/brown': P['brown/40'],
  'custom/brown-var': withOpacityV2(P['brown/40'], 0.64),
  'custom/brown-subtle': withOpacityV2(P['brown/40'], 0.20),
  'custom/brown-border': withOpacityV2(P['brown/40'], 0.12),
  'custom/brown-on-container': P['brown/30'],
  'custom/red': P['red/50'],
  'custom/red-var': withOpacityV2(P['red/50'], 0.64),
  'custom/red-subtle': withOpacityV2(P['red/50'], 0.20),
  'custom/red-border': withOpacityV2(P['red/50'], 0.12),
  'custom/red-on-container': P['red/30'],
  'custom/purple': P['purple/40'],
  'custom/purple-var': withOpacityV2(P['purple/40'], 0.64),
  'custom/purple-subtle': withOpacityV2(P['purple/40'], 0.20),
  'custom/purple-border': withOpacityV2(P['purple/40'], 0.12),
  'custom/purple-on-container': P['purple/30'],
  'custom/blue': P['blue/40'],
  'custom/blue-var': withOpacityV2(P['blue/40'], 0.64),
  'custom/blue-subtle': withOpacityV2(P['blue/40'], 0.20),
  'custom/blue-border': withOpacityV2(P['blue/40'], 0.12),
  'custom/blue-on-container': P['blue/30'],
  'custom/grey': P['neutral/60'],
  'custom/grey-var': withOpacityV2(P['neutral/60'], 0.64),
  'custom/grey-subtle': withOpacityV2(P['neutral/60'], 0.20),
  'custom/grey-border': withOpacityV2(P['neutral/60'], 0.12),
  'custom/grey-on-container': P['neutral/30'],
  'custom/cream': P['cream/60'],
  'custom/cream-var': withOpacityV2(P['cream/60'], 0.64),
  'custom/cream-subtle': withOpacityV2(P['cream/60'], 0.20),
  'custom/cream-border': withOpacityV2(P['cream/60'], 0.12),
  'custom/cream-on-container': P['cream/30'],

  // Overlay (둘 다 light/dark에서 동일하게 dark scrim)
  'overlay/subtle': withOpacityV2(P['neutral/4'], 0.16),
  'overlay/strong': withOpacityV2(P['neutral/4'], 0.16),
} as const;

export type SemanticV2DarkKey = keyof typeof SemanticColorsDark;
export type SemanticColors = typeof SemanticColorsLight;

// ---- Radius ----

export const RadiusV2 = {
  'radius/none': 0,
  'radius/xs': 4,
  'radius/sm': 8,
  'radius/md': 12,
  'radius/lg': 16,
  'radius/xl': 20,
  'radius/xxl': 32,
  'radius/full': 1000,
} as const;

export type RadiusV2Key = keyof typeof RadiusV2;

// ---- Opacity (% 단위 — 0 ~ 100) ----

export const OpacityV2 = {
  'opacity/none': 0,
  'opacity/5': 5,
  'opacity/8': 8,
  'opacity/12': 12,
  'opacity/16': 16,
  'opacity/22': 22,
  'opacity/32': 32,
  'opacity/44': 44,
  'opacity/56': 56,
  'opacity/64': 64,
  'opacity/76': 76,
  'opacity/88': 88,
  'opacity/96': 96,
  'opacity/100': 100,
} as const;

export type OpacityV2Key = keyof typeof OpacityV2;

// ---- Effect (blur radius) ----

export const EffectV2 = {
  'effect/none': 0,
  'effect/1': 1,
  'effect/2': 2,
  'effect/4': 4,
  'effect/6': 6,
  'effect/8': 8,
  'effect/12': 12,
  'effect/16': 16,
  'effect/20': 20,
} as const;

export type EffectV2Key = keyof typeof EffectV2;

// ---- OS specific (status bar / home indicator) ----
// iOS / Android 모드별 다른 값. 런타임에 Platform.OS 로 분기해서 사용.

export const OSV2iOS = {
  'sizing/status-bar/normal': 62,
  'sizing/home-indicator/normal': 34,
  'sizing/home-indicator/compact': 22,
} as const;

export const OSV2Android = {
  'sizing/status-bar/normal': 44,
  'sizing/home-indicator/normal': 56,
  'sizing/home-indicator/compact': 24,
} as const;

export type OSV2Key = keyof typeof OSV2iOS;
