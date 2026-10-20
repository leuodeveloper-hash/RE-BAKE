import type {ViewStyle} from 'react-native';

/**
 * 팁·주의 블록 — 왼쪽 세로 라인(블록쿼트). PDF·편집·요리모드·상세 한번에 보기가 같은 모양.
 * 색은 쓰는 곳에서 borderLeftColor로(팁=TIP_LINE_COLOR, 주의=yellow-var).
 */
export const NOTE_BLOCK: ViewStyle = {
  borderLeftWidth: 2,
  // 라인과 글 사이 — 붙여 보이게 8
  paddingLeft: 8,
};

/** 팁 라인 색 — 글(muted)과 같은 색이면 라인이 진해 보여 한 단계 연한 테두리 색 */
export const TIP_LINE_COLOR = 'border/normal' as const;
