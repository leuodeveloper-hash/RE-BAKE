import {requireNativeModule} from 'expo-modules-core';

interface WidgetStorageModule {
  setString(key: string, value: string, appGroup: string): void;
  remove(key: string, appGroup: string): void;
  reloadWidget(name?: string): void;
}

// 네이티브 모듈이 없는 환경(웹 등)에서 require가 throw할 수 있으므로 호출부에서 try/catch 권장.
const WidgetStorage: WidgetStorageModule = requireNativeModule('WidgetStorage');

export default WidgetStorage;
