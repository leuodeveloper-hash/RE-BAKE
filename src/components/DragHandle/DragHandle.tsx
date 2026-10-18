import React from 'react';
import {Pressable, View} from 'react-native';
import {IconDragger} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {dragStyles} from '@hooks/useDragReorder';
import {StyleSheet} from 'react-native';
import {Radius} from '@constants/tokens';

const styles = StyleSheet.create({
  // 손잡이 칸(28)을 꽉 채운 동그라미 — 눌린 바탕이 아이콘 버튼과 같은 크기로 보이게
  press: {
    width: 28,
    height: 28,
    borderRadius: Radius['radius-full'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
  /** 롱프레스 동작 — 기본은 없음(롱프레스는 끌어 옮기기 시작이라 메뉴를 띄우지 않는다) */
  onLongPress?: () => void;
  /** 메뉴가 열려 있을 때 — 다른 아이콘 버튼처럼 눌린 모양을 유지한다 */
  active?: boolean;
}

export function DragHandle({responder, enabled = true, size = 20, color, onPress, onLongPress, active = false}: DragHandleProps) {
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
        // 롱프레스(꾹 눌러 끌기)엔 메뉴를 띄우지 않는다 — onLongPress를 주면 onPress도 안 불린다
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress ?? (() => {})}
          delayLongPress={300}
          hitSlop={6}
          // 누르는 동안·메뉴가 열린 동안 눌린 바탕 — IconButton(ghost)과 같은 state/pressed 동그라미
          style={({pressed}) => [styles.press, (pressed || active) && enabled && {backgroundColor: colors['state/pressed']}]}>
          {icon}
        </Pressable>
      ) : icon}
    </View>
  );
}
