# 피그마 기반 React Native 앱

피그마 디자인을 기반으로 개발하는 React Native 앱 프로젝트입니다.

## 🚀 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- React Native 개발 환경 설정
  - iOS: Xcode (macOS만)
  - Android: Android Studio

### 설치

1. **의존성 설치**
```bash
npm install
# 또는
yarn install
```

2. **iOS 의존성 설치** (macOS만)
```bash
cd ios && pod install && cd ..
```

### 실행

**iOS 시뮬레이터:**
```bash
npm run ios
```

**Android 에뮬레이터:**
```bash
npm run android
```

**Metro 번들러 시작:**
```bash
npm start
```

## 📁 프로젝트 구조

```
├── src/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   └── Button/
│   ├── screens/             # 화면 컴포넌트
│   ├── constants/           # 상수 (색상, 타이포그래피, 간격)
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   ├── utils/               # 유틸리티 함수
│   │   └── figmaHelpers.ts  # 피그마 값 변환 헬퍼
│   └── types/               # TypeScript 타입 정의
├── App.tsx                  # 메인 앱 컴포넌트
├── index.js                 # 엔트리 포인트
└── package.json
```

## 🎨 피그마 디자인 시스템 통합

### 색상 사용

피그마에서 추출한 색상은 `src/constants/colors.ts`에 정의되어 있습니다.

```typescript
import {Colors} from '@constants/colors';

// 사용 예시
<View style={{backgroundColor: Colors.primary}} />
```

### 타이포그래피 사용

피그마의 텍스트 스타일은 `src/constants/typography.ts`에 정의되어 있습니다.

```typescript
import {Typography} from '@constants/typography';

// 사용 예시
<Text style={Typography.h1}>제목</Text>
```

### 간격 사용

피그마의 간격 값은 `src/constants/spacing.ts`에 정의되어 있습니다.

```typescript
import {Spacing} from '@constants/spacing';

// 사용 예시
<View style={{padding: Spacing.md}} />
```

## 🔧 피그마 값 변환

피그마에서 직접 가져온 값을 React Native 스타일로 변환하는 헬퍼 함수들이 `src/utils/figmaHelpers.ts`에 있습니다.

```typescript
import {parseFigmaColor, parseFigmaSize} from '@utils/figmaHelpers';

// 사용 예시
const color = parseFigmaColor(figmaColorObject);
const size = parseFigmaSize('16px');
```

## 📝 피그마에서 디자인 가져오기

1. **Figma API 사용** (선택사항)
   - Figma API를 통해 디자인 토큰을 자동으로 가져올 수 있습니다
   - `src/utils/figmaHelpers.ts`의 함수들을 활용하세요

2. **수동 추출**
   - 피그마에서 색상, 폰트, 간격 값을 확인
   - `src/constants/` 폴더의 해당 파일에 추가

## 🧩 컴포넌트 예시

프로젝트에는 기본 Button 컴포넌트가 포함되어 있습니다:

```typescript
import {Button} from '@components/Button';

<Button
  title="클릭하세요"
  onPress={() => console.log('클릭됨')}
  variant="primary"
  size="medium"
/>
```

## 📱 개발 팁

- **디자인 토큰**: 피그마의 디자인 토큰을 상수 파일에 정의하여 일관성 유지
- **컴포넌트 재사용**: 공통 컴포넌트를 만들어 디자인 시스템 준수
- **반응형 디자인**: `Dimensions` API를 사용하여 화면 크기에 맞는 스타일 적용

## 🔗 유용한 링크

- [React Native 공식 문서](https://reactnative.dev/)
- [Figma API 문서](https://www.figma.com/developers/api)
- [React Navigation](https://reactnavigation.org/)
