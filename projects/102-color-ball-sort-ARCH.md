# 102-color-ball-sort 아키텍처 (디저트/라이언디저트소트)

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 102-color-ball-sort (디저트) |
| 엔진 | Cocos Creator 2.4.13 |
| 언어 | TypeScript (cc._decorator 스타일) |
| 장르 | 컬러 볼 소팅 퍼즐 |
| 플랫폼 SDK | Hi5Games (postMessage 기반 iframe 통신) |
| 빌드 타겟 | Web Mobile |
| 현재 버전 | 1.0.10 (2026-03-10) |
| 씬 수 | 1개 (`assets/main/game.fire`) |

## 디렉토리 구조

```
assets/
  configs/              # 레벨 데이터 JSON (level.json)
  kakao/                # Kakao 플랫폼 전용 에셋
    spine/              # Ryan 캐릭터 Spine (lobby, result)
    ui/                 # help, ingame, intro, lobby, option, store UI 이미지
  main/                 # 메인 씬 (game.fire)
  prefabs/              # UI 프리팹 (Asset Bundle)
    common/             # BusyLoading, MsgHints
    game/               # Ball, GameWin, PassWin, SettingWin, Tubes
    loading/            # LoadingWin
    lobby/              # LobbyWin, LobbyHelpWin
    shop/               # ShopWin, ShopBallItem, ShopThemeItem, ShopTubeItem
  scripts/
    ccstudio/           # 공용 프레임워크
      arithmetic/       # Astar (미사용)
      common/           # GameConst (상수, 이벤트, 색상)
      component/        # BaseUI, BasePanel, FitUI, FrameAnimation, LinkPrefab,
                        # List, ListItem, ListView, MsgBox, MsgHints
      config/           # Config, LevelCfgParser, CollectionCfgParser
      data/             # Model, GameModel, ModelBase (@save 데코레이터)
      k-cocos/          # k-cocos.js + kcocos.d.ts (경량 유틸)
      manager/          # BusyLoadingManager, ConfigManager, Dispatcher,
                        # LayerManager, PoolManager, Singleton, WindowManager, WXTTUtils
      utils/            # AudioMgr, Base64, BezierUtil, BigNumber, DebugTools,
                        # HTTP, ImageQueueLoader, ItemRechargeMgr, LongTouchComponent,
                        # Shake, StringUtil, Timer, Utils
      Core.ts           # 정적 싱글턴 컨테이너 (진입점)
    Hi5Helper_2x/       # Hi5Games SDK 래퍼
      Hi5.ts            # SDK 통신 (postMessage)
      BMConfig.ts       # 광고/상품 ID 설정
      i18n/             # 다국어
        Hi5Lang.ts      # i18n 매니저
        Hi5Lang_Lable.ts  # Label 컴포넌트 자동 번역
        Hi5Lang_Sprite.ts # Sprite 컴포넌트 언어별 교체
        langs/          # en.ts, ko.ts, zh.ts
    modules/            # 게임 전용 모듈
      collection/       # 컬렉션 시스템 (Main/Sub/List Win/Item)
      common/           # BusyLoading
      daily/            # DailyChallengeWin (TODO - 미구현)
      game/             # 핵심 게임플레이 (GameWin, Tubes, Ball, Tile 등)
      level/            # LevelWin (레벨 선택), ViewGroupNesting
      loading/          # LoadingWin (에셋 로딩)
      lobby/            # LobbyWin, LobbyHelpWin
      menu/             # MenuWin
      shop/             # ShopWin, ShopBallItem, ShopThemeItem, ShopTubeItem
      GameEntry.ts      # 루트 컴포넌트 (씬 진입점)
  shaders/              # changeColor, changeGray, flag, wave (커스텀 셰이더)
  sounds/               # bgm, clickbtn, clickcube, failed, victory 등
  texture/              # 이미지 에셋 (Asset Bundle)
    fieldssets/         # 볼 스킨 (set_1~4, field_0~18)
    particles/          # 파티클 텍스처
    tubes/              # 튜브 스킨 (3~7구멍, tube_1~14)
    ui/                 # common, game, levels, menu, misc, store
build-templates/
  web-mobile/           # 빌드 HTML 템플릿
packages/
  cocos-editor-server/  # Cocos Editor HTTP 서버 확장 (개발용)
```

## 핵심 모듈

### Core (정적 싱글턴 컨테이너)

`Core.ts`가 프레임워크 전체의 진입점으로, 모든 매니저를 정적 멤버로 보유한다.

| 멤버 | 클래스 | 역할 |
|------|--------|------|
| `Core.win` | `WindowManager` | UI 패널(prefab) 로드/표시/숨김/캐싱 |
| `Core.scene` | `WindowManager` | 씬 레이어 관리 (별도 인스턴스) |
| `Core.soundManager` | `AudioMgr` | BGM/SFX 재생, 볼륨 관리 |
| `Core.pool` | `PoolManager` | 오브젝트 풀링 (Ball 100개 선풀) |
| `Core.layer` | `LayerManager` | 레이어 노드 관리 (scene/ui/window/alert) |
| `Core.dispather` | `Dispatcher` | 커스텀 이벤트 시스템 |
| `Core.timer` | `Timer` | 타이머 유틸 |

### BaseUI / BasePanel (자동 바인딩 시스템)

`BaseUI`는 `onLoad()`에서 `autoMapping()`을 실행하여 노드 이름 접두사(prefix convention)로 컴포넌트를 자동 바인딩한다.

| 접두사 | 바인딩 대상 | 예시 |
|--------|------------|------|
| `node_` | `cc.Node` | `node_container` |
| `btn_` | `cc.Button` + clickEvent 자동 등록 | `btn_undo` |
| `txt_`, `lbl_` | `cc.Label` | `txt_lv` |
| `sp_` | `cc.Sprite` | `sp_icon` |
| `spine_` | `sp.Skeleton` | - |
| `list_` | `ListView` | `list_view1` |
| `toggle_`, `tog_` | `cc.Toggle` + clickEvent | - |
| `progress_` | `cc.ProgressBar` | - |
| `page_` | `cc.PageView` | - |
| `clip_` | `FrameAnimation` | - |

`BasePanel`은 `BaseUI`를 상속하며, `show(data)`, `close()`, `recycle()`, `panelDataUpdate(data)` 인터페이스를 제공한다. 모든 UI 윈도우의 기본 클래스.

### WindowManager (윈도우 생명주기)

`WindowManager`는 prefab 기반 패널의 전체 생명주기를 관리한다.

- **open**: 번들에서 prefab 로드 -> instantiate -> windowLayer에 추가 -> `show(data)` 호출
- **prefab 캐싱 (방법 B)**: `preload()`로 prefab 에셋만 미리 로드 (instantiate 없음)
- **인스턴스 캐싱 (방법 A)**: `removeWindow()` 시 destroy 대신 `active=false`로 숨김, 재오픈 시 즉시 재사용
- **closeOther**: 특정 윈도우 오픈 시 나머지 모두 닫기

윈도우 경로는 `GameConst.winPath`에 `{name, path, bundle}` 객체로 정의:
```typescript
Core.win.open(GameConst.winPath.GameWin, data, closeOther, showBusy)
```

### PoolManager (오브젝트 풀링)

`Ball` prefab 100개를 초기화 시 선풀링. `cc.NodePool` 기반.
- `Core.pool.get('Ball')` -> 풀에서 꺼내거나 새로 instantiate
- `Core.pool.recover('Ball', node)` -> 풀에 반환

### Dispatcher (이벤트 시스템)

커스텀 이벤트 시스템. `on(type, callback, thisObj)` / `off()` / `execute(type, params)`.
`cc.director`의 내장 이벤트(`cc.director.on/emit`)와 병행 사용한다:
- `Dispatcher`: 비즈니스 로직 이벤트 (야간모드 변경 등)
- `cc.director`: 스킨 변경 이벤트 (`ChangeTube`, `ChangeBall`, `ChangeTheme`)

## 게임 로직

### 게임 플로우

```
튜브 클릭 → doMoveBall(idx)
  ├─ 이미 선택된 튜브 있고, 클릭한 튜브가 유효 → moveToIdx(source, target)
  ├─ 빈 튜브 → 무시
  ├─ 이미 선택 상태인 튜브 재클릭 → backRightPos() (되돌리기)
  └─ 새 튜브 선택 → getValidTubeIdx(idx)
       ├─ 유효 0개 → MsgHints("적합한 위치가 없습니다") + moveToTop()
       ├─ 유효 1개 → 즉시 이동
       └─ 유효 2+개 → moveToTop() + 유효/무효 튜브 시각적 표시
```

### 볼 이동 로직 (Tubes.addBall)

1. 소스 튜브에서 최상단 볼 제거 (`removeTopBall`)
2. 좌표 변환 (소스 -> 타겟 노드 공간)
3. 경유점 5개 계산: 현재위치 -> 소스 상단 -> 중간 호 -> 타겟 상단 -> 최종 위치
4. 공선 점 제거 후 베지어 곡선 보간 (`BezierUtil`)으로 부드러운 아크 이동
5. 이동 완료 후 완성 체크 (`checkComplete`) -> 파티클 효과

### 튜브 유효성 판단 (getValidTubeIdx)

1. **1순위**: 모든 볼이 같은 색인 비완성 튜브 (색 합치기 최적)
2. **2순위**: 같은 색 top 볼을 가진 튜브 + 빈 튜브 (빈 튜브는 1개만)
3. 가득 찬 튜브, 자기 자신은 제외

### 승리 판정 (checkGameResult)

모든 튜브가 `checkIsOk()` = true:
- 빈 튜브: OK
- 같은 색 볼로 가득 찬 튜브: OK
- 그 외: 미완성

### 아이템 시스템

| 아이템 | 초기량 | 제한 | 기능 |
|--------|--------|------|------|
| Undo | 1 | 소진 시 리워드 광고 | 마지막 이동 취소 (`recordList.pop()`) |
| Hint | 1 | 소진 시 리워드 광고 | AI 이동 추천 (비빈튜브 우선 -> 빈튜브 -> 역방향 폴백) |
| Add Tube | 0 | 스테이지당 1회 | 빈 튜브 1개 추가 + 레이아웃 재배치 |

스테이지 진입 시 Undo=1, Hint=1, Add=0으로 초기화.

### 튜브 레이아웃

`LevelCfgParser.getLayoutInfo(count)`로 튜브 수에 따라 행 수, 간격, 스케일을 결정:

| 튜브 수 | 행당 개수 | 스케일 | 열 간격 |
|---------|-----------|--------|---------|
| 5 | 5 | 0.8 | 130 |
| 6 | 3 | 0.8 | 130 |
| 7-8 | 4 | 0.8 | 130 |
| 9-10 | 5 | 0.8 | 130 |
| 11-12 | 6 | 0.7 | 100 |
| 13-14 | 7 | 0.7 | 90 |
| 15-16 | 8 | 0.65 | 80 |
| 17-18 | 9 | 0.56 | 70 |
| 19-20 | 10 | 0.52 | 63 |
| 21-22 | 11 | 0.48 | 56 |

### 전면 광고 (Interstitial)

`GameWin._roundCount`를 매 라운드(승리/패배) 증가시키고, 3의 배수마다 전면 광고 호출.

## 씬 구성

단일 씬 아키텍처. `game.fire` 1개만 사용한다.

```
game.fire
  Canvas
    GameEntry (루트 컴포넌트)
      container (Core.init 대상)
        layer_scene    # 씬 레이어 (Core.scene)
        layer_ui       # UI 레이어
        layer_win      # 윈도우 레이어 (Core.win)
        layer_alert    # 알림 레이어
```

모든 화면 전환은 `WindowManager`의 `open()`/`removeWindow()`로 처리한다.

### 화면 전환 흐름

```
[Loading] LoadingWin
    ↓ (에셋 로드 완료)
[Lobby] LobbyWin
    ├── [Help] LobbyHelpWin
    ├── [Shop] ShopWin
    ├── [Setting] SettingWin
    ├── [Ranking] Hi5.showRank()
    └── [Start] → GameWin (closeOther=true)
            ├── [Pass] PassWin → 다음레벨 GameWin / 로비 MenuWin
            ├── [Lose] LoseWin → 재시작
            ├── [Setting] SettingWin
            │     ├── [Level Select] LevelWin → GameWin
            │     └── [Exit] → LobbyWin
            ├── [Shop] ShopWin
            └── [Hint/Undo/Add] 인게임 아이템
```

## 상태 관리

### 데이터 모델 (GameModel)

`ModelBase`의 `@save` 데코레이터로 영속화할 필드를 마킹한다. `getData()`는 `@save` 필드만 추출하고, `setData(data)`는 저장된 값을 복원한다.

```typescript
// 영속화되는 필드 (@save 데코레이터)
level: number           // 최고 도달 레벨
nightmode: boolean      // 야간 모드
levelstar: {}           // 레벨별 별 점수
money: number           // 게임 머니
itemAdd/itemUndo/itemHint: number  // 아이템 보유량
guide: number           // 가이드 진행 상태
curTubeType/curBallType/curThemeType: number  // 현재 스킨
unlockTubes/unlockBalls/unlockThemes: number[]  // 해금 상태

// 세션 전용 (비영속)
selectedLevel: number   // 현재 플레이 중인 레벨
selectedTheme/selectedThemeSub: number  // 현재 테마
```

### 저장/로드 흐름

```
[저장] Model.save()
  → Model.game.getData()  (ModelBase: @save 필드만 추출)
  → cc.sys.localStorage.setItem()  (로컬 백업)
  → Hi5.setItem()  (클라우드 저장 - postMessage로 SDK에 전달)

[로드] Model.loadData()
  → Hi5.getItem()  (클라우드 우선)
  → fallback: cc.sys.localStorage.getItem()  (로컬)
  → Model.game.setData()  (ModelBase: @save 필드 복원)
```

## Hi5 SDK 연동

### 통신 방식

iframe 내에서 `window.parent.postMessage()`로 부모 프레임(Hi5 SDK)과 양방향 통신.

### 주요 메시지

| 방향 | 메시지 | 용도 |
|------|--------|------|
| Game -> SDK | `INIT_SDK` | 초기화 |
| Game -> SDK | `LOAD_END` | 로딩 완료 알림 |
| Game -> SDK | `DATA_SET_ITEM` | 데이터 클라우드 저장 |
| Game -> SDK | `SUBMIT_SCORE` | 점수(레벨) 제출 |
| Game -> SDK | `SHOW_RANK` | 랭킹 표시 |
| Game -> SDK | `LOAD_AD` / `SHOW_AD` | 광고 로드/표시 |
| Game -> SDK | `BUY_ITEM` | 인앱 구매 |
| SDK -> Game | `GAME_DATA` | 게임/유저/플랫폼 데이터 전달 |
| SDK -> Game | `SHOW_AD` | 광고 상태 콜백 (show/dismissed) |
| SDK -> Game | `LOAD_AD` | 광고 로드 완료/실패 |

### 광고 (BMConfig.ts)

| 광고 키 | aid | 용도 |
|---------|-----|------|
| `reward_item` | `reward_item` | 아이템 소진 시 리워드 광고 (튜브/볼/테마 해금 포함) |
| `interstitial` | `interstitial` | 3판마다 전면 광고 |

### 로컬 프리뷰 폴백

`GameEntry.start()`에서 `window.parent === window`이면 (iframe 아닌 독립 실행) 200ms 후 `GAME_DATA` 메시지를 직접 시뮬레이션하여 SDK 없이도 게임 진행 가능.

## 스킨/테마 시스템

### 볼 스킨 (Ball Skin)

4종 (`set_1` ~ `set_4`). 각 세트에 19색 이미지 (`field_0` ~ `field_18`).
경로: `texture/fieldssets/set_{id}/field_{colorIndex}`

| ID | 이름 (i18n) |
|----|------------|
| 1 | 젤리 세트 |
| 2 | 쿠키 세트 |
| 3 | 펄 세트 |
| 4 | 캔디 세트 |

### 튜브 스킨 (Tube Skin)

14종 (`tube_1` ~ `tube_14`). 튜브 용량별(3~7구멍) 별도 이미지.
경로: `texture/tubes/{capacity}/tube_{skinId}`

### 배경 테마 (Theme)

3종. `GameConst.THEME_COLOR/THEME_COLOR2/THEME_COLOR3`로 색상 정의.
`GameWin`에서 `BG0` ~ `BG3` 노드의 active 토글로 전환.

| ID | 이름 |
|----|------|
| 0 | 스위트 브라운 (Monochrome) |
| 1 | 스위트 네이비 (Elegant Purple) |
| 2 | 스위트 베이지 (Noble Gold) |

### 스킨 변경 이벤트

스킨 변경 시 `cc.director.emit()`으로 이벤트를 발송하여 모든 해당 컴포넌트가 자동 갱신:
- `ChangeTube`: 모든 `Tubes` 인스턴스가 `changeTube()` -> 스프라이트 교체
- `ChangeBall`: 모든 `Ball` 인스턴스가 `changeBall()` -> 스프라이트 교체
- `ChangeTheme`: `GameWin`이 `updateBg()` -> 배경 노드 active 토글

### 해금 방식

모든 스킨/테마는 리워드 광고 시청으로 해금. `Model.game.unlockTubes/unlockBalls/unlockThemes` 배열에 ID 추가.

## 컬렉션 시스템

레벨 진행에 따라 테마별 타일 컬렉션이 해제되는 시스템. `CollectionCfgParser`에 하드코딩.

| 메인 테마 | 서브 테마 | 타일 키 | 시작 레벨 | 종료 레벨 |
|-----------|-----------|---------|-----------|-----------|
| 미식 | 디저트, 캔디, 컵, 음식 | sweets, candy, cups, food | 1 | 24 |
| 자연 | 꽃, 동물, 자연, 나비, 숲 | flowers, animals, nature, butterflies, forest | 25 | 84 |
| 여름 | 과일, 액티비티, 액세서리, 스포츠, 의류 | fruits, activities, accessories, sports, garments | 85 | 144 |
| 모험 | 일본, 우산, 심볼, 자동차, 우주 | japan, umbrellas, symbols, cars, space | 145 | 204 |

## 레벨 설정 시스템

### level.json 형식

```
id | cupCount | tube1,ballCount,isEmpty[,ball0,ball1,...] | ... | step | moveSeq
```

- `cupCount`: 총 튜브 수
- 각 tube: `[tubeIndex, ballCount, isEmpty, ball0, ball1, ...]`
  - `isEmpty=0`: 볼이 있는 튜브 (ball0~ballN은 색상 인덱스)
  - `isEmpty=1`: 빈 튜브
- `step`: 평가 기준 스텝 수
- `moveSeq`: 해답 이동 시퀀스

### 레벨 선택 (LevelWin)

5개 페이지로 구성, `cc.PageView`로 좌우 스와이프:

| 페이지 | 테마 | 레벨 수 |
|--------|------|---------|
| Summer | 여름 | 15 |
| Winter | 겨울 | 30 |
| Fruits | 과일 | 60 |
| Flowers | 꽃 | 120 |
| Sakura | 벚꽃 | 220 |

총 445레벨. 현재 레벨 이상은 잠금 표시.

## 로컬라이징

### 구현 상태

**Hi5Lang 기반 i18n 적용 완료.**

### 지원 언어

| 코드 | 언어 | 파일 |
|------|------|------|
| `ko` | 한국어 (기본) | `i18n/langs/ko.ts` |
| `en` | 영어 | `i18n/langs/en.ts` |
| `zh` | 중국어 | `i18n/langs/zh.ts` |

### 작동 방식

1. `Hi5Lang.init()`: 브라우저 언어 감지 -> localStorage 캐시 -> 기본 ko 폴백
2. `window['Hi5Lang'].t('key')`: 키 기반 텍스트 조회
3. `Hi5Lang_Lable`: Label 컴포넌트에 부착 -> 언어 변경 시 자동 갱신
4. `Hi5Lang_Sprite`: Sprite 컴포넌트에 부착 -> 언어별 이미지 교체
5. `Hi5Lang.setLang(lang)`: 런타임 언어 변경 + 씬 전체 렌더러 업데이트

## 사운드

| 파일 | 용도 |
|------|------|
| `bgm.mp3` | BGM (반복 재생) |
| `clickbtn.mp3` | 버튼 클릭 |
| `clickcube.mp3` | 큐브/타일 클릭 |
| `sound_ball_move.mp3` | 볼 이동 |
| `sound_tube_full.mp3` | 튜브 완성 |
| `victory.mp3` | 스테이지 클리어 |
| `failed.mp3` | 실패 |
| `swtich.mp3` | 스위치/토글 |
| `tileclean.mp3` | 타일 제거 |

BGM은 `AudioMgr.playBgSeq()`로 순차 재생. 백그라운드 복귀 시 자동 resume (광고 시청 중에는 차단).

## 커스텀 셰이더

| 파일 | 용도 |
|------|------|
| `changeColor.effect/mtl` | 색상 변경 (타일 밝기 조절 - `lerpValue` 프로퍼티) |
| `changeGray.effect/mtl` | 그레이스케일 |
| `flag.effect/mtl` | 깃발 애니메이션 |
| `wave.effect/mtl` | 웨이브 효과 |

`Tile.ts`에서 `changeColor` 머티리얼의 `lerpValue`를 tween으로 애니메이션하여 타일 어둡게/밝게 전환.

## 개발/디버그 도구

### GameCheats

`window.cheat` 라이브러리(외부) 연동. Shift+Click(데스크탑) / 트리플탭(모바일)으로 활성화.

| 그룹 | 명령 | 기능 |
|------|------|------|
| 게임 | 레벨+10 / 레벨-10 | 레벨 조정 |
| 게임 | 아이템 MAX | 모든 아이템 5개 |
| 게임 | 아이템 초기화 | 모든 아이템 0개 |
| 설정 | 언어 | ko/en/zh 런타임 변경 |

### Cocos Editor Server

`packages/cocos-editor-server/`: Cocos Creator 2.x 에디터 내부 HTTP REST API 서버.
`curl`로 씬/노드/컴포넌트/프리팹/에셋 조작 가능 (MCP 대신 직접 HTTP 호출).

### 버전 관리

`bump-version.js`로 `version.json` + `build-templates/web-mobile/index.html` 동시 업데이트:
```bash
node bump-version.js patch|minor|major
node bump-version.js set x.y.z
node bump-version.js log "changelog 항목"
```

## 주의사항 / 특이점

1. **단일 씬 아키텍처**: `game.fire` 1개만 사용. 모든 화면 전환은 `WindowManager`의 prefab open/close로 처리.

2. **Asset Bundle 구조**: `texture`, `prefabs`, `sounds`, `configs`, `kakao` 5개 번들을 사용. `LoadingWin`에서 병렬 로드 + Config/Model 로드도 병렬 진행.

3. **TypeScript 기반**: 프로젝트 설명에 "JavaScript (cc.Class 스타일)"로 되어 있으나, 실제로는 **TypeScript** (`cc._decorator` 스타일)이다. `k-cocos.js` 1개만 JS 파일.

4. **autoMapping 컨벤션**: 노드 이름의 접두사(`btn_`, `txt_`, `sp_` 등)가 코드와 직접 연결되므로, 프리팹에서 노드 이름을 변경하면 코드가 깨진다.

5. **Tile.ts는 컬렉션 전용**: `Tile` 클래스는 볼소팅 게임의 핵심이 아니라 컬렉션 시스템의 타일 UI 컴포넌트이다. 이름이 혼동될 수 있으나 게임 핵심은 `Tubes` + `Ball`.

6. **DailyChallenge 미구현**: `DailyChallengeWin`은 스텁 상태 (TODO).

7. **WXTTUtils 잔재**: 위챗/틱톡 미니게임 관련 코드가 주석 처리된 채 남아있다 (`WXTTUtils`, `showVideo` 등). Hi5 SDK로 전환 완료.

8. **윈도우 인스턴스 캐싱**: `WindowManager`는 패널을 destroy하지 않고 `active=false`로 숨긴다. 재오픈 시 새 인스턴스를 만들지 않아 성능상 유리하지만, `onEnable`에서 상태 초기화를 확실히 해야 한다.

9. **볼 MotionStreak**: `Ball`에 `cc.MotionStreak` 컴포넌트가 부착되어 있어 이동 시 잔상 효과가 나타난다. 색상은 `GameConst.TUBE_COLOR[type]`으로 설정.

10. **Hi5 시간 동기화**: `Hi5.current_time`이 서버 시간 기준으로 1초마다 증가. `Utils.getServerTime()`과 별도 관리.

11. **cheatWin()**: `GameWin`에 치트 승리 메서드가 있다. 0.3초 딜레이 후 즉시 다음 레벨로 진행.
