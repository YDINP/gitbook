# FriendMaker 아키텍처 (봉봉)

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | FriendMaker (봉봉 / 50FriendsBongBong) |
| 엔진 | Cocos Creator 3.8.6 |
| 언어 | TypeScript |
| 장르 | 수박게임(합성 퍼즐) - 물리 기반 과일 합성 (Merge Big Watermelon 클론) |
| 플랫폼 SDK | Hi5 SDK (카카오/토스/구글 등 멀티 플랫폼) |
| 버전 | v0.2.0 |
| 해상도 | 750 x 1625 (FIXED_WIDTH) |
| 원본 프로젝트명 | MergeBigWatermelon (package.json) |

---

## 디렉토리 구조

```
assets/
├── localization/
│   ├── LocalizationManager.ts   # CDN 기반 다국어 매니저 (ko/en/cn)
│   └── localization - FriendsBongBong - main.json  # 로컬 폴백 데이터
├── res/                         # 비-resources 에셋 (직접 참조용)
│   ├── anim/                    # 애니메이션 (bg 등)
│   ├── fx/                      # 이펙트
│   ├── kakao/                   # 카카오 Spine 에셋 (lobby)
│   ├── material/                # 머터리얼
│   ├── particles/               # 파티클 이펙트
│   └── ui/                      # UI 프리팹 (helpView, homeView, gameView 등)
├── resources/                   # 동적 로드 에셋 (resources.load)
│   ├── material/
│   ├── popbg/                   # 팝업 배경 스프라이트
│   ├── prefab/
│   │   ├── fruits/              # 과일 프리팹 (1~11번, 타입별)
│   │   ├── particle/            # 합성 파티클 (1~11번)
│   │   ├── pieces/              # score, star, starParticle, target
│   │   ├── qiandao/             # 출석체크 아이템 (signItem1)
│   │   └── ui/                  # 동적 로드 UI 프리팹
│   └── sound/                   # 사운드 파일 (mp3)
├── scene/
│   └── map.scene                # 유일한 씬
└── script/
    ├── components/              # 재사용 컴포넌트
    │   ├── baseNodeCmpt.ts      # 노드 기본 컴포넌트
    │   ├── baseViewCmpt.ts      # 뷰 기본 컴포넌트 (자동 버튼 바인딩)
    │   ├── i18nLabel.ts         # i18n 라벨
    │   ├── i18nSprite.ts        # i18n 스프라이트
    │   ├── prefabPool.ts        # 프리팹 오브젝트 풀
    │   ├── scrollItemCmpt.ts    # 스크롤 아이템
    │   ├── scrollViewCmpt.ts    # 스크롤 뷰
    │   ├── rotateSelf.ts        # 자체 회전
    │   └── SpineRunner.ts       # Spine 실행기
    ├── config/
    │   └── GameVersion.ts       # 버전 정보 (v0.2.0)
    ├── const/
    │   ├── cameraCmpt.ts        # 카메라 컴포넌트
    │   ├── enumConst.ts         # 열거형/인터페이스 정의
    │   ├── eventName.ts         # 이벤트 이름 상수
    │   ├── levelConfig.ts       # 레벨 설정 관리
    │   ├── modleNameConst.ts    # 모델 이름 상수
    │   ├── rankConfig.ts        # 랭킹 설정
    │   └── viewNameConst.ts     # 뷰 이름 상수
    ├── core/                    # 싱글턴 매니저 계층
    │   ├── app.ts               # GameApp - 최상위 앱 관리자
    │   ├── singletonClass.ts    # 싱글턴 베이스 클래스
    │   ├── audioManager.ts      # 오디오 관리
    │   ├── eventManager.ts      # 이벤트 관리 (자체 pub/sub)
    │   ├── i18nManager.ts       # i18n 관리 (비활성)
    │   ├── indicatorManager.ts  # 로딩 인디케이터
    │   ├── noticeManager.ts     # 알림 관리
    │   ├── platformManager.ts   # 플랫폼 관리 (빈 구현)
    │   ├── subGameManager.ts    # 서브게임 관리
    │   ├── timeManager.ts       # 시간 관리
    │   ├── userInfo.ts          # 유저 정보
    │   └── viewManager.ts       # 뷰(윈도우) 관리
    ├── game/
    │   ├── Hi5.ts               # Hi5 SDK 래퍼 (PostMessage 기반 통신)
    │   ├── Hi5Mock.ts           # 디버그용 Mock Hi5 (localStorage 기반)
    │   ├── mainCmpt.ts          # 씬 진입점 (SDK 초기화, Hi5 메시지 핸들러)
    │   ├── control/
    │   │   └── screenRayCmpt.ts # 터치 입력 처리
    │   ├── logic/
    │   │   └── gameLogic.ts     # 게임 로직 (과일/파티클 리소스 캐시)
    │   └── ui/
    │       ├── homeViewCmpt.ts      # 홈 화면
    │       ├── gameViewCmpt.ts      # 게임 화면 (핵심 게임플레이)
    │       ├── loadingViewCmpt.ts   # 로딩 화면
    │       ├── resultViewCmpt.ts    # 결과 화면 (승/패)
    │       ├── shopViewCmpt.ts      # 상점
    │       ├── settingViewCmpt.ts   # 설정
    │       ├── helpViewCmpt.ts      # 도움말
    │       ├── rankViewCmpt.ts      # 랭킹
    │       ├── signLayer.ts         # 출석체크 레이어
    │       ├── signItem.ts          # 출석체크 아이템
    │       ├── exitViewCmpt.ts      # 종료 확인
    │       ├── onlineRewardViewCmpt.ts # 온라인 보상
    │       ├── tipsViewCmpt.ts      # 토스트 메시지
    │       └── item/
    │           └── gridCmpt.ts      # 과일(그리드) 컴포넌트 (물리 충돌)
    ├── utils/
    │   ├── cocosHelper.ts       # Cocos 유틸리티 (라벨 업데이트, 버튼 바인딩 등)
    │   ├── globalFuncHelper.ts  # 전역 함수 (골드, 하트 시스템, 디버그 모드)
    │   ├── indicator.ts         # 인디케이터 유틸
    │   ├── logHelper.ts         # 로그 유틸
    │   ├── resLoadHelper.ts     # 리소스 로드 유틸
    │   ├── storageHelper.ts     # 저장소 유틸 (Hi5 GameData 연동)
    │   └── toolsHelper.ts       # 도구 유틸 (딜레이, 날짜 체크 등)
    ├── dy/
    │   └── DyManager.ts         # 더우인(틱톡) SDK (비활성)
    ├── ks/
    │   ├── ksManager.ts         # 콰이셔우 SDK (비활성)
    │   └── ksAdvertise.ts       # 콰이셔우 광고 (비활성)
    └── wx/
        ├── wxManager.ts         # WeChat SDK (비활성)
        └── advertise.ts         # WeChat 광고 래퍼 (일부 활성)
```

---

## 핵심 모듈

### 앱 라이프사이클 (초기화 흐름)

```
map.scene 로드
  └─ mainCmpt.onLoad()
       ├─ 디버그 모드 체크 (URL ?debug=true 또는 ?skipSDK=true)
       │   ├─ [디버그] createMockHi5() → localStorage 기반 Mock 동작
       │   └─ [정상] Hi5.Init_SDK() → PostMessage로 SDK 초기화
       │           └─ preloadFonts() → LoadEnd()
       └─ Hi5_onPostMessage(GAME_DATA)
            └─ App.init(canvas)
                 ├─ UserInfo.init()
                 ├─ AudioManager.init()
                 ├─ ViewManager.init()
                 ├─ TimeManager.init()
                 ├─ GameLogic.init()
                 ├─ StorageHelper.initData() (첫 실행 시 초기값 설정)
                 ├─ LevelConfig.initData()
                 └─ GlobalFuncHelper.restoreHeartTimer()
            └─ initView()
                 └─ ViewManager.openView(eLoadingView)
                      └─ 리소스 프리로드 → eHomeView 열기
```

### 싱글턴 매니저 계층 (`App.*`)

| 접근자 | 클래스 | 역할 |
|--------|--------|------|
| `App.user` | UserInfo | 유저 프로필, 랭크 데이터 |
| `App.platform` | PlatformManager | 플랫폼 정보 (빈 구현) |
| `App.subGame` | SubGameManager | 서브게임 (비활성) |
| `App.view` | ViewManager | 뷰(윈도우) 열기/닫기/큐 관리 |
| `App.event` | EventManager | 자체 pub/sub 이벤트 버스 |
| `App.audio` | AudioManager | BGM/SFX 재생, 광고 시 사운드 상태 저장/복원 |
| `App.i18n` | I18nManager | i18n (비활성, LocalizationManager로 대체) |
| `App.notice` | NoticeManager | 알림 |
| `App.timer` | TimeManager | 시간 관리 |
| `App.gameLogic` | GameLogic | 과일/파티클 프리팹 캐시 |
| `App.indicator` | indicatorManager | 로딩 스피너 표시/숨기기 |

모든 싱글턴은 `SingletonClass<T>` 기반이며 `static getInstance()` 패턴으로 접근한다.

### 게임 핵심 로직 (`gameViewCmpt`)

수박게임(Merge Big Watermelon) 클론 구조:

- **과일 타입**: 1~11번 (11이 최대, 수박에 해당)
- **물리**: Box2D (Cocos 2D Physics), `RigidBody2D` + `CircleCollider2D`/`PolygonCollider2D`
- **합성 규칙**: 같은 타입의 과일 2개가 충돌하면 → 다음 타입으로 합성
- **게임 흐름**:
  1. 상단에서 과일 드롭 (터치 좌우 이동 → 터치 종료 시 드롭)
  2. `gridCmpt.onBeginContact()` → 같은 타입 충돌 감지 → `StartMerge` 이벤트
  3. `gameViewCmpt.evtStartMerge()` → 두 과일 제거 + 다음 타입 생성 + 점수 추가 + 파티클
  4. **게임 오버**: 과일이 상단 경계선을 5초 이상 초과하면 게임 종료
  5. **레벨 모드**: 목표 과일 달성 시 클리어 / **무한 모드**: 게임 오버까지

### 뷰 관리 (`ViewManager`)

- **WindowType**: Map, View, Tips, Marquee, Toast, Network (Canvas 하위 레이어별 배치)
- **WindowOpenType**: Single (하나만 표시), Multiple (큐 기반 순차 표시)
- 프리팹 기반 동적 로드 (`ResLoadHelper.loadPrefabSync`)
- `LocalizationManager.instantiatePrefab()`를 통해 프리팹 인스턴스 생성 시 자동 로컬라이징

---

## 씬 구성

| 씬 | 파일 | 역할 |
|----|------|------|
| map | `scene/map.scene` | 유일한 씬. Canvas 하위에 map/view/tips/marquee/toast/network 레이어 구성. mainCmpt가 루트 컴포넌트로 부착. |

단일 씬 구조이며, 모든 화면 전환은 `ViewManager`의 프리팹 열기/닫기로 처리한다.

---

## 상태 관리

### 데이터 저장 구조

모든 게임 데이터는 `Hi5.GameData` 객체에 저장되며, `window['Hi5'].setItem(key, value)` / `getItem(key)` 로 접근한다. `SaveData()` 호출 시 `PostMessage`를 통해 SDK 서버로 전송된다.

`StorageHelper`는 `Hi5.getItem/setItem` 을 래핑하여 기존 `sys.localStorage` 코드를 SDK 연동으로 전환한 어댑터이다.

### 주요 저장 키 (`StorageHelperKey`)

| 키 | 용도 | 기본값 |
|----|------|--------|
| LevelId_2 | 현재 레벨 | 1 |
| Gold | 골드(코인) | 2000 |
| Heart | 하트 (체력) | 5 |
| HeartRechargeTime | 하트 충전 예정 시각 (ms) | 0 |
| Music_Status | 배경음악 ON/OFF | "1" |
| Music_Eff_Status | 효과음 ON/OFF | "1" |
| Zhen_Dong_Status | 진동 ON/OFF | "1" |
| TipsTool | 망치(힌트) 도구 수량 | 0 |
| RefreshTools | 흔들기(새로고침) 도구 수량 | 0 |
| ReplaceTool | 되돌리기 도구 수량 | 2 |
| FreeTimes | 무료 플레이 횟수 | 3 |
| StarScore | 누적 별 점수 | 0 |
| Ads | 광고 제거 구매 여부 | 0 |
| TutoShown | 튜토리얼 완료 여부 | - |
| sign / signDay | 출석체크 | - |

### 하트 시스템 (`GlobalFuncHelper`)

- 최대 하트: 5
- 충전 간격: 5분 (300,000ms)
- 오프라인 충전 지원: 앱 복귀 시 `restoreHeartTimer()` → 오프라인 경과 시간 계산 → 자동 충전 (최대 30일 cap)
- `consumeHeart()`: 게임 시작 시 하트 1개 소비, 부족 시 false 반환
- `addHeart()`: 광고 보상 등으로 하트 추가

### 점수 시스템

- 세션 내 `score` 변수 (gameViewCmpt)로 관리
- 합성 시 과일 타입에 따른 점수 가산
- `window['Hi5'].setItem("score", score)` 로 저장
- `window['Hi5'].submitScore(score)` 로 서버 랭킹 제출

---

## Hi5 SDK 연동

### 통신 방식

`window.postMessage` 기반 iframe 통신. 게임은 Hi5 플랫폼 iframe 안에서 실행된다.

```
게임 → SDK: window.parent.postMessage({tohi5action: action, data: data}, "*")
SDK → 게임: window.addEventListener('message', callback)
```

### 주요 메시지

| 방향 | 메시지 | 용도 |
|------|--------|------|
| G→S | INIT_SDK | SDK 초기화 |
| G→S | LOAD_END | 로딩 완료 알림 |
| S→G | GAME_DATA | 유저/게임 데이터 전달 |
| G→S | SAVE_DATA | 게임 데이터 저장 |
| G→S | DATA_SET_ITEM | 개별 키-값 설정 |
| G→S | LOAD_AD / SHOW_AD | 광고 로드/표시 |
| G→S | SUBMIT_SCORE | 랭킹 점수 제출 |
| G→S | SHOW_RANK | 랭킹 보기 |
| G→S | BUY_ITEM | 인앱 구매 |
| G→S | ITEM_LIST | 상품 목록 조회 |
| G→S | VIBRATION | 진동 |
| G→S | SHARE_TEXT / SHARE_APP_LINK | 공유 |
| G→S | INVITE_FRIEND_REWARDS | 친구 초대 보상 |

### 광고 시스템

```
광고 로드 요청
  └─ App.audio.saveAudioState() → 사운드 정지
  └─ Hi5.loadAd(ad) → App.indicator.show()
      └─ LOAD_AD 콜백 (status 0) → Hi5.showAd()
          └─ SHOW_AD 콜백
              ├─ type="show"/"userEarnedReward" → lastShowAd = true
              └─ type="dismissed" → 보상 이벤트 emit → App.audio.restoreAudioState()
```

광고 종류:
- `default_ad`: 홈 복귀 시 전면 광고
- `reward_Tips`: 망치 도구 보상 광고
- `reward_Refresh`: 흔들기 도구 보상 광고
- `reward_Login`: 접속 보상 2배 광고

### 인앱 구매

| 상품 | key | 가격 |
|------|-----|------|
| 골드 15,000개 | gold | 4,400원 |
| 광고 제거 | ads | 3,300원 |

`purchaseProduct(product)` → `BUY_ITEM` 콜백에서 골드 추가 또는 광고 제거 플래그 설정.

### 디버그 모드

URL 파라미터 `?debug=true` 또는 `?skipSDK=true` 또는 `localStorage.H5_DEBUG_MODE = 'true'` 로 활성화.
- `Hi5Mock` 객체 사용 (localStorage 기반, 실제 SDK 통신 없음)
- 광고 즉시 보상 지급 (광고 시청 건너뜀)
- 콘솔 로그 활성화

---

## 로컬라이징

### LocalizationManager (CDN 기반)

- **CDN URL**: `https://raw.githubusercontent.com/TinycellCorp/kakao_localization/main/50FriendsBongBong/{lang}.json`
- **CDN 프로젝트 ID**: `50FriendsBongBong`
- **지원 언어**: ko (한국어, 기본), en (영어), cn (중국어)
- **캐시**: LocalStorage 기반, 만료 시간 3600초
- **버전 관리**: `version.json` 으로 서버 버전 체크 → 변경 시만 CDN 재로드
- **폴백 순서**: CDN → 캐시 (만료 포함) → 로컬 JSON 파일

### 로컬라이징 적용 방식

1. **자동**: `LocalizationManager.instantiatePrefab()` 으로 프리팹 생성 시 `@` 접두사가 붙은 Label을 자동 번역
2. **수동**: `LocalizationManager.getText("key")` / `getTextWithArgs("key", ...args)` 호출
3. **언어 변경**: `LocalizationManager.setLanguage("en")` → 모든 Label/Sprite 즉시 업데이트
4. **cheat.js 연동**: `window.LocalizationManager` 전역 노출, 언어 변경 치트 메뉴

### 이미지 로컬라이징

- `LocalizationManager.localizeSprite()` 지원
- `@img:` 접두사로 키 식별
- `imageLocalizationData`에 언어별 이미지 경로 매핑

---

## 주의사항 / 특이점

### 1. 중국산 수박게임 베이스

원본 프로젝트는 중국어로 개발된 "合成大西瓜 (Merge Big Watermelon)" 클론이다. 코드 주석과 변수명이 대부분 중국어이며, `package.json`의 `name`은 여전히 `MergeBigWatermelon`이다. `project.json`의 `version`은 `2.4.13`으로 남아 있어 CC 2.x에서 3.x로 마이그레이션된 프로젝트임을 시사한다 (별도 `migrate-canvas.ts` 존재).

### 2. 비활성 SDK 레거시

WeChat(`wx/`), Douyin/TikTok(`dy/`), KuaiShou(`ks/`) SDK 코드가 주석 처리된 채 남아 있다. 현재는 Hi5 SDK만 사용하지만, 중국 플랫폼 배포 흔적이 코드 전반에 산재한다.

### 3. 물리 엔진 주의점

- Box2D 기반 2D 물리 사용 (`RigidBody2D`, `CircleCollider2D`, `PolygonCollider2D`)
- 과일 합성 시 중복 충돌 방지를 위해 `isMerging` 플래그 사용
- `gravityScale=8`, `linearDamping=0.5`, `angularDamping=0.5` 로 물리 감쇠 설정
- 과일 개수가 많아지면 물리 연산 부하 발생 가능

### 4. BaseViewCmpt 자동 바인딩

`BaseViewCmpt`는 `onLoad` 시 모든 하위 노드를 순회하여 `viewList` Map에 경로 기반으로 저장한다. `Button` 컴포넌트가 있는 노드는 `onClick_{노드명}` 메서드가 있으면 자동 바인딩된다. 이는 편리하지만, 노드 이름 변경 시 조용히 바인딩이 끊어질 수 있다.

### 5. 사운드 파일 목록

| 파일 | 용도 |
|------|------|
| background.mp3 | BGM |
| button_click.mp3 | 버튼 클릭 |
| merge.mp3 | 과일 합성 |
| drop.mp3 | 과일 드롭 |
| put.mp3 | 과일 배치 |
| win.mp3 / lose.mp3 | 승리/패배 |
| combo_*.mp3 | 콤보 (good/great/cool/excellent/perfect) |
| coinin.mp3 / coinout.mp3 | 골드 획득/소비 |
| Full.mp3 | 게임 오버 경고 |
| tool_cz.mp3 / tool_refresh.mp3 | 도구 사용 |
| trash.mp3 | 삭제 |
| spin_get.mp3 | 가챠/룰렛 획득 |
| unlock.mp3 | 해금 |
| goaldfly.mp3 / goaldone.mp3 | 골드 애니메이션 |

### 6. 플랫폼별 분기

- `window['Hi5'].getPlatform() === 'google'` 인 경우 홈 화면의 랭킹 버튼이 숨겨진다.
- SafeArea는 SDK에서 제공하는 `{top, bottom}` 값을 기반으로 UI Widget 오프셋을 조정한다.

### 7. 게임 앱 이벤트

- `Game.EVENT_SHOW`: 포그라운드 복귀 시 하트 타이머 복원
- `Game.EVENT_HIDE`: 백그라운드 진입 시 데이터 저장
- `beforeunload`: 브라우저 탭 닫기 시 동기 저장 시도

### 8. 과일 프리팹 구조

`resources/prefab/fruits/1~11.prefab`: 각 과일은 `gridCmpt` 컴포넌트가 부착된 물리 오브젝트. 이름(1~11)이 곧 타입 번호이며, `onLoad`에서 `+this.node.name`으로 타입을 결정한다. 합성 시 `type+1` 프리팹을 로드하여 새로 생성한다.
