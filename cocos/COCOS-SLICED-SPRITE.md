# Cocos Creator 2.x — SLICED Sprite 크기 결정 가이드

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

> **적용 대상**: Cocos Creator 2.x, `cc.Sprite` 컴포넌트
> **원본 출처**: Ben_Claude 프로젝트 SettingPopup UI 배치 작업에서 학습된 패턴

---

## 개요

9-slice(SLICED) 스프라이트는 원본 이미지의 코너를 유지하면서 중간 영역만 늘려 임의 크기 UI를 만드는 기법이다.
크기를 잘못 설정하면 border 비율이 망가지므로 **CUSTOM size vs Scale** 방식 선택이 핵심이다.

---

## 1. sizeMode 분기표

| 상황 | sizeMode | 크기 설정 방법 |
|------|----------|-------------|
| 원본 이미지 그대로 사용 | TRIMMED(2) | 크기 설정 불필요 (자동) |
| 원본 비율 유지 + 스케일만 변경 | TRIMMED(2) + scale | `scale = 목표크기 / 원본크기` |
| 9-slice, 보더 원본 크기 유지 | CUSTOM(0) + SLICED(1) | 목표 크기를 직접 설정 |
| 9-slice, 보더 비례 축소 ✅ | SLICED(1) + 원본크기 + scale | `scale = 목표높이 / 원본높이` |
| 히트 영역만 (Sprite 없음) | — | width/height = 목표 크기 |

---

## 2. CUSTOM size vs Scale 비교 (Critical)

| 방식 | 동작 | 결과 |
|------|------|------|
| `CUSTOM size + scale=1` | 9-slice 보더가 **원본 픽셀 크기 유지** | 작은 노드에서 보더가 상대적으로 두꺼워짐 ❌ |
| `원본 크기 + scale 축소` | 보더도 **비례 축소** | 시각적 비율이 원본과 동일 ✅ |

**권장:** 레퍼런스가 에디터에서 드래그로 만들어진 경우 → 원본 크기 + scale 방식이 더 정확.

---

## 3. SLICED + Scale 공식

원본 리소스와 레퍼런스의 형태/비율이 다를 때 (예: 원형 → 가로 라운드 버튼):

```
scale = target_height / original_height
inner_width = target_width / scale
inner_height = original_height  (변경 불필요)
```

**예시** (btn_blue 230×203 → 목표 459×109):
```
scale = 109 / 203 = 0.537
inner_width = 459 / 0.537 = 855
inner_height = 203 (원본 유지)

→ Bg 자식 노드: width=855, height=203, scale=0.537, spriteType=SLICED(1)
```

> ⚠️ scale은 **Bg 자식 노드에만** 적용. icon/label은 형제 노드이므로 영향 없음.

---

## 4. 9-Slice Border 추론 (border=0인 에셋 자동 추론)

border = 이미지의 **코너 반경**. 이미지 형태(aspect ratio)에 따라 추론:

| 형태 | aspect ratio | border 공식 | 적용 방향 | 검증 사례 |
|------|-------------|------------|----------|----------|
| 정사각/원형 | 0.8~1.25 | `min(w,h) × 0.43` | 4방향 모두 | btn_blue(43%), button_2(44%), friendFrame(43%) |
| 가로 pill | > 2.0 | `height × 0.47` | 좌우만 (상하=0) | img_chapter_coinB: h=83, border=39(47%) |
| 세로 pill | < 0.5 | `width × 0.47` | 상하만 (좌우=0) | — |
| 일반 라운드렉트 | 0.5~2.0 | `min(w,h) × 0.30` | 4방향 모두 | img_chapter_slot(31%), levelFrame(26%) |

> ⚠️ **비대칭 장식 이미지** (상단 장식 영역 등)는 자동 추론 불가 → 레퍼런스 시각 분석 필요.
> cocos-editor-server의 `autoBorder=true`가 aspect ratio 기반 자동 처리 지원.

---

## 5. 구현 패턴

### 버튼 패턴 (히트영역 + Bg 자식)
```
ButtonNode (430×137, cc.Button, Sprite 없음 — 히트영역만)
├── Bg (855×203, scale=0.537, Sprite.type=SLICED, sizeMode=CUSTOM)
│   → 원형 리소스가 가로 라운드 버튼으로 변환됨
├── Icon (52×50, sizeMode=TRIMMED)
└── Label (text, fontSize=46)
```

### 토글 버튼 패턴
```
ToggleButton (170×150, cc.Button, Sprite 없음)
├── Bg (152×152, Sprite.sizeMode=TRIMMED)
├── Icon (56×60)
└── OffMark (64×62, active=false → 토글 시 active 전환)
```

### 전체화면 배경 패턴
```
BgNode — Widget (top=0, bottom=0, left=0, right=0)
└── Sprite (SLICED 또는 단색)
```

---

## 6. MCP API 구현 순서 (cocos-editor-server)

```bash
# 1. 버튼 노드 (히트 영역)
POST /api/node/create_node { parentUuid, name, width: 430, height: 137 }
POST /api/component/add_component { nodeUuid, type: "cc.Button" }

# 2. Bg 자식 노드 (SLICED 이미지)
POST /api/node/create_node { parentUuid: btnUuid, name: "Bg" }
POST /api/scene/set_spriteframe { nodeUuid: bgUuid, spriteFrameUuid, spriteType: 1, sizeMode: 0 }
POST /api/node/set_node_property { nodeUuid: bgUuid, scale: { x: 0.537, y: 0.537 } }
POST /api/node/set_node_property { nodeUuid: bgUuid, size: { width: 855, height: 203 } }
```

---

## 7. 픽셀 측정값 직접 대입 금지

```
❌ 레퍼런스에서 버튼 크기 430×109 측정
   → set_spriteframe sizeMode=CUSTOM, width=430, height=109
   → 보더 비율 망가짐 (border 65px / 109px = 59% 과다)

✅ 원본 크기 유지 + scale
   → scale = 109/203 = 0.537, inner_width = 855
   → 보더 65px / 203px = 32% (원래 비율 유지)
```

---

## 참고

- SettingPopup 적용 사례: `shareable/cocos-editor-server/docs/inference-settingpopup-size-method.md`
- 시각적 추론 전체 워크플로우: `.claude/skills/ref-layout.md`


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->