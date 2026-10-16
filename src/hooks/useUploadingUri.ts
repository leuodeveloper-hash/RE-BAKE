import {useSyncExternalStore} from 'react';
import {isUploadingUri, subscribeUploads} from '@utils/imageUpload';

/** 이 사진이 지금 올라가는 중인지(압축·업로드) — 썸네일 로딩 표시용 */
export function useUploadingUri(uri: string | undefined): boolean {
  return useSyncExternalStore(subscribeUploads, () => (uri ? isUploadingUri(uri) : false), () => false);
}
