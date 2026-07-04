import {initializeApp} from 'firebase/app';
import {getAuth, initializeAuth, getReactNativePersistence} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
export const db = Platform.OS === 'web'
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}),
    })
  : getFirestore(app);
export const storage = getStorage(app);
export default app;
