/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'BakleWidget',
  icon: '../../assets/icon.png',
  colors: {
    // 위젯 배경/악센트 (Bakle 브랜드 크림/브라운 계열)
    $accent: '#B4795A',
    $widgetBackground: '#F8F5ED',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.bakle.app'],
  },
};
