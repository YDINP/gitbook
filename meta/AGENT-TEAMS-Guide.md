# Agent Teams — Claude Code 멀티에이전트 팀 활용 가이드

> 연구 일자: 2026-03-11 | Ben_Claude Autoloop iter 48

## 개요

Claude Code의 **Agent Teams**는 복잡한 작업을 여러 Claude 인스턴스가 병렬로 처리하는 실험적 기능입니다. 오케스트레이터-워커 패턴으로 대규모 작업의 처리 속도를 크게 향상시킵니다.

---

## 활성화 방법

```bash
# 환경변수 설정 (세션 단위)
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 또는 .env / 셸 프로파일에 영구 등록
echo 'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' >> ~/.bashrc
```

> ⚠️ **실험적 기능**: 안정성이 보장되지 않으며 API 명세가 변경될 수 있습니다.

---

## 핵심 개념

### 팀 리드 (Team Lead)
- 팀을 생성하고 팀원을 spawn하는 세션
- 공유 태스크 리스트 관리
- 단, 팀원끼리 직접 메시지 가능 — 리드를 거치지 않아도 됨

### 팀원 (Teammates)
- 팀 리드가 spawn하는 독립 Claude Code 세션
- 각자 독립적인 컨텍스트 창 보유
- **서브에이전트와의 핵심 차이**: 팀원끼리 직접 통신 가능 (SendMessage 도구)

### Subagents vs Agent Teams 비교

| 항목 | Subagents | Agent Teams |
|------|-----------|-------------|
| 통신 방식 | 리드에게만 보고 | 팀원끼리 직접 메시지 |
| 조율 방식 | 오케스트레이터가 모든 작업 관리 | 공유 태스크 리스트 + 자기조율 |
| 사용자 접근 | 리드를 통해서만 | 어떤 팀원에게도 직접 질문 가능 |
| 최적 상황 | 결과만 필요한 단순 작업 | 토론/협력이 필요한 복잡한 작업 |
| 토큰 비용 | 낮음 (요약 후 반환) | 높음 (각 팀원이 별도 인스턴스) |

---

## 내부 아키텍처 — 7가지 조율 도구

Agent Teams는 내부적으로 7개 도구로 동작:

| 도구 | 역할 |
|------|------|
| `TeamCreate` | 팀 네임스페이스/설정 초기화 |
| `TaskCreate` | 작업 단위 정의 |
| `TaskUpdate` | 태스크 클레임 및 완료 처리 |
| `TaskList` | 팀 전체 작업 현황 조회 |
| `Task` (team_name 파라미터) | 팀원을 별도 Claude 세션으로 spawn |
| `SendMessage` | 에이전트 간 직접 메시지 |
| `TeamDelete` | 완료 후 팀 인프라 제거 |

태스크 상태: `pending` → `in_progress` → `completed`

팀 관련 파일 위치:
- `~/.claude/teams/{team-name}/config.json`
- `~/.claude/tasks/{team-name}/`

---

## 병렬 실행 패턴

### Fan-Out (분산 실행)

동일한 작업을 여러 파일에 병렬 적용:

```
오케스트레이터
├── 워커 A: FileA.ts 수정
├── 워커 B: FileB.ts 수정
└── 워커 C: FileC.ts 수정
     → 결과 병합 후 검증
```

**적합한 케이스**: 로컬라이징 키 적용, 파일별 코드 리뷰, 일괄 포맷팅

### Orchestrator-Worker (지시-실행)

오케스트레이터가 계획, 워커가 실행:

```
오케스트레이터 (계획)
├── 설계 분석 완료
├── 워커 1: 백엔드 로직 구현 → 완료
├── 워커 2: UI 컴포넌트 생성 → 완료
└── 검증 단계 실행
```

**적합한 케이스**: 멀티파일 기능 구현, 대규모 리팩토링

### Specialist Routing (전문가 라우팅)

작업 유형에 따라 최적 서브에이전트 선택:

| 작업 유형 | 라우팅 대상 |
|---------|------------|
| 탐색/검색 | `explore` (Haiku) |
| 코드 수정 | `sisyphus-junior` (Sonnet) |
| 복잡한 분석 | `oracle` (Opus) |
| UI 작업 | `frontend-engineer` (Sonnet) |
| 문서 작성 | `document-writer` (Haiku) |

---

## 비용 최적화 전략

### 모델 티어 활용
```
Haiku  → 탐색, 검색, 단순 조회 (가장 저렴)
Sonnet → 일반 코드 작업, 중간 복잡도
Opus   → 설계 결정, 복잡한 추론 (최고 성능)
```

### 병렬화 판단 기준
- 독립적인 작업 + 각 작업 >30초 → 병렬화 효과적
- 의존성 있는 작업 → 순차 실행 필수
- 동일한 파일 수정 → 병렬화 불가 (충돌)

### 컨텍스트 보호
- 대규모 출력이 예상되는 작업은 서브에이전트에 위임
- 서브에이전트에서 처리 후 요약만 메인 컨텍스트에 반환
- `run_in_background: true` → 결과 대기 없이 다음 작업 진행

---

## Ben_Claude 실전 적용 사례

### /cs-parallel 스킬
```
오케스트레이터: Phase 0 서버 상태 확인
├── 에이전트 1: 레이아웃 분석 (ref-layout.md 기반)
├── 에이전트 2: 좌표 계산
└── 에이전트 3: API 적용
```
→ 6개 이상 UI 요소 배치 시 사용. 단일 에이전트 대비 ~2배 속도.

### /qa-agents 스킬
```
오케스트레이터: 검사 유형 결정
├── CodeReviewAgent: 버그/보안
├── LocalizationAgent: 누락 키
├── ResourceCheckAgent: 미사용 파일
└── DesignCheckAgent: 디자인 데이터
```

---

## 주의사항

1. **동일 파일 동시 수정 금지**: 두 팀원이 같은 파일을 수정하면 충돌 발생
2. **세션 재개 불가**: `/resume`, `/rewind`가 in-process 팀원을 복원하지 못함
3. **팀 1개 제한**: 세션당 팀 1개만 관리 가능, 리더십 이전 불가
4. **중첩 팀 불가**: 팀원이 자체 팀을 생성할 수 없음 (리드만 팀 관리)
5. **토큰 비용**: 3명 팀 = 단일 세션 대비 약 3-4배 토큰 소비
6. **컨텍스트 공유 불가**: 팀원은 리드의 전체 컨텍스트를 상속받지 않음 — 필요한 정보는 spawn prompt에 명시
7. **⚠️ Windows 사용자**: Split-pane 모드 미지원 (VS Code, Windows Terminal, Ghostty 모두 미지원). **In-process 모드만 사용 가능.**

---

## 설정 확인

```bash
# 현재 설정 확인
echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS

# Claude Code 내에서 Agent 도구 사용 가능 여부 확인
# → 대화 중 Agent 도구가 나타나면 활성화됨
```

---

## 참조

- [Multi-Agent 오케스트레이션 패턴](MULTI-AGENT-Patterns.md) — 5가지 패턴 상세
- [Extended Thinking 가이드](EXTENDED-THINKING-Guide.md) — ultrathink 키워드 활용
- Ben_Claude_lab `.claude/CLAUDE.md` — 모델 선택 기준 및 서브에이전트 라우팅
