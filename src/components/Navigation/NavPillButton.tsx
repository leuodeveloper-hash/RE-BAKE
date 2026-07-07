import React from 'react';
import {SvgProps} from 'react-native-svg';
import {GlassContainer} from '@components/Container';
import {IconButton, type IconButtonSize} from '@components/IconButton';
import {navPillStyle} from './FloatingNavBar';

/** 알약(pill) 안에는 배경 없는 ghost 계열만 사용 (유리 알약이 배경 역할을 하므로) */
type NavPillVariant = 'ghost' | 'ghost-primary' | 'ghost-secondary' | 'ghost-inverse' | 'ghost-yellow';

export interface NavPillButtonProps {
  icon: React.FC<SvgProps>;
  onPress?: () => void;
  /** ghost 계열만 허용 (기본: ghost-primary) */
  variant?: NavPillVariant;
  /** 아이콘 버튼 크기 (기본: medium) */
  size?: IconButtonSize;
  disabled?: boolean;
}

/**
 * 플로팅 헤더/오버레이용 유리 알약(pill) 안에 아이콘 버튼 하나.
 * 앱 전반에서 반복되던 `<GlassContainer contentStyle={navPillStyle}><IconButton/></GlassContainer>`
 * 조합을 공통화한 것. 하나 고치면 모든 플로팅 알약 버튼에 반영된다.
 */
export function NavPillButton({icon, onPress, variant = 'ghost-primary', size = 'medium', disabled}: NavPillButtonProps) {
  return (
    <GlassContainer contentStyle={navPillStyle}>
      <IconButton icon={icon} onPress={onPress} variant={variant} size={size} disabled={disabled} />
    </GlassContainer>
  );
}
