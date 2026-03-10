# SettingPopup 추론 문서

## 1. 레퍼런스 분석

- **레퍼런스**: `image (6).png` (Texture UUID: `8ceb4f4b-bae4-4697-a6b1-a1f6a2971f3b`)
- **이미지 크기**: 392×664px
- **디자인 해상도**: 750×1334
- **Scale Factor**: 750 / 392 = **1.913**
- **이미지 중심**: (196, 332)
- **좌표 변환**: `design_x = (ix - 196) × 1.913`, `design_y = (332 - iy) × 1.913`

**화면 구성**: 전체화면 설정 메뉴. 단색 살구/갈색 배경(img_back) 위에 버튼들 배치. panel 노드는 그룹 컨테이너(이미지 없음)로 사용.

## 2. UI 요소 식별 테이블

| # | 요소 | 형태 | 색상 | 위치 (image px) | 크기 (image px) | Design X | Design Y |
|---|------|------|------|----------------|----------------|----------|----------|
| 1 | Close 버튼 | 원형 ~35px | 파란색+외곽선 | (27, 30) | 35×35 | -323 | 578 |
| 2 | Sound 토글 | 원형 ~45px | 파란색 | (161, 110) | 45×45 | -67 | 425 |
| 3 | Effect 토글 | 원형 ~45px | 파란색+빨간빗금 | (231, 110) | 45×45 | 67 | 425 |
| 4 | 로비로 버튼 | pill ~240×57px | 파란색 | (196, 190) | 240×57 | 0 | 272 |
| 5 | 챕터선택 버튼 | pill ~240×57px | 파란색 | (196, 260) | 240×57 | 0 | 138 |
| 6 | 레벨 정보 | 텍스트 | 검정/진회색 | (196, 328) | ~200×50 | 0 | 8 |
| 7 | 건너뛰기 버튼 | pill ~230×57px | 노란색 | (196, 400) | 230×57 | 0 | -130 |
| 8 | 랭킹 버튼 | pill ~240×57px | 파란색 | (196, 470) | 240×57 | 0 | -264 |

## 3. 에셋 매칭 테이블

모든 에셋은 Read 도구로 시각적 형태를 직접 확인 후 매칭.

| UI 요소 | 에셋 | 형태 | 색상 | 비율 | 이름 | 총점 | 근거 |
|---------|------|------|------|------|------|------|------|
| bg (전체배경) | img_back (73×73) | +3 단색타일 | +2 salmon | +1 | +0.5 | 6.5 | 단색 배경, 전체화면 stretch |
| CloseBtn Bg | btn_ingame_optionB (152×152) | +3 원형 | +2 파랑 | +1 | +0 | 6 | 소형 원형 버튼, beige 외곽 |
| CloseBtn Icon | icon_ingame_pre | +3 화살표 | +2 파랑윤곽 | +1 | +0 | 6 | 레퍼런스에 X가 아닌 뒤로가기 화살표 표시 |
| SoundToggle Bg | btn_ingame_optionB (152×152) | +3 원형 | +2 파랑 | +1 | +0 | 6 | 토글 배경 |
| SoundToggle Icon | icon_option_sound | +3 음표 | +2 파랑윤곽 | +1 | +0.5 | 6.5 | 음표 형태 정확 매칭 |
| EffectToggle Bg | btn_ingame_optionB (152×152) | +3 원형 | +2 파랑 | +1 | +0 | 6 | 토글 배경 |
| EffectToggle Icon | icon_option_effectsound | +3 스피커 | +2 파랑윤곽 | +1 | +0.5 | 6.5 | 스피커+파형 형태 일치 |
| EffectToggle OffMark | icon_option_off | +3 빗금 | +2 빨강 | +1 | +0.5 | 6.5 | 빨간 사선 비활성 마크 |
| LobbyBtn Bg | btn_blue (230×203) | +3 pill | +2 파랑 | +1 | +0.5 | 6.5 | 큰 pill 버튼 |
| LobbyBtn Icon | icon_ingame_home | +3 집 | +2 파랑윤곽 | +1 | +0.5 | 7 | 홈 아이콘 |
| ChapterBtn Bg | btn_blue (230×203) | +3 pill | +2 파랑 | +1 | +0.5 | 6.5 | 큰 pill 버튼 |
| ChapterBtn Icon | icon_ingame_chapter | +3 별 | +2 파랑윤곽 | +1 | +0.5 | 7 | 별 형태 일치 |
| SkipBtn Bg | btn_yellow (217×203) | +3 pill | +2 노랑 | +1 | +0.5 | 6.5 | 노란 pill 버튼 |
| SkipBtn Icon | icon_ingame_ads | +3 클래퍼보드 | +2 검정 | +1 | +0.5 | 6.5 | 영상 광고 아이콘 |
| RankBtn Bg | btn_blue (230×203) | +3 pill | +2 파랑 | +1 | +0.5 | 6.5 | 큰 pill 버튼 |
| RankBtn Icon | icon_ingame_ranking | +3 포디움 | +2 파랑윤곽 | +1 | +0.5 | 7 | 랭킹 포디움 |

## 4. 노드 트리 설계

```
SettingPopup (root, 750×1334)
├── bg                              — cc.Sprite(SIMPLE), cc.Widget(LRTB=0), cc.BlockInputEvents
│                                     img_back 73×73 → 750×1334 stretch
├── panel (0, 86)                   — 빈 컨테이너 노드 (이미지 없음), 584×813
│   ├── SoundToggle (-67, 343)      — cc.Button(transition=3)
│   │   ├── Bg                      — cc.Sprite(SIMPLE) btn_ingame_optionB, 86×86
│   │   ├── Icon                    — cc.Sprite(SIMPLE) icon_option_sound
│   │   └── OffMark                 — cc.Sprite(SIMPLE) icon_option_off, active=false
│   ├── EffectToggle (67, 343)      — cc.Button(transition=3)
│   │   ├── Bg                      — cc.Sprite(SIMPLE) btn_ingame_optionB, 86×86
│   │   ├── Icon                    — cc.Sprite(SIMPLE) icon_option_effectsound
│   │   └── OffMark                 — cc.Sprite(SIMPLE) icon_option_off
│   ├── LobbyButton (0, 186)        — cc.Button(transition=3), 459×109
│   │   ├── Bg                      — cc.Sprite(SLICED) btn_blue, scale=0.537, inner 855×203
│   │   ├── Icon (-150, 0)          — cc.Sprite(SIMPLE) icon_ingame_home, 57×57
│   │   └── Label (20, 0)           — cc.Label "로비로", fontSize=36
│   ├── ChapterButton (0, 52)       — cc.Button(transition=3), 459×109
│   │   ├── Bg                      — cc.Sprite(SLICED) btn_blue, scale=0.537, inner 855×203
│   │   ├── Icon (-150, 0)          — cc.Sprite(SIMPLE) icon_ingame_chapter, 57×57
│   │   └── Label (20, 0)           — cc.Label "챕터선택", fontSize=36
│   ├── LevelInfo (0, -78)          — cc.Label "Lv.1\n최고급 돼지고기베이컨", fontSize=24
│   ├── SkipButton (0, -216)        — cc.Button(transition=3), 440×109
│   │   ├── Bg                      — cc.Sprite(SLICED) btn_yellow, scale=0.537, inner 819×203
│   │   ├── Icon (-150, 0)          — cc.Sprite(SIMPLE) icon_ingame_ads, 57×57
│   │   └── Label (20, 0)           — cc.Label "건너뛰기", fontSize=36
│   └── RankButton (0, -350)        — cc.Button(transition=3), 459×109
│       ├── Bg                      — cc.Sprite(SLICED) btn_blue, scale=0.537, inner 855×203
│       ├── Icon (-150, 0)          — cc.Sprite(SIMPLE) icon_ingame_ranking, 57×57
│       └── Label (20, 0)           — cc.Label "랭킹", fontSize=36
└── CloseButton (-323, 578)         — cc.Button(transition=3)
    ├── Bg                          — cc.Sprite(SIMPLE) btn_ingame_optionB, 67×67
    └── Icon                        — cc.Sprite(SIMPLE) icon_ingame_pre
```

## 5. 좌표 설계 (시각적 패턴 분석)

> ⚠️ pixel×scale 기계적 변환이 아닌 **시각적 패턴 분석**으로 좌표를 도출함.

### 5-1. 정렬 패턴 식별

| 패턴 | 관찰 결과 | 좌표 결정 |
|------|----------|----------|
| 수평 중앙 | CloseButton 제외 모든 요소 수직축 정렬 | x=0 |
| 좌우 대칭 | Sound/Effect 토글이 중심축 기준 대칭 | 간격 ≈ 직경×1.5 = 86×1.5 ≈ 130 → 각 ±65 |
| CloseButton | 패널 밖 좌상단 코너 | 별도 계산 |

### 5-2. 간격 리듬 분석

요소 간 갭(edge-to-edge)의 상대적 비율 관찰:

| 갭 구간 | 시각적 관찰 | 비율 |
|---------|-----------|------|
| 토글 → 로비 | 가장 넓은 갭 (그룹 구분) | **1.2** |
| 로비 → 챕터 | 표준 갭 | **1.0** |
| 챕터 → 레벨정보 | 좁은 갭 (텍스트 컴팩트) | **0.8** |
| 레벨정보 → 건너뛰기 | 좁은 갭 | **0.8** |
| 건너뛰기 → 랭킹 | 표준 갭 | **1.0** |
| | 비율 합계 | **4.8** |

### 5-3. 컨테이너 기반 좌표 계산

```
요소 높이 합산:
  토글: 86px + 버튼×4: 436px + 텍스트: 60px = 582px

갭 총합:
  패널높이(813) - 요소총합(582) = 231px

기본 갭(비율 1.0):
  231 / 4.8 = 48px

갭 절대값:
  넓은(1.2) = 58px, 표준(1.0) = 48px, 좁은(0.8) = 38px

패널 상단(+406.5)에서 순차 배치:
  Toggle:      +406.5 - 43              = +364
  (갭 58px)
  LobbyBtn:    +364 - 43 - 58 - 54.5    = +209
  (갭 48px)
  ChapterBtn:  +209 - 54.5 - 48 - 54.5  = +52
  (갭 38px)
  LevelInfo:   +52 - 54.5 - 38 - 30     = -71
  (갭 38px)
  SkipBtn:     -71 - 30 - 38 - 54.5     = -194
  (갭 48px)
  RankBtn:     -194 - 54.5 - 48 - 54.5  = -351
```

### 5-4. 좌표 설계 테이블

SettingPopup 직속 자식 + panel 하위 자식 (anchor 0.5, 0.5 기준):

| 노드 | Parent | Design X | Design Y | Width | Height | 추론 근거 |
|------|--------|----------|----------|-------|--------|----------|
| bg | SettingPopup | 0 | 0 | 750 | 1334 | Widget LRTB=0, SIMPLE stretch |
| panel | SettingPopup | 0 | 86 | 584 | 813 | 빈 컨테이너 (이미지 없음) |
| SoundToggle | panel | -65 | **364** | 86 | 86 | 대칭 ±65, 패널상단 - 43 |
| EffectToggle | panel | 65 | **364** | 86 | 86 | 대칭 ±65, 패널상단 - 43 |
| LobbyButton | panel | 0 | **209** | 459 | 109 | 중앙정렬, 넓은갭(58) 후 |
| ChapterButton | panel | 0 | **52** | 459 | 109 | 중앙정렬, 표준갭(48) 후 |
| LevelInfo | panel | 0 | **-71** | 400 | 60 | 중앙정렬, 좁은갭(38) 후 |
| SkipButton | panel | 0 | **-194** | 440 | 109 | 중앙정렬, 좁은갭(38) 후 |
| RankButton | panel | 0 | **-351** | 459 | 109 | 중앙정렬, 표준갭(48) 후 |
| CloseButton | SettingPopup | -323 | 578 | 67 | 67 | panel 밖 좌상단 |

### 5-5. 기존 구현값(pixel×scale) vs 패턴 분석값 비교

| 노드 | 기존 구현 Y | 패턴 분석 Y | 차이 | 비고 |
|------|-----------|-----------|------|------|
| SoundToggle | 343 | **364** | -21 | ✅ 수정 적용됨 |
| EffectToggle | 343 | **364** | -21 | ✅ 수정 적용됨 |
| LobbyButton | 186 | **209** | -23 | ✅ 수정 적용됨 |
| ChapterButton | 52 | **52** | 0 | 변경 불필요 |
| LevelInfo | -78 | **-71** | -7 | ✅ 수정 적용됨 |
| SkipButton | -216 | **-194** | -22 | ✅ 수정 적용됨 |
| RankButton | -350 | **-351** | +1 | ✅ 수정 적용됨 |

> **결과**: 패턴 분석 기반 좌표로 전체 재배치 완료.

버튼 내부 자식 좌표 (버튼 기준 상대좌표):

| 자식 노드 | X | Y | 비고 |
|-----------|---|---|------|
| Bg | 0 | 0 | SLICED, scale=0.537 |
| Icon | -150 | 0 | 버튼 좌측 1/3 |
| Label | 20 | 0 | 중앙~우측 |

## 6. SLICED Sprite 상세

| 노드 | 에셋 | 원본 크기 | 목표 크기 | Scale | Inner Size | Border |
|------|------|----------|----------|-------|-----------|--------|
| LobbyBtn/Bg | btn_blue | 230×203 | 459×109 | 0.537 | 855×203 | L:100 R:100 (기설정) |
| ChapterBtn/Bg | btn_blue | 230×203 | 459×109 | 0.537 | 855×203 | L:100 R:100 |
| SkipBtn/Bg | btn_yellow | 217×203 | 440×109 | 0.537 | 819×203 | L:98 R:98 (기설정) |
| RankBtn/Bg | btn_blue | 230×203 | 459×109 | 0.537 | 855×203 | L:100 R:100 |

Scale 계산: `109 / 203 = 0.537`
Inner width (blue): `459 / 0.537 = 855`
Inner width (yellow): `440 / 0.537 = 819`

bg(img_back)는 단색 73×73 타일 → SIMPLE 모드로 750×1334 직접 stretch (SLICED 불필요).

## 7. 컴포넌트/스크립트 체크리스트

| 노드 | Components | Script | 비고 |
|------|-----------|--------|------|
| SettingPopup | - | SettingPopup.ts | 팝업 루트 |
| bg | cc.Sprite(SIMPLE), cc.Widget(LRTB=0), cc.BlockInputEvents | - | 터치 차단 배경 |
| panel | - | - | 빈 컨테이너 (이미지 없음), 그룹핑용 |
| CloseButton | cc.Button(transition=3) | - | click → 팝업 닫기. 레퍼런스는 X가 아닌 뒤로가기 화살표 형태 |
| SoundToggle | cc.Button(transition=3) | - | click → 사운드 on/off |
| EffectToggle | cc.Button(transition=3) | - | click → 효과음 on/off |
| LobbyButton | cc.Button(transition=3) | - | click → 로비 이동 |
| ChapterButton | cc.Button(transition=3) | - | click → 챕터선택 |
| LevelInfo | cc.Label | - | 멀티라인, overflow=NONE |
| SkipButton | cc.Button(transition=3) | - | click → 광고 건너뛰기 |
| RankButton | cc.Button(transition=3) | - | click → 랭킹 |

## 8. 에셋 UUID 목록

| 에셋 | Texture UUID | SpriteFrame UUID |
|------|-------------|-----------------|
| img_back | b0189a16-8442-4c28-8f09-a14655f5b28c | bceeda25-da2b-4f17-95f6-7cde1ae543fe |
| btn_blue | 99f7d459-c737-4b8f-983f-90c5b1fbbbf3 | ff4267fb-0f7c-47dd-9fb1-8ed3f2fb240f |
| btn_yellow | 5f830c35-3ef6-4ca9-93ee-b6ca30c884fb | a691376c-a3c5-4ba3-ba19-4b7212a965b0 |
| btn_ingame_optionB | f44a80e3-8ae0-428b-b2b4-20f2c4f1bfb2 | c08c7588-5866-4a49-b530-a4b3a2a1782a |
| icon_option_sound | 90af0a20-2e45-43a9-83b6-89dd5048521d | 8b646a05-8d09-45a7-84e0-dbcd2ae023a1 |
| icon_option_effectsound | fdc44058-551f-40ba-9abf-bd330020341c | 573f526e-3fbe-4a72-89c4-f7dfd26d4d3b |
| icon_option_off | f1e46dea-48ba-448d-b8ab-90a933169ea1 | 21934aec-8da6-41c0-aed8-95a2f2e0dbe2 |
| icon_ingame_pre | 19137fdc-3720-429a-9b0b-c5ca5e898ced | 82ab257e-1110-4259-9eb0-cc6994158ed9 |
| icon_ingame_home | e956dea6-3815-4bde-9c38-0843fce18a83 | 93bb5638-9dd7-4423-9fab-de141e8d65a3 |
| icon_ingame_chapter | c98b23f6-7710-4539-91f7-ebb1f8c52178 | d2ddf96f-d9e0-4d72-a9e4-bac3b0a145b7 |
| icon_ingame_ads | bca11fb5-c208-4c2e-a374-2d14c47bcf3c | 4eee9642-595b-4a25-b884-2eff3759be96 |
| icon_ingame_ranking | 4392f7b0-6ad0-4f74-b64c-9845c8956de9 | 319ebdb7-6b26-42ba-aafa-aa4c692e9c1d |

## 9. 추론 근거 요약

1. **패널 이미지 없음**: 레퍼런스는 전체화면 설정 메뉴. 단색 살구/갈색 배경 위에 버튼 배치. img_ingame_popupB 불필요. panel 노드는 그룹 컨테이너(빈 노드)로 유지.
2. **Scale factor 1.913**: 디자인폭 750 / 이미지폭 392 (크기 추론에만 사용, 좌표는 패턴 분석)
3. **pill 버튼 SLICED+Scale**: btn_blue 원본(230×203)이 목표 높이(109)보다 크므로 Bg 자식에 scale=0.537 + 내부 너비 확장
4. **토글 86px**: 이미지 45px × 1.913 ≈ 86, btn_ingame_optionB(152) → sizeMode=CUSTOM
5. **Close 버튼**: 레퍼런스에 X(닫기) 형태가 아닌 화살표(뒤로가기) 형태로 표시 → icon_ingame_pre 사용
6. **bg SIMPLE**: img_back은 73×73 단색 타일이므로 SLICED가 아닌 SIMPLE stretch로 충분
7. **에셋 매칭**: 모든 에셋 6점 이상 — 시각적 형태 확인 완료
8. **버튼 내부 좌표**: Icon x=-150 (좌측 1/3), Label x=+20 (중앙~우측) — 레퍼런스 비율 기반 추정
9. **좌표 도출 방법 (패턴 분석)**: pixel×scale이 아닌 시각적 패턴 분석으로 도출
   - 정렬 패턴: 수평중앙(x=0) + 토글 대칭(±65)
   - 간격 리듬: 1.2:1.0:0.8:0.8:1.0 비율 → 갭 58/48/38/38/48px
   - 컨테이너 기반: 패널(813) - 요소합(582) = 갭합(231) → 비율 분배
   - pixel×scale 결과와 비교 시 ~20px 차이 (pixel 측정 오차 증폭이 원인)

## 10. 교훈 — pixel×scale vs 패턴 분석

초기 추론은 pixel×scale 기계적 변환으로 좌표를 도출했으나, 검증 시 상/하단 요소에서 ~20px 오차 발견.

| 방법 | 장점 | 단점 |
|------|------|------|
| **pixel×scale** | 빠름, 개별 요소 독립 계산 | 저해상도 측정 오차 증폭, 디자인 의도 미반영 |
| **패턴 분석** | 디자인 의도 반영, 요소 간 관계 보존 | 패턴 식별에 판단 필요 |

**결론**: 패턴 분석을 1차 방법으로 사용하고, pixel×scale은 교차 검증용으로만 사용해야 한다.

## 11. 최종 적용 좌표 (오버레이 비교 후 미세 조정)

오버레이(레퍼런스 이미지를 zIndex 9999로 반투명 배치) 비교를 통해 반복 조정한 최종값:

| 노드 | Parent | X | Y | W | H | 비고 |
|------|--------|---|---|---|---|------|
| panel | SettingPopup | 0 | -16 | 566 | 980 | 초기 설계(813)에서 토글 포함하도록 확대 |
| SoundToggle | panel | -77 | 365 | 76 | 76 | ±77 대칭, 76px (초기 86에서 축소) |
| EffectToggle | panel | 77 | 365 | 76 | 76 | ±77 대칭 |
| LobbyButton | panel | 0 | 268 | 398 | 95 | Bg scale=0.50 |
| ChapterButton | panel | 0 | 128 | 398 | 95 | Bg scale=0.50 |
| LevelInfo | panel | 0 | -5 | 459 | 109 | 2줄 텍스트 |
| SkipButton | panel | 0 | -161 | 382 | 95 | Bg scale=0.50 |
| RankButton | panel | 0 | -311 | 398 | 95 | Bg scale=0.50 |
| CloseButton | SettingPopup | -323 | 625 | 67 | 67 | panel 밖 좌상단 |

**패턴 분석값 vs 최종 적용값 차이**: 오버레이 비교에서 패턴 분석값도 ~5-15px 오차가 있었다.
실사 비교가 가장 정확하며, 패턴 분석 → 오버레이 비교 → 미세 조정의 3단계 접근이 최적.

## 12. Electron IPC 한국어 인코딩 이슈

### 문제
`Editor.Scene.callSceneScript()`를 통해 비ASCII UTF-8 문자(한국어 등)를 전달하면 `U+FFFD` 대체 문자로 깨짐.

### 원인
Electron의 main ↔ renderer IPC가 비ASCII UTF-8 바이트를 올바르게 전달하지 못함.

### 검증
- ASCII "Lobby" → 정상 round-trip ✅
- 한국어 "로비로" → 저장 시 `efbfbd cebaefbfbd` (U+FFFD) ❌
- Windows 터미널(Git Bash)의 curl도 CP949 인코딩 문제 추가 발생

### 해결 — codepoint 배열 방식
`set_label_text` / `get_label_text` 도구 추가:
- **Write**: 텍스트를 charCode 숫자 배열(`[47196, 48708, 47196]`)로 변환 → IPC 전달 → `String.fromCharCode()` 복원
- **Read**: `label.string`의 각 문자를 charCode 배열로 변환 → IPC 전달 → main process에서 `String.fromCharCode()` 복원
- 숫자 배열은 순수 ASCII이므로 IPC에서 절대 깨지지 않음

### 사용법
```javascript
// Node.js 스크립트에서 (curl 대신 — 터미널 인코딩 우회)
var http = require('http');
var postData = JSON.stringify({ nodeUuid: 'label-uuid', text: '로비로' });
http.request({ hostname: '127.0.0.1', port: 3001, path: '/api/scene/set_label_text', method: 'POST',
    headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData)}
}, function(res) { /* handle */ }).end(postData);
```

### 기타 IPC 안전 메커니즘
- **base-tool.js**: 비ASCII를 `\uXXXX`로 이스케이프 후 IPC 전달 (범용)
- **scene-script.js**: `analyzeLayout` 응답을 `__SAFE_JSON__` prefix + ASCII-safe JSON으로 래핑
- **main.js**: `requireFresh('./tools/base-tool')` — 패키지 리로드 시 캐시 클리어
