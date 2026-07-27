import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleProp, Text, TextStyle} from 'react-native';
import {useColors} from '@contexts/ThemeContext';

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
  const colors = useColors();
  const muted = colors['foreground/on-surface-muted'] as string;
  const onSurface = colors['foreground/on-surface'] as string;

  const text = typeof children === 'string' ? children : String(children ?? '');
  const chars = useMemo(() => Array.from(text), [text]);
  const n = chars.length;

  const convert = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!animated || n === 0) {
      onDoneRef.current?.();
      return;
    }
    convert.setValue(0);
    const PER_CHAR = 20;
    // 변환 파도: muted로 등장한 글자를 무지개 거쳐 on-surface로 물들이며 흐른다.
    const convertMs = Math.min(2000, Math.max(220, (n + BAND) * PER_CHAR));
    const anim = Animated.timing(convert, {
      toValue: n + BAND,
      duration: convertMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    let done = false;
    const finish = () => { if (!done) { done = true; onDoneRef.current?.(); } };
    anim.start(({finished}) => { if (finished) finish(); });
    // 텍스트 교체 등으로 애니메이션이 중단(stop)돼도 onDone을 보장 → 실제 입력이
    // color:transparent 인 채로 남아 '빈칸처럼' 보이는 문제 방지. (한번에쓰기 append 시 재현)
    return () => { anim.stop(); finish(); };
  }, [animated, n, convert]);

  if (n === 0) return null;
  if (!animated) return <Text style={style}>{text}</Text>;

  return (
    <Text style={style}>
      {chars.map((ch, i) => {
        // reveal(등장) 파도: muted 색으로 등장. 애니가 (전환/중단 등으로) 안 끝나도
        // opacity로 숨기지 않는다 — opacity 0에 갇혀 값이 통째로 안 보이는 버그 방지.
        // 아직 파도가 안 닿은 글자는 살짝 흐리게(muted+반투명 아님)만.
        const color = convert.interpolate({
          // 파도가 글자 i에 닿으면 muted → 무지개(중간) → on-surface
          inputRange: [i, i + BAND / 2, i + BAND],
          outputRange: [muted, RAINBOW[i % RAINBOW.length], onSurface],
          extrapolate: 'clamp',
        });
        return (
          <AnimatedText key={i} style={{color}}>
            {ch}
          </AnimatedText>
        );
      })}
    </Text>
  );
}
