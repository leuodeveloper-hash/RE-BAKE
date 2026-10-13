import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {sheetBottomInset} from '@components/BottomSheet/BottomSheet';
import {TAB_BAR_HEIGHT} from '@components/Navigation/BottomTabBar';
import {Spacing} from '@constants/spacing';

/**
 * 화면 아래에서 탭바가 차지하는 공간 — 기기 안전영역(웹 16) + 탭바 높이 + 간격 8.
 * 가운데 정렬할 때 아래 자리를 이 값으로 빼면 기기마다 탭바 위 영역의 정확한 가운데에 온다
 * (고정 120을 쓰면 홈 인디케이터가 있는 기기·웹에서 위아래로 어긋났다).
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return sheetBottomInset(insets.bottom) + TAB_BAR_HEIGHT + Spacing.sm;
}
