import React, {useCallback, useState} from 'react';
import {Keyboard, Platform, StyleSheet, ViewStyle} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useSnackbar} from '@contexts/SnackbarContext';
import {
  IconMic,
  IconScanText,
  IconPhoto,
  IconCameraFilled,
  IconChevronLeft,
  IconChevronRight,
  IconTick,
  IconAdd,
} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Menu} from '@components/Menu';
import {KeyboardToolbar} from '@components/KeyboardToolbar';
import {EditorToolbar} from '@components/EditorToolbar';
import {useSTT} from '@hooks/useSTT';
import {recognizeImageText, parseRecognizedText, type RecipeOcrField} from '@utils/recipeOcr';
import {OcrCropModal} from './OcrCropModal';

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
  /** 이전 입력 구역으로 이동 (◀). 없으면 영역이동 버튼 숨김 */
  onPrevField?: () => void;
  /** 다음 입력 구역으로 이동 (▶) */
  onNextField?: () => void;
  /** ◀ 활성화 여부 */
  canPrev?: boolean;
  /** ▶ 활성화 여부 */
  canNext?: boolean;
  /** 칩 추가(+): 포커스된 과정에 팁/주의/사진 추가 메뉴 열기. 없으면 + 버튼 숨김 */
  onAddChip?: () => void;
  /** + 활성화 여부 (해당사항 없으면 false → disabled) */
  canAddChip?: boolean;
  /** 완료(✓): 기본은 키보드 내리기 */
  onDone?: () => void;
  /**
   * 사진 픽/크롭/OCR 진행 중 여부를 부모에 알림. 부모는 이 값이 true면 바를 계속 마운트 유지해야 한다.
   * (사진 고를 때 입력창 blur → 바 언마운트 → 크롭 모달이 닫히는 문제 방지)
   */
  onPickActiveChange?: (active: boolean) => void;
  style?: ViewStyle;
}

/**
 * 키보드 위에 붙는 입력 도구 툴바 (아이콘 전용).
 * 좌: 영역이동(◀▶) · 음성 · 카메라 · 갤러리 / 우: 완료(✓)
 */
export function RecipeInputFloatingBar({
  field,
  onRecognized,
  onOcrStart,
  onOcrEnd,
  externalBusy,
  onStop,
  onVoicePress,
  onPrevField,
  onNextField,
  canPrev = true,
  canNext = true,
  onAddChip,
  canAddChip = false,
  onDone,
  onPickActiveChange,
  style,
}: RecipeInputFloatingBarProps) {
  const {showSnackbar} = useSnackbar();
  const stt = useSTT();
  const [busy, setBusy] = useState(false);
  const [showScanMenu, setShowScanMenu] = useState(false);
  // 촬영/선택 후 영역 지정 크롭 대상
  const [cropTarget, setCropTarget] = useState<{
    uri: string;
    width: number;
    height: number;
    field: RecipeOcrField;
  } | null>(null);

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
    // 픽 시작 → 부모가 바를 유지하도록 (사진 고를 때 blur로 언마운트되어 크롭 모달이 닫히는 것 방지)
    onPickActiveChange?.(true);
    // iOS: 스캔 메뉴 닫힘 + 키보드가 떠 있는 상태에서 이미지 피커를 present하면
    // "다른 화면 전환 중"이라 iOS가 present를 조용히 무시함(안드는 정상).
    // → 키보드 내리고 한 틱 기다렸다가 피커를 띄운다. (키보드 툴바→메뉴 회귀 수정)
    Keyboard.dismiss();
    let cropStarted = false;
    try {
      if (Platform.OS === 'ios') {
        await new Promise<void>(resolve => setTimeout(resolve, 350));
      }
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
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      // 크기를 알면 영역 지정 크롭, 모르면(드묾) 전체 이미지로 바로 인식
      if (asset.width && asset.height) {
        setCropTarget({uri: asset.uri, width: asset.width, height: asset.height, field: capturedField});
        cropStarted = true; // 크롭 모달이 뜨는 동안 바 유지 (모달 닫힐 때 false)
      } else {
        await runOcrPipeline(asset.uri, capturedField);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Image pick failed', err);
      showSnackbar('이미지를 불러오지 못했어요');
    } finally {
      setBusy(false);
      // 크롭이 뜨지 않았으면(취소/직접 인식/에러) 여기서 유지 해제
      if (!cropStarted) onPickActiveChange?.(false);
    }
  }, [busy, field, runOcrPipeline, showSnackbar, onPickActiveChange]);

  const handleCameraTap = useCallback(() => {
    if (busy) return;
    if (Platform.OS === 'web') {
      // 웹 이미지 인식(OCR)은 정확도·안정성이 낮아 막고 앱으로 안내
      showSnackbar('이미지 인식(OCR)은 앱에서 사용할 수 있어요');
      return;
    }
    pickImage('camera');
  }, [busy, pickImage, showSnackbar]);

  const handleGalleryTap = useCallback(() => {
    if (busy) return;
    pickImage('library');
  }, [busy, pickImage]);

  // 스캔 버튼: 촬영/갤러리 선택 메뉴 토글 (웹은 OCR 미지원 안내)
  const handleScanTap = useCallback(() => {
    if (busy) return;
    if (Platform.OS === 'web') {
      showSnackbar('이미지 인식(OCR)은 앱에서 사용할 수 있어요');
      return;
    }
    setShowScanMenu(v => !v);
  }, [busy, showSnackbar]);

  const handleDone = useCallback(() => {
    Keyboard.dismiss();
    onDone?.();
  }, [onDone]);

  const showRegionNav = !!(onPrevField || onNextField);

  return (
    <>
      <EditorToolbar
        style={style}
        prev={{onPress: onPrevField, disabled: !onPrevField || !canPrev}}
        next={{onPress: onNextField, disabled: !onNextField || !canNext}}
        add={{onPress: onAddChip, disabled: !canAddChip}}
        voice={{onPress: handleVoice, active: stt.recording}}
        scan={{
          onPress: () => {
            if (externalBusy || busy) {
              onStop?.();
            } else {
              handleScanTap();
            }
          },
          active: showScanMenu,
        }}
        onDone={handleDone}
        above={showScanMenu ? (
          <Menu
            items={[
              {id: 'camera', label: '촬영해서 스캔', icon: IconCameraFilled},
              {id: 'gallery', label: '갤러리에서 스캔', icon: IconPhoto},
            ]}
            visible={showScanMenu}
            onSelect={(id) => {
              setShowScanMenu(false);
              pickImage(id === 'camera' ? 'camera' : 'library');
            }}
            onClose={() => setShowScanMenu(false)}
            style={styles.scanMenu}
          />
        ) : undefined}
      />
      <OcrCropModal
        visible={!!cropTarget}
        imageUri={cropTarget?.uri ?? null}
        imageWidth={cropTarget?.width ?? 0}
        imageHeight={cropTarget?.height ?? 0}
        onCancel={() => { setCropTarget(null); onPickActiveChange?.(false); }}
        onConfirm={croppedUri => {
          const capturedField = cropTarget?.field;
          setCropTarget(null);
          if (capturedField) {
            runOcrPipeline(croppedUri, capturedField).finally(() => onPickActiveChange?.(false));
          } else {
            onPickActiveChange?.(false);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // 스캔 선택 메뉴: 바 위쪽, 스캔 버튼 근처에 앵커
  scanMenu: {
    marginLeft: 96,
    marginBottom: 6,
  },
});
