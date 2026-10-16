import {Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * 사진 고르기 — 앱 안 사진첩 화면(AlbumPickerHost)을 띄운다. 마지막으로 연 앨범을 기억한다.
 * 결과 모양은 expo-image-picker와 같다 — 기존 호출부가 launchImageLibraryAsync 자리만 바꿔 쓴다.
 * 웹은 브라우저 파일 선택(기존 그대로).
 */
export interface PickedAsset {
  uri: string;
  width: number;
  height: number;
  base64?: string | null;
  type?: 'image' | 'video';
}
export type PickResult = {canceled: true; assets: null} | {canceled: false; assets: PickedAsset[]};

type Opener = (limit: number) => Promise<PickedAsset[] | null>;
let opener: Opener | null = null;
/** AlbumPickerHost가 화면에 붙으면서 등록한다 */
export function registerAlbumPicker(fn: Opener | null) { opener = fn; }

export async function launchLibrary(options: ImagePicker.ImagePickerOptions = {}): Promise<PickResult> {
  // 웹·화면이 아직 없을 때·영상까지 고를 때는 시스템 선택
  const wantsVideo = Array.isArray(options.mediaTypes) && options.mediaTypes.includes('videos' as any);
  if (Platform.OS === 'web' || !opener || wantsVideo) {
    const r = await ImagePicker.launchImageLibraryAsync(options);
    return r.canceled ? {canceled: true, assets: null} : {canceled: false, assets: r.assets as PickedAsset[]};
  }
  const limit = options.allowsMultipleSelection ? Math.max(1, options.selectionLimit || 10) : 1;
  const picked = await opener(limit);
  return picked && picked.length > 0 ? {canceled: false, assets: picked} : {canceled: true, assets: null};
}
