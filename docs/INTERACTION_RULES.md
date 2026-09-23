# 인터랙션 규칙

> 탭·롱프레스·햅틱처럼 "누르면 무슨 일이 일어나는가"에 대한 약속.
> 디자인 토큰(색·간격·타이포)은 [DESIGN_RULES.md](./DESIGN_RULES.md) 참고.

## 📳 햅틱 (진동 피드백)

`@utils/haptics`의 `triggerHaptic()`을 쓴다. 웹에서는 자동으로 무시된다.

| 종류 | 언제 | 예 |
|---|---|---|
| `light` | 일반 탭 — 버튼, 항목 추가, 메뉴 열기 | 「재료 추가」, 카드 탭 |
| `medium` | **롱프레스** — 평소보다 강한 의도 | 길게 눌러 편집 진입, 메뉴 열기 |
| `selection` | 값이 잘게 바뀔 때 (연속 호출 가능) | OCR 타자기 진행, 슬라이더 |

### 롱프레스는 항상 `medium`

롱프레스는 "일부러 오래 눌렀다"는 동작이라, 반응이 없으면 **눌린 건지 알 수 없다.**
탭보다 한 단계 강한 `medium`으로 "지금 반응했다"를 알린다.

```tsx
// ✅ GOOD
onLongPress={() => { triggerHaptic('medium'); openMenu(); }}

// ❌ BAD — 길게 눌렀는데 아무 반응이 없어 계속 누르게 된다
onLongPress={() => openMenu()}
```

### 공통 컴포넌트는 안에서 처리한다

`ListItem` 등은 내부에서 햅틱을 붙인다. 호출부가 매번 챙기면 빠뜨리는 곳이 생긴다.

```tsx
// ListItem.tsx — 호출부는 onPress/onLongPress만 넘기면 된다
onPress: onPress ? () => { triggerHaptic('light'); onPress(); } : undefined,
onLongPress: onLongPress ? () => { triggerHaptic('medium'); onLongPress(); } : undefined,
```

새 공통 컴포넌트를 만들 때도 이 방식을 따른다. 호출부에서 또 부르면 진동이 두 번 난다.

## 👆 탭 vs 롱프레스

| | 쓰는 곳 |
|---|---|
| **탭** | 그 화면의 주된 동작 하나 (열기·선택·이동) |
| **롱프레스** | 부가 동작 — 메뉴, 편집 진입, 전체보기 |

### 스와이프 영역에서는 탭을 피한다

좌우로 밀어 넘기는 영역(레시피 상세 대표 이미지 등)에 탭 동작을 주면,
넘기려다 실수로 눌린다. 이런 곳은 **롱프레스**로 받는다.

```tsx
// 히어로 이미지 — 좌우 스와이프로 이웃 레시피 이동. 전체보기는 롱프레스.
<Pressable onLongPress={() => { triggerHaptic('medium'); openViewer(); }} />
```

## 🎯 터치 영역

- 최소 44×44pt (iOS 권장). 아이콘이 작으면 `hitSlop`으로 넓힌다.
- `position: absolute`인 요소를 `Pressable`로 감싸면 배치 기준이 바뀌어
  레이아웃이 깨진다. 감싸는 대신 **같은 자리에 투명 Pressable을 겹친다.**

## ⚠️ 자주 하는 실수

**진동이 두 번 난다** — 공통 컴포넌트가 이미 부르는데 호출부에서 또 부른 경우.
`ListItem`·`RecipeCard`를 쓸 때는 직접 부르지 않는다.

**롱프레스가 안 먹는다** — 부모에 PanResponder가 있으면 제스처를 가로챌 수 있다.
`onMoveShouldSetPanResponder`만 쓰면 "움직일 때"만 가로채므로 제자리 누름은 통과한다.

**웹에서 에러** — `triggerHaptic`은 웹에서 무시되도록 처리돼 있다. 직접
`expo-haptics`를 부르지 말 것.
