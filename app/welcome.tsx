import React, {useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRouter} from 'expo-router';
import {useAuth} from '@contexts/AuthContext';
import {ExploreRouteBase} from './(tabs)/explore';

/** 처음 연 사람이 보는 소개 화면을 이미 봤는지 */
export const WELCOME_SEEN_KEY = '@bakle_welcome_seen';

/**
 * 최상위 소개 화면(로그인 전). 둘러보기 레시피 카드들이 배경에 흩어지고 가운데에 소개.
 * 로그인하면 홈으로, [둘러보기]면 둘러보기로. 한 번 보면 다음부터는 바로 앱이 열린다.
 */
export default function WelcomeRoute() {
  const router = useRouter();
  const {user} = useAuth();
  useEffect(() => { AsyncStorage.setItem(WELCOME_SEEN_KEY, '1').catch(() => {}); }, []);
  useEffect(() => { if (user) router.replace('/' as any); }, [user, router]);
  return <ExploreRouteBase landing />;
}
