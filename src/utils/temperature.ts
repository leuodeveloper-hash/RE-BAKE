import {useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

/**
 * 온도 단위 — 저장은 늘 섭씨, 화면에서만 바꿔 보여준다.
 * 처음 값은 기기 지역(미국 등 화씨 쓰는 곳이면 화씨). 고르면 기기에 기억한다.
 */
export type TempUnit = 'C' | 'F';

const KEY = '@bakle_temp_unit';
/** 화씨를 쓰는 지역 */
const F_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW']);

function deviceUnit(): TempUnit {
  try {
    const region = Localization.getLocales()[0]?.regionCode;
    return region && F_REGIONS.has(region) ? 'F' : 'C';
  } catch {
    return 'C';
  }
}

let current: TempUnit = deviceUnit();
const listeners = new Set<() => void>();
AsyncStorage.getItem(KEY).then(v => {
  if (v === 'C' || v === 'F') { current = v; listeners.forEach(l => l()); }
}).catch(() => {});

/** 지금 단위(화면 밖 — PDF 만들 때 등) */
export function getTempUnit(): TempUnit {
  return current;
}

export function setTempUnit(u: TempUnit) {
  current = u;
  AsyncStorage.setItem(KEY, u).catch(() => {});
  listeners.forEach(l => l());
}

/** 지금 온도 단위(바뀌면 다시 그린다) */
export function useTempUnit(): TempUnit {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => current,
    () => current,
  );
}

export const cToF = (c: number) => c * 9 / 5 + 32;
export const fToC = (f: number) => (f - 32) * 5 / 9;

/** 화씨 보이기 — 오븐처럼 높은 온도(100℉ 넘음)는 5단위, 반죽 온도는 1단위 */
function roundF(f: number): number {
  return f >= 100 ? Math.round(f / 5) * 5 : Math.round(f);
}

/** "27°C"·"27" → 보일 글자. 섭씨면 그대로 */
export function formatTemp(raw: string | undefined, unit: TempUnit): string {
  if (!raw) return '';
  if (unit === 'C') return raw;
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return raw;
  return `${roundF(cToF(parseFloat(m[0])))}°F`;
}

/**
 * 글 속 섭씨 온도를 화씨로 — "180℃", "180°C", "180 °C"만(‘도’처럼 애매한 표기는 건드리지 않는다).
 * 섭씨면 그대로.
 */
export function convertTempsInText(text: string, unit: TempUnit): string {
  if (!text || unit === 'C') return text;
  return text.replace(/(-?\d+(?:\.\d+)?)\s*(?:℃|°\s*C)(?![a-zA-Z])/g, (_, n) => `${roundF(cToF(parseFloat(n)))}°F`);
}
