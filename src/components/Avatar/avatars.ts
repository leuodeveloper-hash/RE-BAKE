/**
 * 랜덤 아바타 이미지
 * 프로필 아바타가 없을 때 기본으로 사용됩니다.
 */

export const RANDOM_AVATARS = [
  require('../../../assets/images/avatars/avatar_1.png'),
  require('../../../assets/images/avatars/avatar_2.png'),
  require('../../../assets/images/avatars/avatar_3.png'),
  require('../../../assets/images/avatars/avatar_4.png'),
  require('../../../assets/images/avatars/avatar_5.png'),
  require('../../../assets/images/avatars/avatar_6.png'),
];

/**
 * 그라데이션 배경 이미지 (avatar-bg-1 ~ 6)
 * type='gradient' 아바타의 파스텔 배경으로 사용됩니다.
 */
export const GRADIENT_AVATARS = [
  require('../../../assets/images/avatars/avatar-bg-1.png'),
  require('../../../assets/images/avatars/avatar-bg-2.png'),
  require('../../../assets/images/avatars/avatar-bg-3.png'),
  require('../../../assets/images/avatars/avatar-bg-4.png'),
  require('../../../assets/images/avatars/avatar-bg-5.png'),
  require('../../../assets/images/avatars/avatar-bg-6.png'),
];

/** 시드/문자열 → 안정적인 정수 해시 */
function hashSeed(seed: string | number): number {
  return typeof seed === 'string'
    ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : seed;
}

/**
 * 랜덤 아바타 가져오기
 * @param seed 시드 값 (같은 시드는 같은 아바타 반환)
 */
export function getRandomAvatar(seed?: string | number): number {
  if (seed !== undefined) {
    // 시드 기반으로 일관된 인덱스 반환
    return RANDOM_AVATARS[hashSeed(seed) % RANDOM_AVATARS.length];
  }
  // 완전 랜덤
  return RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
}

/**
 * 그라데이션 배경 가져오기
 * @param index 1~6 명시 인덱스 (우선). 범위를 벗어나면 자동으로 순환.
 * @param seed  index가 없을 때 시드 기반으로 일관된 배경 반환
 */
export function getGradientAvatar(
  index?: number,
  seed?: string | number,
): number {
  if (index !== undefined) {
    // 1-based 인덱스를 0-based로, 범위 밖은 순환
    const i = ((Math.round(index) - 1) % GRADIENT_AVATARS.length + GRADIENT_AVATARS.length) % GRADIENT_AVATARS.length;
    return GRADIENT_AVATARS[i];
  }
  if (seed !== undefined) {
    return GRADIENT_AVATARS[hashSeed(seed) % GRADIENT_AVATARS.length];
  }
  return GRADIENT_AVATARS[Math.floor(Math.random() * GRADIENT_AVATARS.length)];
}
