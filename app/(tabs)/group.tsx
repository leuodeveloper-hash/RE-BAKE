import {Redirect} from 'expo-router';

// 그룹 화면은 홈에 통합됨(홈 상단 드롭다운의 그룹화 축). /group 진입은 홈으로 리다이렉트.
export default function GroupRoute() {
  return <Redirect href="/" />;
}
