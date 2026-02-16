import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Platform} from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {auth, db} from '@config/firebase';

const googleProvider = new GoogleAuthProvider();

interface AuthContextValue {
  user: User | null;
  handle: string | null;
  isAdmin: boolean;
  isLoading: boolean;
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
            const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
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
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithGoogleFn = useCallback(async () => {
    if (Platform.OS === 'web') {
      // 웹: Firebase 팝업 방식 (리디렉트 없이 바로 로그인)
      await signInWithPopup(auth, googleProvider);
    } else {
      // 네이티브: expo-auth-session 사용 (추후 구현)
      throw new Error('Google Sign-In on native requires expo-auth-session setup');
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
    signIn,
    signUp,
    signInWithGoogle: signInWithGoogleFn,
    signOut,
    updateHandle,
  }), [user, handle, isAdmin, isLoading, signIn, signUp, signInWithGoogleFn, signOut, updateHandle]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
