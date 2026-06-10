import React, {useCallback, useEffect, useState} from 'react';
import {Keyboard, Platform, StyleSheet, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {useColorsV2} from '@contexts/ThemeContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {IconMic, IconCameraFilled, IconPhoto} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {NAV_PILL_HEIGHT} from '@components/Navigation';
import {useSTT} from '@hooks/useSTT';
import {recognizeImageText, parseRecognizedText, type RecipeOcrField} from '@utils/recipeOcr';

export interface RecipeInputFloatingBarProps {
  /** 어떤 필드 타입에 결과를 적용할지 */
  field: RecipeOcrField;
  /** OCR/STT 결과 콜백. 필드 타입을 두 번째 인자로 전달 (blur 후에도 라우팅 가능) */
  onRecognized: (value: string | string[], field: RecipeOcrField) => void;
  /** OCR 시작 */
  onOcrStart?: () => void;
  /** OCR 종료 */
  onOcrEnd?: () => void;
  /** 외부 진행 중 상태 (타이핑 등). true면 카메라 → 정지 아이콘 */
  externalBusy?: boolean;
  /** 정지 버튼 핸들러 */
  onStop?: () => void;
  /** 음성 입력 핸들러 */
  onVoicePress?: () => void;
  style?: ViewStyle;
}

/**
 * 키보드 바로 위에 고정되는 입력 도구 툴바 (가운데 둥근 알약).
 * 키보드 높이를 추적해 키보드 위에 떠 있고, 키보드가 없을 땐 화면 하단 안전영역 위에 위치.
 */
export function RecipeInputFloatingBar({
  field,
  onRecognized,
  onOcrStart,
  onOcrEnd,
  externalBusy,
  onStop,
  onVoicePress,
  style,
}: RecipeInputFloatingBarProps) {
  const colors = useColorsV2();
  const {showSnackbar} = useSnackbar();
  const stt = useSTT();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => setKbHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleVoice = useCallback(() => {
    if (onVoicePress) {
      onVoicePress();
      return;
    }
    if (!stt.supported) {
      showSnackbar('음성 입력 — 준비 중 (모바일 빌드에서 지원 예정)');
      return;
    }
    if (stt.recording) {
      stt.stop();
    } else {
      const capturedField = field;
      stt.start(text => {
        const parsed = parseRecognizedText(text, capturedField);
        onRecognized(parsed, capturedField);
      });
    }
  }, [onVoicePress, stt, showSnackbar, field, onRecognized]);

  const runOcrPipeline = useCallback(async (uri: string, capturedField: RecipeOcrField) => {
    onOcrStart?.();
    try {
      const text = await recognizeImageText(uri);
      if (!text || !text.trim()) {
        showSnackbar('이미지에서 글씨를 찾지 못했어요');
        return;
      }
      const parsed = parseRecognizedText(text, capturedField);
      if (typeof parsed === 'string' ? !parsed.trim() : parsed.length === 0) {
        showSnackbar('이미지에서 글씨를 찾지 못했어요');
        return;
      }
      onRecognized(parsed, capturedField);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('OCR failed', err);
      showSnackbar('이미지 분석 실패. 다시 시도해주세요');
    } finally {
      onOcrEnd?.();
    }
  }, [onRecognized, onOcrStart, onOcrEnd, showSnackbar]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    if (busy) return;
    const capturedField = field;
    setBusy(true);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showSnackbar('카메라 권한이 필요해요 — 설정에서 허용해주세요');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showSnackbar('사진 권한이 필요해요 — 설정에서 허용해주세요');
          return;
        }
      }
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        quality: 0.85,
        base64: Platform.OS === 'web',
        allowsEditing: false,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (result.canceled || !result.assets[0]) return;
      await runOcrPipeline(result.assets[0].uri, capturedField);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Image pick failed', err);
      showSnackbar('이미지를 불러오지 못했어요');
    } finally {
      setBusy(false);
    }
  }, [busy, field, runOcrPipeline, showSnackbar]);

  const handleCameraTap = useCallback(() => {
    if (busy) return;
    if (Platform.OS === 'web') {
      pickImage('library');  // 웹은 카메라 미지원 → 라이브러리
      return;
    }
    pickImage('camera');
  }, [busy, pickImage]);

  const handleGalleryTap = useCallback(() => {
    if (busy) return;
    pickImage('library');
  }, [busy, pickImage]);

  // 키보드 위에 고정 (키보드 없으면 하단 안전영역 위). 8px 간격.
  const bottom = (kbHeight > 0 ? kbHeight : insets.bottom) + 8;

  return (
    <View
      style={[styles.container, {bottom}, style]}
      pointerEvents="box-none">
      <View style={[styles.pill, {backgroundColor: colors['surface/bright']}]}>
        <IconButton
          icon={IconMic}
          onPress={handleVoice}
          variant="ghost-secondary"
          size="medium"
        />
        <IconButton
          icon={IconCameraFilled}
          onPress={() => {
            if (externalBusy || busy) {
              onStop?.();
            } else {
              handleCameraTap();
            }
          }}
          variant="ghost-secondary"
          size="medium"
        />
        {Platform.OS !== 'web' && (
          <IconButton
            icon={IconPhoto}
            onPress={() => {
              if (externalBusy || busy) {
                onStop?.();
              } else {
                handleGalleryTap();
              }
            }}
            variant="ghost-secondary"
            size="medium"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: NAV_PILL_HEIGHT,
    padding: 2,
    gap: 2,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
