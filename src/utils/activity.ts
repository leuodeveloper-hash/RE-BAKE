import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, setDoc, serverTimestamp} from 'firebase/firestore';
import {db} from '@config/firebase';

/**
 * 활성 사용자 기록(DAU·WAU·MAU) — 기기마다 문서 하나(activeDevices/{deviceId}), 하루 한 번 마지막 접속일을 갱신.
 * 로그인 안 한 사람도 센다(기기 기준). 어드민 > 사용자 통계에서 날짜로 세어 본다.
 */
const DEVICE_KEY = '@bakle_device_id';
const LAST_KEY = '@bakle_active_day';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function deviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY).catch(() => null);
  if (!id) {
    id = `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_KEY, id).catch(() => {});
  }
  return id;
}

/** 앱을 켜거나 다시 열 때 — 오늘 이미 남겼으면 건너뛴다 */
export async function recordActive(uid?: string | null): Promise<void> {
  try {
    const day = today();
    const last = await AsyncStorage.getItem(LAST_KEY).catch(() => null);
    if (last === `${day}|${uid ?? ''}`) return;
    const id = await deviceId();
    await setDoc(doc(db, 'activeDevices', id), {
      lastDay: day,
      platform: Platform.OS,
      ...(uid ? {uid} : {}),
      updatedAt: serverTimestamp(),
    }, {merge: true});
    await AsyncStorage.setItem(LAST_KEY, `${day}|${uid ?? ''}`).catch(() => {});
  } catch {
    /* 통계라 실패해도 앱 동작엔 영향 없다 */
  }
}
