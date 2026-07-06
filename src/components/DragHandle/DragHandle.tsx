import React from 'react';
import {View} from 'react-native';
import {IconDragger} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {dragStyles} from '@hooks/useDragReorder';

export interface DragHandleProps {
  /** useDragReorder.createDragHandlers 결과 (panHandlers 포함). null이면 비활성 */
  responder?: {panHandlers: object} | null;
  /** 비활성 시 아이콘 흐리게 표시 (기본 true) */
  enabled?: boolean;
  /** 아이콘 사이즈 (기본 20) */
  size?: number;
  /** 아이콘 색상 override */
  color?: string;
}

export function DragHandle({responder, enabled = true, size = 20, color}: DragHandleProps) {
  const colors = useColors();
  // IconButton ghost-secondary 변형과 동일한 색 토큰 사용 (활성: on-surface-muted, 비활성: on-surface-disabled)
  const iconColor = color
    ?? (enabled
      ? colors['foreground/on-surface-muted']
      : colors['foreground/on-surface-disabled']);
  return (
    <View {...(responder ? responder.panHandlers : {})} style={dragStyles.handle}>
      <IconDragger width={size} height={size} color={iconColor} />
    </View>
  );
}
