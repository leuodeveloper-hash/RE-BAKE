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
  /** 이 버전 미만은 강제 업데이트(닫을 수 없는 모달). 없으면 강제 없음 */
  minVersion?: string;
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

/** App Store 번들 ID — 스토어 공개 정보에서 최신 버전을 찾는다 */
const IOS_BUNDLE_ID = 'com.bakle.app';

/**
 * 손으로 적지 않아도 알 수 있는 최신 버전.
 * - 웹: 배포 때 함께 올리는 /version.json (npm run deploy:web이 만든다)
 * - iOS: App Store 공개 정보(iTunes lookup). 스토어에 새 버전이 나오면 바로 잡힌다.
 *   TestFlight 빌드는 여기 안 잡힌다 — 테스터는 TestFlight 앱이 알려준다.
 */
async function fetchAutoLatest(): Promise<{version: string; storeUrl?: string} | null> {
  try {
    if (Platform.OS === 'web') {
      const res = await fetch(`/version.json?t=${Date.now()}`, {cache: 'no-store'});
      if (!res.ok) return null;
      const v = (await res.json())?.version;
      return typeof v === 'string' ? {version: v} : null;
    }
    if (Platform.OS === 'ios') {
      const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${IOS_BUNDLE_ID}&country=kr&t=${Date.now()}`);
      if (!res.ok) return null;
      const r = (await res.json())?.results?.[0];
      return typeof r?.version === 'string' ? {version: r.version, storeUrl: r.trackViewUrl} : null;
    }
  } catch {
    // 네트워크 실패는 "업데이트 없음"으로 본다
  }
  return null;
}

async function fetchConfig(): Promise<AppConfig> {
  try {
    const snap = await getDoc(doc(db, 'config', 'app'));
    return snap.exists() ? (snap.data() as AppConfig) : {};
  } catch {
    return {};
  }
}

/**
 * 최신 버전이 현재보다 높은지 확인. 높으면 업데이트 액션(웹=새로고침, 앱=스토어)까지 반환.
 * 실패/동일 버전이면 null.
 *
 * 최신 버전은 자동으로 찾는다(fetchAutoLatest). config/app은 강제 업데이트(minVersion)와
 * 스토어 주소를 덮어쓸 때만 쓴다 — 예전엔 latestVersion을 손으로 적어야만 팝업이 떠서
 * 버전을 올려도 아무도 몰랐다.
 */
export async function checkForUpdate(): Promise<{
  latestVersion: string;
  /** minVersion 미만 — 권장이 아니라 강제. 호출부는 닫을 수 없는 모달을 띄운다 */
  required: boolean;
  onUpdate: () => void;
} | null> {
  const [cfg, auto] = await Promise.all([fetchConfig(), fetchAutoLatest()]);
  const candidates = [auto?.version, cfg.latestVersion].filter((v): v is string => !!v);
  const latest = candidates.sort((a, b) => compareVersions(b, a))[0];
  // 강제는 minVersion 기준 — latestVersion이 없어도 강제는 걸릴 수 있다
  const required = !!cfg.minVersion && compareVersions(cfg.minVersion, CURRENT_VERSION) > 0;
  const hasNewer = !!latest && compareVersions(latest, CURRENT_VERSION) > 0;
  if (!required && !hasNewer) return null;

  const onUpdate = () => {
    if (Platform.OS === 'web') {
      // 웹: 캐시 무시 새로고침으로 최신 배포본 로드
      if (typeof window !== 'undefined') window.location.reload();
      return;
    }
    // 앱: 스토어로. config → 스토어 공개 정보 → 기본값 순.
    const url = Platform.OS === 'ios'
      ? cfg.iosAppStoreUrl ?? auto?.storeUrl ?? 'https://apps.apple.com/app/id0'
      : cfg.androidStoreUrl ?? 'https://play.google.com/store/apps/details?id=com.bakle.app';
    Linking.openURL(url).catch(() => {});
  };
  return {latestVersion: latest ?? cfg.minVersion ?? CURRENT_VERSION, required, onUpdate};
}
