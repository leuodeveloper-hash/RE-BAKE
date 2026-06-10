import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleProp, Text, TextStyle} from 'react-native';
import {useColorsV2} from '@contexts/ThemeContext';

const AnimatedText = Animated.createAnimatedComponent(Text);

// 파도 앞에서 흐르는 무지개 띠 색 (글자마다 다른 색이 보이도록 8색)
const RAINBOW = ['#E0533B', '#E07A3A', '#CFA32B', '#7BAA1A', '#3FA98C', '#5A85D6', '#8E6FD6', '#D6537C'] as const;
// 무지개 띠 폭 (글자 수) — 변환 파도 앞 8글자가 무지개
const BAND = 8;

export interface RainbowTextProps {
  children: React.ReactNode;
  /** 텍스트 스타일 (폰트/라인하이트는 글자에 상속) */
  style?: StyleProp<TextStyle>;
  /** 애니메이션 활성화 */
  animated?: boolean;
  /** reveal+convert 시퀀스 종료 콜백 */
  onDone?: () => void;
}

/**
 * OCR/STT 결과 표시 애니메이션.
 * 1) reveal — 글자가 muted 색으로 좌→우로 쭉쭉 찍힘
 * 2) hold  — 잠깐 멈춤
 * 3) convert — 처음 글자부터 on-surface로 재색칠되는 파도가 우측으로 지나가고,
 *    파도 앞 8글자는 각기 다른 무지개색으로 보였다가 우측으로 사라짐.
 */
export function RainbowText({children, style, animated = true, onDone}: RainbowTextProps) {
  const colors = useColorsV2();
  const muted = colors['foreground/on-surface-muted'] as string;
  const onSurface = colors['foreground/on-surface'] as string;

  const text = typeof children === 'string' ? children : String(children ?? '');
  const chars = useMemo(() => Array.from(text), [text]);
  const n = chars.length;

  const reveal = useRef(new Animated.Value(0)).current;
  const convert = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!animated || n === 0) {
      onDoneRef.current?.();
      return;
    }
    reveal.setValue(0);
    convert.setValue(0);
    // 쭉쭉 — 글자당 14ms, 220~1400ms로 클램프
    const revealMs = Math.min(1400, Math.max(220, n * 14));
    const holdMs = 380;
    // 변환 파도 — 글자당 28ms, 700~3200ms로 클램프
    const convertMs = Math.min(3200, Math.max(700, (n + BAND) * 28));
    const anim = Animated.sequence([
      Animated.timing(reveal, {
        toValue: n,
        duration: revealMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(holdMs),
      Animated.timing(convert, {
        toValue: n + BAND,
        duration: convertMs,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    anim.start(({finished}) => {
      if (finished) onDoneRef.current?.();
    });
    return () => anim.stop();
  }, [animated, n, reveal, convert]);

  if (n === 0) return null;
  if (!animated) return <Text style={style}>{text}</Text>;

  return (
    <Text style={style}>
      {chars.map((ch, i) => {
        const opacity = reveal.interpolate({
          inputRange: [i, i + 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });
        // 파도가 글자 i에 닿으면 muted → 무지개(중간) → on-surface
        const color = convert.interpolate({
          inputRange: [i, i + BAND / 2, i + BAND],
          outputRange: [muted, RAINBOW[i % RAINBOW.length], onSurface],
          extrapolate: 'clamp',
        });
        return (
          <AnimatedText key={i} style={{color, opacity}}>
            {ch}
          </AnimatedText>
        );
      })}
    </Text>
  );
}
