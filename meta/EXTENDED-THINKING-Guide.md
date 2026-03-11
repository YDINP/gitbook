# Extended Thinking — Claude 4.x 심층 추론 활용 가이드

> 기록일: 2026-03-11 | Ben_Claude_lab 연구 결과

---

## 개념

Extended Thinking은 Claude 4.x(Opus/Sonnet)가 응답 전에 내부적으로 "생각하는" 단계를 갖는 기능이다.
일반 응답과 달리, 모델이 여러 접근법을 탐색하고 자가 검증하는 과정을 거친다.

```
일반 응답: 입력 → [즉시] 출력
Extended: 입력 → <thinking>...</thinking> [심층 추론] → 출력
```

---

## 언제 사용하면 효과적인가

### ✅ 적합한 태스크

| 태스크 유형 | 이유 | Ben_Claude 예시 |
|------------|------|----------------|
| **복잡한 UI 좌표 추론** | 여러 패턴 동시 고려 필요 | ref-layout.md Step 4.5 — 간격 리듬 분석 |
| **에이전트 오케스트레이션 설계** | 의존성 그래프 추론 | cs-parallel.md 그룹 분리 판단 |
| **코드 버그 원인 분석** | 여러 가설 순차 검증 | code-review 복잡한 비동기 버그 |
| **상충 요구사항 해결** | 트레이드오프 분석 | 빌드 설정 최적화 |
| **수학/알고리즘 문제** | 단계별 검증 필요 | 게임 밸런스 계산 |

### ❌ 비효율적인 경우

- 단순 조회 (파일 읽기, 검색)
- 형식 변환 (JSON 포맷팅)
- 반복 실행 작업 (여러 파일에 동일 패턴 적용)
- 이미 명확한 명령 실행

---

## Claude Code에서 트리거 방법

Claude Code 자체에서 extended thinking을 직접 제어하는 API는 없지만, **프롬프트 구조**로 유도할 수 있다:

```markdown
# 효과적인 트리거 패턴

## 명시적 요청
"이 문제를 단계별로 깊이 생각해서 해결해줘"
"여러 접근법을 비교해서 최선을 선택해줘"
"확신이 없는 부분은 대안도 제시해줘"

## 구조화된 복잡 태스크
"다음 3가지 조건을 모두 만족하는 해결책을 찾아줘:
1. ...
2. ...
3. ..."
```

---

## API/SDK 활성화 (Claude API 직접 사용 시)

```python
# Anthropic SDK
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000  # 최대 thinking 토큰
    },
    messages=[{"role": "user", "content": "..."}]
)

# thinking 블록 접근
for block in response.content:
    if block.type == "thinking":
        print(block.thinking)  # 내부 추론 과정
    elif block.type == "text":
        print(block.text)      # 최종 응답
```

---

## 토큰 비용 고려사항

| 항목 | 일반 | Extended Thinking |
|------|------|------------------|
| 입력 토큰 | 동일 | 동일 |
| 출력 토큰 | 응답만 | 응답 + thinking (별도 청구) |
| 비용 배수 | 1x | 1.5x ~ 3x (thinking 길이에 따라) |
| 응답 품질 | 기본 | 복잡 태스크에서 유의미한 향상 |

**권장:** `budget_tokens`를 태스크 복잡도에 맞게 제한 (기본 10,000, 복잡한 경우 최대 32,000)

---

## Ben_Claude 적용 포인트

### cs.md / ref-layout.md에서
복잡한 UI 추론 시 에이전트 프롬프트에 추가:
```
이 UI 요소의 좌표와 크기를 추론할 때:
1. 먼저 레이아웃 패턴을 파악하고
2. 여러 가능한 해석을 검토한 후
3. 가장 합리적인 값을 선택해서 이유와 함께 설명해줘
```

### oracle/judge 역할에서
채점/검증 시 복잡한 판단이 필요하면:
```
각 변경사항을 평가할 때, 즉각적인 판단보다
실제 Claude 사용 시나리오에서 어떤 영향을 줄지
단계적으로 생각해서 점수를 매겨줘
```

---

## 한계

- Claude Code CLI에서는 `thinking` 파라미터를 직접 설정할 수 없음
- 프롬프트로 유도하는 것과 API 설정의 효과는 다를 수 있음
- Haiku에서는 extended thinking 지원 안 됨 (Opus/Sonnet만)
- Streaming과 함께 사용 시 thinking 블록이 먼저 스트리밍됨

---

## 참조

- [Anthropic Extended Thinking 공식 문서](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- Ben_Claude_lab loop-log.md — 연구 이터레이션 기록
