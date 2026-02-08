/**
 * 랜덤 아바타 이미지
 * 프로필 아바타가 없을 때 기본으로 사용됩니다.
 */

export const RANDOM_AVATARS = [
  require('../../assets/images/avatars/avatar_1.png'),
  require('../../assets/images/avatars/avatar_2.png'),
  require('../../assets/images/avatars/avatar_3.png'),
  require('../../assets/images/avatars/avatar_4.png'),
  require('../../assets/images/avatars/avatar_5.png'),
  require('../../assets/images/avatars/avatar_6.png'),
  require('../../assets/images/avatars/avatar_7.png'),
  require('../../assets/images/avatars/avatar_8.png'),
];

/**
 * 랜덤 아바타 가져오기
 * @param seed 시드 값 (같은 시드는 같은 아바타 반환)
 */
export function getRandomAvatar(seed?: string | number): number {
  if (seed !== undefined) {
    // 시드 기반으로 일관된 인덱스 반환
    const hash =
      typeof seed === 'string'
        ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        : seed;
    return RANDOM_AVATARS[hash % RANDOM_AVATARS.length];
  }
  // 완전 랜덤
  return RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
}
