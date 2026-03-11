# Z-wuhuarou 아키텍처 (밥도둑)

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Z-wuhuarou (밥도둑 / 네오의 밥도둑) |
| 엔진 | Cocos Creator 2.4.13 |
| 언어 | JavaScript (cc.Class 스타일) |
| 장르 | 물리 퍼즐 (베이컨/김치를 구조물 위에 올려놓기) |
| 플랫폼 SDK | Hi5 (카카오 게임 플랫폼, iframe postMessage 기반) |
| 원본 플랫폼 | WeChat 미니게임 (wxAPI → Hi5API로 마이그레이션 완료) |
| 콘텐츠 규모 | 21챕터 x 5스테이지 = 105스테이지 |

## 디렉토리 구조

```
assets/
  anim/                    # 애니메이션 (anims, spines)
  migration/               # CC 엔진 마이그레이션 스크립트 (2.1→2.2)
  particles/               # 파티클 에셋
  prefabs/
    public/                # 공용 프리팹 (Bacon, Pan, Hand, BaconStorage 등 16개)
  resources/
    Jsons/                 # 설정 JSON (chapter, const, localization, share)
    kakao/                 # 카카오 전용 스프라이트 (kimchi, UI)
    Sounds/                # 사운드 (bgm, btn, gacha, paji, zizizi)
    SpriteFrames/          # 스프라이트 프레임 (bacon/0~3, chapter, pan)
    StagePrefabs/          # 스테이지 프리팹 (0-0 ~ 20-4, 총 105개)
    UIPrefabs/             # UI 프리팹 (15개)
  scenes/
    MainScene.fire         # 유일한 씬
  scripts/
    core/
      AppConst.js          # 전역 상수 (서버 URL, 리소스 경로, 버전)
      GameApp.js           # 앱 진입점 (매니저 초기화, 전역 싱글톤)
      Manager/
        DataManager.js     # 데이터 관리 (configVo, chapterVo, shareVo)
        UIManager.js       # UI 관리 (showUI, showPopup, Toast)
        SoundManager.js    # 사운드 관리 (BGM/SFX, iOS Audio Helper)
        SocketManager.js   # WebSocket 관리 (미사용, 스켈레톤만 존재)
        HttpManager.js     # HTTP 요청 (XMLHttpRequest POST)
        iOSAudioHelper.js  # iOS Safari 오디오 복구 헬퍼
      Localization/
        LocalizationHelper.js    # 간편 로컬라이징 헬퍼 (전역 L / window.L)
        LocalizationManager.js   # 정식 로컬라이징 매니저 (cc.Component)
    Hi5/
      Hi5.js               # Hi5 SDK 코어 (postMessage 통신)
      Hi5API.js            # Hi5 어댑터 (wxAPI 호환 인터페이스)
      Hi5Helper.js         # 광고/상품 설정, 플랫폼 감지
    prefabs/
      public/              # 프리팹 스크립트 (Bacon, Pan, Hand 등)
      SwitchCollider.js    # 스위치 충돌체
    StagePrefabs/          # 스테이지별 Config 스크립트 (특수 연출용)
    UIPrefabs/             # UI 프리팹 스크립트 (15개)
    Utils/
      Utils.js             # 유틸리티 (디버그 드로잉, 문자열 포맷 등)
      PhysicsBound.js      # 물리 경계 생성
    GameCheats.js          # cheat.js 연동 치트 패널
    InGameCheatPanel.js    # 네이티브 cc.Node 기반 치트 패널 (localhost 전용)
    LoadingUI.js           # 로딩 화면 + 리소스 부트스트래핑
  textures/                # 텍스처 에셋 (bacon_mask, statue, ui)
```

## 핵심 모듈

### 1. GameApp (전역 싱글톤)

**파일**: `scripts/core/GameApp.js`

앱 전체의 진입점. `window.GameApp`으로 전역 등록.

```
GameApp
  .soundManager   → SoundManager
  .uiManager      → UIManager (cc.Component, 씬에서 할당)
  .dataManager    → DataManager
  .socketManager  → SocketManager (미사용)
  .httpManager    → HttpManager
```

### 2. DataManager (데이터 허브)

**파일**: `scripts/core/Manager/DataManager.js`

게임 상태의 중앙 저장소. 3가지 VO(Value Object)를 `cc.sys.localStorage`로 영속화.

| VO | 용도 | 저장 키 |
|----|------|---------|
| `configVo` | 유저 설정 (bacon, pan, gold, bgm/sfx, lastLoginTime) | `{GameName}ConfigVo` |
| `chapterVo` | 챕터/스테이지 잠금해제 및 완료 상태 배열 | `{GameName}ChapterVo` |
| `shareVo` | 공유 관련 설정 (WeChat 레거시) | `{GameName}ShareVo` |
| `gameVo` | 런타임 전용 (in-memory), 현재 챕터/스테이지/베이컨 등 | N/A |

주요 기능:
- **베이컨(김치) 충전 시스템**: 시간 기반 자동 회복 (180초/1개), 오프라인 충전 계산, 포그라운드 복귀 보정
- **챕터/스테이지 진행**: 잠금해제, 완료, 다음 스테이지 자동 잠금해제
- **골드 재화**: 스테이지 최초 클리어 시 보상
- **물리 중력**: 스테이지별 gravity 배율 적용

### 3. UIManager (화면 관리)

**파일**: `scripts/core/Manager/UIManager.js`

단일 씬 구조에서 모든 화면을 프리팹으로 관리. `cc.game.addPersistRootNode`으로 영속화.

| 메서드 | 동작 |
|--------|------|
| `showUI(name)` | uiRoot의 자식을 교체 (전체 화면 전환) |
| `showPopup(name)` | popupRoot에 추가 (스택 구조) |
| `popPopup()` | 최상위 팝업 제거 |
| `showToast(str)` | 토스트 메시지 표시 (풀링) |
| `loadAllPrefabs()` | 로딩 시 모든 UIPrefabs 일괄 로드 |

노드 트리:
```
Canvas
  UIRoot          → MainUI / GameUI (상호 교체)
  PopupRoot       → 팝업 스택 (ChapterSelect, Setting, Success 등)
  ToastRoot       → 토스트 메시지
  LoadingMask     → 로딩 블로커
```

### 4. SoundManager

**파일**: `scripts/core/Manager/SoundManager.js`

| 사운드 | 파일 | 용도 |
|--------|------|------|
| bgm | bgm.mp3 | 배경 음악 (루프) |
| btn | btn.mp3 | 버튼 클릭 SFX (전역 패치) |
| gacha | gacha.mp3 | 스테이지 클리어 시 찰칵 효과음 |
| paji | paji.mp3 | 베이컨이 구조물/팬에 닿을 때 효과음 |
| zizizi | zizizi.mp3 | (미사용, 레거시) |

- BGM/SFX 독립 토글
- `cc.Button.prototype._onTouchEnded` 전역 패치로 모든 버튼에 클릭음 자동 적용
- iOS Safari 오디오 복구를 위한 `iOSAudioHelper` 연동

### 5. iOSAudioHelper

**파일**: `scripts/core/Manager/iOSAudioHelper.js`

iOS Safari에서 백그라운드 복귀 시 Web Audio API(AudioContext) 손상 문제를 해결.

- Web Audio API 손상 감지 시 HTML5 Audio(DOM Audio)로 자동 fallback
- 사용자 제스처(touchstart/click) 기반 오디오 unlock
- visibility/focus/pageshow 이벤트로 포그라운드 복귀 감지
- 광고 시청 중(`window.__isWatchingAd`) 사운드 복구 스킵

### 6. Localization (이중 구조)

| 모듈 | 역할 | 접근 방식 |
|------|------|-----------|
| `LocalizationHelper` | 간편 헬퍼 (전역 `L` / `window.L`) | `L.getText(key)`, `L.getConst(constKey)` |
| `LocalizationManager` | 정식 매니저 (cc.Component + static) | `@key` 접두사 자동 번역, 씬 전체 스캔 |

- JSON 데이터: `resources/Jsons/localization.json`
- 지원 언어: ko(한국어), cn(중국어), en(영어), jp(일본어)
- `@` 접두사가 붙은 Label.string을 자동으로 로컬라이징 키로 인식
- `const.json`의 값도 `@` 접두사 시 자동 번역 (`L.getConst`)
- 이미지 로컬라이징 지원 (`LocalizedImageEntry`)

## 씬 구성

**단일 씬 구조**: `MainScene.fire` 하나만 사용.

화면 전환은 `UIManager.showUI()`로 프리팹을 교체하는 방식.

### UI 화면 흐름

```
[LoadingUI] ──로딩 완료──> [MainUI] ──게임시작──> [GameUI]
                              │                      │
                              ├── ChapterSelectPopup  ├── StageDescPopup (진입 시)
                              ├── LobbySettingPopup   ├── SettingPopup
                              └── RankPopup           ├── SuccessPopup ──> CollectGoldConfirmPopup
                                                      ├── VideoAddBaconPopup
                                                      ├── ChapterCompleteHintPopup
                                                      └── UnlockChapterConfirmPopup
```

### UI 프리팹 목록 (15개)

| 프리팹 | 유형 | 설명 |
|--------|------|------|
| MainUI | UI | 메인 화면 (시작, 챕터선택, 랭킹, 설정) |
| GameUI | UI | 인게임 화면 (물리 퍼즐 플레이) |
| ChapterSelectPopup | Popup | 챕터 선택 스크롤 뷰 |
| ChapterCompleteHintPopup | Popup | 챕터 완료 알림 |
| CleanStorageConfirmPopup | Popup | 데이터 초기화 확인 |
| CollectGoldConfirmPopup | Popup | 골드 수령 확인 (리워드 광고) |
| DebugPopup | Popup | 디버그 팝업 |
| LobbySettingPopup | Popup | 로비 설정 (BGM/SFX 토글) |
| MoreGamePopup | Popup | 더보기 게임 (WeChat 레거시) |
| RankPopup | Popup | 랭킹 표시 |
| SettingPopup | Popup | 인게임 설정 |
| StageDescPopup | Popup | 스테이지 진입 시 설명 |
| SuccessPopup | Popup | 클리어 성공 화면 (스크린샷, 공유) |
| UnlockChapterConfirmPopup | Popup | 챕터 잠금해제 골드 소비 확인 |
| VideoAddBaconPopup | Popup | 리워드 광고로 베이컨 추가 |

## 상태 관리

### 앱 라이프사이클

```
[앱 시작]
  1. GameApp 싱글톤 생성 (매니저 초기화)
  2. MainScene 로드 → UIManager.onLoad (PersistRootNode 등록)
  3. LoadingUI 표시
     a. UIManager.loadAllPrefabs (UIPrefabs 전체 로드)
     b. 병렬 로드: Sounds, SpriteFrames, KakaoSprites, StagePrefabs, JsonConfig
     c. 5개 actionComplete 이벤트 수신 후:
        - localStorage에서 configVo/chapterVo/shareVo 읽기
        - SoundManager 초기화 + BGM 재생
        - LocalizationHelper/LocalizationManager 초기화
        - GameCheats/InGameCheatPanel 초기화
        - DataManager.initForegroundRecovery (백그라운드 복귀 리스너)
     d. Hi5 SDK 초기화 (Hi5API.init)
  4. MainUI 표시
```

### 게임플레이 루프 (GameUI)

```
[GameUI._updateStage]
  1. 물리 세계 중력 설정 (스테이지별 gravity 배율)
  2. 줌 비율 설정 (카메라 대신 노드 scale)
  3. Pan(프라이팬) 프리팹 생성 → RevoluteJoint로 앵커에 연결
  4. Statue(구조물) 프리팹 생성 → 스테이지 설정 좌표에 배치
  5. Hand(손) 프리팹 생성 → Bacon(김치) 인스턴스 포함
  6. PhysicsBound 재설정
  7. StageDescPopup 표시

[터치 입력]
  터치 → Pan 모터 활성화 + Hand에서 Bacon 드롭
  Bacon은 RevoluteJoint 해제 후 자유 낙하

[Bacon 판정]
  - 구조물 위 1.5초 안정 (위치 변화 50px 이내) → 성공
  - 경계 밖 + 정지 → 실패

[성공 시]
  스크린샷 캡처 → SuccessPopup → 골드 보상 → 다음 스테이지

[실패 시]
  baconConsumption++ → 같은 스테이지 재시도
```

### 물리 시스템 (Box2D)

| Collider Tag | 의미 |
|--------------|------|
| 0 | 베이컨 조각 |
| 1 | 프라이팬 |
| 2 | 구조물(조각상) |
| 3 | 액체 표면 |
| 4 | 물방울 |
| 5 | 중력 센터 |
| 6 | 경계 (실패 판정) |
| 7 | 바람 영역 |
| 8 | 바람 스위치 |

### 특수 기믹 프리팹

| 프리팹 | 설명 |
|--------|------|
| GravityCenter | 범위 내 물체에 중심 방향 힘 적용 |
| WindField | 지정 각도/세기로 바람 힘 적용 |
| WaterSurface | 물 표면 접촉 시 물보라(Blob) 파티클 생성 |
| MovableCollider | 터치 드래그로 이동 가능한 충돌체 |
| SwitchCollider | 스위치 토글 충돌체 |
| Eye | 눈 장식 (구조물 위) |

### 베이컨(김치) 시스템

- **익힘도(maturity)**: 팬 위에 있는 시간에 비례하여 증가 (0.012/frame)
- 익힘도에 따라 **마찰력**과 **탄성** 자동 계산 (포물선 함수)
- 시각적으로 검은색 오버레이(opacity 0~180)로 표현
- 8개 조각(BaconPiece)이 RevoluteJoint로 연결된 래그돌 구조
- 이미지: `resources/kakao/kimchi/` 폴더의 스프라이트 사용

### 베이컨 충전 시스템

| 설정 | 값 |
|------|-----|
| 초기 재고 | 30개 (baconInitCapacity) |
| 최대 재고 | 200개 (baconMaxCapacity) |
| 충전 주기 | 180초 (3분) / 1개 |
| 오프라인 최대 | 30일 |

- 충전 카운트다운은 `gameVo.countDownTime`으로 관리
- `beforeunload` / `EVENT_HIDE` 시 카운트다운 저장
- `EVENT_SHOW` / 포그라운드 복귀 시 경과 시간 계산하여 일괄 충전
- 재고 부족 시 `VideoAddBaconPopup` (리워드 광고)

## Hi5 SDK 연동

### 아키텍처

```
[게임 코드] → Hi5API (어댑터) → Hi5.js (코어) → postMessage → [Hi5 플랫폼]
                                                                      │
                                              ← postMessage ← ──────┘
```

### 3계층 구조

| 계층 | 파일 | 역할 |
|------|------|------|
| Hi5.js | SDK 코어 | postMessage 송수신, GameData/UserData 관리 |
| Hi5API.js | 어댑터 | wxAPI 호환 인터페이스, 광고/사운드 콜백 처리 |
| Hi5Helper.js | 설정 | 광고/상품 ID 관리, 플랫폼 감지 |

### wxAPI → Hi5API 마이그레이션

wxAPI 패턴 호환을 위한 별칭 유지:
```javascript
Hi5API.wxVo = Hi5API.hi5Vo;
Hi5API.wxToast = Hi5API.hi5Toast;
Hi5API.wxShare = Hi5API.hi5Share;
window.wxAPI = Hi5API;  // 전역 별칭
```

### 광고 설정

| 키 | 유형 | 용도 |
|----|------|------|
| addBacon | 리워드 | 베이컨 추가 |
| doubleGold | 리워드 | 골드 2배 |
| settingSkip | 리워드 | 설정에서 스테이지 스킵 |
| gameUISkip | 리워드 | 게임 중 스테이지 스킵 |
| interstitial | 전면 | 5회 클리어/실패마다 노출 |
| banner | 배너 | 배너 광고 |

### 플랫폼 감지

`Hi5Helper.detectPlatform()`:
- `toss`: AppsInToss / TossApp UA
- `hi5`: ancestorOrigins에 hi5games 포함
- `android` / `ios`: UA 기반
- `web`: 그 외 (standalone 모드)

### 데이터 영속화

- **Hi5 플랫폼**: `Hi5.setItem(key, value)` → postMessage로 플랫폼에 저장
- **오프라인/로컬**: `cc.sys.localStorage` (동일 키에 중복 저장)
- **클라우드 키**: `baconScore` (AppConst.UserCloudKey)

## 로컬라이징

**현재 상태**: 인프라 구축 완료, 실 적용은 부분적

- `localization.json`에 ko/cn/en/jp 4개 언어 데이터 존재
- UI 텍스트는 `@` 접두사 키로 자동 번역 (`@ui.confirm` 등)
- `const.json`의 힌트 텍스트도 `@` 접두사로 로컬라이징 연동
- 기본 언어: ko (한국어)
- 치트 패널에서 런타임 언어 전환 가능
- 이미지 로컬라이징 인프라 존재 (`LocalizedImageEntry`)

## 치트 시스템

### GameCheats (cheat.js 연동)

외부 `cheat.js` 라이브러리 기반. 웹 환경에서 `Shift+클릭` 또는 `3회 탭`으로 활성화.

기능: 언어 전환, 키값 보기, 골드 조작, 스테이지 이동, 전체 해금, 데이터 초기화, 인게임 치트 (김치 추가, 즉시 클리어/실패, 베이컨 위치 이동)

### InGameCheatPanel (네이티브 UI)

`cheat.js` 없이도 동작하는 cc.Node 기반 바텀 시트 UI. **localhost 전용**.

- `Shift+클릭`으로 토글
- 5개 탭: 언어, 재화, 스테이지, 맵, 인게임
- 베이컨 텔레포트 토글 (클릭 위치로 물리 바디 포함 이동)
- cc.Graphics로 런타임 UI 렌더링 (프리팹 불필요)

## 주의사항 / 특이점

1. **단일 씬**: MainScene.fire 하나로 운영. 화면 전환은 UIManager의 프리팹 교체 방식.

2. **WeChat → Hi5 마이그레이션 흔적**: wxAPI 별칭, LayaBox 버튼 주석 처리, 공유 기능 등 WeChat 코드가 주석/비활성 상태로 잔존.

3. **베이컨 = 김치**: 원래 중국판은 베이컨(五花肉) 게임이었으나, 카카오 버전은 김치로 리스킨. 코드 내부 변수명은 `bacon` 그대로 유지, 이미지만 `kakao/kimchi/` 폴더에서 교체.

4. **줌 방식**: 카메라 줌 대신 3개 노드(statueAttachNode, panAttachNode, handAttachNode)의 scale을 동시에 조절. UI 잘림 방지 목적.

5. **물리 좌표 불일치 방어**: zoom != 1일 때 `WeldJoint.anchor`를 zoom 배율로 수동 보정. Box2D의 b2Body는 unscaled 좌표 사용.

6. **스크린샷 시스템**: 클리어 시 `cc.RenderTexture`로 구조물 영역 캡처 → flipY → 투명 트리밍 → 종횡비 보정 후 SuccessPopup에 표시. Web Share API 또는 다운로드로 공유 가능.

7. **cc.Button 전역 패치**: `SoundManager._patchButtonSound()`에서 `cc.Button.prototype._onTouchEnded`를 오버라이드하여 모든 버튼에 클릭 효과음 자동 적용.

8. **프레임레이트 고정**: 60fps + `requestAnimFrame`을 `setTimeout` 기반으로 강제 교체. 모바일 브라우저 절전 모드의 requestAnimationFrame throttle 방지.

9. **iOS 오디오 복구**: iOS Safari 백그라운드 복귀 시 Web Audio API 손상에 대비하여 HTML5 Audio fallback + 사용자 제스처 기반 unlock 구현.

10. **스테이지 Config 스크립트**: 일부 스테이지(4-1, 5-4, 8-1, 9-4, 12-4 등)는 전용 Config 스크립트가 있어 특수 연출(성공 애니메이션 등)을 처리.

11. **SocketManager/HttpManager**: 둘 다 스켈레톤만 존재하며 실제 서버 통신은 하지 않음. 모든 데이터는 localStorage + Hi5 플랫폼 저장.

12. **전면 광고 정책**: 클리어 5회마다, 실패 5회마다 전면 광고 노출 (세션 내 누적 카운트).
