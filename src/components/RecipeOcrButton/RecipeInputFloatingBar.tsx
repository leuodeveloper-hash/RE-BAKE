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
import {dismissKeyboardAndWait} from '@utils/keyboard';
import {ensureImagePermission} from '@utils/imagePermission';
import {useTranslation} from '@contexts/LanguageContext';
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
  const {t} = useTranslation();
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
      showSnackbar(t('recipeInputFloatingBar.voiceComingSoon'));
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
  }, [onVoicePress, stt, showSnackbar, field, onRecognized, t]);

  const runOcrPipeline = useCallback(async (uri: string, capturedField: RecipeOcrField) => {
    onOcrStart?.();
    try {
      const text = await recognizeImageText(uri);
      if (!text || !text.trim()) {
        showSnackbar(t('recipeInputFloatingBar.noTextFound'));
        return;
      }
      const parsed = parseRecognizedText(text, capturedField);
      if (typeof parsed === 'string' ? !parsed.trim() : parsed.length === 0) {
        showSnackbar(t('recipeInputFloatingBar.noTextFound'));
        return;
      }
      onRecognized(parsed, capturedField);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('OCR failed', err);
      showSnackbar(t('recipeInputFloatingBar.ocrFailed'));
    } finally {
      onOcrEnd?.();
    }
  }, [onRecognized, onOcrStart, onOcrEnd, showSnackbar, t]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    if (busy) return;
    const capturedField = field;
    setBusy(true);
    // 픽 시작 → 부모가 바를 유지하도록 (사진 고를 때 blur로 언마운트되어 크롭 모달이 닫히는 것 방지)
    onPickActiveChange?.(true);
    // iOS: 키보드가 떠 있는 상태에서 이미지 피커를 present하면 "전환 중"이라 조용히 무시됨.
    // → 키보드를 내리고 실제로 내려간 뒤(keyboardDidHide) present. (갤러리 안열림 회귀 근본 대응)
    let cropStarted = false;
    try {
      await dismissKeyboardAndWait();
      const permOk = source === 'camera'
        ? await ensureImagePermission('camera', {
            deniedMessage: t('recipeInputFloatingBar.cameraPermissionNeeded'),
            showSnackbar,
            settingsTitle: t('permission.cameraTitle'),
            settingsBody: t('permission.cameraBody'),
            settingsConfirmLabel: t('permission.openSettings'),
            settingsCancelLabel: t('permission.cancel'),
          })
        : await ensureImagePermission('mediaLibrary', {
            deniedMessage: t('recipeInputFloatingBar.photoPermissionNeeded'),
            showSnackbar,
            settingsTitle: t('permission.photoTitle'),
            settingsBody: t('permission.photoBody'),
            settingsConfirmLabel: t('permission.openSettings'),
            settingsCancelLabel: t('permission.cancel'),
          });
      if (!permOk) return;
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
      showSnackbar(t('recipeInputFloatingBar.imageLoadFailed'));
    } finally {
      setBusy(false);
      // 크롭이 뜨지 않았으면(취소/직접 인식/에러) 여기서 유지 해제
      if (!cropStarted) onPickActiveChange?.(false);
    }
  }, [busy, field, runOcrPipeline, showSnackbar, onPickActiveChange, t]);

  const handleCameraTap = useCallback(() => {
    if (busy) return;
    if (Platform.OS === 'web') {
      // 웹 이미지 인식(OCR)은 정확도·안정성이 낮아 막고 앱으로 안내
      showSnackbar(t('recipeInputFloatingBar.ocrAppOnly'));
      return;
    }
    pickImage('camera');
  }, [busy, pickImage, showSnackbar, t]);

  const handleGalleryTap = useCallback(() => {
    if (busy) return;
    pickImage('library');
  }, [busy, pickImage]);

  // 스캔 버튼: 촬영/갤러리 선택 메뉴 토글 (웹은 OCR 미지원 안내)
  const handleScanTap = useCallback(() => {
    if (busy) return;
    if (Platform.OS === 'web') {
      showSnackbar(t('recipeInputFloatingBar.ocrAppOnly'));
      return;
    }
    if (showScanMenu) {
      setShowScanMenu(false);
      onPickActiveChange?.(false);
    } else {
      // 메뉴 여는 순간 바로 '활성' 신호 → 메뉴 탭 시 입력 blur로 툴바가 언마운트되지 않게 유지
      // (안 그러면 focusedOcrField=null 되며 툴바+메뉴가 통째로 사라져 "내려가고 반응없음")
      onPickActiveChange?.(true);
      setShowScanMenu(true);
    }
  }, [busy, showScanMenu, showSnackbar, onPickActiveChange, t]);

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
              {id: 'camera', label: t('recipeInputFloatingBar.scanByCamera'), icon: IconCameraFilled},
              {id: 'gallery', label: t('recipeInputFloatingBar.scanFromGallery'), icon: IconPhoto},
            ]}
            visible={showScanMenu}
            onSelect={(id) => {
              // 툴바(이 컴포넌트)가 blur로 언마운트되면 pickImage의 async 흐름이 끊겨
              // 피커 present가 씹힌다("한 번 눌러선 안 열림"). → 메뉴 닫기 전에 pickActive를
              // 먼저 세워 툴바 유지를 보장하고, 그 다음 메뉴를 닫는다.
              onPickActiveChange?.(true);
              setShowScanMenu(false);
              pickImage(id === 'camera' ? 'camera' : 'library');
            }}
            onClose={() => { setShowScanMenu(false); onPickActiveChange?.(false); }}
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
