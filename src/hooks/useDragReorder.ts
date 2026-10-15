import {useCallback, useRef, useState} from 'react';
import {Animated, PanResponder, StyleSheet} from 'react-native';
import {triggerHaptic} from '@utils/haptics';
import {CARD_GROUP_GAP} from '@components/Container/Card';

export const ROW_HEIGHT = 48;

export const dragStyles = StyleSheet.create({
  handle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function useDragReorder() {
  const dragY = useRef(new Animated.Value(0)).current;
  const indicatorTop = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const dragFromRef = useRef<number | null>(null);
  const dropTargetRef = useRef<number | null>(null);
  const dragItemsLengthRef = useRef(0);

  // 아이템별 페이지 Y 좌표 저장
  const itemPageYRef = useRef<Map<string, number>>(new Map());
  // 아이템 높이 — 가운데끼리 비교한다(윗변끼리 비교하면 내용이 긴 줄은 한참 끌어야 자리가 바뀌었다)
  const itemHeightRef = useRef<Map<string, number>>(new Map());
  const dragStartPageY = useRef(0);
  const draggedItemOriginalY = useRef(0);

  // ref 맵: Animated.View ref를 저장해 measureInWindow 호출용
  const itemViewRefs = useRef<Map<string, any>>(new Map());

  const createItemRef = useCallback((id: string) => (el: any) => {
    if (el) {
      itemViewRefs.current.set(id, el);
    } else {
      itemViewRefs.current.delete(id);
    }
  }, []);

  const handleItemLayout = useCallback((id: string) => () => {
    const el = itemViewRefs.current.get(id);
    if (el && typeof el.measureInWindow === 'function') {
      el.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        itemPageYRef.current.set(id, y);
        itemHeightRef.current.set(id, h);
      });
    } else {
      console.warn(`[DRAG] no measureInWindow for ${id}, el=`, typeof el, el ? Object.keys(el).slice(0, 5) : 'null');
    }
  }, []);

  const registerItemPosition = useCallback((id: string, pageY: number) => {
    itemPageYRef.current.set(id, pageY);
  }, []);

  const createDragHandlers = useCallback(
    (itemId: string, index: number, items: {id: string}[], reorder: (from: number, to: number) => void) => {
      const callbacksRef = {itemId, index, items, reorder};
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (_, gesture) => {
          setScrollEnabled(false);
          triggerHaptic('light'); // 드래그 시작(집어올림) 햅틱
          setDraggingId(callbacksRef.itemId);
          dragFromRef.current = callbacksRef.index;
          dropTargetRef.current = callbacksRef.index;
          dragItemsLengthRef.current = callbacksRef.items.length;
          dragStartPageY.current = gesture.y0;
          indicatorOpacity.setValue(0);
          dragY.setValue(0);
          // 드래그 시작 시 모든 아이템 위치 재측정 (스크롤 후 stale 방지)
          for (const item of callbacksRef.items) {
            const el = itemViewRefs.current.get(item.id);
            if (el && el.measureInWindow) {
              const capturedId = item.id;
              const isDraggedItem = capturedId === callbacksRef.itemId;
              el.measureInWindow((_x: number, y: number, _w: number, h: number) => {
                itemPageYRef.current.set(capturedId, y);
                itemHeightRef.current.set(capturedId, h);
                if (isDraggedItem) {
                  draggedItemOriginalY.current = y;
                }
              });
            }
          }
        },
        onPanResponderMove: Animated.event([null, {dy: dragY}], {useNativeDriver: false}),
        onPanResponderRelease: (_, gesture) => {
          const fromIdx = dragFromRef.current ?? 0;
          const items_ = callbacksRef.items;
          const positions = itemPageYRef.current;

          // 아이템의 현재 시각적 위치 기반 계산 (손가락 위치가 아닌 아이템 위치)
          const currentPageY = draggedItemOriginalY.current + gesture.dy
            + (itemHeightRef.current.get(callbacksRef.itemId) ?? 0) / 2; // 끄는 줄의 가운데
          let newIdx = fromIdx;
          let minDist = Infinity;

          for (let i = 0; i < items_.length; i++) {
            const top = positions.get(items_[i].id);
            const itemY = top != null ? top + (itemHeightRef.current.get(items_[i].id) ?? 0) / 2 : undefined; // 줄의 가운데
            if (itemY != null) {
              const dist = Math.abs(currentPageY - itemY);
              if (dist < minDist) {
                minDist = dist;
                newIdx = i;
              }
            }
          }

          // 위치 정보가 없으면 기존 ROW_HEIGHT 방식 폴백
          if (minDist === Infinity) {
            // 묶음 카드(줄 사이 1px 간격)도 같이 — 줄 한 칸 = 줄 높이 + 간격
            const moveBy = Math.round(gesture.dy / (ROW_HEIGHT + CARD_GROUP_GAP));
            newIdx = Math.max(0, Math.min(items_.length - 1, fromIdx + moveBy));
          }

          if (fromIdx !== newIdx) {
            triggerHaptic('medium'); // 순서 변경 완료(드롭) 햅틱
            callbacksRef.reorder(fromIdx, newIdx);
          }
          dragY.setValue(0);
          indicatorOpacity.setValue(0);
          setDraggingId(null);
          dropTargetRef.current = null;
          dragFromRef.current = null;
          setScrollEnabled(true);
        },
        onPanResponderTerminate: () => {
          dragY.setValue(0);
          indicatorOpacity.setValue(0);
          setDraggingId(null);
          dropTargetRef.current = null;
          dragFromRef.current = null;
          setScrollEnabled(true);
        },
      });
    },
    [dragY, indicatorOpacity],
  );

  return {
    dragY,
    indicatorTop,
    indicatorOpacity,
    draggingId,
    scrollEnabled,
    createDragHandlers,
    dragFromRef,
    dropTargetRef,
    dragItemsLengthRef,
    registerItemPosition,
    createItemRef,
    handleItemLayout,
    itemPageYRef,
    itemHeightRef,
    draggedItemOriginalY,
  };
}
