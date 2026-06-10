import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
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

const GUEST_AVATAR_SEED_KEY = '@bakecycle_avatar_seed';
const DAILY_SIGNUP_LIMIT = 10;

async function checkSignupLimit(): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const ref = doc(db, 'signupLimits', todayKey);
  const snap = await getDoc(ref);
  const count = snap.exists() ? snap.data().count : 0;
  if (count >= DAILY_SIGNUP_LIMIT) {
    throw new Error('오늘의 가입 한도(10명)에 도달했습니다. 내일 다시 시도해주세요.');
  }
}

async function incrementSignupCount(): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const ref = doc(db, 'signupLimits', todayKey);
  await setDoc(ref, {count: increment(1)}, {merge: true});
}

const GOOGLE_WEB_CLIENT_ID = '420587944388-nh09tqe1o1gmsreuf55qesjjmalgtmg0.apps.googleusercontent.com';
const googleProvider = new GoogleAuthProvider();

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

interface AuthContextValue {
  user: User | null;
  handle: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  /** 아바타 시드: 게스트=AsyncStorage 랜덤, 로그인=UID 기반 */
  avatarSeed: string | number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateHandle: (newHandle: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 어드민 판별: 아래 이메일 목록, UID 목록, 또는 Firestore admins 컬렉션
const ADMIN_EMAILS: string[] = [
  'leuo.developer@gmail.com',
];
const ADMIN_UIDS: string[] = [];

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
      setUser(firebaseUser);
      if (firebaseUser) {
        // 어드민 확인 (이메일, UID, Firestore 순)
        if (
          (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email)) ||
          ADMIN_UIDS.includes(firebaseUser.uid)
        ) {
          setIsAdmin(true);
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admin', firebaseUser.uid));
            setIsAdmin(adminDoc.exists());
          } catch {
            setIsAdmin(false);
          }
        }
        // 핸들 로드 (없으면 자동 생성)
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists() && userDoc.data().handle) {
            setHandle(userDoc.data().handle);
          } else {
            const newHandle = generateHandle(firebaseUser.displayName, firebaseUser.email);
            await setDoc(doc(db, 'users', firebaseUser.uid), {handle: newHandle}, {merge: true});
            setHandle(newHandle);
          }
        } catch {
          setHandle(generateHandle(firebaseUser.displayName, firebaseUser.email));
        }
      } else {
        setIsAdmin(false);
        setHandle(null);
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
    await firebaseSignOut(auth);
  }, []);

  const updateHandle = useCallback(async (newHandle: string) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), {handle: newHandle}, {merge: true});
    setHandle(newHandle);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    handle,
    isAdmin,
    isLoading,
    avatarSeed,
    signIn,
    signUp,
    signInWithGoogle: signInWithGoogleFn,
    signOut,
    updateHandle,
  }), [user, handle, isAdmin, isLoading, avatarSeed, signIn, signUp, signInWithGoogleFn, signOut, updateHandle]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
