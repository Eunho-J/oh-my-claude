# LSP Tools MCP Server

Claude Code를 위한 LSP (Language Server Protocol) 및 AST-Grep 도구 MCP 서버입니다.

## 설치

```bash
cd mcp-servers/lsp-tools
npm install
```

### 선택적 의존성

AST-Grep 기능을 사용하려면:
```bash
# npm에서 설치 (Node.js 바인딩)
npm install @ast-grep/napi

# 또는 CLI 설치
cargo install ast-grep
# 또는
brew install ast-grep
```

### 언어 서버 설치

각 언어에 대한 언어 서버가 필요합니다:

**TypeScript/JavaScript:**
```bash
npm install -g typescript-language-server typescript
```

**Python:**
```bash
pip install python-lsp-server
```

**Rust:**
```bash
rustup component add rust-analyzer
```

**Go:**
```bash
go install golang.org/x/tools/gopls@latest
```

## 사용법

MCP 서버로 실행:
```bash
node index.js
```

## 도구

### lsp_goto_definition

심볼의 정의로 이동합니다.

```json
{
  "file_path": "/path/to/file.ts",
  "line": 10,
  "character": 5
}
```

### lsp_find_references

심볼의 모든 참조를 찾습니다.

```json
{
  "file_path": "/path/to/file.ts",
  "line": 10,
  "character": 5,
  "include_declaration": true
}
```

### lsp_symbols

파일 또는 워크스페이스의 심볼 목록을 반환합니다.

```json
{
  "file_path": "/path/to/file.ts",
  "query": "function"
}
```

### lsp_diagnostics

파일의 진단 정보 (에러, 경고)를 반환합니다.

```json
{
  "file_path": "/path/to/file.ts"
}
```

### lsp_rename

심볼을 안전하게 리네임합니다.

```json
{
  "file_path": "/path/to/file.ts",
  "line": 10,
  "character": 5,
  "new_name": "newFunctionName"
}
```

### ast_grep_search

AST 패턴으로 코드를 검색합니다.

```json
{
  "pattern": "console.log($$$)",
  "path": "/path/to/search",
  "language": "typescript"
}
```

### ast_grep_replace

AST 패턴으로 코드를 교체합니다.

```json
{
  "pattern": "console.log($MSG)",
  "replacement": "logger.info($MSG)",
  "path": "/path/to/apply",
  "language": "typescript",
  "dry_run": true
}
```

## AST-Grep 패턴 예시

### 기본 패턴

```
// 함수 호출 매칭
console.log($ARG)

// 여러 인수 매칭
console.log($$$)

// 메서드 체인
$OBJ.then($CALLBACK).catch($HANDLER)
```

### 고급 패턴

```
// 특정 타입 매칭
function $NAME($$$PARAMS): $RETURN_TYPE { $$$ }

// 조건문 매칭
if ($CONDITION) { $$$BODY }

// 클래스 메서드 매칭
class $NAME {
  $METHOD($$$PARAMS) { $$$BODY }
}
```

## 문제 해결

### 언어 서버가 시작되지 않음

1. 해당 언어 서버가 설치되어 있는지 확인
2. PATH에 언어 서버 실행 파일이 있는지 확인
3. 로그 확인: `stderr` 출력

### AST-Grep 오류

1. `ast-grep` CLI가 설치되어 있는지 확인
2. 지원되는 언어인지 확인

## 라이선스

MIT
