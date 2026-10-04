import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {identify} from '@utils/analytics';
import {clearAccountCache, parkAccountRecipes, restoreAccountRecipes} from '@utils/accountCache';
import {Platform} from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  getAdditionalUserInfo,
  User,
  UserCredential,
} from 'firebase/auth';
import {doc, getDoc, setDoc, increment} from 'firebase/firestore';
import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {RANDOM_AVATARS} from '@components/Avatar/avatars';
import {auth, db} from '@config/firebase';

const GUEST_AVATAR_SEED_KEY = '@bakle_avatar_seed';
// 가입 한도 — 하루 100명, 전체 1,000명(베타 운영 규모). 숫자를 바꾸면 안내 문구도 같이 바뀐다
const DAILY_SIGNUP_LIMIT = 100;
const TOTAL_SIGNUP_LIMIT = 1000;
/** 전체 누적 카운터 — 날짜 문서와 같은 컬렉션이라 보안 규칙(signupLimits/{day})을 그대로 탄다 */
const TOTAL_KEY = 'total';

async function checkSignupLimit(): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const [daySnap, totalSnap] = await Promise.all([
    getDoc(doc(db, 'signupLimits', todayKey)),
    getDoc(doc(db, 'signupLimits', TOTAL_KEY)),
  ]);
  const total = totalSnap.exists() ? totalSnap.data().count : 0;
  if (total >= TOTAL_SIGNUP_LIMIT) {
    throw new Error(`지금은 가입 인원(${TOTAL_SIGNUP_LIMIT}명)이 모두 찼어요. 자리가 나면 다시 열게요.`);
  }
  const today = daySnap.exists() ? daySnap.data().count : 0;
  if (today >= DAILY_SIGNUP_LIMIT) {
    throw new Error(`오늘의 가입 한도(${DAILY_SIGNUP_LIMIT}명)에 도달했어요. 내일 다시 시도해주세요.`);
  }
}

async function incrementSignupCount(): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  await Promise.all([
    setDoc(doc(db, 'signupLimits', todayKey), {count: increment(1)}, {merge: true}),
    setDoc(doc(db, 'signupLimits', TOTAL_KEY), {count: increment(1)}, {merge: true}),
  ]);
}

const GOOGLE_WEB_CLIENT_ID = '420587944388-nh09tqe1o1gmsreuf55qesjjmalgtmg0.apps.googleusercontent.com';
const googleProvider = new GoogleAuthProvider();

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

interface AuthContextValue {
  user: User | null;
  /** 고유 아이디 — 영문/숫자/언더스코어 (URL·멘션용) */
  handle: string | null;
  /** 화면 표시 이름 — 한글 등 자유. 없으면 handle 표시 */
  displayName: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  /** 아바타 시드: 게스트=AsyncStorage 랜덤, 로그인=UID 기반 */
  avatarSeed: string | number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateHandle: (newHandle: string) => Promise<void>;
  updateDisplayName: (newDisplayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 어드민 판별은 Firestore admin/{uid} 문서로만 한다.
 *
 * 예전엔 이메일 허용목록을 여기 뒀는데, 앱 번들에 그대로 박혀 누구나 꺼내 볼 수
 * 있었다. 판별 자체는 서버(firestore.rules)에서 다시 하므로 목록을 앱에 둘 이유가
 * 없다 — 어드민을 추가하려면 콘솔에서 admin/{uid} 문서를 만든다.
 */

function generateHandle(displayName: string | null, email: string | null): string {
  if (displayName) {
    return displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
  if (email) {
    return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  }
  return 'baker_' + Math.random().toString(36).slice(2, 8);
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [guestSeed, setGuestSeed] = useState<number>(0);

  // 게스트 아바타 시드: AsyncStorage에 한 번 저장 후 고정
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(GUEST_AVATAR_SEED_KEY);
        if (stored !== null) {
          setGuestSeed(Number(stored));
          return;
        }
        const newSeed = Math.floor(Math.random() * RANDOM_AVATARS.length);
        await AsyncStorage.setItem(GUEST_AVATAR_SEED_KEY, String(newSeed));
        setGuestSeed(newSeed);
      } catch {
        setGuestSeed(0);
      }
    })();
  }, []);

  // 아바타 시드: 로그인=UID, 게스트=랜덤 시드
  const avatarSeed: string | number = user ? user.uid : guestSeed;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // 로그아웃 때 보관해 둔 이 계정의 레시피를 되돌린다.
      // setUser 전에 해야 레시피 훅이 되돌린 데이터를 읽는다.
      if (firebaseUser) {
        await restoreAccountRecipes(firebaseUser.uid).catch(e =>
          console.warn('[Auth] 보관한 레시피 복원 실패:', e));
      }
      setUser(firebaseUser);
      identify(firebaseUser?.uid ?? null);
      if (firebaseUser) {
        // 어드민 확인 — admin/{uid} 문서가 있으면 어드민
        try {
          const adminDoc = await getDoc(doc(db, 'admin', firebaseUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch (e) {
          // 조용히 false로 두면 원인을 알 수 없다
          console.warn('[Auth] admin 조회 실패 — 비어드민으로 둔다:', e);
          setIsAdmin(false);
        }
        // 핸들·표시이름 로드 (핸들 없으면 자동 생성)
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const data = userDoc.exists() ? userDoc.data() : null;
          if (data?.handle) {
            setHandle(data.handle);
          } else {
            const newHandle = generateHandle(firebaseUser.displayName, firebaseUser.email);
            await setDoc(doc(db, 'users', firebaseUser.uid), {handle: newHandle}, {merge: true});
            setHandle(newHandle);
          }
          // 표시이름: 저장값 우선, 없으면 구글 계정 이름 폴백(있을 때)
          setDisplayName(data?.displayName ?? firebaseUser.displayName ?? null);
        } catch {
          setHandle(generateHandle(firebaseUser.displayName, firebaseUser.email));
          setDisplayName(firebaseUser.displayName ?? null);
        }
      } else {
        setIsAdmin(false);
        setHandle(null);
        setDisplayName(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await checkSignupLimit();
    await createUserWithEmailAndPassword(auth, email, password);
    await incrementSignupCount();
  }, []);

  const signInWithGoogleFn = useCallback(async () => {
    let result: UserCredential | undefined;
    if (Platform.OS === 'web') {
      result = await signInWithPopup(auth, googleProvider);
    } else {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'success' && response.data.idToken) {
        const credential = GoogleAuthProvider.credential(response.data.idToken);
        result = await signInWithCredential(auth, credential);
      }
    }
    if (result) {
      const info = getAdditionalUserInfo(result);
      if (info?.isNewUser) {
        try {
          await checkSignupLimit();
          await incrementSignupCount();
        } catch (e) {
          await firebaseSignOut(auth);
          throw e;
        }
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    // 레시피는 계정별로 보관해 둔다 — 무료 등급은 로컬이 유일한 사본이다.
    // 보관에 실패하면 지우지 않는다(데이터 유실보다 다른 계정에 보이는 게 낫다).
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await parkAccountRecipes(uid);
      } catch (e) {
        console.warn('[Auth] 레시피 보관 실패 — 로컬 캐시를 지우지 않는다:', e);
        await firebaseSignOut(auth);
        return;
      }
    }
    // 로컬 캐시를 비운다 — 안 그러면 다음 계정/비로그인 상태에서
    // 이전 계정의 레시피·스탬프·회고가 그대로 보인다.
    await clearAccountCache();
    await firebaseSignOut(auth);
  }, []);

  const updateHandle = useCallback(async (newHandle: string) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), {handle: newHandle}, {merge: true});
    setHandle(newHandle);
  }, [user]);

  const updateDisplayName = useCallback(async (newDisplayName: string) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), {displayName: newDisplayName}, {merge: true});
    setDisplayName(newDisplayName);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    handle,
    displayName,
    isAdmin,
    isLoading,
    avatarSeed,
    signIn,
    signUp,
    signInWithGoogle: signInWithGoogleFn,
    signOut,
    updateHandle,
    updateDisplayName,
  }), [user, handle, displayName, isAdmin, isLoading, avatarSeed, signIn, signUp, signInWithGoogleFn, signOut, updateHandle, updateDisplayName]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
