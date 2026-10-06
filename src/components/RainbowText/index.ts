export {RainbowText} from './RainbowText';
export type {RainbowTextProps} from './RainbowText';
export {BulkTypingOverlay} from './BulkTypingOverlay';

/**
 * 무지개 타이핑 동안 입력칸 글자를 감추는 스타일 — 글자색 투명 대신 opacity.
 * iOS 여러 줄 입력칸은 글자색을 transparent에서 되돌려도 다시 그리지 않아, 애니가 끝나도 글자가 안 보이고 자리만 남았다.
 */
export const TYPING_CONCEAL = {opacity: 0} as const;
