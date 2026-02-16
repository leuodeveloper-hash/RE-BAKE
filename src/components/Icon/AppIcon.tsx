import React from 'react';
import {SvgProps} from 'react-native-svg';
import {useColors} from '@contexts/ThemeContext';

export type AppIconSize = 'xs' | 'sm' | 'md' | 'lg';

const ICON_SIZE_MAP: Record<AppIconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
};

export interface AppIconProps {
  icon: React.FC<SvgProps>;
  size?: AppIconSize;
  color?: string;
}

/**
 * 앱 전반에서 사용하는 공통 아이콘 컴포넌트
 *
 * - size: 디자인 토큰 기반 사이즈만 사용 (xs/sm/md/lg)
 * - color: 넘겨주지 않으면 기본 on-surface 색 사용
 * - SVG는 fill="currentColor" 를 사용해야 함 (svgr.config에서 강제)
 */
export function AppIcon({icon: Icon, size = 'md', color}: AppIconProps) {
  const colors = useColors();
  const pixelSize = ICON_SIZE_MAP[size];

  return (
    <Icon
      width={pixelSize}
      height={pixelSize}
      color={color ?? colors['foreground-onsurface']}
    />
  );
}

