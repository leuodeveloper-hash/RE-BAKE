import React, {useCallback, useState} from 'react';
import {Platform, Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useColors} from '@contexts/ThemeContext';
import {Radius} from '@constants/tokens';
import {IconCameraFilled} from '@components/Icon/IconIndex';
import {recognizeImageText, parseRecognizedText, type RecipeOcrField} from '@utils/recipeOcr';

export interface RecipeOcrButtonProps {
  /** 어떤 필드 타입에 결과를 적용할지 */
  field: RecipeOcrField;
  /** OCR 시작될 때 (스켈레톤 표시 트리거) */
  onStart?: () => void;
  /** OCR 결과 (파싱된 값). 필드 타입에 따라 string(제목) 또는 string[] */
  onRecognized: (value: string | string[]) => void;
  /** OCR 끝났을 때 (성공/실패 무관) */
  onEnd?: () => void;
  /** 절대 위치 스타일 (플로팅 위치) */
  style?: ViewStyle;
}

/**
 * 카메라 촬영 → OCR → 필드별 파싱 결과 콜백.
 * 활성 필드 옆에 플로팅 버튼으로 사용.
 */
export function RecipeOcrButton({field, onStart, onRecognized, onEnd, style}: RecipeOcrButtonProps) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);

  const handlePress = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    onStart?.();
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        onEnd?.();
        setBusy(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        base64: Platform.OS === 'web',
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) {
        onEnd?.();
        return;
      }
      const text = await recognizeImageText(result.assets[0].uri);
      const parsed = parseRecognizedText(text, field);
      onRecognized(parsed);
    } catch (err) {
      // 실패 시 silent — 상위에서 스낵바 등 처리
      // eslint-disable-next-line no-console
      console.warn('OCR failed', err);
    } finally {
      onEnd?.();
      setBusy(false);
    }
  }, [busy, field, onStart, onRecognized, onEnd]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      style={({pressed}) => [
        styles.button,
        {backgroundColor: colors['foreground/on-surface']},
        pressed && {opacity: 0.8},
        busy && {opacity: 0.6},
        style,
      ]}
      hitSlop={8}>
      <IconCameraFilled width={20} height={20} color={colors['surface/normal']} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
});
