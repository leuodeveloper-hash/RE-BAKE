import {getFunctions, httpsCallable} from 'firebase/functions';
import app from '@config/firebase';
import {isLocalUri, uploadImageTo} from '@utils/imageUpload';

const fns = () => getFunctions(app, 'asia-northeast3');

/**
 * 사진 보정(어드민) — 서버(restylePhoto)가 프롬프트대로 다시 그려 새 주소를 돌려준다.
 * 기기 안 사진이면 먼저 올려서(압축 포함) 그 주소를 넘긴다. prompt를 주면 서버에 저장돼 다음에도 쓴다.
 */
export async function restylePhoto(uri: string, prompt?: string): Promise<string> {
  const imageUrl = isLocalUri(uri) ? await uploadImageTo(uri, `recipe_images/restyle_src_${Date.now()}`) : uri;
  const call = httpsCallable<{imageUrl: string; prompt?: string}, {url: string}>(fns(), 'restylePhoto', {timeout: 180000});
  const {data} = await call({imageUrl, ...(prompt?.trim() ? {prompt: prompt.trim()} : {})});
  return data.url;
}

/** 지금 쓰는 보정 프롬프트(저장된 것, 없으면 기본). reset이면 기본으로 되돌린다 */
export async function loadStylePrompt(reset = false): Promise<{prompt: string; isDefault: boolean}> {
  const call = httpsCallable<{reset?: boolean}, {prompt: string; isDefault: boolean}>(fns(), 'photoStylePrompt');
  const {data} = await call(reset ? {reset: true} : {});
  return data;
}
