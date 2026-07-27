import React from 'react';
import {Image, StyleSheet} from 'react-native';
import {Avatar, type AvatarSize, type AvatarShape} from '@components/Avatar';
import {Radius} from '@constants/tokens';
import {isOfficialAuthor} from '../../types/author';

// bakey(공식) 아바타 전용 이미지
const BAKEY_AVATAR = require('../../../assets/images/avatars/bakey-avatar.png');

export interface AuthorAvatarProps {
  authorId?: string | null;
  /** random 아바타 시드 (비공식 작성자용) */
  seed: string | number;
  size?: AvatarSize;
  shape?: AvatarShape;
}

// Avatar 크기 토큰 → px (Avatar SIZE_CONFIG와 일치)
const SIZE_PX: Record<AvatarSize, number> = {
  xsmall: 16, small: 32, medium: 36, large: 48, xlarge: 72,
};

/**
 * 작성자 아바타 — 공식 작성자(bakey)면 브랜드 로고 이미지 아바타, 그 외엔 시드 기반 랜덤 아바타.
 * 칩·책 표지·프로필 등 작성자 아바타를 그리는 모든 곳에서 이걸 쓴다(공통화).
 */
export function AuthorAvatar({authorId, seed, size = 'small', shape = 'circle'}: AuthorAvatarProps) {
  if (isOfficialAuthor(authorId)) {
    const px = SIZE_PX[size];
    const radius = shape === 'circle' ? Radius['radius-full'] : 12;
    return (
      <Image
        source={BAKEY_AVATAR}
        style={[styles.image, {width: px, height: px, borderRadius: radius}]}
      />
    );
  }
  return <Avatar size={size} shape={shape} type="random" seed={seed} />;
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
});
