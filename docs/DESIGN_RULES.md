# 디자인 구현 규칙

> 이 문서는 Figma 디자인을 React Native 코드로 구현할 때 따라야 할 규칙을 정의합니다.

## 📐 기본 원칙

### 1. 기존 디자인 시스템 우선 사용
- **ALWAYS** 먼저 기존에 정의된 토큰을 확인하고 사용합니다
- 기존 시스템: `@constants/tokens`, `@constants/spacing`, `@constants/typography`
- 이미 정의된 값이 있다면 새로 만들지 않습니다

### 2. 구현 우선, 디테일은 나중에
- 첫 구현 시: 기존 토큰으로 빠르게 구현
- 디테일 조정: 구현 후 피드백을 받아 세부 조정
- 완벽함보다 빠른 반복이 우선

### 3. 새로운 토큰은 물어보기
- 기존 시스템에 없는 새로운 값이 필요할 때만 사용자에게 확인
- 예: 새로운 색상, 새로운 간격 값, 새로운 폰트 스타일
- 기존 것과 비슷하면 기존 것을 사용

## 🎨 디자인 토큰 사용 가이드

### 색상 (Colors)
```typescript
// ✅ GOOD: 기존 토큰 사용
import {SemanticColorsLight} from '@constants/tokens';
backgroundColor: SemanticColorsLight['surface-surfacebright']

// ❌ BAD: 하드코딩
backgroundColor: '#F5F5F5'
```

**새로운 색상이 필요한 경우:**
1. 기존 토큰에서 가장 비슷한 것 찾기
2. 없으면 사용자에게 물어보기: "이 색상을 토큰에 추가할까요? 아니면 기존의 X 색상을 사용할까요?"

### 간격 (Spacing)
```typescript
// ✅ GOOD: 기존 간격 사용
import {Spacing} from '@constants/spacing';
padding: Spacing.md

// ❌ BAD: 임의의 숫자
padding: 15
```

**사용 가능한 간격:**
- `Spacing.xs`, `Spacing.sm`, `Spacing.md`, `Spacing.lg`, `Spacing.xl` 등

**새로운 간격이 필요한 경우:**
1. 기존 간격 조합으로 해결 가능한지 확인
2. 불가능하면 사용자에게 물어보기

### 타이포그래피 (Typography)
```typescript
// ✅ GOOD: 기존 스타일 사용
import {Typography} from '@constants/typography';
...Typography.body.large

// ❌ BAD: 개별 속성 직접 지정
fontSize: 16,
fontWeight: '400'
```

**새로운 텍스트 스타일이 필요한 경우:**
1. Typography에서 가장 비슷한 것 찾기
2. 없으면 사용자에게 물어보기

### 폰트 Baseline 보정

IBM Plex Sans 폰트는 아이콘과 함께 사용할 때 텍스트가 시각적으로 위로 올라가 보입니다. 이를 보정하기 위해 `FONT_BASELINE_OFFSET`을 사용합니다.

```typescript
// ✅ GOOD: baseline 보정 적용
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

const styles = StyleSheet.create({
  label: {
    fontFamily: Typography.body.large.fontFamily,
    fontSize: Typography.body.large.fontSize,
    // ... 기타 Typography 속성
    marginTop: FONT_BASELINE_OFFSET, // 폰트 baseline 보정
  },
});
```

**적용 시점:**
- 아이콘과 텍스트가 한 줄에 나란히 있을 때
- flexDirection: 'row', alignItems: 'center' 조합에서 텍스트가 위로 올라가 보일 때

**참고:**
- `FONT_BASELINE_OFFSET` 값은 typography.ts에서 중앙 관리 (현재: 2px)
- App.tsx에 `includeFontPadding: false` 전역 설정도 적용됨

## 🧩 컴포넌트 공통화 원칙

### 1. 반복되는 UI는 컴포넌트로
- 2번 이상 사용되면 컴포넌트화 고려
- 3번 이상 사용되면 반드시 컴포넌트화

### 2. 컴포넌트 위치
```
src/components/
  ├── Button/         # 기본 UI 컴포넌트
  ├── Card/           # 카드 컴포넌트
  ├── Layout/         # 레이아웃 컴포넌트
  │   ├── AppBar/
  │   └── TabBar/
  └── [도메인]/        # 도메인 특화 컴포넌트
      └── RecipeCard/
```

### 3. Props 설계
- 필수 props 최소화
- 기본값 제공
- TypeScript 타입 정의

```typescript
// ✅ GOOD
interface RecipeCardProps {
  title: string;
  imageUrl: string;
  onPress?: () => void;        // 선택적
  showMenu?: boolean;          // 기본값 false
}

// ❌ BAD
interface RecipeCardProps {
  title: string;
  imageUrl: string;
  onPress: () => void;         // 항상 필수
  showMenu: boolean;           // 기본값 없음
  width: number;               // 레이아웃은 부모가 결정
}
```

## 📝 구현 워크플로우

### 1단계: 빠른 구현
```typescript
// 기존 토큰으로 빠르게 구현
const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
  },
  title: {
    ...Typography.heading.medium,
    color: SemanticColorsLight['foreground-onsurface'],
  },
});
```

### 2단계: 피드백 및 조정
- 사용자가 "이 부분 조정해줘" 하면 해당 부분만 수정
- Figma와 정확히 일치시키기

### 3단계: 새로운 토큰 추가 (필요시)
```typescript
// 사용자 확인 후 토큰 추가
export const NewSpacing = {
  ...Spacing,
  xxs: 4,  // 새로 추가됨
};
```

## 📍 메뉴 정렬 규칙

### 캡슐(Selector) 클릭 시 노출되는 메뉴

AppBar의 캡슐을 클릭하면 노출되는 Menu는 **해당 캡슐 기준으로 정렬**합니다.

#### 수평 정렬

| 트리거 위치 | 메뉴 정렬 | 스타일 |
|------------|-----------|--------|
| 좌측 캡슐 (타이틀 셀렉터) | 캡슐 좌측 기준 정렬 | `left: Spacing.md` |
| 우측 캡슐 (아이콘버튼 그룹) | 아이콘버튼 우측 기준 정렬 | `right: Spacing.md` |

#### 수직 간격

캡슐 하단 + 4px (`Spacing.xs`)

```typescript
// ✅ GOOD: 상수 사용
import {APPBAR_CONTENT_BOTTOM} from '@components/Layout';

// 좌측 캡슐 메뉴
groupFilterMenu: {
  position: 'absolute',
  top: APPBAR_CONTENT_BOTTOM + Spacing.xs,
  left: Spacing.md,
  zIndex: 20,
}

// 우측 캡슐 메뉴
moreMenu: {
  position: 'absolute',
  top: APPBAR_CONTENT_BOTTOM + Spacing.xs,
  right: Spacing.md,
  zIndex: 20,
}

// ❌ BAD: 하드코딩
style={{ top: 60, left: 16 }}
```

#### 수직 방향 (위/아래)

메뉴의 노출 방향은 트리거 위치와 화면 내 여유 공간에 따라 결정합니다.

| 조건 | 메뉴 방향 |
|------|-----------|
| 기본 (AppBar 트리거) | 아래로 노출 |
| 화면 하단 근처 트리거 | 위로 노출 |
| 스크롤 컨텍스트 | 남은 공간이 많은 방향으로 노출 |

### 메뉴 상호 배타
- 메뉴는 한 번에 하나만 노출
- 다른 메뉴를 열면 기존 메뉴는 닫힘
- 메뉴 바깥 터치 시 닫기 위한 투명 오버레이 필요

```typescript
// 오버레이 패턴
<Pressable
  style={styles.overlay}  // absoluteFill + transparent
  onPress={handleOverlayPress}
  pointerEvents={anyMenuOpen ? 'auto' : 'none'}
/>
```

## 🎬 애니메이션 규칙

### BlurView (expo-blur) 주의사항

**⚠️ CRITICAL: BlurView가 포함된 컴포넌트에서 `opacity: 0`을 사용하면 안 됩니다.**

BlurView는 부모의 opacity가 0이 되면 제대로 렌더링되지 않습니다. 블러 효과가 사라지거나 깜빡이는 현상이 발생합니다.

```typescript
// ❌ BAD: opacity로 BlurView 포함 컴포넌트 숨기기
<Animated.View style={{ opacity: animatedOpacity }}>
  <GlassContainer>  {/* BlurView 포함 */}
    <Content />
  </GlassContainer>
</Animated.View>

// ✅ GOOD: translateY로 화면 밖으로 이동
<Animated.View style={{ transform: [{ translateY: animatedTranslateY }] }}>
  <GlassContainer>
    <Content />
  </GlassContainer>
</Animated.View>
```

### 숨김/표시 애니메이션 패턴

GlassContainer, BottomTabBar, AddMenu 등 BlurView를 사용하는 컴포넌트:

```typescript
// 열기
Animated.spring(translateY, {
  toValue: 0,
  tension: 80,
  friction: 10,
  useNativeDriver: true,
}).start();

// 닫기 (화면 밖으로 이동)
Animated.timing(translateY, {
  toValue: 500, // 또는 100 등 화면 밖 거리
  duration: 250,
  useNativeDriver: true,
}).start();
```

### pointerEvents 활용

숨겨진 상태에서 터치 이벤트 차단:

```typescript
<Animated.View
  style={{ transform: [{ translateY }] }}
  pointerEvents={visible ? 'auto' : 'none'}
>
  <GlassContainer>...</GlassContainer>
</Animated.View>
```

### 콘텐츠 내부 opacity 사용

BlurView 컨테이너 자체가 아닌 **내부 콘텐츠**에만 opacity 적용 가능:

```typescript
// ✅ GOOD: 내부 콘텐츠만 opacity 적용
<GlassContainer>
  <Animated.View style={{ opacity: contentOpacity }}>
    <Text>내용</Text>
  </Animated.View>
</GlassContainer>
```

## ⚠️ 주의사항

### DO
- ✅ 기존 컴포넌트 재사용
- ✅ 기존 토큰 최대한 활용
- ✅ 일관성 있는 네이밍
- ✅ TypeScript 타입 정의
- ✅ BlurView 컴포넌트는 translateY로 숨김

### DON'T
- ❌ 하드코딩된 값 (색상, 크기 등)
- ❌ 인라인 스타일 남발
- ❌ 중복 컴포넌트 생성
- ❌ 토큰 없이 임의로 값 사용
- ❌ BlurView 포함 컴포넌트에 opacity 애니메이션

## 🤔 결정이 애매할 때

### 색상이 애매한 경우
→ 가장 비슷한 기존 토큰 사용, 나중에 조정

### 간격이 애매한 경우
→ 기존 간격 중 가장 가까운 것 사용

### 완전히 새로운 패턴인 경우
→ 사용자에게 물어보기: "이런 패턴은 처음인데, 어떻게 처리할까요?"

## 📌 체크리스트

구현 전 확인사항:
- [ ] 기존 토큰에서 사용할 수 있는 값 확인했는가?
- [ ] 비슷한 컴포넌트가 이미 있는지 확인했는가?
- [ ] 새로운 값이 정말 필요한지 고민했는가?
- [ ] 컴포넌트를 재사용 가능하게 설계했는가?

---

**이 규칙은 모든 페이지와 컴포넌트 구현 시 적용됩니다.**
