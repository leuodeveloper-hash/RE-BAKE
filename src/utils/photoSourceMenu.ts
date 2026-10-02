import {IconCameraFilled, IconPhoto} from '@components/Icon/IconIndex';

export type PhotoSource = 'camera' | 'gallery';

/**
 * 사진 넣기 메뉴 항목 — 촬영 / 갤러리.
 * 편집 화면·사진 뷰어·상세 빈 자리가 모두 이 목록을 써서 라벨과 아이콘이 같다.
 */
export function photoSourceMenuItems(t: (key: string) => string) {
  return [
    {id: 'camera', label: t('recipeEdit.takePhoto'), icon: IconCameraFilled},
    {id: 'gallery', label: t('recipeEdit.chooseFromGallery'), icon: IconPhoto},
  ];
}
