# Autoloop — Ben_Claude 자율 개선 루프

> 기록 시작: 2026-03-11
> Karpathy의 [Autoresearch](https://github.com/karpathy/autoresearch)에서 영감을 받아 설계

---

## 개념

Andrej Karpathy가 공개한 Autoresearch는 AI 에이전트가 ML 학습 코드를 스스로 수정·실험·커밋하는 루프다.

```
학습 코드 수정 → 5분 학습 → validation loss 비교 → 더 나으면 커밋 → 반복
```

이 방식을 **Claude Code 설정 파일 개선**에 적용한 것이 Ben_Claude Autoloop.

```
.claude/ 파일 분석 → 개선 적용 → LLM-judge 채점 → 더 나으면 커밋 → 반복
```

---

## 피트니스 함수 (채점 기준)

ML과 달리 단일 숫자 지표가 없으므로, Opus 4.6이 5개 항목을 채점:

| 항목 | 가중치 | 설명 |
|------|--------|------|
| 지시 명확성 | 25% | 모호함, 중복 없음 |
| 토큰 효율성 | 30% | 불필요한 반복 제거 |
| 일관성 | 20% | 용어/형식 통일 |
| 컨텍스트 관리 | 15% | handoff/compact 전략 |
| 에이전트 라우팅 | 10% | 모델 선택 기준 명확성 |

**총점이 이전보다 높으면 git 커밋, 낮으면 rollback.**

---

## 설계

### 핵심 파일

```
Ben_Claude_lab/
├── program.md          ← 개선 목표 & 채점 기준 (Karpathy의 program.md)
├── loop-log.md         ← 이터레이션 기록 누적
└── .claude/commands/
    └── autoloop.md     ← /autoloop 커맨드
```

### 안전 설계
- 원본 `Ben_Claude/`는 건드리지 않음
- `Ben_Claude_lab/`에서만 실험 (별도 git 레포)
- 전역 CLAUDE.md (`~/.claude/CLAUDE.md`) 수정 금지
- 이터레이션당 최대 3파일 수정

---

## 이터레이션 로그

### Baseline — 2026-03-11
초기 복사. 11,700단어 기준.

---

### Iter 1 — 6.10 → 7.45 ✅

**주제**: MCP → HTTP API 명확화

**변경 파일:**
- `ref-layout.md`: Step 2의 MCP 도구 명칭을 curl HTTP API 패턴으로 변경. "MCP 도구 빠른 참고" 테이블 헤더 + 엔드포인트 형식 명확화
- `cs-parallel.md`: cs.md와 중복되는 핵심 규칙 섹션 제거 → cs.md 참조로 대체

**이유**: `cs.md`는 `mcp__electron__* 사용 금지`를 명시하는데, `ref-layout.md`는 같은 API를 MCP 도구명으로 나열해 혼선 유발.

---

### Iter 2 — 7.45 → 7.55 ✅

**주제**: 모델 선택 기준 + 컨텍스트 관리 고도화

**변경 파일:**
- `CLAUDE.md` (프로젝트): 모델 선택 기준 섹션 추가 (Opus-4-6 / Sonnet-4-6 / Haiku-4-5), 컨텍스트 관리 트리거 테이블 추가
- `SKILL-GUIDE.md`: `troubleshoot`/`fix` 중복 카탈로그 항목 통합, `allowed-tools` 템플릿에 `Agent` 추가, `build.md` DEPRECATED 명확 표시
- `claude-monitor.md`: "Max X20" 불명확 텍스트 수정

**이유**: 매 대화에 로드되는 CLAUDE.md에 컨텍스트 관리·모델 선택 가이드가 없어 에이전트가 Opus/Sonnet 선택 기준 없이 진행.

---

### Iter 3 — 7.55 → 7.65 ✅

**주제**: 모델 ID 최신화 + 스킬 불필요 메모 제거

**변경 파일:**
- `project-sync.md`: 커밋 메시지 Co-Authored-By 모델명 `Claude Opus 4.5` → `Claude Opus 4.6`
- `hi5-setup.md`: 스킬 본문과 무관한 MCP 상태 메모 (serena/context7 비활성화 안내) 제거

**이유**: 모델 ID는 문서 전체의 신뢰도에 영향. 불필요한 메타 정보는 스킬 파일에 부적절.

---

### Iter 4 — 7.65 → 8.05 ✅

**주제**: Dead link 제거 + code-review 섹션 최신화

**변경 파일:**
- `local-server.md`: Puppeteer 관련 dead link 제거 (이미 playwright로 대체됨)
- `code-review.md`: 섹션명 최신화 (Puppeteer 섹션 → playwright 기반)

**이유**: 사용하지 않는 도구의 링크가 남아 있으면 Claude가 존재하지 않는 경로를 시도함.

---

### Iter 5 — 8.05 → 8.30 ✅

**주제**: TaskMaster 완료 섹션 제거 + l10n 중복 테이블 제거

**변경 파일:**
- `localization.md`: TaskMaster 완료 항목 섹션 제거 (-400단어)
- `l10n-sync.md`: 프로젝트 테이블 중복 제거 → `localization.md` 참조로 대체 (-87단어)

**이유**: 완료된 태스크 목록은 스킬 파일에 불필요. 프로젝트 테이블 중복은 정보 분산 야기.

---

### Iter 6 — 8.30 → 8.40 ✅

**주제**: adb alias 명확화 + /build 커맨드 카탈로그 등록

**변경 파일:**
- `SKILL-GUIDE.md`: adb/adb-android 두 스킬의 차이를 명확화. `/build` 커맨드를 카탈로그에 추가 (이전 빌드 스킬은 DEPRECATED로 표기).

---

### Iter 7 — 8.40 → 8.48 ✅

**주제**: playwright 설치 안내 + Windows 주의사항

**변경 파일:**
- `web-test.md`: playwright 최초 설치 명령어 추가, Windows 경로 구분자 주의사항 명시

---

### Iter 8 — 8.48 → 8.58 ✅

**주제**: code-review 역할 중복 제거 + 판단 기준 추가

**변경 파일:**
- `code-review.md`: 역할 중복 설명 제거. 수동/에이전트 실행 판단 기준 추가. 출력 형식 섹션 추가.

**이유**: 코드 리뷰 스킬에 "언제 에이전트를 쓰는가"에 대한 기준이 없어 매번 재판단이 필요했음.

---

### Iter 9 — 8.58 → 8.65 ✅

**주제**: 컨텍스트 관리 트리거 정량화

**변경 파일:**
- `CLAUDE.md`: 컨텍스트 관리 테이블에 정량 기준 추가 (메시지 20회↑, 파일 5개↑ 수정 시 등)

**이유**: "대화가 길어짐" 같은 정성적 기준보다 숫자 기준이 실행 가능한 지침이 됨.

---

### Iter 10 — 8.65 → 8.72 ✅

**주제**: l10n-update CDN 퍼지 중복 제거

**변경 파일:**
- `l10n-update.md`: CDN 퍼지 curl 명령어 제거 → `localization.md` 섹션 참조로 대체

---

### Iter 11~12 — Gitbook 연구 기록

**주제**: Extended Thinking + Multi-Agent 패턴 연구 결과 Gitbook 반영

**Gitbook 추가/업데이트:**
- `meta/EXTENDED-THINKING-Guide.md`: Claude 4.x의 Adaptive Thinking API 정확화
  - `budget_tokens` (deprecated) → `effort` 레벨 (`low/medium/high/max`)
  - Claude Code 키워드: `think`(4K) / `megathink`(10K) / `ultrathink`(32K)
  - Tab 키로 thinking 모드 토글 가능
  - Claude 4.x는 thinking 요약본만 반환하지만 전체 토큰 청구
- `meta/MULTI-AGENT-Patterns.md` (신규): 5가지 멀티에이전트 패턴 카탈로그
  - Fan-Out/Fan-In, Orchestrator-Worker, Research-Then-Implement, Evaluator-Optimizer, Specialist Routing
  - 실측 데이터: 3~5 병렬 에이전트 → 90.2% 성능 향상, 90% 시간 단축
  - 비용: 단일 채팅 대비 최대 15x 토큰 소비 → 복잡한 작업에만 적용

---

### Iter 13 — 8.72 → 8.78 ✅

**주제**: autoloop Judge 채점에 ultrathink 힌트 추가

**변경 파일:**
- `autoloop.md`: "4. Opus 4.6 Judge 채점" 단계에 `ultrathink:` 키워드 힌트 추가 → 복잡한 다기준 채점에 심층 추론 유도

---

### Iter 14~20 — 8.78 → 9.05 ✅

**주제**: Dead Link 일괄 정리 + Adaptive Thinking 가이드 추가

**변경 내용 (7개 이터레이션):**
- SKILL-GUIDE.md: 카탈로그 누락 항목 추가 (web-test, hi5-setup, localization)
- web-test.md: `agents/README.md` → `qa-agents/SKILL.md`, node -e → .js 파일 패턴
- code-review.md: 참조 dead link 수정 (agents/README.md → qa-agents)
- localization.md / hi5-setup.md / project-sync.md: PRD 파일 dead link → 실제 경로
- **CLAUDE.md**: Adaptive Thinking 키워드 테이블 추가 (`think/megathink/ultrathink` + 토큰 예산)

---

### Iter 21~26 — 9.05 → 9.28 ✅

**주제**: 연구 결과 반영 + l10n 커맨드 TaskMaster 완전 제거

**변경 내용:**
- cs.md: `megathink` 힌트 추가 (Visual Inference 섹션)
- program.md: 완료 항목 체크, 신규 연구 주제 (프롬프트 캐싱, Agent Teams) 추가
- autoloop.md: Step2 `ultrathink` + dead link 항목 추가; Step7 ralph-loop 연동 명확화
- l10n-sync/bump/setup/migrate.md: TaskMaster Task #1, #3, #13, #14 dead link 제거
- review.md: `agents/` → `/qa-agents` 경로 수정
- setup.md: MCP 설정 단계 제거

**연구 성과:**
- Prompt Caching 완전 파악: 캐시 히트 시 90% 비용 절감, Claude Code는 자동 적용 (5분 TTL)
- Gitbook 신규 페이지: `PROMPT-CACHING-Guide.md`

---

### Iter 27~30 — 9.28 → 9.40 ✅

**주제**: 참조 정확성 최종 점검 + 컨텍스트 관리 완성

**변경 내용:**
- cs-parallel.md: Phase1 에이전트 프롬프트에 `megathink` 힌트 추가
- cs-parallel.md: 참조 테이블 `CLAUDE.md`(부정확) → `cs.md`(실제 핵심 규칙 위치) 수정
- ref-layout.md: 연계 문서 상단 참조도 같은 방식으로 수정
- **CLAUDE.md**: 컨텍스트 관리 테이블에 "새 세션 시작 → handoff.md 먼저 확인" 행 추가

**총 이터레이션 현황:**
- 1~30 완료, 점수: 6.10 → 9.40 (+3.30p)
- Dead link 제거: ~15개 파일 정리
- 신규 Claude 고도화 기능 문서: Adaptive Thinking, Prompt Caching, Multi-Agent Patterns

---

## 인사이트

### 잘 작동한 것
- **구체적 피트니스 함수**: 5개 항목 가중 채점으로 "더 나은지"를 수치화
- **안전 격리**: lab 폴더 분리로 원본 보호
- **작은 이터레이션**: 이터레이션당 3파일 이내 → 변경 추적 용이
- **병렬 연구 + 즉시 적용**: 연구 에이전트 백그라운드 실행 중 다른 개선 진행 → 연구 결과를 기다리지 않음
- **ultrathink 힌트**: Judge 단계에 `ultrathink:` 추가로 채점 품질 향상 기대

### 한계
- LLM 자체가 judge이므로 자기 작업에 관대해질 수 있음
- "토큰 효율" 지표는 단순 단어 수로는 완전히 측정 불가
- 실제 Claude Code 동작 개선 여부는 실사용 없이 검증 불가
- 8.78 이후 점수 개선 폭이 줄어드는 수확 체감 현상 예상

### 다음 개선 방향
- [x] 프롬프트 캐싱 활용 전략 문서화 (PROMPT-CACHING-Guide.md)
- [ ] 채점 모델을 별도 에이전트로 분리 (자기 평가 편향 제거)
- [ ] 점수 정체 시 더 큰 변경 시도하는 로직 추가 (9.3+ 이후)
- [ ] Agent Teams 활용 패턴 실험 (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)

---

## 관련 링크

- [Karpathy Autoresearch](https://github.com/karpathy/autoresearch)
- [GeekNews 토픽](https://news.hada.io/topic?id=27300)
- Ben_Claude_lab: `C:\Users\a\Documents\Ben_Claude_lab`
