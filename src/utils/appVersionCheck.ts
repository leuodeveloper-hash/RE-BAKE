import {Platform, Linking} from 'react-native';
import Constants from 'expo-constants';
import {doc, getDoc} from 'firebase/firestore';
import {db} from '../config/firebase';

/** 현재 실행 중인 앱/웹 버전 (app.json version) */
export const CURRENT_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/**
 * Firestore `config/app` 문서의 최신 버전 정보.
 * 예: { latestVersion: "1.1.0", iosAppStoreUrl?: string, androidStoreUrl?: string }
 */
interface AppConfig {
  latestVersion?: string;
  iosAppStoreUrl?: string;
  androidStoreUrl?: string;
}

/** "1.2.10" vs "1.2.9" → 앞의 것이 크면 1, 같으면 0, 작으면 -1 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * 최신 버전이 현재보다 높은지 확인. 높으면 업데이트 액션(웹=새로고침, 앱=스토어)까지 반환.
 * 실패/동일 버전이면 null.
 */
export async function checkForUpdate(): Promise<{latestVersion: string; onUpdate: () => void} | null> {
  try {
    const snap = await getDoc(doc(db, 'config', 'app'));
    if (!snap.exists()) return null;
    const cfg = snap.data() as AppConfig;
    const latest = cfg.latestVersion;
    if (!latest || compareVersions(latest, CURRENT_VERSION) <= 0) return null;

    const onUpdate = () => {
      if (Platform.OS === 'web') {
        // 웹: 캐시 무시 새로고침으로 최신 배포본 로드
        if (typeof window !== 'undefined') window.location.reload();
        return;
      }
      // 앱: 스토어로. config에 URL 있으면 그걸, 없으면 기본 스토어 검색.
      const url = Platform.OS === 'ios'
        ? cfg.iosAppStoreUrl ?? 'https://apps.apple.com/app/id0'
        : cfg.androidStoreUrl ?? 'https://play.google.com/store/apps/details?id=com.bakle.app';
      Linking.openURL(url).catch(() => {});
    };

    return {latestVersion: latest, onUpdate};
  } catch {
    return null;
  }
}
