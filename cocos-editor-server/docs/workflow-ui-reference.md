# UI Reference-Based Layout Workflow

레퍼런스 이미지 기반 Cocos Creator 2.x UI 배치를 멀티에이전트 오케스트레이션으로 수행하는 워크플로우.

## 워크플로우 개요

```
Phase 0: 레퍼런스 오버레이 배치
    ↓
Phase 1: 추론 (Inference Agent)
    ↓
Phase 1.5: 추론 검증 (Oracle Agent)
    ↓
Phase 2: 설계안 → 사용자 승인
    ↓
Phase 3: 구현 (Implementation Agent)
    ↓
Phase 4: 최종 검증 (Verification Agent)
```

---

## 에이전트 구성

| 역할 | 에이전트 타입 | 담당 Phase | 도구 |
|------|-------------|-----------|------|
| **추론** | `oracle-medium` / `multimodal-looker` | Phase 1 | Read(이미지), Glob, Grep |
| **검증** | `oracle-medium` | Phase 1.5, 4 | Read(문서), 분석 |
| **설계** | 리더 직접 | Phase 2 | AskUserQuestion |
| **구현** | `sisyphus-junior` | Phase 3 | Bash(curl MCP) |
| **오케스트레이터** | 리더 (Opus) | 전체 | Task, TaskCreate, SendMessage |

### 에이전트 라우팅 기준

- 단순 속성 변경 (< 10개 API): 리더 직접 실행
- 중간 복잡도 (10~30개 API): `sisyphus-junior` 위임
- 대규모 배치 (30개+ API): 스크립트 파일 생성 → Bash 실행

---

## Phase 0: 레퍼런스 노드 배치 + 좌표 기준 확립

**목적**: 레퍼런스 이미지를 씬에 배치하고, 그 노드의 실측값으로 좌표 기준을 확립한다.

> ⭐ **핵심 원칙**: 좌표 기준은 에셋 폴더 이미지의 픽셀 크기로 scale_factor를 추정하지 않는다.
> 씬에 배치된 레퍼런스 노드의 `position`, `contentSize`를 API로 실측하여 사용한다.

### 절차

1. 레퍼런스 이미지 Texture UUID 확인
   ```bash
   curl -X POST http://localhost:{PORT}/api/project/browse_assets \
     -d '{"folder":"db://assets","type":"texture"}'
   ```

2. 레퍼런스 노드 배치 (프로젝트 designResolution 크기로)
   ```bash
   # designResolution 확인
   curl -s http://localhost:{PORT}/api/project/get_project_settings \
     | grep -o '"designResolution":[^}]*}'

   # 레퍼런스 오버레이 배치
   curl -X POST http://localhost:{PORT}/api/scene/place_reference_image \
     -H "Content-Type: application/json" \
     -d '{"textureUuid":"<texture-uuid>","width":750,"height":1334,"opacity":128,"name":"__REF_OVERLAY__"}'
   ```
   - `width`/`height`: **반드시 designResolution과 동일하게** (750×1334 등)
   - `opacity`: 128 (50%) 권장
   - zIndex -9999로 자동 배치됨

3. **레퍼런스 노드 실측 — 좌표 기준 확립**
   ```bash
   curl -s http://localhost:{PORT}/api/node/find_node_by_name \
     -d '{"name":"__REF_OVERLAY__"}'
   curl -s http://localhost:{PORT}/api/node/get_node_info \
     -d '{"uuid":"<refNodeUuid>"}'
   ```
   추출 항목:
   | 변수 | 필드 | 의미 |
   |------|------|------|
   | `cx` | `position.x` | 레퍼런스 노드 중심 x |
   | `cy` | `position.y` | 레퍼런스 노드 중심 y |
   | `ref_w` | `contentSize.width` | 씬에서의 실제 너비 |
   | `ref_h` | `contentSize.height` | 씬에서의 실제 높이 |

4. 사용자에게 오버레이 확인 요청

### 완료 후 정리

작업 완료 시 `scene_remove_reference_image`로 오버레이 제거.

---

## Phase 1: 추론 (Inference)

**목적**: 레퍼런스 이미지를 분석하여 UI 요소 식별, 좌표 측정, 에셋 매칭 수행.

### 입력

- 레퍼런스 이미지 (Read 도구로 시각 확인 — UI 요소 식별용)
- Phase 0에서 확보한 레퍼런스 노드 실측값 (cx, cy, ref_w, ref_h)
- 프로젝트 에셋 이미지들 (후보 에셋 시각 확인)

### 추론 절차

#### 1-1. Scale 계산 (씬 노드 실측 기준)

```
img_pixel_w = 레퍼런스 이미지 파일 픽셀 너비  (Read로 확인)
img_pixel_h = 레퍼런스 이미지 파일 픽셀 높이

scale_x = ref_w / img_pixel_w   (1:1 배치 시 ≈ 1.0)
scale_y = ref_h / img_pixel_h

※ designResolution / imagePixelSize 로 추정하지 않음 — 씬 노드 실측값 사용
```

#### 1-2. 좌표 변환 공식 (씬 레퍼런스 노드 기반)

```
이미지 픽셀 (px, py) [좌상단 = (0,0)] → Cocos 좌표:
  design_x = cx + (px - img_pixel_w/2) × scale_x
  design_y = cy + (img_pixel_h/2 - py) × scale_y

1:1 배치 + 레퍼런스 노드가 (0,0)인 경우 단순화:
  design_x = px - img_pixel_w/2
  design_y = img_pixel_h/2 - py
```

#### 1-2b. 구현 전 추가 확인 (큰 오차 방지)

```bash
# 부모 노드 실제 position 확인 (자식 좌표 = 부모 기준 local)
curl -s http://localhost:{PORT}/api/node/get_node_info \
  -d '{"uuid":"<parentUuid>"}' | grep -o '"position":{[^}]*}'

# 대상 노드 앵커포인트 확인 (≠ 0.5 이면 position 보정 필요)
curl -s http://localhost:{PORT}/api/node/get_node_info \
  -d '{"uuid":"<targetUuid>"}' | grep -o '"anchorPoint":{[^}]*}'
# anchorX/Y ≠ 0.5: set_x = design_x + w*(0.5-anchorX), set_y = design_y + h*(0.5-anchorY)
```

#### 1-3. UI 요소 식별

레퍼런스에서 각 UI 요소를 식별하고 테이블로 정리:

| # | 요소 | 형태 | 색상 | 위치 (image px) | 크기 (image px) |
|---|------|------|------|----------------|----------------|
| 1 | ... | 원형/pill/사각 | ... | (x, y) | w×h |

#### 1-4. 에셋 매칭 (점수제)

**반드시 에셋 이미지를 Read 도구로 직접 확인한 후 매칭.**

점수 기준:
| 기준 | 점수 | 확인 방법 |
|------|------|---------|
| 형태 일치 (pill↔pill, 원형↔원형, 직사각↔직사각) | +3 | Read로 PNG 직접 확인 |
| 색상 계열 일치 | +2 | Read로 PNG 직접 확인 |
| 가로:세로 비율 유사 (±20% 이내) | +1.5 | browse_assets size 비교 |
| 텍스처 크기 근접 | +1 | browse_assets size 비교 |
| 이름 키워드 일치 (보조) | +0.5 | 파일명 확인 |
| 이미 씬에서 사용 중인 에셋 | +0.5 | get_scene_hierarchy 결과에서 확인 |

**판정**: 7점↑ 확정 / 5~6점 후보 2개 제시 후 사용자 선택 / 4점↓ 재탐색

#### 1-5. 에셋 UUID 수집

```bash
# sprite-frame UUID + 크기 일괄 수집 (grep .meta 대체)
curl -X POST http://localhost:{PORT}/api/project/browse_assets \
  -H "Content-Type: application/json" \
  -d '{"folder":"db://assets","type":"sprite-frame"}'
# → [{name, uuid, path, size:{w,h}}, ...] 반환
# 캐시: .claude/cache/asset-inventory-{ProjectName}.json
```

### 출력: 추론 문서

`docs/inference-{PopupName}.md` 파일 생성. 필수 섹션:

1. **레퍼런스 분석** — 이미지 크기, scale factor, 좌표 변환식
2. **UI 요소 식별 테이블** — 위치, 크기, 형태, 색상
3. **에셋 매칭 테이블** — 점수, 근거
4. **노드 트리 설계** — 부모-자식 구조, 컴포넌트
5. **좌표 설계** — 디자인 좌표 변환 결과
6. **SLICED Sprite 상세** — scale, 내부 size, border
7. **컴포넌트/스크립트 체크리스트** — 각 노드별 필요 컴포넌트
8. **에셋 UUID 목록** — Texture UUID 참조표
9. **추론 근거 요약** — 각 결정의 이유

---

## Phase 1.5: 추론 검증

**목적**: 추론 결과의 수학적 정확성과 구조적 타당성 검증.

### 검증 항목

| # | 항목 | 방법 |
|---|------|------|
| 1 | Scale factor 계산 | 수식 검증 |
| 2 | 좌표 변환 정확성 | 개별 좌표 역산 |
| 3 | SLICED 계산 | scale × inner_size = target_size 확인 |
| 4 | 에셋 매칭 합리성 | 형태 기반 점수 재확인 |
| 5 | 노드 트리 Cocos 2.x 표준 | 부모-자식 관계, 컴포넌트 배치 |
| 6 | 자식 scale 영향 | SLICED+Scale 시 자식 노드 영향 여부 |

### 검증 에이전트 프롬프트 템플릿

```
추론 문서 [path]를 검증해주세요.
검증 항목:
1. scale factor 계산 정확성
2. 좌표 변환 (역산으로 검증)
3. SLICED sprite 계산 (scale × size = target)
4. 에셋 매칭 형태 기반 타당성
5. 노드 트리 Cocos 2.x 표준 준수
문제 발견 시 구체적 수정 제안 포함.
```

---

## Phase 2: 설계안 작성 및 사용자 승인

**목적**: 구현 전 사용자에게 노드 구조, 에셋 매칭, 컴포넌트 구성을 승인받음.

### 승인 요청 포맷

```
**노드 구조** (총 N개 노드):
SettingPopup
├── bg (img_back, SLICED 풀스크린)
├── panel (img_ingame_popupB, SLICED 584×814)
│   ├── Button1 → Bg(asset SLICED) + Icon(asset) + Label "텍스트"
│   └── ...
└── CloseButton → Bg(asset) + Icon(asset)

**컴포넌트**: cc.Button(transition), cc.Widget, cc.Label(fontSize)
**SLICED+Scale**: asset→scale값
```

### 승인 옵션

- **승인 - 진행**: 그대로 구현 시작
- **수정 필요**: 사용자가 수정 사항 전달
- **전체 재설계**: Phase 1부터 다시

### 스크립트 체크 (필수)

설계안에 반드시 포함:
- 어떤 커스텀 스크립트를 붙일지 (예: SettingPopup.ts, SoundToggle.ts)
- cc.Button의 click handler 대상
- 토글 상태 관리 방법

---

## Phase 3: 구현

**목적**: 승인된 설계안을 MCP API로 실제 노드 생성 및 속성 설정.

### 구현 순서

```
1. 씬 구조 파악 (get_scene_hierarchy includeComponents:true)
2. 부모 노드 생성/확인 (create_node / get_node_info)
3. 자식 노드 생성 (create_node with parentUuid)
   → 반복 구조이면 첫 번째 완성 후 duplicate_node로 복제
4. 컴포넌트 추가 (add_component)
   → 추가 전 get_components로 기존 컴포넌트 확인 (중복 방지)
5. Sprite Frame 설정 (set_spriteframe, autoBorder:true 기본값)
6. 위치/크기 설정 (set_node_transform — x/y/scaleX/scaleY 일괄)
   → Widget 노드: get_component_info로 flag 확인 후 처리
   → cc.Layout 부모: type 확인 (NONE 아니면 자식 position 불가 — reorder_node만)
   → ScrollView 내부: content 노드 기준 배치 (뷰포트 기준 아님)
7. SLICED 설정 (set_component_property: type=1, sizeMode=0)
8. Label 설정
   - string, fontSize (레퍼런스 텍스트 행 높이 × scale_y → 짝수 반올림)
   - overflow: CLAMP(고정박스) / SHRINK(버튼라벨 가변) / RESIZE_HEIGHT(설명텍스트)
   - color: Read로 레퍼런스 픽셀 확인 → RGB hex
9. Font 설정 (set_label_font — 폰트 UUID: browse_assets type:font 결과)
10. Button 설정 (set_component_property: transition=3)
11. Widget 설정 (set_component_property: isAlignTop, top, ...)
    → ALWAYS 모드: Widget margin으로 위치 조정
    → flag만 활성: 해당 축 Widget 프로퍼티 수정
실수 시: curl -X POST http://localhost:{PORT}/api/scene/undo
```

### REST API 호출 패턴

```bash
# REST API 패턴 (JSON-RPC 아님)
curl -X POST http://localhost:{PORT}/api/{category}/{tool_name} \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### SLICED + Scale 기법

> **공식 및 구현 패턴 상세**: `shareable/cocos/COCOS-SLICED-SPRITE.md`

```
scale = target_height / original_height
inner_width = target_width / scale
```

예시 (230×203 → 459×109): `scale=0.537`, `inner_width=855`
→ Bg 자식: width=855, height=203, scale=0.537, spriteType=SLICED(1)

### 한글 라벨 인코딩

MCP JSON-RPC로 한글 텍스트 전달 시 UTF-8 기본 지원. 결과 조회 시 인코딩 깨짐이 보일 수 있으나 에디터 내 실제 표시는 정상.

---

## Phase 4: 최종 검증

**목적**: 구현 결과가 설계안 및 레퍼런스와 일치하는지 확인.

### 검증 방법

1. **자동 검증**: `scene_analyze_reference_layout` 호출
   ```json
   {
     "name": "scene_analyze_reference_layout",
     "arguments": { "parentUuid": "<root-uuid>" }
   }
   ```
   반환값에서 각 노드의 x, y, width, height, components 확인.

2. **설계안 대비 비교**: 추론 문서의 좌표 테이블과 실제 값 비교
   - ±5px 이내 → PASS
   - ±6~15px → set_node_transform으로 자동 보정
   - ±16~30px → 해당 요소 Phase 1 재추론
   - ±30px 초과 → AskUserQuestion (레퍼런스 재확인)

3. **시각적 확인**: 사용자에게 레퍼런스 오버레이와 비교 요청

4. **씬 저장** (구현 완료 직후, create_prefab 전 필수):
   ```bash
   curl -X POST http://localhost:{PORT}/api/scene/save_scene
   ```

### 검증 체크리스트

- [ ] 모든 노드 생성됨
- [ ] 모든 sprite frame 설정됨
- [ ] 모든 위치/크기가 설계안과 일치
- [ ] SLICED sprite가 정상 렌더링됨
- [ ] Label 텍스트/폰트/크기 정확
- [ ] Button transition 설정됨
- [ ] Widget 설정됨 (해당 노드만)
- [ ] 레퍼런스 오버레이와 시각적 일치
- [ ] Widget 노드: alignment 적용 후 position 덮어쓰기 없음 확인
- [ ] 반복 구조 노드: 복제본 위치가 각각 정확한지 확인
- [ ] analyze_reference_layout 수치 검증 완료

### 완료 후 마무리

**FULL/CREATE 모드:**
```bash
# 프리팹 저장
curl -X POST http://localhost:{PORT}/api/prefab/create_prefab \
  -d '{"nodeUuid":"<rootNodeUuid>","path":"db://assets/prefabs/{PopupName}.prefab"}'
```

**런타임 검증** (애니메이션·파티클 등 런타임 전용 렌더링이 있는 경우):
```bash
curl -X POST http://localhost:{PORT}/api/scene/start_preview
# 에디터 프리뷰 확인 후
curl -X POST http://localhost:{PORT}/api/scene/stop_preview
```

---

## 태스크 관리

### TodoWrite 활용

```
Phase 0: 레퍼런스 오버레이 배치 → completed
Phase 1: 추론 — 레퍼런스 분석 및 에셋 매칭 → in_progress
Phase 1.5: 추론 검증 → pending (blocked by Phase 1)
Phase 2: 설계안 작성 및 사용자 승인 → pending (blocked by Phase 1.5)
Phase 3: 구현 — 노드 생성 및 속성 설정 → pending (blocked by Phase 2)
Phase 4: 최종 검증 → pending (blocked by Phase 3)
```

### 추론 기록 필수

**모든 Phase에서 작업 내용 및 추론 근거를 기록:**

- Phase 1: 추론 문서 (`inference-{name}.md`) 생성
- Phase 3: 각 MCP API 호출 결과 성공/실패 로그
- Phase 4: 검증 결과 및 수정 사항

---

## 사용 예시: SettingPopup

### Phase 0
```
scene_place_reference_image(textureUuid="8ceb4f4b-...", width=750, height=1334, opacity=128)
→ __REF_OVERLAY__ 노드 생성, zIndex -9999
```

### Phase 1 추론 결과 요약
- Scale factor: 1.913 (750/392)
- UI 요소 8개 식별 (Close, Sound, Effect, Lobby, Chapter, LevelInfo, Skip, Rank)
- 에셋 12종 매칭 완료 (모두 5.5점 이상)

### Phase 2 설계안
```
SettingPopup (24개 노드)
├── bg — Widget LRTB=0
├── panel (584×814) — img_ingame_popupB SLICED
│   ├── SoundToggle (-67,343) — btn_ingame_optionB + icon_option_sound
│   ├── EffectToggle (67,343) — btn_ingame_optionB + icon_option_effectsound + off
│   ├── LobbyButton (0,195) — btn_blue SLICED + icon_home + "로비로"
│   ├── ChapterButton (0,67) — btn_blue SLICED + icon_chapter + "챕터선택"
│   ├── LevelInfo (0,-63) — "Lv.1\n최고급 돼지고기베이컨"
│   ├── SkipButton (0,-207) — btn_yellow SLICED + icon_ads + "건너뛰기"
│   └── RankButton (0,-341) — btn_blue SLICED + icon_ranking + "랭킹"
└── CloseButton (-323,584) — btn_ingame_optionB + icon_pre
```

### Phase 3 구현 통계
- API 호출: 42회
- 성공률: 100%
- 소요 시간: ~3분

### Phase 4 검증
- 29개 노드 확인
- 모든 위치/크기 설계안과 일치
- 토글 bg scale 조정 (152→86px에 맞춤)

---

## 관련 문서

- [ref-layout.md](./ref-layout.md) — 시각적 추론 방법론 상세
- [inference-settingpopup.md](./inference-settingpopup.md) — SettingPopup 추론 사례
