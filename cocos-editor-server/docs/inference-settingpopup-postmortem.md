# SettingPopup 추론 실패 분석 (Post-mortem)

> 작성일: 2026-02-26

## 1. 문제 요약

레퍼런스 이미지(`image (6).png`)를 기반으로 SettingPopup UI를 배치했으나, 5가지 심각한 차이가 발견됨:

| # | 문제 | 심각도 | 원인 카테고리 |
|---|------|--------|-------------|
| 1 | 라벨 텍스트 깨짐 (한글 미표시) | Critical | 폰트 미적용 |
| 2 | 버튼 크기/비율 레퍼런스와 불일치 | Major | 크기 추론 미완료 |
| 3 | LevelInfo 배경 이미지 없음 | Critical | 에셋 매칭 누락 |
| 4 | 팝업 배경 이미지 없음 | Critical | 에셋 매칭 누락 |
| 5 | LevelInfo 좌우 화살표 노드 없음 | Major | 노드 트리 불완전 |

## 2. 근본 원인 분석 (Root Cause)

### 2.1 워크플로우의 구조적 결함: "기하학만 추론"

기존 ref-layout.md 워크플로우는 **기하학적 배치(Geometry)**에만 집중:
- ✅ 위치(X, Y) 추론
- ✅ 크기(W, H) 추론
- ✅ 간격/리듬 패턴 분석
- ❌ **에셋 매칭(어떤 이미지가 어디에?)** → 누락
- ❌ **폰트 적용(어떤 폰트로?)** → 누락
- ❌ **노드 트리 완전성(자식 노드가 다 있는지?)** → 누락
- ❌ **배경 레이어(bg 노드 시각적 처리)** → 누락

**핵심 실패**: UI 배치를 순수한 좌표 문제로 축소함. 실제로는 **좌표 + 시각적 콘텐츠 + 노드 구조** 3가지가 모두 필요.

### 2.2 에셋 인벤토리 미수행

프로젝트에 `kakao/UI/` 폴더에 적합한 에셋들이 모두 존재했으나:
- `img_ingame_popupB.png` → 팝업 배경 (2톤: 피치+화이트)
- `btn_blue.png` → 파란 pill 버튼 (9-slice용)
- `btn_yellow.png` → 노란 pill 버튼
- `ingame_levelB.png` → 레벨 정보 배경
- `icon_ingame_pre/next.png` → 좌우 화살표
- `icon_ingame_home/chapter/ranking.png` → 버튼 아이콘
- `icon_option_sound/effectsound/off.png` → 토글 아이콘
- `KAKAOFRIENDSREGULAR.ttf` → 프로젝트 전용 폰트

이 에셋들을 **사전에 목록화하지 않았기 때문에**, 추론 과정에서 에셋 매칭이 누락됨.

### 2.3 각 문제별 직접 원인

**1. 라벨 텍스트 깨짐**
- `cc.Label`에 한글 텍스트 설정 시 `useSystemFont=true` 상태
- `KAKAOFRIENDSREGULAR.ttf` (UUID: `99774aef-9149-4135-920b-dcf9eadfd443`)를 `set_label_font` API로 적용하지 않음
- 시스템 폰트의 한글 렌더링이 Cocos Creator 2.x 에디터에서 인코딩 불일치 발생

**2. 버튼 크기 불일치**
- Bg 노드가 원본 에셋(855×203)을 scale 0.537로 축소하여 459×109 표시
- 레퍼런스 대비 정확한 비율 검증 미수행
- SLICED 모드 사용 시 적절한 내부 크기 설정 필요

**3. LevelInfo 배경 없음**
- `cc.Label` 컴포넌트만 존재, `cc.Sprite` 미추가
- `ingame_levelB.png` (UUID: `75506a90-555b-46fe-bd59-1e1635004abe`)를 적용하지 않음

**4. 팝업 배경 없음**
- `bg` 노드에 `cc.Sprite`는 있으나 spriteFrame이 올바르지 않거나 size=0×0
- `img_ingame_popupB.png` (UUID: `86e7d331-4832-4463-ac02-7f43783016eb`)를 사용해야 함

**5. LevelInfo 화살표 없음**
- LevelInfo에 자식 노드(LeftArrow, RightArrow) 미생성
- `icon_ingame_pre.png` (UUID: `19137fdc-3720-429a-9b0b-c5ca5e898ced`)
- `icon_ingame_next.png` (UUID: `16f84b08-39a1-497d-9a1d-b576084fb18c`)

## 3. 왜 잘못된 추론을 했는가

### 3.1 "위치 최적화 함정"
panelY를 86→60→50→40→30→20→15→10→12로 반복 조정하며 오버레이와의 정렬에만 몰두.
이 과정에서 **배경이 없고, 텍스트가 깨지고, 화살표가 없다는 시각적 문제를 간과**.

### 3.2 스크린샷 캡처가 문제를 가렸음
캡처한 스크린샷에서 깨진 텍스트와 누락된 배경이 보였으나,
오버레이와의 위치 일치에만 집중하여 **내용(content)**을 검증하지 않음.

### 3.3 기존 노드를 "완성된 것"으로 가정
이전 세션에서 생성된 노드 트리를 재사용할 때,
에셋/폰트/자식 노드가 모두 올바르게 설정되어 있다고 가정.
실제로는 불완전한 상태였음.

## 4. 개선 방안

### 4.1 워크플로우 확장: "Visual Content Layer" 추가

기존 7단계에 아래 단계를 삽입:

| 단계 | 이름 | 내용 |
|------|------|------|
| **Step 0.5** | Asset Inventory | 프로젝트 에셋 전체 목록화 (이미지, 폰트, 프리팹) |
| **Step 1.5** | Visual Content Mapping | 레퍼런스 요소 ↔ 에셋 매칭 테이블 생성 |
| **Step 3.5** | Content Application | 에셋 적용 (spriteFrame, font, text) |
| **Step 3.7** | Node Completeness Check | 자식 노드 존재 여부 확인 |

### 4.2 추론 체크리스트 (필수)

구현 전 아래 항목을 모두 확인:

```
□ 배경 레이어 (bg) 스프라이트 확인
□ 폰트 적용 (커스텀 폰트 UUID)
□ 각 노드의 스프라이트프레임 확인
□ 자식 노드 완전성 (화살표, 아이콘, 레이블 등)
□ 라벨 텍스트 인코딩 확인
□ 9-slice 설정 확인 (SLICED 모드 + border)
□ 크기 추론 근거 기록
```

### 4.3 에셋 인벤토리 자동화

ref-layout.md의 Phase 0에 추가:
```
1. browse_assets로 프로젝트 UI 에셋 목록 수집
2. 각 에셋 이미지를 Read로 시각 확인
3. 에셋 ↔ 레퍼런스 요소 매칭 테이블 생성
4. 폰트 에셋 확인 (TTF/BMFont)
```

### 4.4 스크린샷 검증 강화

캡처 후 단순 위치 비교가 아니라:
1. **콘텐츠 체크**: 텍스트가 올바르게 표시되는지
2. **시각 체크**: 배경/아이콘이 렌더링되는지
3. **구조 체크**: 모든 요소가 보이는지
4. **비율 체크**: 요소 간 비율이 레퍼런스와 일치하는지

## 5. 에셋 UUID 레퍼런스

| 에셋 | 파일명 | UUID |
|------|--------|------|
| 팝업 배경 | img_ingame_popupB.png | `86e7d331-4832-4463-ac02-7f43783016eb` |
| 파란 버튼 | btn_blue.png | `99f7d459-c737-4b8f-983f-90c5b1fbbbf3` |
| 노란 버튼 | btn_yellow.png | `5f830c35-3ef6-4ca9-93ee-b6ca30c884fb` |
| 레벨 배경 | ingame_levelB.png | `75506a90-555b-46fe-bd59-1e1635004abe` |
| 왼쪽 화살표 | icon_ingame_pre.png | `19137fdc-3720-429a-9b0b-c5ca5e898ced` |
| 오른쪽 화살표 | icon_ingame_next.png | `16f84b08-39a1-497d-9a1d-b576084fb18c` |
| 홈 아이콘 | icon_ingame_home.png | `e956dea6-3815-4bde-9c38-0843fce18a83` |
| 챕터 아이콘 | icon_ingame_chapter.png | `c98b23f6-7710-4539-91f7-ebb1f8c52178` |
| 랭킹 아이콘 | icon_ingame_ranking.png | `4392f7b0-6ad0-4f74-b64c-9845c8956de9` |
| 사운드 아이콘 | icon_option_sound.png | `90af0a20-2e45-43a9-83b6-89dd5048521d` |
| 이펙트 아이콘 | icon_option_effectsound.png | `fdc44058-551f-40ba-9abf-bd330020341c` |
| 음소거 마크 | icon_option_off.png | `f1e46dea-48ba-448d-b8ab-90a933169ea1` |
| 닫기 X | img_ingame_popupB_x.png | `4f5437ac-6d79-464e-b8fc-32bc63554107` |
| 뒤로가기 | img_back.png | `b0189a16-8442-4c28-8f09-a14655f5b28c` |
| 옵션 버튼 | btn_ingame_optionB.png | `f44a80e3-8ae0-428b-b2b4-20f2c4f1bfb2` |
| 광고 아이콘 | icon_ingame_ads.png | `bca11fb5-c208-4c2e-a374-2d14c47bcf3c` |
| 프로젝트 폰트 | KAKAOFRIENDSREGULAR.ttf | `99774aef-9149-4135-920b-dcf9eadfd443` |
