# Cocos Editor Server — UI 배치 커맨드

Cocos Creator 2.x 에디터의 cocos-editor-server를 통한 UI 작업을 자연어로 요청합니다.

## 인자

- `$ARGUMENTS`: 자연어 요청 (레퍼런스 이미지, 대상 노드, 작업 내용 포함)

## 사전 조건

- Cocos Creator 2.x 에디터 실행 중 + cocos-editor-server 패키지 로드 상태
- 접속: `curl` HTTP REST API (`mcp__electron__*` 사용 금지)

---

## 요청 파싱

`$ARGUMENTS`에서 아래 요소를 추출:

| 요소 | 추출 방법 | 예시 |
|------|----------|------|
| **레퍼런스 이미지** | 따옴표 안 경로, `.png`/`.jpg` 확장자 | `'ref-setting.png'` |
| **대상 노드/팝업** | 고유명사, PascalCase, 한글 명칭 | `SettingPopup`, `상점 팝업` |
| **작업 유형** | 키워드 매칭 (아래 테이블) | `위치 조정`, `프리팹 생성` |

### 작업 유형 라우팅

| 키워드 | 작업 모드 | 실행 Phase |
|--------|----------|-----------|
| `전체 배치`, `만들어줘`, `구현해줘` | **FULL** — 전체 워크플로우 | 0 → 1 → 1.5 → 2 → 3 → 4 |
| `프리팹 생성`, `팝업 생성`, `새로 만들어` | **CREATE** — 노드 트리 신규 생성 | 0 → 1 → 1.5 → 2 → 3 → 4 |
| `위치`, `좌표`, `배치`, `정렬` | **POSITION** — 위치/크기만 조정 | 0 → 1(위치만) → 3(속성변경) → 4 |
| `에셋 변경`, `이미지 교체`, `스프라이트` | **ASSET** — 에셋 매칭 + 교체 | 1(에셋매칭) → 3(set_spriteframe) |
| `확인`, `분석`, `비교` | **ANALYZE** — 추론만, 구현 안함 | 0 → 1 → 1.5 |
| `검증`, `체크` | **VERIFY** — 현재 상태 vs 레퍼런스 비교 | 0 → 4 |

**키워드 미매칭 시**: 사용자에게 작업 유형 확인 (AskUserQuestion)

---

## 참조 문서 (작업 시 필수)

4개 문서를 항상 연계하여 사용. 이 섹션의 규칙이 최상위 원칙.

| 문서 | 역할 | 위치 |
|------|------|------|
| **CLAUDE.md** | 최상위 추론 원칙/규칙 | `.claude/CLAUDE.md` > "Cocos Editor Server + Visual Inference" |
| **workflow-ui-reference.md** | 멀티에이전트 오케스트레이션 | `cocos-editor-server/docs/workflow-ui-reference.md` |
| **ref-layout.md** | 7단계 추론 기법 (정본) | `.claude/skills/ref-layout.md` |
| **inference-*.md** | 작업별 추론 기록/예시 | `cocos-editor-server/docs/inference-*.md` |

> **문서가 없는 프로젝트**: cocos-editor-server 패키지 내 docs/ 폴더의 문서를 우선 참조.
> `ref-layout.md`가 `.claude/skills/`에 없으면 `cocos-editor-server/docs/ref-layout.md`의 포인터를 따라감.

---

## 워크플로우 (Phase 0 → 4)

```
Phase 0: 레퍼런스 오버레이 배치 (사용자 실시간 확인용)
    ↓
Phase 1: 추론 — 레퍼런스 분석, 좌표 측정, 에셋 매칭
    ↓
Phase 1.5: 추론 검증 (oracle 에이전트)
    ↓
Phase 2: 설계안 → 사용자 승인 (노드트리 + 스크립트 + 컴포넌트)
    ↓
Phase 3: 구현 — curl로 cocos-editor-server API 호출
    ↓
Phase 4: 최종 검증 + 레퍼런스 오버레이 제거
```

## 에이전트 구성

| 역할 | 에이전트 | Phase |
|------|---------|-------|
| 추론 | `oracle-medium` / `multimodal-looker` | 1 |
| 검증 | `oracle-medium` | 1.5, 4 |
| 설계 | 리더 직접 (AskUserQuestion) | 2 |
| 구현 | `sisyphus-junior` | 3 |
| 오케스트레이터 | 리더 (Opus) | 전체 |

---

## 핵심 규칙

- ❌ `mcp__electron__*` 사용 금지 — `curl` HTTP REST API만 사용
- ❌ 에셋 이름만으로 선택 금지 — 반드시 이미지 형태 직접 확인 (Read)
- ❌ 프리팹 값 그대로 복사 금지 — 레퍼런스 측정값 사용
- ✅ 모든 추론에 근거 기록
- ✅ FULL/CREATE 모드에서 추론 문서 `inference-{name}.md` 생성 필수

### Visual Inference Rules (요약)

- 추론 우선순위: 시각적 형태(형태/색상/비율) > 컴포넌트 타입 > 이름 유사성
- 에셋 선택 점수: 형태 +3, 색상 +2, 비율 +1, 이름 +0.5 (5점 이상 확정)
- 좌표 변환: `design_x = (image_x - center_x) × scale`, `design_y = (center_y - image_y) × scale`
- SLICED+Scale: `scale = target_h / original_h`, `inner_w = target_w / scale`
- 9-slice border: 정사각 `min*0.43`, 가로pill `h*0.47`, 일반렉트 `min*0.30`

---

## 실행

요청: $ARGUMENTS

### Step 1 — 서버 연결
```bash
curl -s http://localhost:3001/health || curl -s http://localhost:3000/health
```
포트 실패 시 3000~3010 순차 스캔.

### Step 2 — 요청 파싱
`$ARGUMENTS`에서 레퍼런스 이미지, 대상 노드, 작업 유형을 추출.
누락 정보가 있으면 사용자에게 질문.

### Step 3 — 작업 유형별 Phase 실행
라우팅 테이블에 따라 해당 Phase만 실행.
각 Phase는 `workflow-ui-reference.md`와 `ref-layout.md` 절차를 따름.

### Step 4 — 결과 기록
작업 내용 및 추론 근거를 기록하며 진행.
