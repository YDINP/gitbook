# Claude Code Hooks — 라이프사이클 자동화 완전 가이드

> 연구 일자: 2026-03-11 | Ben_Claude Autoloop 연구기록

## 개요

Hooks는 Claude Code 라이프사이클의 특정 시점에 자동으로 실행되는 사용자 정의 셸 커맨드, HTTP 엔드포인트, 또는 LLM 프롬프트입니다. "LLM이 선택할 수도 있는 것"이 아닌 **항상 실행되는 결정적 제어** 수단입니다.

---

## 설정 방법

`settings.json`의 `hooks` 키에 정의:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/check-safety.sh"
          }
        ]
      }
    ]
  }
}
```

### 설정 파일 위치 및 범위

| 파일 | 범위 | 공유 가능 |
|------|------|-----------|
| `~/.claude/settings.json` | 모든 프로젝트 | 아니오 |
| `.claude/settings.json` | 단일 프로젝트 | 예 (git 커밋) |
| `.claude/settings.local.json` | 단일 프로젝트 | 아니오 (gitignore) |
| Managed policy | 조직 전체 | 예 (관리자) |

Claude Code CLI에서 `/hooks` 명령으로 인터랙티브 관리 가능.

---

## 18개 Hook 이벤트 전체 목록

| 이벤트 | 발생 시점 | 블로킹 가능 |
|--------|-----------|-------------|
| `SessionStart` | 세션 시작/재개 | 아니오 |
| `InstructionsLoaded` | CLAUDE.md 또는 rules 파일 로드 | 아니오 |
| `UserPromptSubmit` | 사용자 프롬프트 제출, Claude 처리 전 | 예 |
| `PreToolUse` | 도구 호출 실행 전 | **예** |
| `PermissionRequest` | 권한 대화상자 표시 시 | 예 |
| `PostToolUse` | 도구 호출 성공 후 | 아니오 |
| `PostToolUseFailure` | 도구 호출 실패 후 | 아니오 |
| `Notification` | Claude Code 알림 전송 시 | 아니오 |
| `SubagentStart` | 서브에이전트 spawn 시 | 아니오 |
| `SubagentStop` | 서브에이전트 종료 시 | 예 |
| `Stop` | Claude 응답 완료 시 | 예 |
| `TeammateIdle` | Agent Teams 팀원 유휴 상태 예정 | 예 |
| `TaskCompleted` | 태스크 완료 표시 전 | 예 |
| `ConfigChange` | 설정 파일 변경 시 | 예 |
| `WorktreeCreate` | Worktree 생성 중 | 예 |
| `WorktreeRemove` | Worktree 제거 시 | 아니오 |
| `PreCompact` | 컨텍스트 압축 전 | 아니오 |
| `SessionEnd` | 세션 종료 시 | 아니오 |

---

## 4가지 Hook 타입

### 1. `command` — 셸 스크립트
```json
{
  "type": "command",
  "command": ".claude/hooks/my-script.sh",
  "timeout": 30,
  "async": false,
  "statusMessage": "검사 중..."
}
```
- stdin: JSON 이벤트 데이터
- stdout: JSON 응답 또는 컨텍스트 추가 텍스트
- exit code로 허용/차단 결정

### 2. `http` — HTTP 엔드포인트
```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/tool-use",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"],
  "timeout": 30
}
```
- HTTP POST로 이벤트 데이터 전송
- 2xx = 성공, non-2xx = 비차단 오류 (HTTP 상태로는 차단 불가, JSON 응답 바디 필요)

### 3. `prompt` — LLM 단일 평가
```json
{
  "type": "prompt",
  "prompt": "모든 태스크가 완료됐는지 확인해줘. 완료 안 됐으면 {\"ok\": false, \"reason\": \"이유\"}로 응답."
}
```
- 단일 턴 Claude 평가 (기본: Haiku)
- 예/아니오 판단에 적합

### 4. `agent` — 도구 접근 가능 서브에이전트
```json
{
  "type": "agent",
  "prompt": "단위 테스트가 모두 통과하는지 확인해줘. 테스트 스위트를 실행하고 결과를 확인해.",
  "timeout": 120
}
```
- Read, Grep, Glob 등 도구 사용 가능
- 복잡한 검증에 적합

기본 타임아웃: command=600s, prompt=30s, agent=60s

---

## Matcher 패턴

`matcher` 필드는 훅이 발생하는 조건을 필터링하는 **정규식 문자열**입니다.

| 이벤트 | 매처가 필터링하는 것 | 예시 |
|--------|---------------------|------|
| `PreToolUse`, `PostToolUse` | 도구 이름 | `Bash`, `Edit\|Write`, `mcp__.*` |
| `SessionStart` | 세션 시작 방식 | `startup`, `resume`, `clear`, `compact` |
| `SessionEnd` | 종료 이유 | `clear`, `logout`, `other` |
| `Notification` | 알림 유형 | `permission_prompt`, `idle_prompt` |
| `SubagentStart/Stop` | 에이전트 타입 | `Bash`, `Explore` |
| `PreCompact` | 압축 트리거 | `manual`, `auto` |
| `ConfigChange` | 설정 소스 | `user_settings`, `project_settings` |

**MCP 도구 패턴:** `mcp__<서버명>__<도구명>`
- `mcp__memory__.*` → 모든 memory 서버 도구
- `mcp__.*__write.*` → 모든 서버의 write 도구

---

## 입력/출력 스키마

### stdin JSON (모든 훅 공통)
```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

### exit code 의미

| exit code | 의미 |
|-----------|------|
| `0` | 성공. stdout을 JSON으로 파싱. |
| `2` | 블로킹 오류. stderr를 Claude에게 피드백으로 전송. |
| 기타 | 비차단 오류. verbose 모드에서만 stderr 표시. |

---

## PreToolUse: 도구 호출 차단 및 수정

### 방법 1: exit code 2 (단순 차단)
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
if echo "$COMMAND" | grep -q "rm -rf"; then
  echo "위험한 명령 차단됨" >&2
  exit 2
fi
exit 0
```

### 방법 2: JSON 구조화 출력 (세밀한 제어)

`permissionDecision` 값: `allow`, `deny`, `ask`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "rg를 사용해주세요 (grep보다 빠름)"
  }
}
```

### 도구 입력 수정 (실행 전)
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "npm run lint --fix"
    },
    "additionalContext": "npm 스크립트로 수정됨"
  }
}
```

### 범용 JSON 출력 필드

| 필드 | 설명 |
|------|------|
| `continue: false` | Claude 완전 중단 |
| `stopReason` | 사용자에게 표시할 메시지 |
| `suppressOutput` | stdout을 verbose에서 숨김 |
| `systemMessage` | 사용자에게 경고 표시 |

---

## 실용 예시 모음

| 목적 | 이벤트 | 타입 |
|------|--------|------|
| 편집 후 자동 포맷 (Prettier, ESLint) | `PostToolUse` matcher `Edit\|Write` | command |
| 위험한 셸 명령 차단 (`rm -rf`, `DROP TABLE`) | `PreToolUse` matcher `Bash` | command |
| 민감 파일 보호 (`.env`, `package-lock.json`) | `PreToolUse` matcher `Edit\|Write` | command |
| Claude 입력 필요 시 데스크탑 알림 | `Notification` | command |
| 압축 후 컨텍스트 재주입 | `SessionStart` matcher `compact` | command |
| 세션 시작 시 환경변수 설정 | `SessionStart` | command |
| 설정 변경 감사 로그 | `ConfigChange` | command |
| 모든 Bash 명령 파일에 로그 | `PostToolUse` matcher `Bash` | command |
| MCP 서버 쓰기 작업 차단 | `PreToolUse` matcher `mcp__.*__write.*` | command |
| Claude 종료 전 테스트 통과 확인 | `Stop` | agent 또는 prompt |
| 코드 품질 게이트 강제 | `PostToolUse` | command + prompt |
| 팀 공유 검증 HTTP 서비스 | `PreToolUse` | http |
| 세션 시작 시 git 상태 컨텍스트 로드 | `SessionStart` | command |
| "미완료 태스크 있으면 완료 불가" | `Stop` | prompt |

---

## 무한 루프 방지 (`Stop` 훅)

`Stop` 훅에서 Claude를 다시 시작하면 무한 루프 위험:

```bash
#!/bin/bash
INPUT=$(cat)
# stop_hook_active가 true면 훅 실행 중 → 바로 종료
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
# 나머지 훅 로직...
```

---

## 주의사항

1. **셸 프로파일 오염**: `~/.zshrc` 등에서 무조건 `echo`하면 JSON 출력 손상됨
   ```bash
   # 올바른 패턴
   if [[ $- == *i* ]]; then
     echo "Shell ready"  # interactive 모드에서만 출력
   fi
   ```
2. **설정 파일 변경**: 즉시 적용되지 않음 — `/hooks` 메뉴 검토 또는 세션 재시작 필요
3. **`PermissionRequest` 훅**: 비인터랙티브 모드(`-p` 플래그)에서 미발동 → `PreToolUse` 사용
4. **JSON/exit code 상호 배타적**: exit 2 + stderr OR exit 0 + JSON stdout, 둘 다 사용 금지

---

## Agent Teams 전용 훅

| 이벤트 | 용도 |
|--------|------|
| `TeammateIdle` | 팀원이 유휴 상태 예정 → exit 2로 계속 작업 |
| `TaskCompleted` | 태스크 완료 표시 전 → exit 2로 품질 게이트 실행 |

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "코드 변경사항을 검토하고 테스트가 통과하는지 확인해.",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

---

## 참조

- [Hooks reference — 공식 문서](https://code.claude.com/docs/en/hooks)
- [Automate workflows with hooks — 가이드](https://code.claude.com/docs/en/hooks-guide)
- [claude-code-hooks-mastery (GitHub)](https://github.com/disler/claude-code-hooks-mastery)
- Ben_Claude_lab `.claude/CLAUDE.md` — 검증 루프 탈출 규칙 (Stop 훅 활용 패턴)
