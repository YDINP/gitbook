# Extended Thinking (Adaptive Thinking) — Claude 4.x 심층 추론 활용 가이드

> 기록일: 2026-03-11 | Ben_Claude_lab 연구 결과 (loop-11 업데이트)

---

## 개념

Claude 4.x는 응답 전에 내부적으로 "생각하는" 단계(**Adaptive Thinking**)를 갖는다.
Claude 3.x의 "Extended Thinking(`budget_tokens`)"에서 명칭과 API가 변경되었다.

```
일반 응답: 입력 → [즉시] 출력
Adaptive:  입력 → [thinking 단계] → 출력
```

> ⚠️ Claude 4.x에서는 `budget_tokens` 파라미터가 **deprecated** 됨. `effort` 레벨로 대체.

---

## Claude Code에서 트리거하는 방법

Claude Code CLI에서는 **키워드**로 thinking 깊이를 조절할 수 있다:

| 키워드 | 토큰 예산 | 사용 시점 |
|--------|----------|----------|
| `think` | ~4,000 | 간단한 추론, 설계 검토 |
| `megathink` | ~10,000 | 중간 복잡도 문제 |
| `ultrathink` | ~32,000 (최대) | 복잡한 아키텍처, 다단계 추론 |

또한 **Tab 키**로 thinking 모드를 토글할 수 있다 (Claude Code UI).

### 효과적인 트리거 패턴

```markdown
# 명시적 키워드 사용
"ultrathink: 이 아키텍처 결정의 트레이드오프를 분석해줘"
"megathink를 사용해서 에이전트 의존성 그래프를 설계해줘"

# 복잡한 조건 제시
"다음 3가지 조건을 모두 만족하는 해결책을 찾아줘:
1. 토큰 효율 최대화
2. 병렬 실행 안전성 보장
3. 하위 호환성 유지"
```

---

## API/SDK 활성화 (Claude API 직접 사용 시)

### Claude 4.x (현재 권장)

```python
# Anthropic SDK — Claude 4.x Adaptive Thinking
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={
        "type": "adaptive"  # Claude 4.x: budget_tokens 대신 adaptive
    },
    output_config={
        "effort": "high"    # "low" | "medium" | "high" | "max"
    },
    messages=[{"role": "user", "content": "..."}]
)

# thinking 블록 접근 (Claude 4는 요약본 반환)
for block in response.content:
    if block.type == "thinking":
        print(block.thinking)  # thinking 요약 (전체 토큰은 내부 소비)
    elif block.type == "text":
        print(block.text)
```

### Claude 3.x (구버전 참조용)

```python
# Claude 3.x — budget_tokens 방식 (deprecated)
response = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000  # Claude 3.x 전용
    },
    messages=[{"role": "user", "content": "..."}]
)
```

---

## 언제 사용하면 효과적인가

### ✅ 적합한 태스크

| 태스크 유형 | 이유 | Ben_Claude 예시 |
|------------|------|----------------|
| **복잡한 UI 좌표 추론** | 여러 패턴 동시 고려 필요 | ref-layout.md Step 4.5 — 간격 리듬 분석 |
| **에이전트 오케스트레이션 설계** | 의존성 그래프 추론 | cs-parallel.md 그룹 분리 판단 |
| **코드 버그 원인 분석** | 여러 가설 순차 검증 | code-review 복잡한 비동기 버그 |
| **상충 요구사항 해결** | 트레이드오프 분석 | autoloop 개선 방향 결정 |
| **수학/알고리즘 문제** | 단계별 검증 필요 | 게임 밸런스 계산 |

### ❌ 비효율적인 경우

- 단순 조회 (파일 읽기, 검색)
- 형식 변환 (JSON 포맷팅)
- 반복 실행 작업 (여러 파일에 동일 패턴 적용)
- 이미 명확한 명령 실행

---

## 토큰 비용 고려사항

| 항목 | 일반 | Adaptive Thinking |
|------|------|------------------|
| 입력 토큰 | 동일 | 동일 |
| 출력 토큰 | 응답만 | 응답 (thinking은 내부 소비) |
| 청구 방식 | 출력 토큰 | thinking 생성 토큰 전체 청구 (요약본만 반환해도) |
| 비용 배수 | 1x | 1.5x ~ 3x (effort 레벨에 따라) |
| 평균 TTFT | 빠름 | Opus 4.6 기준 ~21.56초 |

> ⚠️ Claude 4.x에서 thinking 블록은 **요약본만 반환**되지만, 내부적으로 생성된 **전체 토큰이 청구**된다.

---

## Ben_Claude 적용 포인트

### autoloop.md에서 (복잡한 채점 단계)

```
# Opus 4.6 Judge 채점 시
ultrathink: 변경 전/후를 비교하여 각 기준(토큰효율/명확성/일관성/컨텍스트관리/에이전트라우팅)을
다단계로 검토하고 최종 점수를 산출해줘.
```

### cs.md / ref-layout.md에서 (UI 추론)

```
megathink를 사용해서:
1. 레이아웃 패턴을 파악하고
2. 여러 가능한 해석을 검토한 후
3. 가장 합리적인 값을 선택해서 이유와 함께 설명해줘
```

### oracle/judge 역할에서

```
ultrathink로 각 변경사항을 평가할 때, 실제 Claude 사용 시나리오에서
어떤 영향을 줄지 단계적으로 검토해서 점수를 매겨줘
```

---

## 한계

- Claude Code CLI에서 `effort` 파라미터를 직접 설정할 수 없음 → 키워드(`think`/`megathink`/`ultrathink`)로 유도
- thinking 블록 요약본만 반환 → 전체 추론 과정 열람 불가 (Claude 4.x)
- Haiku에서는 Adaptive Thinking 지원 안 됨 (Opus/Sonnet만)
- Streaming과 함께 사용 시 thinking 블록이 먼저 스트리밍됨

---

## 참조

- [Anthropic Extended Thinking 공식 문서](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- Ben_Claude_lab loop-log.md — 연구 이터레이션 기록
- Ben_Claude_lab/meta/MULTI-AGENT-Patterns.md — 멀티에이전트 패턴 연구
