import {requireNativeModule} from 'expo-modules-core';

/** 홈 화면에 설치된 위젯 하나 */
export interface InstalledWidget {
  /** 위젯 kind (expo-target.config.js의 name) */
  kind: string;
  family: 'small' | 'medium' | 'large' | 'extraLarge' | 'other';
}

export interface InstalledWidgetsResult {
  /** iOS 14 미만이면 false */
  supported: boolean;
  /**
   * 설치 여부. **null이면 "알 수 없음"** — 조회가 실패한 경우다.
   * false와 반드시 구분할 것: 이미 설치한 사람에게 설치 안내를 띄우면 안 된다.
   */
  installed: boolean | null;
  widgets: InstalledWidget[];
  error?: string;
}

interface WidgetStorageModule {
  setString(key: string, value: string, appGroup: string): void;
  remove(key: string, appGroup: string): void;
  reloadWidget(name?: string): void;
  getInstalledWidgets(): Promise<InstalledWidgetsResult>;
}

// 네이티브 모듈이 없는 환경(웹 등)에서 require가 throw할 수 있으므로 호출부에서 try/catch 권장.
const WidgetStorage: WidgetStorageModule = requireNativeModule('WidgetStorage');

export default WidgetStorage;
