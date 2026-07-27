import type {StepPhoto} from '../types/recipe';

/**
 * 스텝 사진 배열을 항상 StepPhoto[] 형태로 정규화.
 * 구버전 데이터는 string[](uri만) → {uri} 로 변환(캡션 없음). 이미 객체면 그대로.
 * 로드/렌더 지점에서 이 함수를 거쳐 구/신 포맷 차이를 흡수한다.
 */
export function normalizeStepPhotos(photos?: (string | StepPhoto)[] | null): StepPhoto[] {
  if (!photos || photos.length === 0) return [];
  return photos.map(p =>
    typeof p === 'string' ? {uri: p} : {uri: p.uri, caption: p.caption},
  );
}
