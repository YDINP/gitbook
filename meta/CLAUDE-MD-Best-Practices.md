# CLAUDE.md 작성 모범 사례 — 2026 가이드

> 연구 일자: 2026-03-11 | Ben_Claude Autoloop 연구기록
> 출처: Anthropic 공식 문서, HumanLayer, BSWEN (1000+ 세션 기반)

## 개요

CLAUDE.md는 Claude Code 세션이 시작될 때 자동으로 로드되는 프로젝트/사용자 지시 파일입니다. **200줄 이하**로 유지하고, 세부 내용은 `@path` import로 분리하는 것이 핵심 원칙입니다.

---

## 로딩 계층 구조 (우선순위 높은 순)

```
Managed policy CLAUDE.md (조직 관리자, 제외 불가)
  ↓
~/.claude/CLAUDE.md (사용자 글로벌)
  ↓
~/.claude/rules/*.md (사용자 rules)
  ↓
./CLAUDE.md 또는 ./.claude/CLAUDE.md (프로젝트)
  ↓
./.claude/rules/*.md (프로젝트 rules — paths 없음: 항상 / paths 있음: lazy)
  ↓
서브디렉토리 CLAUDE.md (파일 접근 시 lazy 로드)
```

### 설정 파일 위치

| 파일 | 범위 | git 공유 |
|------|------|---------|
| `~/.claude/CLAUDE.md` | 모든 프로젝트 | 아니오 |
| `.claude/CLAUDE.md` | 현재 프로젝트 | 예 |
| `.claude/settings.local.json` | 로컬 오버라이드 | 아니오 (gitignore) |

---

## 2026 신기능: `.claude/rules/` 디렉토리

기존 단일 CLAUDE.md를 역할별로 분리할 수 있는 rules 시스템:

```
.claude/
├── CLAUDE.md              # 핵심 요약 (50~100줄)
└── rules/
    ├── code-style.md      # paths 없음 → 항상 로드
    ├── testing.md         # paths 없음 → 항상 로드
    └── api-rules.md       # paths 있음 → 해당 파일 접근 시만 로드
```

### Path-scoped Rules (파일 타입별 lazy 로딩)

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "lib/**/*.{ts,tsx}"
---

# API 규칙
- 모든 엔드포인트에 입력 검증 필수
- 표준 에러 응답 형식 사용
```

- `paths` frontmatter **없음** → 세션 시작 시 항상 로드
- `paths` frontmatter **있음** → 해당 경로 파일 접근 시에만 로드 (컨텍스트 토큰 절약)

### 사용자 레벨 rules

`~/.claude/rules/` — 모든 프로젝트에 적용 (프로젝트 rules가 우선)

**심링크 지원:** 공유 rules 디렉토리를 여러 프로젝트에 링크 가능

---

## `@path` Import 문법

대용량 참조는 별도 파일로 분리 후 import:

```markdown
# 워크플로우
- Git 워크플로우: @docs/git-instructions.md
- API 컨벤션: @docs/api-conventions.md
- 개인 오버라이드: @~/.claude/my-project-instructions.md
```

- 최대 import depth: 5단계
- 상대 경로는 해당 파일 기준으로 해석
- **장점**: CLAUDE.md 토큰 최소화 + 세부 내용은 필요 시 로드

---

## 최적 CLAUDE.md 구조 템플릿

```markdown
# 프로젝트명

한 줄 설명 + 기술 스택.

## Commands
- 빌드: `npm run build`
- 테스트: `npm test`
- 린트: `npm run lint`

## Architecture
- `src/api/` - REST 핸들러 (Express)
- `src/stores/` - Zustand 상태 (Redux 사용 금지)
- `src/components/` - React 함수형 컴포넌트만

## Key Files
- 엔트리 포인트: `src/index.ts`
- 설정: `src/config/env.ts`

## 프로젝트별 규칙
- 마이그레이션 파일은 커밋 후 절대 수정 금지
- API 에러는 `src/utils/errors.ts` 형식 사용
- `bun` 사용 (node/npm 금지)

## Gotchas
- Auth 테스트는 로컬 Redis 필요 (`docker-compose up redis`)
- Tailwind 아님, CSS modules (레거시 결정)

## 상세 참조
- Git 워크플로우: @docs/git-workflow.md
- API 컨벤션: @docs/api-conventions.md
```

---

## 포함하지 말아야 할 것

프론티어 모델은 150~200개 지시를 따를 수 있지만, **불필요한 지시는 전체 지시 성능을 균등하게 저하**시킵니다.

| 포함 금지 | 이유 |
|----------|------|
| 일반적인 코드 스타일 규칙 | Claude가 이미 알고 있음 |
| 린팅 규칙 | 실제 린터(Biome, ESLint) 사용 |
| 일회성 버그 수정 | 맥락 없이 혼란만 초래 |
| `/init` 자동 생성 결과 그대로 | 대부분 최적화되지 않음 |
| 자주 변하는 정보 | 유지보수 부담 |

---

## 빠른 판단 기준

| 필요한 것 | 해결책 |
|----------|--------|
| 항상 적용할 프로젝트 규칙 | `.claude/CLAUDE.md` (200줄 이하) |
| 파일 타입별 규칙 | `.claude/rules/api.md` (paths frontmatter) |
| 개인 선호사항 (전체 프로젝트) | `~/.claude/CLAUDE.md` |
| 개인 프로젝트 오버라이드 | `.claude/settings.local.json` + local import |
| **반드시 실행되어야 하는 액션** | **hooks** (CLAUDE.md 지시가 아닌 settings.json hooks) |
| 대용량 상세 참조 | `@path` import로 분리 |
| 특정 작업별 워크플로우 | `.claude/skills/` (`/skill-name`으로 호출) |
| 로드된 파일 디버그 | `/memory` 명령 또는 `InstructionsLoaded` hook |

---

## Auto Memory vs CLAUDE.md

| | CLAUDE.md | Auto Memory (`~/.claude/MEMORY.md`) |
|---|---|---|
| 작성자 | 사람 | Claude 자동 작성 |
| 내용 | 지시/규칙 | 학습한 패턴/발견 |
| 로딩 | 세션 시작 시 | 세션 시작 시 (첫 200줄) |
| 범위 | 프로젝트/사용자/조직 | 작업 트리별 |

---

## 참조

- [Claude Code Memory — 공식 문서](https://code.claude.com/docs/en/memory)
- [Claude Code Settings — 공식 문서](https://code.claude.com/docs/en/settings)
- [Writing a Good CLAUDE.md — HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [CLAUDE.md Structure Guide — BSWEN](https://docs.bswen.com/blog/2026-03-10-how-to-structure-claude-md/)
- Ben_Claude_lab `.claude/CLAUDE.md` — 실제 적용 사례 참조
