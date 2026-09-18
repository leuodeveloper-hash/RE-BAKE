import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {RainbowText} from './RainbowText';

interface BulkTypingOverlayProps {
  /** 표시할 전체 텍스트 (입력값과 동일해야 한다) */
  text: string;
  /** 입력과 같은 글자 스타일 — 폰트·줄높이가 다르면 위치가 어긋난다 */
  textStyle?: StyleProp<any>;
  /** 입력과 같은 안쪽 여백 */
  containerStyle?: StyleProp<ViewStyle>;
  onDone?: () => void;
}

/**
 * "한번에 쓰기" 입력 위에 덮는 타이핑(무지개) 오버레이.
 *
 * 타이핑 중에는 입력 글자를 transparent로 두고 이 오버레이만 보이므로,
 * 오버레이가 잘리면 그대로 "글이 사라진" 것처럼 보인다.
 *
 * absoluteFill만 쓰면 부모(입력 컨테이너) 높이에 갇힌다. AutoGrowInput의
 * 높이 계산이 반영되기 전에 그려지면 마지막 줄이 밖으로 밀려 잘렸다
 * (이미지로 긴 텍스트를 불러올 때 마지막이 사라지던 원인).
 *
 * top/left만 고정해 너비는 부모를 따르되 높이는 내용만큼 자라게 하고,
 * 혹시 부모가 클립하더라도 글자가 지워지지 않도록 overflow를 열어 둔다.
 */
export function BulkTypingOverlay({text, textStyle, containerStyle, onDone}: BulkTypingOverlayProps) {
  return (
    <View pointerEvents="none" style={[styles.overlay, containerStyle]}>
      <RainbowText style={textStyle} animated onDone={onDone}>{text}</RainbowText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // bottom을 주지 않는다 — 높이를 내용에 맡겨야 마지막 줄이 잘리지 않는다
    overflow: 'visible',
  },
});
