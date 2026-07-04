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
 * OCR/STT 결과 표시 애니메이션 (연속 흐름).
 * reveal(연한색 등장)과 convert(진한색 변환) 파도가 동시에 흐르되,
 * 진한색 파도가 reveal 뒤를 일정 간격(lag)으로 쫓아간다.
 * → 글자가 뜨는 즉시 차례로 진해져, "전체 등장 후 일괄 변환"의 끊김 없이
 *   스트리밍처럼 매끄럽게 완성된다. 파도 앞 8글자는 무지개색으로 스쳐 지나감.
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
    // 두 파도가 같은 속도(글자당 PER_CHAR)로 흘러야 간격이 일정하게 유지됨 → linear
    const PER_CHAR = 20;
    // 진한색 파도가 reveal 뒤를 쫓는 간격(글자 수). 클수록 연한색 꼬리가 길게 보임
    const LAG = 6;
    const revealMs = Math.min(2000, Math.max(220, n * PER_CHAR));
    const lagMs = LAG * PER_CHAR;
    // 변환 파도는 reveal보다 lag만큼 늦게 시작해 무지개 BAND까지 마저 통과
    const convertMs = Math.min(2000, Math.max(220, (n + BAND) * PER_CHAR));
    const anim = Animated.parallel([
      Animated.timing(reveal, {
        toValue: n,
        duration: revealMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.delay(lagMs),
        Animated.timing(convert, {
          toValue: n + BAND,
          duration: convertMs,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
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
