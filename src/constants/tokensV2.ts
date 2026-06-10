/**
 * V2 Design Tokens — Figma 동기화 (2-tier: Primitive → Semantic)
 * Source: Figma 파일 SuXlE5Q4KKIG4LJjJ8j6Jd
 *
 * Phase 1: 새 토큰 시스템 — 기존 tokens.ts 와 병행 운영
 * 마이그레이션 완료 후 tokens.ts 는 제거 예정.
 *
 * 구조:
 * - PrimitiveColorsV2: 12 패밀리 × 15 단계 + mono (raw 색상 팔레트)
 * - SemanticColorsV2Light/Dark: 의미 기반 컬러 (Light/Dark 모드)
 * - RadiusV2 / OpacityV2 / EffectV2 / OSV2: 추가 토큰들
 */

// ---- Helper ----

export function withOpacityV2(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---- Primitive colors (Figma `primitive` collection, single mode) ----

export const PrimitiveColorsV2 = {
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
  'neutral/96': '#F4F3F1',
  'neutral/98': '#FAF9F7',

  // Grey-brown (warm grey)
  'grey-brown/4': '#403934',
  'grey-brown/8': '#534B43',
  'grey-brown/12': '#625850',
  'grey-brown/16': '#6F645B',
  'grey-brown/20': '#7B6F65',
  'grey-brown/30': '#9C8E82',
  'grey-brown/40': '#B7A89A',
  'grey-brown/50': '#CABDAE',
  'grey-brown/60': '#D9CEBF',
  'grey-brown/70': '#E7DDCF',
  'grey-brown/80': '#EEE8DD',
  'grey-brown/90': '#F5F1E9',
  'grey-brown/94': '#F8F5EF',
  'grey-brown/96': '#F9F7F2',
  'grey-brown/98': '#FAF9F5',

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
  'orange/4': '#150B09',
  'orange/8': '#26140D',
  'orange/12': '#321911',
  'orange/16': '#411F13',
  'orange/20': '#542113',
  'orange/30': '#78311B',
  'orange/40': '#9B4426',
  'orange/50': '#C6542E',
  'orange/60': '#EC663A',
  'orange/70': '#F7906B',
  'orange/80': '#F9B7A0',
  'orange/90': '#FCDCD1',
  'orange/94': '#FDE9E3',
  'orange/96': '#FEF1ED',
  'orange/98': '#FEF8F5',

  // Yellow
  'yellow/4': '#372600',
  'yellow/8': '#483200',
  'yellow/12': '#573B00',
  'yellow/16': '#644400',
  'yellow/20': '#704C00',
  'yellow/30': '#936500',
  'yellow/40': '#B57C00',
  'yellow/50': '#D09724',
  'yellow/60': '#E6AF3F',
  'yellow/70': '#FAC65C',
  'yellow/80': '#FFD987',
  'yellow/90': '#FFE8B5',
  'yellow/94': '#FFEEC9',
  'yellow/96': '#FFF2D4',
  'yellow/98': '#FFF5DF',

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

export type PrimitiveColorV2Key = keyof typeof PrimitiveColorsV2;

// ---- Semantic colors: Light mode ----

const P = PrimitiveColorsV2;

export const SemanticColorsV2Light = {
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
  'surface/dim': P['neutral/94'],
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
  'border/strong': P['neutral/60'],
  'border/normal': withOpacityV2(P['neutral/60'], 0.24),
  'border/muted': withOpacityV2(P['neutral/60'], 0.10),
  'border/subtle': withOpacityV2(P['neutral/60'], 0.16),
  'border/negative': P['red/50'],
  'border/negative-subtle': withOpacityV2(P['red/50'], 0.12),
  'border/accent': P['lime/60'],
  'border/accent-subtle': withOpacityV2(P['lime/60'], 0.12),
  'border/success': P['green/50'],

  // Custom hue (10 hues × 4 variants)
  'custom/green': P['green/50'],
  'custom/green-var': withOpacityV2(P['green/50'], 0.64),
  'custom/green-subtle': withOpacityV2(P['green/50'], 0.16),
  'custom/green-border': withOpacityV2(P['green/50'], 0.12),
  'custom/lime': P['lime/60'],
  'custom/lime-var': withOpacityV2(P['lime/60'], 0.64),
  'custom/lime-subtle': withOpacityV2(P['lime/60'], 0.16),
  'custom/lime-border': withOpacityV2(P['lime/60'], 0.12),
  'custom/orange': P['orange/50'],
  'custom/orange-var': withOpacityV2(P['orange/50'], 0.64),
  'custom/orange-subtle': withOpacityV2(P['orange/50'], 0.16),
  'custom/orange-border': withOpacityV2(P['orange/50'], 0.12),
  'custom/yellow': P['yellow/40'],
  'custom/yellow-var': withOpacityV2(P['yellow/40'], 0.64),
  'custom/yellow-subtle': withOpacityV2(P['yellow/40'], 0.16),
  'custom/yellow-border': withOpacityV2(P['yellow/40'], 0.12),
  'custom/grey-brown': P['grey-brown/20'],
  'custom/grey-brown-var': withOpacityV2(P['grey-brown/20'], 0.64),
  'custom/grey-brown-subtle': withOpacityV2(P['grey-brown/20'], 0.16),
  'custom/grey-brown-border': withOpacityV2(P['grey-brown/20'], 0.12),
  'custom/light-blue': P['light-blue/50'],
  'custom/light-blue-var': withOpacityV2(P['light-blue/50'], 0.64),
  'custom/light-blue-subtle': withOpacityV2(P['light-blue/50'], 0.16),
  'custom/light-blue-border': withOpacityV2(P['light-blue/50'], 0.12),
  'custom/brown': P['brown/40'],
  'custom/brown-var': withOpacityV2(P['brown/40'], 0.64),
  'custom/brown-subtle': withOpacityV2(P['brown/40'], 0.16),
  'custom/brown-border': withOpacityV2(P['brown/40'], 0.12),
  'custom/red': P['red/50'],
  'custom/red-var': withOpacityV2(P['red/50'], 0.64),
  'custom/red-subtle': withOpacityV2(P['red/50'], 0.16),
  'custom/red-border': withOpacityV2(P['red/50'], 0.12),
  'custom/purple': P['purple/40'],
  'custom/purple-var': withOpacityV2(P['purple/40'], 0.64),
  'custom/purple-subtle': withOpacityV2(P['purple/40'], 0.16),
  'custom/purple-border': withOpacityV2(P['purple/40'], 0.12),
  'custom/blue': P['blue/40'],
  'custom/blue-var': withOpacityV2(P['blue/40'], 0.64),
  'custom/blue-subtle': withOpacityV2(P['blue/40'], 0.16),
  'custom/blue-border': withOpacityV2(P['blue/40'], 0.12),
  'custom/grey': P['neutral/40'],
  'custom/grey-var': withOpacityV2(P['neutral/40'], 0.64),
  'custom/grey-subtle': withOpacityV2(P['neutral/40'], 0.16),
  'custom/grey-border': withOpacityV2(P['neutral/40'], 0.12),

  // Overlay
  'overlay/subtle': withOpacityV2(P['neutral/4'], 0.16),
  'overlay/strong': withOpacityV2(P['neutral/4'], 0.32),
} as const;

export type SemanticV2LightKey = keyof typeof SemanticColorsV2Light;

// ---- Semantic colors: Dark mode ----

export const SemanticColorsV2Dark = {
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
  'border/strong': P['neutral/40'],
  'border/normal': withOpacityV2(P['neutral/40'], 0.24),
  'border/muted': withOpacityV2(P['neutral/40'], 0.10),
  'border/subtle': withOpacityV2(P['neutral/40'], 0.16),
  'border/negative': P['red/50'],
  'border/negative-subtle': withOpacityV2(P['red/50'], 0.12),
  'border/accent': P['lime/60'],
  'border/accent-subtle': withOpacityV2(P['lime/60'], 0.12),
  'border/success': P['green/50'],

  // Custom hue (Dark variants)
  'custom/green': P['green/60'],
  'custom/green-var': withOpacityV2(P['green/60'], 0.64),
  'custom/green-subtle': withOpacityV2(P['green/60'], 0.20),
  'custom/green-border': withOpacityV2(P['green/60'], 0.16),
  'custom/lime': P['lime/70'],
  'custom/lime-var': withOpacityV2(P['lime/70'], 0.64),
  'custom/lime-subtle': withOpacityV2(P['lime/70'], 0.20),
  'custom/lime-border': withOpacityV2(P['lime/70'], 0.12),
  'custom/orange': P['orange/50'],
  'custom/orange-var': withOpacityV2(P['orange/50'], 0.64),
  'custom/orange-subtle': withOpacityV2(P['orange/50'], 0.20),
  'custom/orange-border': withOpacityV2(P['orange/50'], 0.12),
  'custom/yellow': P['yellow/40'],
  'custom/yellow-var': withOpacityV2(P['yellow/40'], 0.64),
  'custom/yellow-subtle': withOpacityV2(P['yellow/40'], 0.20),
  'custom/yellow-border': withOpacityV2(P['yellow/40'], 0.12),
  'custom/grey-brown': P['grey-brown/20'],
  'custom/grey-brown-var': withOpacityV2(P['grey-brown/20'], 0.64),
  'custom/grey-brown-subtle': withOpacityV2(P['grey-brown/20'], 0.20),
  'custom/grey-brown-border': withOpacityV2(P['grey-brown/20'], 0.12),
  'custom/light-blue': P['light-blue/50'],
  'custom/light-blue-var': withOpacityV2(P['light-blue/50'], 0.64),
  'custom/light-blue-subtle': withOpacityV2(P['light-blue/50'], 0.20),
  'custom/light-blue-border': withOpacityV2(P['light-blue/50'], 0.12),
  'custom/brown': P['brown/40'],
  'custom/brown-var': withOpacityV2(P['brown/40'], 0.64),
  'custom/brown-subtle': withOpacityV2(P['brown/40'], 0.20),
  'custom/brown-border': withOpacityV2(P['brown/40'], 0.12),
  'custom/red': P['red/50'],
  'custom/red-var': withOpacityV2(P['red/50'], 0.64),
  'custom/red-subtle': withOpacityV2(P['red/50'], 0.20),
  'custom/red-border': withOpacityV2(P['red/50'], 0.12),
  'custom/purple': P['purple/40'],
  'custom/purple-var': withOpacityV2(P['purple/40'], 0.64),
  'custom/purple-subtle': withOpacityV2(P['purple/40'], 0.20),
  'custom/purple-border': withOpacityV2(P['purple/40'], 0.12),
  'custom/blue': P['blue/40'],
  'custom/blue-var': withOpacityV2(P['blue/40'], 0.64),
  'custom/blue-subtle': withOpacityV2(P['blue/40'], 0.20),
  'custom/blue-border': withOpacityV2(P['blue/40'], 0.12),
  'custom/grey': P['neutral/60'],
  'custom/grey-var': withOpacityV2(P['neutral/60'], 0.64),
  'custom/grey-subtle': withOpacityV2(P['neutral/60'], 0.20),
  'custom/grey-border': withOpacityV2(P['neutral/60'], 0.12),

  // Overlay (둘 다 light/dark에서 동일하게 dark scrim)
  'overlay/subtle': withOpacityV2(P['neutral/4'], 0.16),
  'overlay/strong': withOpacityV2(P['neutral/4'], 0.16),
} as const;

export type SemanticV2DarkKey = keyof typeof SemanticColorsV2Dark;
export type SemanticColorsV2 = typeof SemanticColorsV2Light;

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
