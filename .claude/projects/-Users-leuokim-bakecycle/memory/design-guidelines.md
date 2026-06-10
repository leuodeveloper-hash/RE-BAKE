# Design Guidelines

## Interaction States
- **focused 스타일은 pressed와 동일하게 적용**: Pressable 컴포넌트에서 `focused` 상태는 항상 `pressed`와 같은 스타일을 사용한다. 패턴: `(pressed || focused) && styles.pressed`
- `getContainerStyle` 함수를 사용하는 경우: `getContainerStyle(pressed || focused)`
