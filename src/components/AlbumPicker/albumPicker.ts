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

type Opener = (limit: number, scope?: string) => Promise<PickedAsset[] | null>;

/** 웹 — 영상을 고르면 장면 고르기(VideoCaptureHost)를 띄워 사진으로 바꾼다 */
type VideoCaptureOpener = (uri: string, durationMs: number) => Promise<PickedAsset | null>;
let videoCapture: VideoCaptureOpener | null = null;
export function registerVideoCapture(fn: VideoCaptureOpener | null) { videoCapture = fn; }

/**
 * 지금 사진을 넣는 레시피 — 레시피마다 마지막으로 연 앨범을 따로 기억한다(없으면 앱 전체 마지막 앨범).
 * 편집 화면·요리모드가 열릴 때 정하고 닫힐 때 비운다.
 */
let albumScope: string | undefined;
export function setAlbumScope(scope: string | undefined) { albumScope = scope; }
let opener: Opener | null = null;
/** AlbumPickerHost가 화면에 붙으면서 등록한다 */
export function registerAlbumPicker(fn: Opener | null) { opener = fn; }

export async function launchLibrary(options: ImagePicker.ImagePickerOptions = {}): Promise<PickResult> {
  // 웹·화면이 아직 없을 때·영상까지 고를 때는 시스템 선택
  const wantsVideo = Array.isArray(options.mediaTypes) && options.mediaTypes.includes('videos' as any);
  if (Platform.OS === 'web' && !wantsVideo && videoCapture) {
    // 웹 — 영상도 고를 수 있게, 고른 영상은 장면을 골라 사진으로(사진만 받는 곳이 그대로 쓴다)
    const r = await ImagePicker.launchImageLibraryAsync({...options, mediaTypes: ['images', 'videos']});
    if (r.canceled) return {canceled: true, assets: null};
    const out: PickedAsset[] = [];
    for (const a of r.assets) {
      if (a.type === 'video') {
        const f = await videoCapture(a.uri, a.duration ?? 0);
        if (f) out.push(f);
      } else {
        out.push(a as PickedAsset);
      }
    }
    return out.length ? {canceled: false, assets: out} : {canceled: true, assets: null};
  }
  if (Platform.OS === 'web' || !opener || wantsVideo) {
    const r = await ImagePicker.launchImageLibraryAsync(options);
    return r.canceled ? {canceled: true, assets: null} : {canceled: false, assets: r.assets as PickedAsset[]};
  }
  const limit = options.allowsMultipleSelection ? Math.max(1, options.selectionLimit || 10) : 1;
  const picked = await opener(limit, albumScope);
  return picked && picked.length > 0 ? {canceled: false, assets: picked} : {canceled: true, assets: null};
}
