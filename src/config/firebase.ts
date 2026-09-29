import {initializeApp} from 'firebase/app';
import {getAuth, initializeAuth, getReactNativePersistence} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Firebase Console에서 프로젝트 생성 후 아래 값 입력
const firebaseConfig = {
  apiKey: "AIzaSyBxV2M2GYMqhg6_3RFW3-vrB0PkQn9XQaU",
  authDomain: "bakecycle-b82b5.firebaseapp.com",
  projectId: "bakecycle-b82b5",
  storageBucket: "bakecycle-b82b5.firebasestorage.app",
  messagingSenderId: "420587944388",
  appId: "1:420587944388:web:615a0faa8bdde6ff9fcc91",
  measurementId: "G-624SREVWG9"
};

const app = initializeApp(firebaseConfig);

// Auth: React Native에서는 AsyncStorage 기반 persistence 사용
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

// Firestore 캐시:
// - 웹: IndexedDB 영구 캐시(persistentLocalCache)로 새로고침 간 읽기를 재사용해 읽기 비용 절감.
// - 네이티브: IndexedDB 미지원 → 기본(getFirestore) 사용.
//
// 탭 매니저는 단일(기본)로 둔다. multipleTab은 한 탭이 리더가 되어 서버와
// 통신하는데, 그 리더 잠금이 IndexedDB에 남으면 새 탭이 리더가 못 돼
// 쓰기가 캐시에만 머물고 서버로 나가지 않는다(에러도 없이 조용히).
function createDb() {
  if (Platform.OS !== 'web') return getFirestore(app);
  try {
    return initializeFirestore(app, {localCache: persistentLocalCache()});
  } catch {
    // 핫 리로드로 모듈이 다시 실행되면 이미 초기화돼 있다 — 그 인스턴스를 쓴다
    return getFirestore(app);
  }
}

export const db = createDb();
export const storage = getStorage(app);
export default app;
