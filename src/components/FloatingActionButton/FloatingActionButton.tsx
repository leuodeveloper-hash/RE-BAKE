import React from 'react';
import {Pressable, StyleSheet, View, type ViewStyle} from 'react-native';
import type {SvgProps} from 'react-native-svg';
import {useColorsV2} from '@contexts/ThemeContext';
import {Spacing} from '@constants/spacing';

export interface FloatingActionButtonProps {
  icon: React.FC<SvgProps>;
  onPress: () => void;
  accessibilityLabel?: string;
  /** 위치/여백 오버라이드 */
  style?: ViewStyle;
}

const SIZE = 56;
// 하단 탭바(app/_layout: bottom Spacing.lg, 높이 ~68)와 세로 중앙을 맞추기 위한 보정
const TABBAR_ALIGN = 6;

/**
 * 우측 하단 플로팅 액션 버튼. 하단 탭바(가운데 펠릿)와 겹치지 않는 우측 영역에 위치.
 */
export function FloatingActionButton({icon: Icon, onPress, accessibilityLabel, style}: FloatingActionButtonProps) {
  const colors = useColorsV2();
  return (
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({pressed}) => [
          styles.button,
          {backgroundColor: colors['foreground/on-surface']},
          pressed && {opacity: 0.85, transform: [{scale: 0.96}]},
        ]}
        hitSlop={8}>
        <Icon width={26} height={26} color={colors['surface/normal']} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg + TABBAR_ALIGN,
    zIndex: 20,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
});
