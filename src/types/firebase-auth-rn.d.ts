/**
 * firebase/auth의 React Native 전용 export 보강.
 *
 * getReactNativePersistence는 @firebase/auth의 RN 진입점(index.rn.d.ts)에만
 * 선언돼 있다. 번들러(Metro)는 RN 빌드를 골라 실제로 이 함수를 쓰지만,
 * TypeScript는 웹용 타입(auth-public.d.ts)을 보고 "없는 멤버"라고 한다.
 * 런타임에는 정상 동작하므로 타입 쪽만 맞춰 준다.
 *
 * import가 있어야 "모듈 보강"이 된다 — 없으면 모듈 전체를 덮어써
 * getAuth 등 원래 export가 사라진다.
 */
import type {Persistence} from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
