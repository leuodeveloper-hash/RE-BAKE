import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect, useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '@contexts/AuthContext';
import {ExploreRouteBase} from './explore';
import {WELCOME_SEEN_KEY, takeLandingRequest} from '@utils/landing';

/**
 * 맨 앞 주소(/) = 소개(홈) 화면. 내 레시피는 /recipes.
 * - 로그인했으면 소개가 없다 → 내 레시피로
 * - 로그인 전 처음이면 소개, 한 번 봤으면 바로 내 레시피(메뉴의 [홈]으로 오면 다시 보여준다)
 *
 * 탭이라 한 번 열리면 계속 붙어 있다. <Redirect>는 포커스될 때마다 바로 튕겨 내서
 * 메뉴의 [홈]을 눌러도 소개로 못 왔다 — 포커스마다 직접 판단해 보여 주거나 넘긴다.
 */
export default function LandingRoute() {
  const router = useRouter();
  const {user, isLoading} = useAuth();
  const [show, setShow] = useState(false);
  const seenRef = useRef<boolean | null>(null);
  const [seenLoaded, setSeenLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY)
      .then(v => { seenRef.current = !!v; })
      .catch(() => { seenRef.current = false; })
      .finally(() => setSeenLoaded(true));
  }, []);

  const decide = useCallback(() => {
    if (isLoading || !seenLoaded) return;
    const requested = takeLandingRequest();
    if (!user && (requested || seenRef.current === false)) {
      setShow(true);
      seenRef.current = true;
      AsyncStorage.setItem(WELCOME_SEEN_KEY, '1').catch(() => {});
    } else {
      setShow(false);
      router.replace('/recipes' as any);
    }
  }, [isLoading, seenLoaded, user, router]);

  // 처음 열 때(로딩이 끝나면) + 다시 이 화면으로 올 때마다
  useFocusEffect(decide);

  return show ? <ExploreRouteBase landing /> : null;
}
