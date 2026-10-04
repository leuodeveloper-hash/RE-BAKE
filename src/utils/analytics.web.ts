import {getAnalytics, isSupported, logEvent, setUserId, type Analytics} from 'firebase/analytics';
import app from '@config/firebase';
import type {AnalyticsEventName, AnalyticsEvents} from './analyticsEvents';

/** 웹 — Firebase JS SDK(GA4). 지원 안 되는 브라우저(쿠키 차단 등)면 조용히 건너뛴다 */
let ready: Promise<Analytics | null> | null = null;
function analytics(): Promise<Analytics | null> {
  if (!ready) ready = isSupported().then(ok => (ok ? getAnalytics(app) : null)).catch(() => null);
  return ready;
}

export function track<E extends AnalyticsEventName>(name: E, params: AnalyticsEvents[E]): void {
  analytics().then(a => { if (a) logEvent(a, name as string, params as Record<string, unknown>); });
}

export function trackScreen(path: string): void {
  analytics().then(a => { if (a) logEvent(a, 'screen_view', {firebase_screen: path, firebase_screen_class: path}); });
}

export function identify(uid: string | null): void {
  analytics().then(a => { if (a) setUserId(a, uid); });
}
