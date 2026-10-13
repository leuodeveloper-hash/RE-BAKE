/**
 * 가장자리 가림 그라디언트(앱바 뒤·콘텐츠 위아래 마스크) — 블러 없이 배경색만으로 막는다.
 * 가장자리 쪽 25%는 100%로 꽉 막고, 나머지는 코사인 곡선으로 천천히 사라진다
 * (처음·끝이 모두 완만해 경계가 선처럼 보이지 않는다). 앱바와 콘텐츠 마스크가 같은 값을 쓴다.
 * (위에서 아래로 사라지는 방향 기준. 아래 마스크는 뒤집어 쓴다)
 */
const SOLID = 0.25;
const STEPS = 12;
export const EDGE_FADE_LOCATIONS = [0, ...Array.from({length: STEPS + 1}, (_, i) => SOLID + ((1 - SOLID) * i) / STEPS)];
export const EDGE_FADE_ALPHAS = [1, ...Array.from({length: STEPS + 1}, (_, i) => (1 + Math.cos((Math.PI * i) / STEPS)) / 2)];
