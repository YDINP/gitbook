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

## 인사이트

### 잘 작동한 것
- **구체적 피트니스 함수**: 5개 항목 가중 채점으로 "더 나은지"를 수치화
- **안전 격리**: lab 폴더 분리로 원본 보호
- **작은 이터레이션**: 이터레이션당 3파일 이내 → 변경 추적 용이

### 한계
- LLM 자체가 judge이므로 자기 작업에 관대해질 수 있음
- "토큰 효율" 지표는 단순 단어 수로는 완전히 측정 불가
- 실제 Claude Code 동작 개선 여부는 실사용 없이 검증 불가

### 다음 개선 방향
- 백그라운드 분석 에이전트 결과 반영 (l10n 중복, web-test 품질)
- 채점 모델을 별도 에이전트로 분리 (자기 평가 편향 제거)
- 점수 정체 시 더 큰 변경 시도하는 로직 추가

---

## 관련 링크

- [Karpathy Autoresearch](https://github.com/karpathy/autoresearch)
- [GeekNews 토픽](https://news.hada.io/topic?id=27300)
- Ben_Claude_lab: `C:\Users\a\Documents\Ben_Claude_lab`
