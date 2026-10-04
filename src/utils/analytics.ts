import {getAnalytics, logEvent, logScreenView, setUserId} from '@react-native-firebase/analytics';
import type {AnalyticsEventName, AnalyticsEvents} from './analyticsEvents';

/**
 * 행동 기록 — 앱(iOS·안드로이드)은 Firebase Analytics 네이티브, 웹은 analytics.web.ts.
 * 화면에서는 이 함수들만 쓴다(도구를 바꿔도 이 파일만 고치면 된다). 실패해도 앱 동작엔 영향 없게 삼킨다.
 */
export function track<E extends AnalyticsEventName>(name: E, params: AnalyticsEvents[E]): void {
  Promise.resolve(logEvent(getAnalytics(), name as string, params as Record<string, unknown>)).catch(() => {});
}

/** 화면 진입 — 루트 레이아웃이 경로가 바뀔 때마다 부른다 */
export function trackScreen(path: string): void {
  logScreenView(getAnalytics(), {screen_name: path, screen_class: path}).catch(() => {});
}

/** 로그인 계정 연결(로그아웃이면 null) — 이메일이 아니라 uid만 */
export function identify(uid: string | null): void {
  setUserId(getAnalytics(), uid).catch(() => {});
}
