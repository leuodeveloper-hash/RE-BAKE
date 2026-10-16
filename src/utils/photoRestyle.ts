import {getFunctions, httpsCallable} from 'firebase/functions';
import app from '@config/firebase';
import {isLocalUri, uploadImageTo} from '@utils/imageUpload';

/**
 * 사진 보정(어드민) — 서버(restylePhoto)가 커버 사진 톤으로 다시 그려 새 주소를 돌려준다.
 * 기기 안 사진이면 먼저 올려서(압축 포함) 그 주소를 넘긴다.
 */
export async function restylePhoto(uri: string): Promise<string> {
  const imageUrl = isLocalUri(uri) ? await uploadImageTo(uri, `recipe_images/restyle_src_${Date.now()}`) : uri;
  const call = httpsCallable<{imageUrl: string}, {url: string}>(getFunctions(app, 'asia-northeast3'), 'restylePhoto', {timeout: 180000});
  const {data} = await call({imageUrl});
  return data.url;
}
