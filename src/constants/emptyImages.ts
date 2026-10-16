import type {ImageSourcePropType} from 'react-native';

/** 빈 상태 일러스트 — 라이트·다크 따로. 빈 화면(EmptyState)과 빈 레시피북 표지가 같이 쓴다 */
const EMPTY_IMAGES = {
  default: {
    light: require('../../assets/images/empty-default-light.png'),
    dark: require('../../assets/images/empty-default-dark.png'),
  },
  network: {
    light: require('../../assets/images/empty-network-light.png'),
    dark: require('../../assets/images/empty-network-dark.png'),
  },
};

/** 일러스트 원본 비율(가로/세로) */
export const EMPTY_IMAGE_RATIO = 236 / 240;

export function emptyImage(kind: keyof typeof EMPTY_IMAGES, isDark: boolean): ImageSourcePropType {
  return EMPTY_IMAGES[kind][isDark ? 'dark' : 'light'];
}
