import {Platform} from 'react-native';

// 안드로이드 홈 화면 위젯 — 런처가 앱 없이도 부를 수 있게 앱보다 먼저 등록한다
if (Platform.OS === 'android') {
  const {registerWidgetTaskHandler} = require('react-native-android-widget');
  const {widgetTaskHandler} = require('./src/widgets/android/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

require('expo-router/entry');
