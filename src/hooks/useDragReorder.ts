import {useCallback, useRef, useState} from 'react';
import {Animated, PanResponder, StyleSheet} from 'react-native';

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

  const createDragHandlers = useCallback(
    (itemId: string, index: number, items: {id: string}[], reorder: (from: number, to: number) => void) => {
      const callbacksRef = {itemId, index, items, reorder};
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          setScrollEnabled(false);
          setDraggingId(callbacksRef.itemId);
          dragFromRef.current = callbacksRef.index;
          dropTargetRef.current = callbacksRef.index;
          dragItemsLengthRef.current = callbacksRef.items.length;
          indicatorOpacity.setValue(0);
          dragY.setValue(0);
        },
        onPanResponderMove: Animated.event([null, {dy: dragY}], {useNativeDriver: false}),
        onPanResponderRelease: (_, gesture) => {
          const fromIdx = dragFromRef.current ?? 0;
          const moveBy = Math.round(gesture.dy / ROW_HEIGHT);
          const newIdx = Math.max(0, Math.min(callbacksRef.items.length - 1, fromIdx + moveBy));
          if (fromIdx !== newIdx) {
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
  };
}
