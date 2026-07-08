import {Alert, Linking, Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type ImagePermissionKind = 'camera' | 'mediaLibrary';

interface EnsureOptions {
  /** 권한 거부(재요청 가능) 시 보여줄 스낵바 문구 */
  deniedMessage: string;
  /** 스낵바 표시 함수 */
  showSnackbar: (msg: string) => void;
  /** 영구 거부(설정에서만 켤 수 있음) 시 Alert에 쓸 문구 */
  settingsTitle: string;
  settingsBody: string;
  settingsConfirmLabel: string;
  settingsCancelLabel: string;
}

/**
 * 카메라/사진 권한을 보장한다. 핵심: 한 번 거부해도 다시 시도할 수 있게 함.
 * - 이미 granted → true
 * - 아직 물어본 적 없거나 재요청 가능(canAskAgain) → request 재시도
 * - 영구 거부(canAskAgain=false) → 시스템 팝업이 더는 안 뜨므로 "설정 열기" Alert로 안내
 *
 * 기존 코드는 request 결과만 보고 실패 시 스낵바만 띄워서, 한 번 거부하면
 * 그 뒤로 팝업도 안 뜨고 계속 막히는 버그가 있었다. 이 헬퍼로 통일해 해결한다.
 */
export async function ensureImagePermission(
  kind: ImagePermissionKind,
  opts: EnsureOptions,
): Promise<boolean> {
  const get = kind === 'camera'
    ? ImagePicker.getCameraPermissionsAsync
    : () => ImagePicker.getMediaLibraryPermissionsAsync();
  const request = kind === 'camera'
    ? ImagePicker.requestCameraPermissionsAsync
    : () => ImagePicker.requestMediaLibraryPermissionsAsync();

  const current = await get();
  if (current.granted) return true;

  // 재요청 가능하면(처음이거나 iOS "한 번만 허용" 등) 시스템 팝업 다시 띄움
  if (current.canAskAgain) {
    const req = await request();
    if (req.granted) return true;
    if (req.canAskAgain) {
      // 사용자가 이번 팝업에서 거부 → 다음에 또 시도할 수 있음. 안내만.
      opts.showSnackbar(opts.deniedMessage);
      return false;
    }
  }

  // 영구 거부: 시스템 팝업이 안 뜨므로 설정 앱으로 유도
  Alert.alert(
    opts.settingsTitle,
    opts.settingsBody,
    [
      {text: opts.settingsCancelLabel, style: 'cancel'},
      {
        text: opts.settingsConfirmLabel,
        onPress: () => {
          if (Platform.OS !== 'web') Linking.openSettings().catch(() => {});
        },
      },
    ],
  );
  return false;
}
