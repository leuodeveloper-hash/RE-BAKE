# 둘러보기 레시피 관리 기능 3종

## Context
어드민이 실수로 둘러보기 레시피를 영구 삭제한 사건 이후, 3가지 개선 필요:
1. 내 레시피 → 둘러보기 복사 기능 (어드민 전용)
2. 삭제 전 확인 다이얼로그
3. 소프트 삭제 (24시간 후 영구 삭제)

---

## Feature 1: 내 레시피 → 둘러보기 복사 (어드민 전용)

### 흐름
내 레시피 상세 → 메뉴 "둘러보기에 복사" → **공식 요리책 선택 시트** → Firestore `explore_recipes`에 복사

### 수정 파일

**`src/utils/recipeMenuItems.ts`**
- `RecipeMenuOptions`에 `showCopyToExplore?: boolean` 추가
- 메뉴 아이템 추가: `{id: 'copyToExplore', label: '둘러보기에 복사', icon: IconExprolerBookFilled}`

**`src/screens/RecipeDetailScreen.tsx`**
- props에 `onCopyToExplore?: () => void` 추가
- `menuItems` useMemo에 `showCopyToExplore: !!onCopyToExplore` 추가
- `handleMenuSelect`에 `'copyToExplore'` → `onCopyToExplore?.()` 케이스 추가

**`app/recipe/[id].tsx`** (핵심)
- `useExploreRecipeContext()`에서 `exploreCookbooks` 추가 디스트럭처링
- 공식 요리책 선택 시트 상태: `const [showExploreCookbookSheet, setShowExploreCookbookSheet] = useState(false)`
- `handleCopyToExplore` 콜백:
  - `setShowExploreCookbookSheet(true)` → 시트에서 요리책 선택
  - 선택 후 `handleExploreCookbookSelect(cookbookName)`:
    - 레시피 데이터에서 `id, sourceId, remakeGroupId, session, reviews, reviewCount` 제거
    - `explore_${Date.now()}` ID로 `setDoc(doc(db, 'explore_recipes', id), data)`
    - 선택한 요리책을 `cookbook` 필드에 설정
    - `stripUndefined` 적용
    - 성공 시 스낵바 "둘러보기에 복사되었습니다"
- `RecipeDetailScreen`에 `onCopyToExplore={isMyRecipe && isAdmin ? () => setShowExploreCookbookSheet(true) : undefined}` 전달
- `CookbookSelectSheet` 렌더링:
  - `visible={showExploreCookbookSheet}`
  - `cookbooks={exploreCookbooks.map(c => c.name)}`
  - `bookIcon={IconExprolerBookFilled}`
  - `onSelect={handleExploreCookbookSelect}`
  - 기존 `CookbookSelectSheet` 컴포넌트 재사용 (explore cookbook 색상 매핑)

### 임포트 추가
- `app/recipe/[id].tsx`: `setDoc` (firebase/firestore), `CookbookSelectSheet` (@components/BottomSheet), `IconExprolerBookFilled` (@components/Icon/IconIndex)

---

## Feature 2: 삭제 확인 다이얼로그

### 수정 파일

**`src/screens/ExploreScreen.tsx`** (카드 메뉴 삭제)
- `deleteTarget` 상태 추가: `useState<Recipe | null>(null)`
- `handleCardMenuSelect`에서 `'delete'` 시 `setDeleteTarget(recipe)` (기존: 바로 `onDeleteRecipe`)
- `Dialog` 렌더링:
  - `icon={IconTrashTwotone}`, `avatarColor="red"`, `title="레시피를 삭제할까요?"`
  - `description="24시간 이내에 되돌릴 수 있습니다."`
  - 취소 버튼 (`variant="soft"`) + 삭제 버튼 (`variant="soft"`, `destructive`)
- 삭제 확인 시 `onDeleteRecipe(deleteTarget)` 호출

**`src/screens/RecipeDetailScreen.tsx`** (상세 메뉴 삭제)
- `showDeleteConfirm?: boolean` prop 추가
- `showDeleteDialog` 상태 추가
- `handleMenuSelect`에서 `'delete'` 시: `showDeleteConfirm` → `setShowDeleteDialog(true)`, 아니면 기존대로 `onDelete?.()`
- `Dialog` 렌더 (ExploreScreen과 동일 패턴)

**`app/recipe/[id].tsx`**
- `showDeleteConfirm={isExploreRecipe && isAdmin}` prop 전달

---

## Feature 3: 소프트 삭제 (24시간 후 영구 삭제)

### 수정 파일

**`src/types/recipe.ts`**
- `Recipe` 인터페이스에 `deletedAt?: string` 추가

**`src/hooks/useExploreRecipes.ts`**
- `deleteDoc`, `doc` 임포트 추가
- `onSnapshot` 콜백에서:
  1. 만료된 레시피 영구 삭제: `deletedAt`이 24시간 이상 지난 레시피 → `deleteDoc`
  2. 표시용 필터: `deletedAt` 없는 레시피만 `applyFirestoreRecipes`
- `reload` 콜백에도 동일 로직

**`app/(tabs)/explore.tsx`** (카드 메뉴 삭제)
- `handleDeleteRecipe`: `deleteDoc` → `updateDoc(doc(...), {deletedAt: new Date().toISOString()})`
- 스낵바에 "되돌리기" 액션 추가: `updateDoc(doc(...), {deletedAt: deleteField()})`
- 임포트: `updateDoc`, `deleteField` 추가, `deleteDoc` 제거

**`app/recipe/[id].tsx`** (상세 삭제)
- `handleDelete`의 explore 분기: `deleteDoc` → `updateDoc` + `deletedAt`
- 스낵바에 "되돌리기" 액션 추가
- 임포트: `updateDoc`, `deleteField` 추가

---

## 구현 순서
1. `src/types/recipe.ts` — `deletedAt` 필드 추가
2. `src/utils/recipeMenuItems.ts` — `showCopyToExplore` 메뉴 아이템
3. `src/hooks/useExploreRecipes.ts` — 소프트 삭제 필터링 + 만료 퍼지
4. `app/(tabs)/explore.tsx` — 소프트 삭제 + 되돌리기
5. `src/screens/ExploreScreen.tsx` — 삭제 확인 다이얼로그
6. `src/screens/RecipeDetailScreen.tsx` — `onCopyToExplore` + 삭제 확인
7. `app/recipe/[id].tsx` — 복사 핸들러 + 요리책 선택 시트 + 소프트 삭제

## 검증
- 어드민 계정으로 내 레시피 상세 → 메뉴 → "둘러보기에 복사" → 요리책 선택 → 복사 확인
- 둘러보기 레시피 삭제 시 확인 다이얼로그 표시
- 삭제 후 스낵바 "되돌리기" 클릭 시 복원
- 삭제 후 Firestore에서 `deletedAt` 필드 존재, 레시피 목록에서 숨김
- 24시간 후 앱 로드 시 `deleteDoc`으로 영구 삭제
