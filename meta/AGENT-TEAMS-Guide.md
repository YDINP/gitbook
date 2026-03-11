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

### 오케스트레이터 (Orchestrator)
- 전체 작업을 계획하고 서브에이전트에 위임
- 결과를 수집하여 최종 응답 조합
- 메인 Claude 인스턴스가 이 역할을 담당

### 워커 에이전트 (Worker Agents)
- 오케스트레이터가 spawn하는 독립 Claude 인스턴스
- 각자 독립적인 컨텍스트에서 작업 실행
- 결과만 오케스트레이터에 반환

### 격리 (Isolation)
- 각 워커는 독립적인 컨텍스트 창 보유
- 워커 간 직접 통신 없음 — 오케스트레이터를 통해서만 정보 공유
- 워커 오류가 전체 작업을 중단시키지 않음

---

## Claude Code Agent 도구

Agent Teams 활성화 시 사용 가능한 내장 도구:

```typescript
// Agent 도구 파라미터
{
  subagent_type: "general-purpose" | "explore" | "sisyphus-junior" | ...,
  prompt: string,          // 워커에게 전달할 작업 설명
  description: string,     // 3-5단어 작업 요약
  run_in_background?: boolean,  // 백그라운드 실행 여부
  isolation?: "worktree"   // git worktree 격리 모드
}
```

### 격리 모드: `isolation: "worktree"`
```
agent이 임시 git worktree에서 실행됨
변경사항 없으면 자동 정리
변경사항 있으면 worktree 경로 + 브랜치 반환
```

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

1. **동일 파일 동시 수정 금지**: 두 워커가 같은 파일을 수정하면 충돌 발생
2. **워커 오류 처리**: 오케스트레이터가 워커 실패를 감지하고 재시도 또는 스킵
3. **토큰 누적**: 각 워커가 독립적으로 토큰 소비 → 총 비용 증가 가능
4. **컨텍스트 공유 불가**: 워커는 오케스트레이터의 전체 컨텍스트를 상속받지 않음 — 필요한 정보는 prompt에 명시

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
