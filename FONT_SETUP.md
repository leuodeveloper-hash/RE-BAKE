# IBM Plex Sans 폰트 설치 가이드

## 1. 폰트 파일 다운로드

IBM Plex Sans 폰트를 다운로드하세요:

### 방법 1: Google Fonts에서 다운로드 (권장)
1. [Google Fonts - IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) 접속
2. "Download family" 버튼 클릭
3. ZIP 파일 다운로드 및 압축 해제

### 방법 2: IBM Design Language에서 다운로드
1. [IBM Design Language - IBM Plex](https://www.ibm.com/design/language/typography/plex/) 접속
2. 폰트 다운로드

## 2. 필요한 폰트 파일

다음 폰트 파일들이 필요합니다:
- `IBMPlexSans-Regular.ttf` (400)
- `IBMPlexSans-Medium.ttf` (500)
- `IBMPlexSans-SemiBold.ttf` (600)
- `IBMPlexSans-Bold.ttf` (700)

## 3. 폰트 파일 복사

다운로드한 폰트 파일들을 다음 경로에 복사하세요:

```
assets/fonts/
  ├── IBMPlexSans-Regular.ttf
  ├── IBMPlexSans-Medium.ttf
  ├── IBMPlexSans-SemiBold.ttf
  └── IBMPlexSans-Bold.ttf
```

## 4. 폰트 링크

폰트 파일을 복사한 후, 다음 명령어를 실행하세요:

```bash
# React Native CLI를 사용하는 경우
npx react-native-asset

# 또는 수동으로 링크 (React Native 0.60+는 자동 링크)
# iOS의 경우 pod install 필요
cd ios && pod install && cd ..
```

## 5. 앱 재시작

폰트를 추가한 후 Metro 번들러와 앱을 재시작하세요:

```bash
# Metro 번들러 재시작
npm start -- --reset-cache

# 앱 재시작
npm run ios
# 또는
npm run android
```

## 6. 폰트 사용 확인

폰트가 제대로 설치되었는지 확인하려면:

```typescript
import {Typography} from '@constants/typography';

// App.tsx에서 테스트
<Text style={Typography.headline.large}>
  IBM Plex Sans 폰트 테스트
</Text>
```

## 문제 해결

### 폰트가 적용되지 않는 경우

1. **캐시 클리어**
   ```bash
   npm start -- --reset-cache
   ```

2. **iOS의 경우 Info.plist 확인**
   - `ios/[프로젝트명]/Info.plist` 파일에 폰트가 자동으로 추가되었는지 확인
   - `UIAppFonts` 배열에 폰트 파일명이 포함되어 있어야 함

3. **Android의 경우**
   - `android/app/src/main/assets/fonts/` 폴더에 폰트 파일이 있는지 확인

4. **폰트 이름 확인**
   - React Native에서 사용하는 폰트 이름은 파일명과 다를 수 있습니다
   - 폰트 파일을 열어서 실제 PostScript 이름을 확인하세요
   - macOS: 폰트 파일을 더블클릭하여 Font Book에서 확인
   - Windows: 폰트 파일을 더블클릭하여 속성에서 확인
   - 일반적으로 IBM Plex Sans는 'IBMPlexSans' 또는 'IBMPlexSans-Regular'입니다
   - 폰트 이름이 다르면 `src/constants/typography.ts`의 `fontFamily` 값을 수정하세요

## 참고 링크

- [React Native 폰트 가이드](https://reactnative.dev/docs/text#limited-style-inheritance)
- [IBM Plex Sans 다운로드](https://fonts.google.com/specimen/IBM+Plex+Sans)
- [react-native-asset](https://www.npmjs.com/package/react-native-asset)
