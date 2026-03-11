# Prompt Caching (프롬프트 캐싱) 활용 가이드

> 기록일: 2026-03-11 | Ben_Claude_lab 연구 결과 (loop-22)

---

## 개념

프롬프트 캐싱은 반복되는 프롬프트 접두사(prefix)를 KV 캐시로 저장해 재사용하는 기능이다.

```
일반 요청: 시스템 프롬프트(전체) → 처리 → 응답
캐싱 적용: 시스템 프롬프트(캐시 히트) → 빠른 처리 → 응답
```

- **캐시 히트**: 입력 토큰 비용 **90% 절감**, 레이턴시 **80% 감소**
- **손익분기**: 동일 프롬프트 ~1.4회 이상 재사용 시 캐싱이 유리

---

## API 활성화 방법

### 방법 1: 자동 캐싱 (권장 — Claude API 2026-02-19 출시)

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},  # 최상위에 추가
    system="...",
    messages=[...]
)
```

시스템이 자동으로 마지막 캐시 가능 블록을 캐싱. 대화가 길어질수록 캐시 포인트가 자동으로 전진.

### 방법 2: 명시적 브레이크포인트 (세밀 제어)

```python
system=[
    {"type": "text", "text": "기본 지침..."},
    {
        "type": "text",
        "text": "50페이지 분량의 문서...",
        "cache_control": {"type": "ephemeral"}  # 이 블록까지 캐싱
    }
]
```

요청당 최대 4개 브레이크포인트 설정 가능.

---

## 비용 구조

| 구분 | 배율 | Sonnet 4.6 예시 |
|------|------|----------------|
| 일반 입력 토큰 | 1x | $3.00/M |
| 캐시 쓰기 (5분 TTL) | **1.25x** | $3.75/M |
| 캐시 쓰기 (1시간 TTL) | **2.0x** | $6.00/M |
| **캐시 읽기 (히트)** | **0.1x** | **$0.30/M** |

### TTL 선택 기준

| TTL | 설정 방법 | 적합 상황 |
|-----|---------|---------|
| **5분** (기본) | `{"type": "ephemeral"}` | 5분 이하 간격 반복 호출 |
| **1시간** | `{"type": "ephemeral", "ttl": "1h"}` | 긴 문서 처리, 간헐적 호출 |

---

## Claude Code CLI에서의 자동 캐싱

Claude Code CLI는 **자동으로 프롬프트 캐싱을 사용**한다.

- CLAUDE.md, 시스템 프롬프트, 대화 히스토리를 캐시된 컨텍스트로 매 요청에 전송
- 현재는 **5분 TTL만 사용** (1시간 TTL 미적용)
- 별도 설정 없이 자동 적용 → 사용자가 직접 제어하는 파라미터는 없음

**실무 의미**: CLAUDE.md가 길어도 캐시 덕분에 반복 처리 비용이 절감됨. 하지만 CLAUDE.md가 너무 길면 캐시 미스 시 전체 처리 비용이 큼 → 여전히 간결하게 유지하는 것이 유리.

---

## 최소 캐싱 토큰 수

| 모델 | 최소 토큰 |
|------|---------|
| Claude Opus 4.6 / Haiku 4.5 | **4,096** |
| Claude Sonnet 4.6 | **2,048** |
| Claude Haiku 3.5 | **2,048** |

> 최소 토큰 미만 프롬프트는 `cache_control`을 명시해도 캐시되지 않는다.

---

## 효과적인 캐싱 대상

**캐싱하면 유리한 콘텐츠:**

| 콘텐츠 유형 | 이유 |
|------------|------|
| 긴 시스템 프롬프트 | 매 요청마다 동일하게 전송 |
| 도구 정의 (`tools` 배열) | 변경 없이 반복 사용 |
| 긴 문서/코드베이스 컨텍스트 | RAG, 코드 분석에 효과적 |
| 대화 히스토리 (multi-turn) | 자동 캐싱 활용 |

**캐싱 효과 없는 경우:**
- 매 요청마다 다른 프롬프트
- 최소 토큰 미만
- thinking 블록

---

## Ben_Claude 적용 포인트

### qa-agents (API 직접 호출 스크립트)

`qa-agents` 스킬은 Claude API를 직접 호출한다. 시스템 프롬프트가 4,096 토큰 이상이면 캐싱 적용:

```typescript
// qa-agent.ts — 자동 캐싱 활성화
const response = await anthropic.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 4096,
  cache_control: { type: "ephemeral" },  // 추가
  system: SYSTEM_PROMPT,  // 길고 반복되는 시스템 프롬프트
  messages: [...]
});
```

### 여러 파일 분석 시 (RAG 패턴)

```typescript
// 파일 내용을 user 메시지에 포함 + 캐싱
messages: [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: fileContents,  // 분석할 코드베이스
        cache_control: { type: "ephemeral" }  // 캐싱
      },
      { type: "text", text: "이 코드를 분석해줘" }
    ]
  }
]
```

---

## 주의사항

| 항목 | 내용 |
|------|------|
| 100% 동일해야 히트 | 프롬프트가 1자라도 다르면 캐시 미스 |
| 캐시 무효화 조건 | 도구 정의 변경, 이미지 추가/삭제, thinking 설정 변경 |
| 캐싱 순서 | tools → system → messages 순서. 상위 변경 시 하위 무효화 |
| workspace 격리 | workspace 단위로 캐시 격리 (2026-02-05~) |
| rate limit | 캐시 히트는 rate limit 카운터에 포함되지 않음 |

---

## 참조

- [Prompt Caching 공식 문서](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- Ben_Claude_lab/qa-agents 스킬 — API 직접 호출 패턴
- Ben_Claude_lab/meta/MULTI-AGENT-Patterns.md — 멀티에이전트 비용 최적화
