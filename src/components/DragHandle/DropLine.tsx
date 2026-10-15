import React from 'react';
import {Animated, StyleSheet} from 'react-native';
import {useColors} from '@contexts/ThemeContext';

/**
 * 끌어 옮길 때 놓일 자리 표시 — 목록 맨 위 레이어에 한 줄(2px).
 * 줄 테두리로 그리면 선이 생길 때 줄 높이가 늘어 밀렸고, 줄 안에 그리면 끄는 줄에 가려졌다(아래로 옮길 때).
 * 목록(줄들을 감싼 View) 안 마지막에 두고, top은 그 목록 기준 좌표.
 */
export function DropLine({top, opacity}: {top: Animated.Value; opacity: Animated.Value}) {
  const colors = useColors();
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.line, {top, opacity, backgroundColor: colors['custom/yellow'] as string}]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 100,
    elevation: 100,
  },
});
