# Figma API 설정 가이드

Figma API를 사용하여 디자인 토큰과 컴포넌트를 자동으로 가져오는 방법입니다.

## 1. Figma Personal Access Token 발급

1. [Figma Settings](https://www.figma.com/settings) 접속
2. **Account** 탭에서 **Personal access tokens** 섹션 찾기
3. **Create new token** 클릭
4. 토큰 이름 입력 (예: "React Native App")
5. 생성된 토큰 복사 (한 번만 표시되므로 안전하게 보관)

## 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 **본인이 발급한 토큰 값을 직접 넣어주세요.**  
아래 예시의 값은 설명용이므로 그대로 사용하면 안 됩니다:

```bash
# .env 파일 생성
FIGMA_PERSONAL_ACCESS_TOKEN=YOUR_FIGMA_PERSONAL_ACCESS_TOKEN

# 선택사항: 자주 사용하는 파일 키
FIGMA_FILE_KEY=ce9cxzvQSvJoPldTSZIiGG
```

⚠️ **주의**: `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

## 3. 패키지 설치

```bash
npm install
```

필요한 패키지:
- `dotenv` - 환경 변수 로드
- `ts-node` - TypeScript 스크립트 실행

## 4. Figma 파일 정보 가져오기

### 방법 1: 스크립트 사용

```bash
# Figma URL 사용
npm run figma:fetch https://www.figma.com/design/ce9cxzvQSvJoPldTSZIiGG/RE-BAKE

# 파일 키 직접 사용
npm run figma:fetch ce9cxzvQSvJoPldTSZIiGG

# 데이터를 JSON 파일로 저장
npm run figma:fetch ce9cxzvQSvJoPldTSZIiGG --save
```

### 방법 2: 코드에서 직접 사용

```typescript
import {getFigmaFile, extractFileKeyFromUrl} from '@utils/figmaApi';

// URL에서 파일 키 추출
const url = 'https://www.figma.com/design/ce9cxzvQSvJoPldTSZIiGG/RE-BAKE';
const fileKey = extractFileKeyFromUrl(url);

// 파일 정보 가져오기
const fileData = await getFigmaFile(fileKey);
console.log('컴포넌트 수:', Object.keys(fileData.components).length);
console.log('스타일 수:', Object.keys(fileData.styles).length);
```

## 5. Figma MCP 도구 사용

이 프로젝트는 Cursor의 Figma MCP 도구를 사용할 수 있습니다:

### ⚠️ 중요: MCP 도구 사용 전 필수 조건

**MCP가 켜져있어도 작동하지 않는 경우가 있습니다!** 다음 조건을 모두 만족해야 합니다:

1. ✅ **Figma Desktop 앱이 실행 중이어야 함** (웹 브라우저 버전은 지원 안 됨)
2. ✅ **Figma 파일이 Desktop 앱에서 열려있어야 함**
3. ✅ **노드를 선택했거나 nodeId를 제공해야 함** (선택 사항이지만 권장)

### 사용 가능한 MCP 도구들:
- `get_design_context` - 선택된 노드의 디자인 컨텍스트 가져오기 (코드 생성)
- `get_metadata` - 노드 메타데이터 가져오기 (구조 정보)
- `get_variable_defs` - 변수 정의 가져오기
- `get_screenshot` - 노드 스크린샷 가져오기
- `get_figjam` - FigJam 보드 정보 가져오기

### 사용 방법:

1. **Figma Desktop 앱에서 파일 열기**
2. **원하는 노드 선택** (선택하지 않으면 현재 선택된 노드 사용)
3. **Cursor에서 요청하기:**

```
"현재 선택된 피그마 노드의 디자인 토큰을 가져와서 tokens.ts에 반영해줘"
```

또는 URL에서 nodeId 추출:

```
"피그마 URL https://figma.com/design/ce9cxzvQSvJoPldTSZIiGG/RE-BAKE?node-id=1-2의 디자인을 가져와줘"
```

### MCP 도구가 작동하지 않는 경우:

- ❌ Figma Desktop 앱이 실행되지 않음 → 앱 실행 필요
- ❌ 파일이 열려있지 않음 → 파일 열기 필요
- ❌ 노드 ID가 잘못됨 → URL에서 올바른 node-id 확인
- ❌ MCP 서버 연결 오류 → Cursor 재시작 시도

## 6. 파일 키 추출 방법

Figma 파일 URL에서 파일 키를 추출하는 방법:

```
https://www.figma.com/design/[FILE_KEY]/[파일명]?node-id=...
```

예시:
- URL: `https://www.figma.com/design/ce9cxzvQSvJoPldTSZIiGG/RE-BAKE`
- 파일 키: `ce9cxzvQSvJoPldTSZIiGG`

## 7. 노드 ID 추출 방법

특정 컴포넌트나 화면의 노드 ID를 추출:

```
https://www.figma.com/design/...?node-id=49823-12141
```

노드 ID: `49823-12141`

## 문제 해결

### MCP 도구 오류 (가장 흔한 원인)

**"MCP가 켜져있어도 피그마를 못 읽는 경우"**

1. **Figma Desktop 앱 확인**
   - Figma Desktop 앱이 실행 중인지 확인
   - 웹 브라우저에서 열린 Figma는 MCP 도구가 작동하지 않음
   - [Figma Desktop 다운로드](https://www.figma.com/downloads/)

2. **파일 열기 확인**
   - Desktop 앱에서 파일이 열려있는지 확인
   - 파일이 열려있지 않으면 MCP 도구가 작동하지 않음

3. **노드 선택 확인**
   - 특정 노드를 읽으려면 해당 노드를 선택하거나
   - URL에서 `node-id` 파라미터를 제공해야 함
   - 예: `?node-id=123-456` → nodeId는 `123:456` 형식으로 변환

4. **MCP 서버 재연결**
   - Cursor를 재시작
   - Figma Desktop 앱을 재시작
   - MCP 설정에서 서버 연결 상태 확인

### 토큰 오류 (스크립트/API 사용 시)
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 토큰이 올바르게 복사되었는지 확인 (공백 없이)
- 토큰이 만료되지 않았는지 확인

### API 오류 (스크립트/API 사용 시)
- 파일 키가 올바른지 확인
- 파일에 대한 접근 권한이 있는지 확인
- 네트워크 연결 확인

## 참고 링크

- [Figma API 문서](https://www.figma.com/developers/api)
- [Personal Access Tokens](https://www.figma.com/developers/api#access-tokens)
- [Figma MCP 서버](https://github.com/modelcontextprotocol/servers)
