import {Platform} from 'react-native';

// 안드로이드 홈 화면 위젯 — 런처가 앱 없이도 부를 수 있게 앱보다 먼저 등록한다
if (Platform.OS === 'android') {
  const {registerWidgetTaskHandler, registerWidgetConfigurationScreen} = require('react-native-android-widget');
  const {widgetTaskHandler} = require('./src/widgets/android/widgetTaskHandler');
  const {WidgetConfigScreen} = require('./src/widgets/android/WidgetConfigScreen');
  registerWidgetTaskHandler(widgetTaskHandler);
  // 위젯을 놓을 때·길게 눌러 '설정'할 때 뜨는 화면(레시피북·D-day 고르기)
  registerWidgetConfigurationScreen(WidgetConfigScreen);
}

require('expo-router/entry');
