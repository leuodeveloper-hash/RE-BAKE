// 웹 배포 번호 — 앱 코드(src/config/webBuild.json)와 dist/version.json에 같은 값을 쓴다.
// 예전엔 EXPO_PUBLIC_WEB_BUILD 환경변수로 넣었는데, 번들러 캐시가 이전 값을 남겨
// 화면 번호와 version.json이 달라져 업데이트 팝업이 끝없이 떴다. 파일은 바뀌면 캐시가 다시 읽는다.
const fs = require('fs');
const mode = process.argv[2];
const path = 'src/config/webBuild.json';
if (mode === 'pre') {
  fs.writeFileSync(path, JSON.stringify({build: String(Math.floor(Date.now() / 1000))}) + '\n');
} else {
  const {build} = JSON.parse(fs.readFileSync(path, 'utf8'));
  fs.writeFileSync('dist/version.json', JSON.stringify({version: require('../app.json').expo.version, build}));
}
