/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'BakleWidget',
  icon: '../../assets/icon.png',
  colors: {
    // 이미지가 없을 때의 위젯 배경만. $accent/$widgetBackground(특수 이름)를 쓰면
    // 위젯 편집 화면까지 브랜드 크림·브라운으로 물들어 누렇게 보여 시스템 기본을 쓴다.
    widgetFallback: '#F8F5ED',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.bakle.app'],
  },
};
