/**
 * 썸네일이 없는 집계 팩(레시피 북 없음 / 회고록 등) 장식용 커버 이미지.
 * assets/images/thumbnails/cover-01~04.png
 *
 * require() numeric 소스를 그대로 expo-image(ExpoImage)에 전달 → iOS/Android/web 모두 렌더.
 * (Asset.fromModule().uri 로 문자열화하면 iOS 스탠드얼론 빌드에서 번들 에셋이
 *  추출 전 경로를 가리켜 expo-image 로드 실패 → 빈 카드. expo-image는 numeric require를
 *  모든 플랫폼에서 지원하므로 변환하지 않는다.)
 */
export const COVER_THUMBNAIL_SOURCES: number[] = [
  require('../../assets/images/thumbnails/cover-01.png'),
  require('../../assets/images/thumbnails/cover-02.png'),
  require('../../assets/images/thumbnails/cover-03.png'),
  require('../../assets/images/thumbnails/cover-04.png'),
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 시드 기반으로 중복 없이 최대 n개의 커버 소스(require numeric) 반환.
 * 같은 시드 → 항상 같은 결과 (렌더마다 바뀌지 않음).
 */
export function pickCovers(seed: string, n: number): number[] {
  const pool = [...COVER_THUMBNAIL_SOURCES];
  const out: number[] = [];
  let h = hashStr(seed) || 1;
  const count = Math.min(n, pool.length);
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const idx = h % pool.length;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/** 시드 기반 단일 커버 소스 (require numeric) */
export function getCover(seed: string): number {
  return COVER_THUMBNAIL_SOURCES[hashStr(seed) % COVER_THUMBNAIL_SOURCES.length];
}
