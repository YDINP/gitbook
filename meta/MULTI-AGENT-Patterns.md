# Multi-Agent 오케스트레이션 패턴 — Claude Code 활용 가이드

> 기록일: 2026-03-11 | Ben_Claude_lab 연구 결과 (loop-12)

---

## 핵심 원칙

멀티에이전트 시스템에서는 **단일 에이전트로 처리하기 어려운 작업**을 여러 전문화된 에이전트에 분산한다.

- 3~5개 병렬 에이전트: 단일 에이전트 대비 **90.2% 성능 향상**, **90% 시간 단축**
- 비용: 멀티에이전트는 단일 채팅 대비 **~15x 토큰 소비** → 복잡한 작업에만 적용
- 컨텍스트 전달: 자식 에이전트는 부모 히스토리를 받지 않음 → **spawn 프롬프트에 필요한 모든 정보 포함**

---

## 패턴 카탈로그

### 1. Fan-Out / Fan-In

독립적인 병렬 분석 후 오케스트레이터가 결과를 통합하는 패턴.

```
오케스트레이터
├── Agent A: 파트 1 분석 → 결과 A
├── Agent B: 파트 2 분석 → 결과 B
└── Agent C: 파트 3 분석 → 결과 C
     ↓
오케스트레이터: A + B + C 통합 → 최종 결과
```

**Ben_Claude 예시:** `cs-parallel.md` Phase 1 — 3~5 oracle-medium 에이전트가 UI 요소 그룹별 분석
**적합:** 대규모 코드 분석, 여러 파일 동시 검토, UI 배치 병렬 추론

---

### 2. Orchestrator-Worker

오케스트레이터가 단계별로 Worker에게 작업을 분배하는 패턴.

```
오케스트레이터 (Opus)
  │
  ├─ Step 1 → Worker A (Haiku): 파일 탐색
  ├─ Step 2 → Worker B (Sonnet): 코드 수정
  └─ Step 3 → Worker C (Sonnet): 검증
```

**적합:** 순서가 있는 다단계 작업, 각 단계가 이전 결과에 의존

---

### 3. Research-Then-Implement

연구 에이전트가 정보 수집 후, 구현 에이전트가 실행하는 패턴.

```
Research Agent (librarian)
  → 공식 문서, 코드베이스 조사
  → 발견사항 요약 반환
     ↓
Implement Agent (sisyphus-junior-high)
  → 연구 결과 기반 코드 작성/수정
```

**Ben_Claude 예시:** autoloop — 연구 에이전트 백그라운드 실행 → 개선 적용 병렬화
**적합:** 새로운 라이브러리 통합, 패턴 적용 전 사전 조사

---

### 4. Evaluator-Optimizer (Judge-Commit Loop)

평가자가 변경사항을 채점하고, 기준 충족 시에만 커밋하는 패턴.

```
Implementor → 변경사항 적용
Oracle (Judge) → 점수 산출
  → 향상: git commit
  → 하락: git checkout -- .  (롤백)
```

**Ben_Claude 예시:** autoloop.md의 채점 + 커밋/롤백 메커니즘
**적합:** 자율 개선 루프, A/B 테스트 자동화, 품질 게이팅

---

### 5. Specialist Routing

작업 유형에 따라 최적의 전문 에이전트로 라우팅하는 패턴.

```
오케스트레이터 (작업 분류)
├── 파일 탐색? → explore (Haiku) — 저비용
├── 코드 수정? → sisyphus-junior (Sonnet) — 중간
├── 아키텍처? → oracle (Opus) — 고품질
└── UI 작업? → frontend-engineer (Sonnet) — 전문화
```

**Ben_Claude 예시:** 글로벌 CLAUDE.md 서브에이전트 라우팅 테이블
**적합:** 다양한 유형의 작업이 섞인 복잡한 프로젝트

---

## Subagents vs Agent Teams

| 항목 | Subagents (현재 안정) | Agent Teams (실험적) |
|------|---------------------|---------------------|
| 통신 방향 | 오케스트레이터 ↔ 서브에이전트만 | 에이전트 간 직접 통신 가능 |
| 활성화 | 기본 (Agent 도구) | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| 권장 팀 규모 | 3~5 | 3~5 (최대 5~6 태스크/에이전트) |
| 안정성 | 안정 | 실험적 |

---

## 컨텍스트 전달 베스트 프랙티스

자식 에이전트는 **부모 대화 히스토리를 받지 않는다**. spawn 프롬프트에 필요한 모든 정보를 포함해야 한다.

```markdown
# 효과적인 서브에이전트 프롬프트 구조
다음 작업을 수행해줘:

## 배경 (Background)
[현재 프로젝트/작업 컨텍스트]

## 입력 데이터
[이전 단계 결과물, 관련 파일 경로]

## 요청
[구체적인 수행 작업]

## 출력 형식
[기대하는 결과 형식 — JSON, 마크다운 테이블 등]
```

---

## Ben_Claude 적용 가이드

### autoloop에서 Research 병렬화

```
# 연구 에이전트 백그라운드 실행
Agent(librarian, "Claude 4.x adaptive thinking API 조사", background=True)
Agent(librarian, "멀티에이전트 토큰 비용 최적화 전략 조사", background=True)

# 연구 결과 대기 없이 다른 개선 작업 병렬 실행
Edit(file1) ...
Edit(file2) ...
```

### cs-parallel에서 Fan-Out 적용

```
Phase 1 (병렬 3~5 에이전트):
  oracle-medium × 3: UI 그룹별 독립 분석
  explore × 2: 프리팹 파싱 + 에셋 인벤토리

Phase 3 (병렬 스크립트 생성):
  sisyphus-junior × 3: 그룹별 curl 스크립트 생성
```

---

## 비용 최적화 원칙

1. **Haiku 먼저**: 탐색/검색은 explore(Haiku) → 저비용
2. **Sonnet 중간**: 코드 수정, 단일 파일 작업 → 균형
3. **Opus 최소화**: 아키텍처 결정, 최종 채점에만 → 고품질 필요 시만
4. **병렬화 기준**: 독립 작업이고 각각 30초+ 예상 시 → 병렬 실행

**비용 예상 (멀티에이전트 Fan-Out 5개):**
- 단일 Opus 대화: 1x
- Sonnet 5개 병렬: ~5x
- 혼합 (Opus 1 + Sonnet 3 + Haiku 2): ~8x

---

## 참조

- [Claude Code Multi-Agent 공식 문서](https://docs.anthropic.com/en/docs/claude-code/multi-agent)
- [Agent SDK 공식 문서](https://docs.anthropic.com/en/docs/agents)
- Ben_Claude_lab/cs-parallel.md — 실제 멀티에이전트 UI 배치 적용 사례
- Ben_Claude_lab/meta/EXTENDED-THINKING-Guide.md — Adaptive Thinking과 멀티에이전트 결합
