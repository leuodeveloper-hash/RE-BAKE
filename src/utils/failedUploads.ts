import {useSyncExternalStore} from 'react';

/**
 * 저장할 때 서버에 못 올린 사진 주소 — 편집 화면의 사진(상단·과정·조언)과 뷰어가 이걸 보고 빨간 표시를 한다.
 * 저장 실패 안내만으로는 어느 사진이 문제인지 몰랐다. 다음 저장이 성공하면 비운다.
 */
let failed = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function setFailedUploads(uris: string[]) {
  failed = new Set(uris);
  emit();
}
export function clearFailedUploads() {
  if (failed.size === 0) return;
  failed = new Set();
  emit();
}
export function useFailedUploads(): Set<string> {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => failed,
    () => failed,
  );
}
