import React, {useEffect, useState} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {IconBlackNoseExclamation} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';

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

/** 이미지가 깨졌는지 — onError에 연결. 주소가 바뀌면 다시 본다 */
export function useBrokenImage(uri: string | number | undefined | null) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [uri]);
  return {broken, onError: () => setBroken(true)};
}

const styles = StyleSheet.create({
  mark: {alignItems: 'center', justifyContent: 'center'},
});
