import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {IconBlackNoseExclamation} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {LoadingLogo} from '@components/PullIndicator';

/**
 * 깨진 이미지 표시 — 이미지 자리 가운데에 블랙 노즈(앱 캐릭터).
 * 이미지 위에 겹쳐 그린다(부모가 이미지 크기·모서리를 가진다). 썸네일·상단 사진·사진 뷰어 공용.
 */
export function BrokenImageMark({size = 40, style}: {size?: number; style?: StyleProp<ViewStyle>}) {
  const colors = useColors();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.mark, {backgroundColor: colors['fill/faint']}, style]}>
      <IconBlackNoseExclamation width={size} height={size} color={colors['fill/strong'] as string} />
    </View>
  );
}

/**
 * 아직 불러오는 중 — 이미지 자리에 옅게 깜빡이는 바탕 + 가운데 작은 로딩.
 * 이미지 위에 겹쳐 그린다(부모가 크기·모서리). 썸네일·과정 사진·상단 사진·사진 뷰어 공용.
 */
export function ImageLoadingMark({dark, label, style}: {dark?: boolean; /** 로딩 아래 한 줄(예: 보정하는 중) */ label?: string; style?: StyleProp<ViewStyle>}) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, {toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      Animated.timing(pulse, {toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.mark, style]}>
      {/* 다크(사진 위)는 사진을 어둡게 깜빡여 작업 중임을 보인다 */}
      <Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: dark ? 'rgba(0,0,0,0.45)' : colors['fill/faint'], opacity: pulse}]} />
      {/* 당겨서 새로고침과 같은 로딩(크레파스 로고) */}
      <LoadingLogo color={dark ? '#FFFFFF' : undefined} />
      {label ? <Text style={[styles.label, {color: dark ? '#FFFFFF' : (colors['foreground/on-surface-muted'] as string)}]}>{label}</Text> : null}
    </View>
  );
}

/** 불러오기가 이보다 길면 로딩 표시를 걷는다 — 웹에서 onLoad가 안 오는 경우가 있어 계속 돌지 않게 */
const LOADING_GIVE_UP_MS = 10000;

/**
 * 이미지 상태 — 깨졌는지(onError)·불러오는 중인지(onLoad). 주소가 바뀌면 다시 본다.
 * 이미 캐시에 있으면 onLoad가 바로 와 로딩 표시가 거의 보이지 않는다.
 */
export function useBrokenImage(uri: string | number | undefined | null) {
  const [broken, setBroken] = useState(false);
  const [loading, setLoading] = useState(typeof uri === 'string' && !!uri);
  useEffect(() => {
    setBroken(false);
    const remote = typeof uri === 'string' && !!uri;
    setLoading(remote);
    if (!remote) return;
    const timer = setTimeout(() => setLoading(false), LOADING_GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [uri]);
  return {
    broken,
    loading: loading && !broken,
    onError: () => { setBroken(true); setLoading(false); },
    onLoad: () => setLoading(false),
  };
}

const styles = StyleSheet.create({
  mark: {alignItems: 'center', justifyContent: 'center', gap: 8},
  label: {fontSize: 13, fontWeight: '600'},
});
