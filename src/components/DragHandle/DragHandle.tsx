import React from 'react';
import {Pressable, View} from 'react-native';
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
  /** 탭 — 행 단위 메뉴(묶음 나누기 등) 트리거 */
  onPress?: () => void;
  /** 롱프레스 — onPress와 같은 메뉴를 여는 보조 경로 */
  onLongPress?: () => void;
}

export function DragHandle({responder, enabled = true, size = 20, color, onPress, onLongPress}: DragHandleProps) {
  const colors = useColors();
  // IconButton ghost-secondary 변형과 동일한 색 토큰 사용 (활성: on-surface-muted, 비활성: on-surface-disabled)
  const iconColor = color
    ?? (enabled
      ? colors['foreground/on-surface-muted']
      : colors['foreground/on-surface-disabled']);
  const icon = <IconDragger width={size} height={size} color={iconColor} />;
  // 탭/롱프레스가 필요하면 Pressable로 감싼다. panHandlers는 바깥 View에 그대로 둬야
  // 드래그 정렬이 계속 동작한다(Pressable이 제스처를 가로채지 않도록).
  // → 탭하면 메뉴, 끌면 드래그.
  return (
    <View {...(responder ? responder.panHandlers : {})} style={dragStyles.handle}>
      {onPress || onLongPress ? (
        <Pressable onPress={onPress} onLongPress={onLongPress ?? onPress} delayLongPress={300} hitSlop={6}>
          {icon}
        </Pressable>
      ) : icon}
    </View>
  );
}
