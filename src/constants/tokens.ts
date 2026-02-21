/**
 * Figma 디자인 토큰을 React Native에서 사용하기 위한 상수 모음
 * - Primitives: base/primary/neutral/accent/error 등 기본 팔레트
 * - Semantic: Light/Dark 모드별 의미 기반 색상 (background, surface, border 등)
 * - Measurements: radius 토큰
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

export const PrimitiveColors = {
  // Primary (mapped from base grey)
  'color-primary-5': BaseColors['color-base-grey-5'],
  'color-primary-10': BaseColors['color-base-grey-10'],
  'color-primary-20': BaseColors['color-base-grey-20'],
  'color-primary-30': BaseColors['color-base-grey-30'],
  'color-primary-40': BaseColors['color-base-grey-40'],
  'color-primary-50': BaseColors['color-base-grey-50'],
  'color-primary-60': BaseColors['color-base-grey-60'],
  'color-primary-70': BaseColors['color-base-grey-70'],
  'color-primary-80': BaseColors['color-base-grey-80'],
  'color-primary-90': BaseColors['color-base-grey-90'],
  'color-primary-95': BaseColors['color-base-grey-95'],
  'color-primary-98': BaseColors['color-base-grey-98'],
  'color-primary-99': BaseColors['color-base-grey-99'],

  // Neutral (also based on grey)
  'color-neutral-2': BaseColors['color-base-grey-2'],
  'color-neutral-5': BaseColors['color-base-grey-5'],
  'color-neutral-8': BaseColors['color-base-grey-8'],
  'color-neutral-10': BaseColors['color-base-grey-10'],
  'color-neutral-20': BaseColors['color-base-grey-20'],
  'color-neutral-30': BaseColors['color-base-grey-30'],
  'color-neutral-40': BaseColors['color-base-grey-40'],
  'color-neutral-50': BaseColors['color-base-grey-50'],
  'color-neutral-60': BaseColors['color-base-grey-60'],
  'color-neutral-70': BaseColors['color-base-grey-70'],
  'color-neutral-80': BaseColors['color-base-grey-80'],
  'color-neutral-90': BaseColors['color-base-grey-90'],
  'color-neutral-95': BaseColors['color-base-grey-95'],
  'color-neutral-96': BaseColors['color-base-grey-96'],
  'color-neutral-98': BaseColors['color-base-grey-98'],
  'color-neutral-99': BaseColors['color-base-grey-99'],

  // Accent (based on blue)
  'color-accent-5': BaseColors['color-base-blue-5'],
  'color-accent-10': BaseColors['color-base-blue-10'],
  'color-accent-20': BaseColors['color-base-blue-20'],
  'color-accent-30': BaseColors['color-base-blue-30'],
  'color-accent-40': BaseColors['color-base-blue-40'],
  'color-accent-50': BaseColors['color-base-blue-50'],
  'color-accent-60': BaseColors['color-base-blue-60'],
  'color-accent-70': BaseColors['color-base-blue-70'],
  'color-accent-80': BaseColors['color-base-blue-80'],
  'color-accent-90': BaseColors['color-base-blue-90'],
  'color-accent-95': BaseColors['color-base-blue-95'],
  'color-accent-99': BaseColors['color-base-blue-99'],

  // Error (based on red)
  'color-error-5': BaseColors['color-base-red-5'],
  'color-error-10': BaseColors['color-base-red-10'],
  'color-error-20': BaseColors['color-base-red-20'],
  'color-error-30': BaseColors['color-base-red-30'],
  'color-error-40': BaseColors['color-base-red-40'],
  'color-error-50': BaseColors['color-base-red-50'],
  'color-error-60': BaseColors['color-base-red-60'],
  'color-error-70': BaseColors['color-base-red-70'],
  'color-error-80': BaseColors['color-base-red-80'],
  'color-error-90': BaseColors['color-base-red-90'],
  'color-error-95': BaseColors['color-base-red-95'],
  'color-error-99': BaseColors['color-base-red-99'],

  // State layers — primary (pure neutral base)
  'color-primary-statelayers-10-08': withOpacity('#1C1C1C', 0.08),
  'color-primary-statelayers-10-10': withOpacity('#1C1C1C', 0.10),
  'color-primary-statelayers-10-16': withOpacity('#1C1C1C', 0.16),
  'color-primary-statelayers-20-08': withOpacity('#303030', 0.08),
  'color-primary-statelayers-20-10': withOpacity('#303030', 0.10),
  'color-primary-statelayers-20-16': withOpacity('#303030', 0.16),
  'color-primary-statelayers-40-08': withOpacity('#5E5E5E', 0.08),
  'color-primary-statelayers-40-10': withOpacity('#5E5E5E', 0.10),
  'color-primary-statelayers-40-16': withOpacity('#5E5E5E', 0.16),
  'color-primary-statelayers-80-08': withOpacity('#C6C6C6', 0.08),
  'color-primary-statelayers-80-10': withOpacity('#C6C6C6', 0.10),
  'color-primary-statelayers-80-16': withOpacity('#C6C6C6', 0.16),
  'color-primary-statelayers-90-08': withOpacity('#E2E2E2', 0.08),
  'color-primary-statelayers-90-10': withOpacity('#E2E2E2', 0.10),
  'color-primary-statelayers-90-16': withOpacity('#E2E2E2', 0.16),

  // State layers — neutral (pure neutral base)
  'color-neutral-statelayers-10-08': withOpacity('#1C1C1C', 0.08),
  'color-neutral-statelayers-10-10': withOpacity('#1C1C1C', 0.10),
  'color-neutral-statelayers-10-16': withOpacity('#1C1C1C', 0.16),
  'color-neutral-statelayers-20-08': withOpacity('#303030', 0.08),
  'color-neutral-statelayers-20-10': withOpacity('#303030', 0.10),
  'color-neutral-statelayers-20-16': withOpacity('#303030', 0.16),
  'color-neutral-statelayers-40-08': withOpacity('#5E5E5E', 0.08),
  'color-neutral-statelayers-40-10': withOpacity('#5E5E5E', 0.10),
  'color-neutral-statelayers-40-16': withOpacity('#5E5E5E', 0.16),
  'color-neutral-statelayers-80-08': withOpacity('#C6C6C6', 0.08),
  'color-neutral-statelayers-80-10': withOpacity('#C6C6C6', 0.10),
  'color-neutral-statelayers-80-16': withOpacity('#C6C6C6', 0.16),
  'color-neutral-statelayers-90-08': withOpacity('#E2E2E2', 0.08),
  'color-neutral-statelayers-90-10': withOpacity('#E2E2E2', 0.10),
  'color-neutral-statelayers-90-16': withOpacity('#E2E2E2', 0.16),

  // State layers — accent (blue base)
  'color-accent-statelayers-10-08': withOpacity(BaseColors['color-base-blue-90'], 0.08),
  'color-accent-statelayers-10-10': withOpacity(BaseColors['color-base-blue-90'], 0.10),
  'color-accent-statelayers-10-16': withOpacity(BaseColors['color-base-blue-90'], 0.16),
  'color-accent-statelayers-20-08': withOpacity(BaseColors['color-base-blue-80'], 0.08),
  'color-accent-statelayers-20-10': withOpacity(BaseColors['color-base-blue-80'], 0.10),
  'color-accent-statelayers-20-16': withOpacity(BaseColors['color-base-blue-80'], 0.16),
  'color-accent-statelayers-40-08': withOpacity(BaseColors['color-base-blue-60'], 0.08),
  'color-accent-statelayers-40-10': withOpacity(BaseColors['color-base-blue-60'], 0.10),
  'color-accent-statelayers-40-16': withOpacity(BaseColors['color-base-blue-60'], 0.16),
  'color-accent-statelayers-80-08': withOpacity('#DCC843', 0.08),
  'color-accent-statelayers-80-10': withOpacity('#DCC843', 0.10),
  'color-accent-statelayers-80-16': withOpacity('#DCC843', 0.16),
  'color-accent-statelayers-90-08': withOpacity('#F7ECAB', 0.08),
  'color-accent-statelayers-90-10': withOpacity('#F7ECAB', 0.10),
  'color-accent-statelayers-90-16': withOpacity('#F7ECAB', 0.16),

  // State layers — error
  'color-error-statelayers-40-08': withOpacity('#B3261E', 0.08),
  'color-error-statelayers-40-10': withOpacity('#B3261E', 0.10),
  'color-error-statelayers-80-08': withOpacity('#F2B8B5', 0.08),
  'color-error-statelayers-80-10': withOpacity('#F2B8B5', 0.10),
} as const;

export type PrimitiveColorKey = keyof typeof PrimitiveColors;

// ---- Semantic tokens: Light mode ----

export const SemanticColorsLight = {
  // Backgrounds & primary
  'background-primary': PrimitiveColors['color-primary-98'],
  'foreground-primary': PrimitiveColors['color-primary-98'],
  'foreground-onprimary': PrimitiveColors['color-primary-5'],
  'background-primarycontainer': PrimitiveColors['color-primary-90'],
  'foreground-onprimarycontainer': PrimitiveColors['color-primary-98'],

  // Accent
  'foreground-accent': PrimitiveColors['color-accent-60'],
  'background-accent': PrimitiveColors['color-accent-70'],
  'background-accentcontainer': PrimitiveColors['color-accent-20'],
  'foreground-onaccent': PrimitiveColors['color-accent-5'],
  'foreground-onaccentcontainer': PrimitiveColors['color-accent-80'],

  // Surfaces
  'surface-surface': PrimitiveColors['color-neutral-2'],
  'surface-surfacedim': PrimitiveColors['color-neutral-10'],
  'surface-surfacebright': BaseColors['color-base-white'],
  'surface-surfacecontainerlowest': PrimitiveColors['color-neutral-5'],
  'surface-surfacecontainerlow': PrimitiveColors['color-neutral-8'],
  'surface-surfacecontainer': PrimitiveColors['color-neutral-10'],
  'surface-surfacecontainerhigh': PrimitiveColors['color-neutral-20'],
  'surface-surfacecontainerhighest': PrimitiveColors['color-neutral-30'],
  'surface-surfacecontainertransparent': withOpacity(BaseColors['color-base-grey-70'], 0.12),
  'surface-surfacecontainertransparent-onimage': withOpacity(PrimitiveColors['color-neutral-5'], 0.16),
  'surface-surfaceinverse': PrimitiveColors['color-neutral-96'],

  // Error
  'background-error': PrimitiveColors['color-error-80'],
  'background-errorcontainer': withOpacity(BaseColors['color-base-red-80'], 0.12),
  'foreground-error': PrimitiveColors['color-error-80'],
  'foreground-onerror': PrimitiveColors['color-error-5'],
  'foreground-onerrorcontainer': PrimitiveColors['color-error-80'],

  // On surface
  'foreground-onsurface': PrimitiveColors['color-neutral-98'],
  'foreground-onsurfacevar': withOpacity(PrimitiveColors['color-neutral-98'], 0.64),
  'foreground-onsurfacemuted': withOpacity(PrimitiveColors['color-neutral-98'], 0.36),
  'foreground-onsurfacedisabled': withOpacity(PrimitiveColors['color-neutral-98'], 0.24),
  'foreground-onsurfaceinverse': PrimitiveColors['color-neutral-5'],
  'foreground-onsurfaceinversevar': withOpacity(PrimitiveColors['color-neutral-5'], 0.64),
  'foreground-onimage': PrimitiveColors['color-neutral-5'],
  'foreground-onimagevar': withOpacity(PrimitiveColors['color-neutral-5'], 0.64),

  // Border
  'border-borderlight': PrimitiveColors['color-neutral-20'],
  'border-border': PrimitiveColors['color-neutral-40'],
  'border-borderbold': PrimitiveColors['color-primary-50'],

  // Misc
  scrim: BaseColors['color-base-black'],
  shadow: BaseColors['color-base-black'],

  // Custom hues
  'custom-grey': BaseColors['color-base-grey-80'],
  'custom-greyvar': withOpacity(BaseColors['color-base-grey-80'], 0.64),
  'custom-greybrown': BaseColors['color-base-greybrown-80'],
  'custom-greybrownvar': withOpacity(BaseColors['color-base-greybrown-80'], 0.64),
  'custom-brown': BaseColors['color-base-brown-50'],
  'custom-brownvar': withOpacity(BaseColors['color-base-brown-40'], 0.64),
  'custom-onbrowncontainer': BaseColors['color-base-brown-60'],
  'custom-darkred': BaseColors['color-base-darkred-80'],
  'custom-darkredvar': withOpacity(BaseColors['color-base-darkred-80'], 0.64),
  'custom-red': BaseColors['color-base-red-80'],
  'custom-redvar': withOpacity(BaseColors['color-base-red-80'], 0.64),
  'custom-orange': BaseColors['color-base-orange-80'],
  'custom-orangevar': withOpacity(BaseColors['color-base-orange-80'], 0.64),
  'custom-yellow': BaseColors['color-base-yellow-80'],
  'custom-yellowvar': withOpacity(BaseColors['color-base-yellow-80'], 0.64),
  'custom-onyellowcontainer': BaseColors['color-base-yellow-80'],
  'custom-yellowcontainer': withOpacity(BaseColors['color-base-yellow-80'], 0.16),
  'custom-lime': BaseColors['color-base-lime-80'],
  'custom-limevar': withOpacity(BaseColors['color-base-lime-80'], 0.64),
  'custom-green': BaseColors['color-base-green-80'],
  'custom-greenvar': withOpacity(BaseColors['color-base-green-80'], 0.64),
  'custom-teal': BaseColors['color-base-teal-80'],
  'custom-tealvar': withOpacity(BaseColors['color-base-teal-80'], 0.64),
  'custom-lightblue': BaseColors['color-base-lightblue-80'],
  'custom-lightbluevar': withOpacity(BaseColors['color-base-lightblue-50'], 0.64),
  'custom-blue': BaseColors['color-base-blue-80'],
  'custom-bluevar': withOpacity(BaseColors['color-base-blue-80'], 0.64),
  'custom-purple': BaseColors['color-base-purple-80'],
  'custom-purplevar': withOpacity(BaseColors['color-base-purple-80'], 0.64),
  'custom-lavendar': BaseColors['color-base-lavender-80'],
  'custom-lavendarvar': withOpacity(BaseColors['color-base-lavender-80'], 0.64),

  // State layers
  'background-statelayers-primaryhover':
    PrimitiveColors['color-primary-statelayers-40-08'],
  'background-statelayers-primaryfocus_press':
    PrimitiveColors['color-primary-statelayers-40-10'],
  'background-statelayers-primarycontainerhover':
    PrimitiveColors['color-primary-statelayers-10-08'],
  'background-statelayers-primarycontainerfocus_press':
    PrimitiveColors['color-primary-statelayers-10-10'],

  'background-statelayers-accenthover':
    PrimitiveColors['color-accent-statelayers-40-08'],
  'background-statelayers-accentfocus_press':
    PrimitiveColors['color-accent-statelayers-40-10'],
  'background-statelayers-accentcontainerhover':
    PrimitiveColors['color-accent-statelayers-10-08'],
  'background-statelayers-accentcontainerfocus_press2':
    PrimitiveColors['color-accent-statelayers-10-10'],

  'background-statelayers-surfacehover':
    PrimitiveColors['color-neutral-statelayers-40-08'], // Figma: Surface/StateLayers/SurfaceHover (#5E5E5E14)
  'background-statelayers-surfacefocus_press':
    PrimitiveColors['color-neutral-statelayers-40-08'], // Figma: Surface/StateLayers/SurfaceFocus_Press (#5E5E5E14)
  'background-statelayers-surfacedrag':
    PrimitiveColors['color-neutral-statelayers-10-16'],
  'background-statelayers-inversesurfacehover':
    PrimitiveColors['color-neutral-statelayers-90-08'],
  'background-statelayers-inversesurfacefocus_press':
    PrimitiveColors['color-neutral-statelayers-90-08'],
  'background-statelayers-disabled':
    PrimitiveColors['color-neutral-statelayers-10-10'],

  'background-statelayers-errorhover':
    PrimitiveColors['color-error-statelayers-40-08'],
  'background-statelayers-errorfocused_pressed':
    PrimitiveColors['color-error-statelayers-40-10'],

  'background-transparent': withOpacity(BaseColors['color-base-grey-2'], 0.88),
} as const;

export type SemanticLightKey = keyof typeof SemanticColorsLight;

// ---- Semantic tokens: Dark mode ----

export const SemanticColorsDark = {
  // Backgrounds & primary
  'background-primary': PrimitiveColors['color-primary-5'],
  'foreground-primary': PrimitiveColors['color-primary-5'],
  'foreground-onprimary': PrimitiveColors['color-primary-98'],
  'background-primarycontainer': PrimitiveColors['color-primary-20'],
  'foreground-onprimarycontainer': PrimitiveColors['color-primary-5'],

  // Accent
  'foreground-accent': PrimitiveColors['color-accent-60'],
  'background-accent': PrimitiveColors['color-accent-70'],
  'background-accentcontainer': PrimitiveColors['color-accent-90'],
  'foreground-onaccent': PrimitiveColors['color-accent-5'],
  'foreground-onaccentcontainer': PrimitiveColors['color-accent-30'],

  // Surfaces
  'surface-surface': PrimitiveColors['color-neutral-98'],
  'surface-surfacedim': PrimitiveColors['color-neutral-99'],
  'surface-surfacebright': PrimitiveColors['color-neutral-98'],
  'surface-surfacecontainerlowest': PrimitiveColors['color-neutral-98'],
  'surface-surfacecontainerlow': PrimitiveColors['color-neutral-96'],
  'surface-surfacecontainer': PrimitiveColors['color-neutral-95'],
  'surface-surfacecontainerhigh': PrimitiveColors['color-neutral-90'],
  'surface-surfacecontainerhighest': PrimitiveColors['color-neutral-80'],
  'surface-surfacecontainertransparent': withOpacity(BaseColors['color-base-grey-50'], 0.12), // Dark: ~#C8C8DC
  'surface-surfacecontainertransparent-onimage': withOpacity(PrimitiveColors['color-neutral-5'], 0.16),
  'surface-surfaceinverse': PrimitiveColors['color-neutral-10'],

  // Error
  'background-error': PrimitiveColors['color-error-60'],
  'background-errorcontainer': withOpacity(BaseColors['color-base-red-80'], 0.12),
  'foreground-error': PrimitiveColors['color-error-80'],
  'foreground-onerror': PrimitiveColors['color-error-5'],
  'foreground-onerrorcontainer': PrimitiveColors['color-error-10'],

  // On surface
  'foreground-onsurface': PrimitiveColors['color-neutral-5'],
  'foreground-onsurfacevar': withOpacity(PrimitiveColors['color-neutral-5'], 0.64),
  'foreground-onsurfacemuted': withOpacity(PrimitiveColors['color-neutral-5'], 0.38),
  'foreground-onsurfacedisabled': withOpacity(PrimitiveColors['color-neutral-5'], 0.24),
  'foreground-onsurfaceinverse': PrimitiveColors['color-neutral-98'],
  'foreground-onsurfaceinversevar': withOpacity(PrimitiveColors['color-neutral-98'], 0.64),
  'foreground-onimage': PrimitiveColors['color-neutral-5'],
  'foreground-onimagevar': withOpacity(PrimitiveColors['color-neutral-5'], 0.64),

  // Border
  'border-borderlight': PrimitiveColors['color-neutral-95'],
  'border-border': PrimitiveColors['color-neutral-90'],
  'border-borderbold': PrimitiveColors['color-primary-70'],

  // Misc
  scrim: BaseColors['color-base-black'],
  shadow: BaseColors['color-base-black'],

  // Custom hues
  'custom-grey': BaseColors['color-base-grey-70'],
  'custom-greyvar': withOpacity(BaseColors['color-base-grey-70'], 0.64),
  'custom-greybrown': BaseColors['color-base-greybrown-80'],
  'custom-greybrownvar': withOpacity(BaseColors['color-base-greybrown-80'], 0.64),
  'custom-brown': BaseColors['color-base-brown-50'],
  'custom-brownvar': withOpacity(BaseColors['color-base-brown-40'], 0.64),
  'custom-onbrowncontainer': BaseColors['color-base-brown-40'],
  'custom-darkred': BaseColors['color-base-darkred-80'],
  'custom-darkredvar': withOpacity(BaseColors['color-base-darkred-80'], 0.64),
  'custom-red': BaseColors['color-base-red-80'],
  'custom-redvar': withOpacity(BaseColors['color-base-red-80'], 0.64),
  'custom-orange': BaseColors['color-base-orange-80'],
  'custom-orangevar': withOpacity(BaseColors['color-base-orange-80'], 0.64),
  'custom-yellow': BaseColors['color-base-yellow-80'],
  'custom-yellowvar': withOpacity(BaseColors['color-base-yellow-60'], 0.64),
  'custom-onyellowcontainer': BaseColors['color-base-yellow-60'],
  'custom-yellowcontainer': withOpacity(BaseColors['color-base-yellow-80'], 0.16),
  'custom-lime': BaseColors['color-base-lime-80'],
  'custom-limevar': withOpacity(BaseColors['color-base-lime-80'], 0.64),
  'custom-green': BaseColors['color-base-green-80'],
  'custom-greenvar': withOpacity(BaseColors['color-base-green-80'], 0.64),
  'custom-teal': BaseColors['color-base-teal-80'],
  'custom-tealvar': withOpacity(BaseColors['color-base-teal-80'], 0.64),
  'custom-lightblue': BaseColors['color-base-lightblue-80'],
  'custom-lightbluevar': withOpacity(BaseColors['color-base-lightblue-50'], 0.64),
  'custom-blue': BaseColors['color-base-blue-80'],
  'custom-bluevar': withOpacity(BaseColors['color-base-blue-80'], 0.64),
  'custom-purple': BaseColors['color-base-purple-80'],
  'custom-purplevar': withOpacity(BaseColors['color-base-purple-80'], 0.64),
  'custom-lavendar': BaseColors['color-base-lavender-80'],
  'custom-lavendarvar': withOpacity(BaseColors['color-base-lavender-80'], 0.64),

  // State layers
  'background-statelayers-primaryhover':
    PrimitiveColors['color-primary-statelayers-80-08'],
  'background-statelayers-primaryfocus_press':
    PrimitiveColors['color-primary-statelayers-80-10'],
  'background-statelayers-primarycontainerhover':
    PrimitiveColors['color-primary-statelayers-80-08'],
  'background-statelayers-primarycontainerfocus_press':
    PrimitiveColors['color-primary-statelayers-80-08'],

  'background-statelayers-accenthover':
    PrimitiveColors['color-accent-statelayers-80-08'],
  'background-statelayers-accentfocus_press':
    PrimitiveColors['color-accent-statelayers-80-10'],
  'background-statelayers-accentcontainerhover':
    PrimitiveColors['color-accent-statelayers-80-08'],
  'background-statelayers-accentcontainerfocus_press2':
    PrimitiveColors['color-accent-statelayers-80-08'],

  'background-statelayers-surfacehover':
    PrimitiveColors['color-neutral-statelayers-90-08'],
  'background-statelayers-surfacefocus_press':
    PrimitiveColors['color-neutral-statelayers-90-10'],
  'background-statelayers-surfacedrag':
    PrimitiveColors['color-neutral-statelayers-90-16'],
  'background-statelayers-inversesurfacehover':
    PrimitiveColors['color-neutral-statelayers-20-08'],
  'background-statelayers-inversesurfacefocus_press':
    PrimitiveColors['color-neutral-statelayers-20-08'],
  'background-statelayers-disabled':
    PrimitiveColors['color-neutral-statelayers-90-10'],

  'background-statelayers-errorhover':
    PrimitiveColors['color-error-statelayers-80-08'],
  'background-statelayers-errorfocused_pressed':
    PrimitiveColors['color-error-statelayers-80-10'],

  'background-transparent': withOpacity(BaseColors['color-base-grey-96'], 0.80), // Dark: ~#2E2E2E
} as const;

export type SemanticDarkKey = keyof typeof SemanticColorsDark;
export type SemanticColors = typeof SemanticColorsLight;

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

