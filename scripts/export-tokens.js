#!/usr/bin/env node
/**
 * tokens.ts → Tokens Studio JSON 변환 스크립트
 *
 * 사용법:
 *   node scripts/export-tokens.js
 *
 * 출력:
 *   tokens/tokens.json  (Tokens Studio에서 Import 가능한 포맷)
 */

const fs = require('fs');
const path = require('path');

// ── 1. 토큰 값 직접 정의 (tokens.ts / spacing.ts / typography.ts에서 가져옴) ──

const BaseColors = {
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
};

const SemanticColorsLight = {
  'background-primary': '#1F2126',
  'foreground-primary': '#1F2126',
  'foreground-onprimary': '#FCFCFD',
  'background-primarycontainer': '#4E525E',
  'foreground-onprimarycontainer': '#1F2126',
  'foreground-accent': '#326CBB',
  'background-accent': '#2559A5',
  'background-accentcontainer': '#C2D4EB',
  'foreground-onaccent': '#F5F8FC',
  'foreground-onaccentcontainer': '#1C4387',
  'surface-surface': '#FDFDFE',
  'surface-surfacedim': '#F3F4F6',
  'surface-surfacebright': '#FFFFFF',
  'surface-surfacecontainerlowest': '#FCFCFD',
  'surface-surfacecontainerlow': '#F7F7FA',
  'surface-surfacecontainer': '#F3F4F6',
  'surface-surfacecontainerhigh': '#ECEEF2',
  'surface-surfacecontainerhighest': '#E3E5EA',
  'surface-surfacecontainertransparent': 'rgba(139, 142, 156, 0.12)',
  'surface-surfaceinverse': '#2F333A',
  'background-error': '#BB332A',
  'background-errorcontainer': '#F7C4BF',
  'foreground-error': '#BB332A',
  'foreground-onerror': '#FEF6F5',
  'foreground-onerrorcontainer': '#BB332A',
  'foreground-onsurface': '#1F2126',
  'foreground-onsurfacevar': '#1F2126A3',
  'foreground-onsurfacemuted': '#1F21265C',
  'foreground-onsurfacedisabled': '#1F21263D',
  'foreground-onsurfaceinverse': '#FCFCFD',
  'foreground-onsurfaceinversevar': '#FCFCFDA3',
  'foreground-onimage': '#FCFCFD',
  'foreground-onimagevar': '#FCFCFDA3',
  'border-borderlight': '#ECEEF2',
  'border-border': '#D6D8E0',
  'border-borderbold': '#C2C4CF',
  'scrim': '#000000',
  'shadow': '#000000',
  'custom-greybrown': '#948A78',
  'custom-brown': '#7C5727',
  'custom-darkred': '#61131B',
  'custom-red': '#BB332A',
  'custom-orange': '#CA5100',
  'custom-yellow': '#DBA04C',
  'custom-lime': '#BFAC27',
  'custom-green': '#80A109',
  'custom-teal': '#29A195',
  'custom-lightblue': '#7C88EF',
  'custom-blue': '#1C4387',
  'custom-purple': '#60329A',
  'custom-lavendar': '#A370BA',
  'background-transparent': '#FDFDFDE0',
};

const SemanticColorsDark = {
  'background-primary': '#FCFCFD',
  'foreground-primary': '#FCFCFD',
  'foreground-onprimary': '#1F2126',
  'background-primarycontainer': '#ECEEF2',
  'foreground-onprimarycontainer': '#FCFCFD',
  'foreground-accent': '#326CBB',
  'background-accent': '#2559A5',
  'background-accentcontainer': '#16366C',
  'foreground-onaccent': '#F5F8FC',
  'foreground-onaccentcontainer': '#9EBADF',
  'surface-surface': '#1F2126',
  'surface-surfacedim': '#121318',
  'surface-surfacebright': '#1F2126',
  'surface-surfacecontainerlowest': '#1F2126',
  'surface-surfacecontainerlow': '#2F333A',
  'surface-surfacecontainer': '#3B3F48',
  'surface-surfacecontainerhigh': '#4E525E',
  'surface-surfacecontainerhighest': '#6E7280',
  'surface-surfacecontainertransparent': 'rgba(200, 200, 220, 0.12)',
  'surface-surfaceinverse': '#F3F4F6',
  'background-error': '#D4402F',
  'background-errorcontainer': '#4B1511',
  'foreground-error': '#BB332A',
  'foreground-onerror': '#FEF6F5',
  'foreground-onerrorcontainer': '#FCE8E6',
  'foreground-onsurface': '#FCFCFD',
  'foreground-onsurfacevar': '#FCFCFDA3',
  'foreground-onsurfacemuted': '#FCFCFD60',
  'foreground-onsurfacedisabled': '#FCFCFD3D',
  'foreground-onsurfaceinverse': '#1F2126',
  'foreground-onsurfaceinversevar': '#1F2126A3',
  'foreground-onimage': '#FCFCFD',
  'foreground-onimagevar': '#FCFCFDA3',
  'border-borderlight': '#3B3F48',
  'border-border': '#4E525E',
  'border-borderbold': '#8B8E9C',
  'scrim': '#000000',
  'shadow': '#000000',
  'custom-greybrown': '#948A78',
  'custom-brown': '#7C5727',
  'custom-darkred': '#61131B',
  'custom-red': '#BB332A',
  'custom-orange': '#CA5100',
  'custom-yellow': '#DBA04C',
  'custom-lime': '#BFAC27',
  'custom-green': '#80A109',
  'custom-teal': '#29A195',
  'custom-lightblue': '#7C88EF',
  'custom-blue': '#1C4387',
  'custom-purple': '#60329A',
  'custom-lavendar': '#A370BA',
  'background-transparent': '#2E2E2ECC',
};

const Radius = {
  'radius-xs': 4,
  'radius-sm': 8,
  'radius-md': 12,
  'radius-lg': 16,
  'radius-xl': 24,
  'radius-full': 999,
};

const Spacing = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

const Typography = {
  display: {
    large:  { fontSize: 57, fontWeight: 600, letterSpacing: -1,    lineHeight: 64 },
    medium: { fontSize: 45, fontWeight: 700, letterSpacing: 0,     lineHeight: 52 },
    small:  { fontSize: 36, fontWeight: 700, letterSpacing: 0,     lineHeight: 44 },
  },
  headline: {
    large:  { fontSize: 32, fontWeight: 700, letterSpacing: 0,     lineHeight: 40 },
    medium: { fontSize: 28, fontWeight: 700, letterSpacing: -0.25, lineHeight: 36 },
    small:  { fontSize: 22, fontWeight: 600, letterSpacing: -0.25, lineHeight: 28 },
  },
  title: {
    large:  { fontSize: 18, fontWeight: 700, letterSpacing: -0.25, lineHeight: 24 },
    medium: { fontSize: 16, fontWeight: 700, letterSpacing: 0,     lineHeight: 20 },
    small:  { fontSize: 14, fontWeight: 600, letterSpacing: 0,     lineHeight: 18 },
  },
  label: {
    'large-semibold': { fontSize: 14, fontWeight: 600, letterSpacing: 0,     lineHeight: 20 },
    large:            { fontSize: 14, fontWeight: 500, letterSpacing: 0,     lineHeight: 20 },
    'medium-semibold':{ fontSize: 12, fontWeight: 600, letterSpacing: 0,     lineHeight: 16 },
    medium:           { fontSize: 12, fontWeight: 600, letterSpacing: -0.25, lineHeight: 16 },
    small:            { fontSize: 11, fontWeight: 500, letterSpacing: 0,     lineHeight: 16 },
  },
  body: {
    large:  { fontSize: 16, fontWeight: 500, letterSpacing: -0.25, lineHeight: 22 },
    medium: { fontSize: 15, fontWeight: 500, letterSpacing: -0.25, lineHeight: 20 },
    small:  { fontSize: 12, fontWeight: 400, letterSpacing: -0.25, lineHeight: 16 },
  },
};

// ── 2. Tokens Studio JSON 포맷으로 변환 ──

function colorToken(value) {
  return { value, type: 'color' };
}

function dimensionToken(value) {
  return { value: `${value}px`, type: 'dimension' };
}

// Base colors → nested structure: color.base.grey.5
function buildBaseColors() {
  const result = {};
  for (const [key, value] of Object.entries(BaseColors)) {
    // key: "color-base-grey-5" → ["color", "base", "grey", "5"]
    const parts = key.split('-');
    // 첫 번째 "color" 제거, "base" 제거
    const group = parts.slice(2, -1).join('-'); // e.g. "grey", "greybrown", "lightblue"
    const step = parts[parts.length - 1]; // e.g. "5", "10", "black", "white"

    if (!result[group]) result[group] = {};
    result[group][step] = colorToken(value);
  }
  return result;
}

// Semantic colors → nested: background.primary, foreground.accent, surface.surface, etc.
function buildSemanticColors(colors) {
  const result = {};
  for (const [key, value] of Object.entries(colors)) {
    const parts = key.split('-');
    const category = parts[0]; // background, foreground, surface, border, custom, scrim, shadow
    const rest = parts.slice(1).join('-');

    if (!rest) {
      // scrim, shadow
      result[category] = colorToken(value);
    } else {
      if (!result[category]) result[category] = {};
      result[category][rest] = colorToken(value);
    }
  }
  return result;
}

// Radius → radius.xs, radius.sm, etc.
function buildRadius() {
  const result = {};
  for (const [key, value] of Object.entries(Radius)) {
    const name = key.replace('radius-', '');
    result[name] = { value: `${value}`, type: 'borderRadius' };
  }
  return result;
}

// Spacing → spacing.xs, spacing.sm, etc.
function buildSpacing() {
  const result = {};
  for (const [key, value] of Object.entries(Spacing)) {
    result[key] = dimensionToken(value);
  }
  return result;
}

// Typography → typography.display.large (composite token)
function buildTypography() {
  const result = {};
  for (const [category, sizes] of Object.entries(Typography)) {
    result[category] = {};
    for (const [size, props] of Object.entries(sizes)) {
      result[category][size] = {
        value: {
          fontFamily: 'IBM Plex Sans',
          fontSize: `${props.fontSize}`,
          fontWeight: `${props.fontWeight}`,
          letterSpacing: `${props.letterSpacing}px`,
          lineHeight: `${props.lineHeight}`,
        },
        type: 'typography',
      };
    }
  }
  return result;
}

// ── 3. 최종 JSON 구성 ──

const tokensJson = {
  // Global (primitives) — 모드에 의존하지 않는 베이스 컬러
  global: {
    color: {
      base: buildBaseColors(),
    },
    radius: buildRadius(),
    spacing: buildSpacing(),
    typography: buildTypography(),
  },
  // Light mode semantic tokens
  light: {
    semantic: buildSemanticColors(SemanticColorsLight),
  },
  // Dark mode semantic tokens
  dark: {
    semantic: buildSemanticColors(SemanticColorsDark),
  },
  // Tokens Studio metadata
  $themes: [
    {
      id: 'light',
      name: 'Light',
      selectedTokenSets: {
        global: 'source',
        light: 'enabled',
      },
    },
    {
      id: 'dark',
      name: 'Dark',
      selectedTokenSets: {
        global: 'source',
        dark: 'enabled',
      },
    },
  ],
};

// ── 4. 파일 출력 ──

const outDir = path.resolve(__dirname, '..', 'tokens');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'tokens.json');
fs.writeFileSync(outPath, JSON.stringify(tokensJson, null, 2), 'utf-8');

console.log(`✅ Tokens Studio JSON 생성 완료: ${outPath}`);
console.log(`\n📋 포함된 토큰:`);
console.log(`   - Base colors: ${Object.keys(BaseColors).length}개`);
console.log(`   - Semantic (Light): ${Object.keys(SemanticColorsLight).length}개`);
console.log(`   - Semantic (Dark): ${Object.keys(SemanticColorsDark).length}개`);
console.log(`   - Radius: ${Object.keys(Radius).length}개`);
console.log(`   - Spacing: ${Object.keys(Spacing).length}개`);
console.log(`   - Typography: ${Object.values(Typography).reduce((sum, cat) => sum + Object.keys(cat).length, 0)}개`);
console.log(`\n🔧 피그마에서 가져오기:`);
console.log(`   1. Tokens Studio 플러그인 열기`);
console.log(`   2. 좌측 하단 Settings(⚙) → Import → tokens/tokens.json 선택`);
console.log(`   3. "global" 셋 = source, "light" 또는 "dark" = enabled 확인`);
console.log(`   4. Styles/Variables로 내보내기 (선택사항)`);
