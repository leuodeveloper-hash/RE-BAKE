# 피그마 아이콘 등록 가이드

피그마에서 아이콘을 가져와서 React Native에서 사용하는 방법입니다.

## 1. 피그마에서 아이콘 내보내기

### 방법 1: SVG로 직접 내보내기 (권장)

1. 피그마에서 아이콘 선택
2. 우측 패널에서 **Export** 섹션 찾기
3. **Format: SVG** 선택
4. **Export [아이콘명]** 클릭
5. 다운로드된 SVG 파일을 `assets/icons/` 폴더에 저장

### 방법 2: SVG 코드 복사

1. 피그마에서 아이콘 선택
2. 우클릭 → **Copy as SVG**
3. 텍스트 에디터에 붙여넣기
4. SVG 코드를 파일로 저장 (`assets/icons/[아이콘명].svg`)

## 2. SVG를 React Native 컴포넌트로 변환

### 자동 변환 도구 사용 (권장)

**react-native-svg-transformer**를 사용하면 SVG 파일을 직접 import할 수 있습니다.

```bash
npm install --save-dev react-native-svg-transformer
```

그 후 `metro.config.js`를 업데이트하세요 (이미 설정되어 있음).

### 수동 변환

피그마에서 내보낸 SVG 코드를 React Native 컴포넌트로 변환:

1. SVG 파일 열기
2. `<svg>` 태그의 `viewBox` 속성 확인
3. 내부 `<path>`, `<circle>`, `<rect>` 등의 요소 복사
4. `src/components/Icon/` 폴더에 새 컴포넌트 파일 생성

**예시:**

```typescript
// src/components/Icon/IconHome.tsx
import React from 'react';
import Svg, {Path} from 'react-native-svg';
import {Icon, IconProps} from './Icon';

export const IconHome: React.FC<IconProps> = ({size = 24, color = '#000000', ...props}) => {
  return (
    <Icon size={size} color={color} {...props}>
      <Path
        d="M12 2L2 7L2 20L9 20L9 14L15 14L15 20L22 20L22 7L12 2Z"
        fill={color}
      />
    </Icon>
  );
};
```

## 3. 아이콘 사용하기

```typescript
import {IconHome} from '@components/Icon/IconHome';

// 기본 사용
<IconHome />

// 크기와 색상 지정
<IconHome size={32} color="#007AFF" />

// 스타일 적용
<IconHome size={24} color="#000000" style={{marginRight: 8}} />
```

## 4. 피그마 아이콘 일괄 변환 (고급)

여러 아이콘을 한 번에 변환하려면:

1. 피그마에서 아이콘 세트 선택
2. **Export** → **SVG** 선택
3. 모든 아이콘을 한 번에 내보내기
4. 변환 스크립트 사용 (선택사항)

## 5. 아이콘 네이밍 규칙

- 파일명: `Icon[이름].tsx` (예: `IconHome.tsx`, `IconUser.tsx`)
- 컴포넌트명: `Icon[이름]` (예: `IconHome`, `IconUser`)
- 피그마에서의 이름을 그대로 사용하거나, 명확한 이름으로 변경

## 6. 디자인 토큰과 함께 사용

아이콘에 디자인 토큰의 색상을 적용할 수 있습니다:

```typescript
import {SemanticColorsLight} from '@constants/tokens';
import {IconHome} from '@components/Icon/IconHome';

<IconHome 
  size={24} 
  color={SemanticColorsLight['foreground-accent']} 
/>
```

## 문제 해결

### 아이콘이 보이지 않는 경우

1. **SVG 경로 확인**: 피그마에서 내보낸 SVG의 `<path>` 요소가 올바른지 확인
2. **viewBox 확인**: `viewBox` 속성이 올바르게 설정되었는지 확인
3. **색상 확인**: `fill` 또는 `stroke` 속성이 올바르게 설정되었는지 확인
4. **크기 확인**: `size` prop이 적절한 값인지 확인

### 아이콘이 깨져 보이는 경우

1. **viewBox 조정**: 피그마의 실제 크기에 맞게 `viewBox` 수정
2. **경로 단순화**: 복잡한 경로는 단순화 필요할 수 있음
3. **stroke 설정**: 선 아이콘의 경우 `stroke`와 `strokeWidth` 설정 필요

## 7. 피그마 SVG 정규화 규칙

피그마에서 내보낸 SVG는 프로젝트 표준에 맞게 정규화해야 합니다.

### 표준 SVG 포맷

```xml
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="..." fill="#1F2126"/>
</svg>
```

### 정규화 체크리스트

1. **크기**: `width="24" height="24"` (고정값, % 사용 금지)
2. **viewBox**: `viewBox="0 0 24 24"` (피그마가 20x20인 경우 24x24로 스케일링)
3. **fill 색상**: `fill="#1F2126"` (svgr.config.js가 currentColor로 변환)
4. **제거할 속성**: `preserveAspectRatio`, `overflow`, `style`, `id`, CSS 변수

### 피그마 20x20 → 24x24 변환

피그마에서 viewBox가 `0 0 20 20`인 경우:
1. viewBox를 `0 0 24 24`로 변경
2. path의 d 값에서 모든 좌표를 1.2배 스케일링
3. 또는 피그마에서 24x24 프레임에 맞춰 다시 내보내기

### 동적 색상 처리

`svgr.config.js`가 `#1F2126`을 `currentColor`로 자동 변환하므로, 컴포넌트에서 색상을 동적으로 지정할 수 있습니다.

**기본 색상 규칙**: 아이콘은 기본적으로 `foreground-onsurface` 시맨틱 토큰 색상을 사용합니다.

```typescript
import {SemanticColorsLight} from '@constants/tokens';

// 기본 색상 (foreground-onsurface)
<IconAdd
  width={24}
  height={24}
  color={SemanticColorsLight['foreground-onsurface']}
/>

// 비활성 상태 (foreground-onsurfacemuted)
<IconAdd
  width={24}
  height={24}
  color={SemanticColorsLight['foreground-onsurfacemuted']}
/>

// 강조 색상 (foreground-accent)
<IconAdd
  width={24}
  height={24}
  color={SemanticColorsLight['foreground-accent']}
/>
```

## 참고 링크

- [react-native-svg 문서](https://github.com/react-native-svg/react-native-svg)
- [react-native-svg-transformer](https://github.com/kristerkari/react-native-svg-transformer)
- [Figma Export Guide](https://help.figma.com/hc/en-us/articles/360040328153-Guide-to-exporting)
