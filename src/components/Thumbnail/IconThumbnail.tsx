import React from 'react';
import {View, type ViewStyle} from 'react-native';
import type {SvgProps} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';
import {Radius} from '@constants/tokens';

export interface IconThumbnailProps {
  /** 한 변 크기 (기본 64, 작은 줄 44) */
  size?: number;
  icon: React.FC<SvgProps>;
  iconColor?: string;
  /** 있으면 아이콘 대신 이 내용(사진 등)으로 채운다 */
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * 아이콘 아바타 — 레시피북 목록의 북 아바타 등. fill/subtle 배경 + 가운데 아이콘.
 * 레시피북 목록(RecipeCard)과 [+] 시트의 "새 레시피북 만들기"가 같은 모양을 쓴다.
 */
export function IconThumbnail({size = 64, icon: Icon, iconColor, children, style}: IconThumbnailProps) {
  const colors = useColors();
  const small = size < 56;
  const iconSize = small ? 18 : 24;
  return (
    <View
      style={[{
        width: size,
        height: size,
        borderRadius: small ? Radius['radius-sm'] : Radius['radius-md'],
        backgroundColor: colors['fill/subtle'],
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }, style]}>
      {children ?? <Icon width={iconSize} height={iconSize} color={iconColor ?? colors['foreground/on-surface-muted']} />}
    </View>
  );
}
