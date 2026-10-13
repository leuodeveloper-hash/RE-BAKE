import {Redirect} from 'expo-router';

/** 예전 소개 화면 주소 — 소개는 이제 맨 앞 주소(/)다 */
export default function WelcomeRoute() {
  return <Redirect href="/" />;
}
