import type {ViewStyle} from 'react-native';

/**
 * 팁·주의 블록 — 왼쪽 세로 라인(블록쿼트). PDF·편집·요리모드·상세 한번에 보기가 같은 모양.
 * 색은 쓰는 곳에서 borderLeftColor로(팁=muted, 주의=yellow-var).
 */
export const NOTE_BLOCK: ViewStyle = {
  borderLeftWidth: 2,
  paddingLeft: 12,
};
