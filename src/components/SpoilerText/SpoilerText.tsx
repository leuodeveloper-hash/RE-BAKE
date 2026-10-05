import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleProp, StyleSheet, Text, TextStyle, View} from 'react-native';
import {useColors} from '@contexts/ThemeContext';

export interface SpoilerTextProps {
  /** 가릴 글 — 자리(폭·높이)만 차지하고 글자는 안 보인다 */
  children: string;
  /** 바깥 글과 같은 서체·크기 — 가린 자리 크기를 맞추려고 */
  textStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
}

/** 점 몇 개를 한 무리로 깜빡인다 — 점마다 애니메이션을 두면 무거워서 3무리로 나눈다 */
const GROUPS = 3;
/** 점 밀도 — 면적 몇 px²마다 한 개 */
const AREA_PER_DOT = 18;

/**
 * 가린 글(스포일러) — 인스타·스레드처럼 글자 자리에 반짝이는 먼지 점을 깐다.
 * 글자는 투명하게 그려 자리만 잡고, 그 위에 점들을 무작위로 뿌려 무리별로 깜빡인다.
 * 누르면 onPress(링크 열기 등).
 */
export function SpoilerText({children, textStyle, onPress}: SpoilerTextProps) {
  const colors = useColors();
  const [size, setSize] = useState({w: 0, h: 0});
  const anims = useRef(Array.from({length: GROUPS}, () => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 260),
      Animated.timing(v, {toValue: 1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      Animated.timing(v, {toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [anims]);

  // 크기가 정해지면 점 자리를 한 번만 뽑는다(다시 그릴 때마다 흔들리지 않게)
  const dots = useMemo(() => {
    if (!size.w || !size.h) return [];
    const count = Math.max(8, Math.round((size.w * size.h) / AREA_PER_DOT));
    return Array.from({length: count}, (_, i) => ({
      x: Math.random() * size.w,
      y: Math.random() * size.h,
      r: Math.random() < 0.3 ? 1.5 : 1,
      group: i % GROUPS,
    }));
  }, [size.w, size.h]);

  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.wrap} onLayout={(e: any) => setSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}>
      <Text style={[textStyle, styles.hidden]}>{children}</Text>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({length: GROUPS}, (_, g) => (
          <Animated.View
            key={g}
            style={[StyleSheet.absoluteFill, {opacity: anims[g].interpolate({inputRange: [0, 1], outputRange: [0.25, 1]})}]}>
            {dots.filter(d => d.group === g).map((d, i) => (
              <View
                key={i}
                style={{position: 'absolute', left: d.x, top: d.y, width: d.r * 2, height: d.r * 2, borderRadius: d.r, backgroundColor: colors['foreground/on-surface-muted']}}
              />
            ))}
          </Animated.View>
        ))}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  hidden: {
    color: 'transparent',
  },
});
