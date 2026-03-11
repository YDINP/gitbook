# /cs 커맨드 고도화 연구 기록

> 연구 일자: 2026-03-11 | Ralph-loop (max 50 iterations)
> 목표: cocos-editor-server REST API를 활용한 `/cs` 커맨드 아키텍처 고도화

---

## 개요

이전 Autoloop(55 iterations, 6.10→9.97 score)의 연구 결과를 바탕으로, `/cs` 커맨드의 에셋 추론 정확도·구현 효율·검증 신뢰성을 추가 고도화한 연구 기록.

**핵심 발견:**
1. `browse_assets` API로 에셋 인벤토리 수집 자동화 (Glob + .meta 수동 파싱 대체)
2. `set_node_transform`으로 좌표/스케일 1-call 설정 (개별 `set_node_property` 4회 대체)
3. `autoBorder:true`로 9-slice border 서버 자동 추론
4. `analyze_reference_layout`으로 Phase 4 구조 기반 검증 추가
5. Widget 컴포넌트 좌표 처리 규칙 정립

---

## Phase A — cs.md 개선

### A1. 에셋 선택 6기준 점수제

기존 4기준(형태+색상+비율+이름)에서 6기준으로 확장:

| 기준 | 점수 | 확인 방법 |
|------|------|---------|
| 형태 일치 (pill↔pill, 원형↔원형) | +3 | Read로 PNG 직접 확인 |
| 색상 계열 일치 | +2 | Read로 PNG 직접 확인 |
| 가로:세로 비율 유사 (±20% 이내) | +1.5 | .meta에서 width/height 확인 |
| 텍스처 크기 (레퍼런스 요소 px와 근접) | +1 | .meta size 비교 |
| 이름 키워드 일치 (보조) | +0.5 | 파일명 확인 |
| 이미 씬에서 사용 중인 에셋 | +0.5 | get_all_nodes 결과에서 확인 |

**판정 기준**: 7점↑ 확정 / 5~6점 후보 2개 제시 후 사용자 선택 / 4점↓ 재탐색

**핵심 변경점:**
- 비율(±20% 기준)을 별도 항목으로 분리하여 +1.5점 부여
- 텍스처 실제 크기 비교 항목 추가 (+1점)
- 씬 사용 여부 보너스 추가 (+0.5점) — 기존 에셋 재사용 우선 원칙

### A2. Phase 4 오차 대응 기준

픽셀 단위 오차에 따른 자동 보정 테이블:

```
±5px 이내    → PASS (허용 오차)
±6~15px     → 자동 보정: set_node_transform으로 오프셋 재적용
±16~30px    → 해당 요소만 Phase 1 재추론 후 재적용
±30px 초과  → 사용자에게 레퍼런스 재확인 요청 (AskUserQuestion)
```

### A3. 에셋 인벤토리 캐시 (Step 1.5)

```bash
# 캐시 존재 시 Step 2.5 스킵 가능
ls .claude/cache/asset-inventory-{ProjectName}.json 2>/dev/null && echo "CACHE HIT"
```

캐시 없으면 Step 2.5에서 `browse_assets` API로 생성.

### A4. set_node_transform (Phase 3)

```bash
# x, y, scaleX, scaleY 한 번에 설정 (set_node_property 4회 대신)
curl -X POST http://localhost:3000/api/node/set_node_transform \
  -H "Content-Type: application/json" \
  -d '{"uuid":"<nodeUuid>","x":0,"y":172,"scaleX":1,"scaleY":1}'
```

### A5. analyze_reference_layout (Phase 4)

```bash
# 노드 구조+속성 스냅샷으로 수치 비교 (pixel-diff 전 단계)
curl -X POST http://localhost:3000/api/scene/analyze_reference_layout \
  -H "Content-Type: application/json" \
  -d '{"parentUuid":"<popupUuid>","includeInactive":true}'
```

---

## Phase B — ref-layout.md 개선

### B1. Step 2.5 — browse_assets 자동화

기존 Glob + .meta 수동 파싱을 API 1회 호출로 대체:

```bash
# sprite-frame UUID + 크기 일괄 수집
curl -X POST http://localhost:3000/api/project/browse_assets \
  -H "Content-Type: application/json" \
  -d '{"folder":"db://assets","type":"sprite-frame"}'
# → [{name, uuid, path, size:{w,h}}, ...] 반환

# 캐시 저장
# → .claude/cache/asset-inventory-{ProjectName}.json
```

**기대 효과:**
- Step 2.5 시간 단축 (Glob 반복 탐색 → 단일 API 호출)
- size 정보 즉시 활용 (비율 계산, 텍스처 크기 비교)
- UUID 직접 수집으로 .meta 파싱 불필요

### B2. SLICED border 자동 추론 (autoBorder)

`set_spriteframe` 호출 시 `autoBorder:true` (기본값) 사용 — 서버가 shape에서 border 자동 추론.

```bash
# autoBorder 기본 사용 (권장)
curl -X POST http://localhost:3000/api/node/set_spriteframe \
  -H "Content-Type: application/json" \
  -d '{"uuid":"<nodeUuid>","assetUuid":"<spriteUuid>","sizeMode":"SLICED","autoBorder":true}'

# 비대칭/장식형 에셋 — 수동 border
curl -X POST http://localhost:3000/api/node/set_spriteframe \
  -H "Content-Type: application/json" \
  -d '{"uuid":"<nodeUuid>","assetUuid":"<spriteUuid>","sizeMode":"SLICED","autoBorder":false,"border":{"top":8,"bottom":8,"left":20,"right":20}}'
```

**서버 내부 border 추론 공식 (참고용):**
| 형태 | 공식 |
|------|------|
| 정사각/원형 (비율 0.8~1.25) | `min(w,h) × 0.43` |
| 가로 pill (비율 >2.0) | `height × 0.47` (좌우만) |
| 일반 라운드렉트 | `min(w,h) × 0.30` |

### B3. Widget 컴포넌트 좌표 처리 규칙

Widget 컴포넌트가 있는 노드에 `set_node_property`로 x/y 직접 쓰기 전 반드시 확인 필요.

**alignMode별 동작:**

| alignMode | 값 | alignment 실행 시점 |
|-----------|----|--------------------|
| ONCE | 0 | onEnable 1회 (이후 자동 disable) |
| ON_WINDOWS_RESIZE | 1 | 리사이즈 시 재실행 |
| ALWAYS | 2 | 매 프레임 (position 쓰기 불가) |

**처리 방법:**

| 시나리오 | 처리 |
|---------|------|
| 모든 align flag false | `set_node_property` x/y 직접 쓰기 가능 |
| 특정 축 flag 활성 | Widget margin 속성으로 제어 (`widget.left`, `widget.top`) |
| alignMode=ALWAYS + flag 활성 | flag를 false로 변경 후 position 쓰기 |
| 전체 stretch (4방향 활성) | margin으로 위치 조정 |

```bash
# Widget flag 확인 후 margin으로 위치 조정
curl -X POST http://localhost:3000/api/node/set_component_property \
  -d '{"uuid":"<nodeUuid>","component":"cc.Widget","property":"left","value":20}'

# Widget flag 해제 후 position 직접 쓰기
curl -X POST http://localhost:3000/api/node/set_component_property \
  -d '{"uuid":"<nodeUuid>","component":"cc.Widget","property":"isAlignLeft","value":false}'
# → 이후 set_node_transform 정상 작동
```

> Widget 비활성화(enabled=false) 후 re-enable 시 alignment 재실행 → position 초기화.
> flag를 false로 두는 방식 권장 (enabled toggle 금지).

---

## 결론 및 아키텍처 요약

### /cs 커맨드 개선된 흐름

```
Step 1:   서버 연결 확인 (3000~3010 포트 스캔)
Step 1.5: 에셋 인벤토리 캐시 확인
           ├── HIT  → Step 3으로 바로 이동
           └── MISS → Step 2.5에서 browse_assets API 호출
Step 2:   요청 파싱 (레퍼런스 이미지, 대상 노드, 작업 유형)
Step 2.5: 에셋 인벤토리 수집 (browse_assets + 캐시 저장)
Step 3:   6기준 점수제로 에셋 매칭
           → 7점↑ 확정 / 5-6점 후보 제시 / 4점↓ 재탐색
Step 4:   구현 (set_node_transform으로 일괄 좌표 적용)
           → Widget 노드: flag 확인 후 margin 또는 flag 해제 처리
           → SLICED: autoBorder:true (기본값)
Step 5:   검증 (analyze_reference_layout + pixel-diff.js)
           → ±5px PASS / ±6~15px 자동보정 / ±16~30px 재추론 / ±30px+ 사용자 확인
```

### 핵심 API 요약

| 목적 | API | 비고 |
|------|-----|------|
| 에셋 인벤토리 | `project/browse_assets` | type으로 필터링 가능 |
| 좌표/스케일 일괄 설정 | `node/set_node_transform` | x/y/rotation/scaleX/scaleY |
| SLICED 스프라이트 | `node/set_spriteframe` | autoBorder:true 기본값 |
| 구조 스냅샷 | `scene/analyze_reference_layout` | Phase 4 검증용 |
| Widget margin | `node/set_component_property` | isAlignLeft 등 flag 제어 |

---

## 관련 문서

- [UI 배치 워크플로우 (Phase 0~4)](workflow-ui-reference.md)
- [SettingPopup 배치 회고](inference-settingpopup-postmortem.md)
- [SLICED 스프라이트 크기 결정](../../cocos/COCOS-SLICED-SPRITE.md)
