# FriendMatchPuzzle 아키텍처

## 프로젝트 개요

- **장르**: Match-3 퍼즐 (3매칭 교환 방식)
- **엔진**: Cocos Creator 3.8.6 (TypeScript)
- **플랫폼**: Hi5 (우선), WeChat Mini Game 지원
- **설계 해상도**: 720×1334 (SHOW_ALL 레터박스)
- **레벨 수**: 1,700개 이상

---

## 디렉토리 구조

```
assets/
├── Hi5/
│   ├── Hi5SDK.ts                 # iframe postMessage 기반 SDK
│   ├── Hi5Manager.ts
│   └── Hi5Helper.ts
├── script/
│   ├── core/                     # 싱글턴 매니저 집합 (App 파사드)
│   │   ├── app.ts                # 중앙 App 파사드 (GameApp 싱글톤)
│   │   ├── eventManager.ts       # 커스텀 이벤트 버스
│   │   ├── audioManager.ts       # 오디오 재생/대기열 관리
│   │   ├── viewManager.ts        # UI 뷰 스택 관리
│   │   └── i18nManager.ts
│   ├── game/
│   │   ├── mainCmpt.ts           # 루트 씬 진입점
│   │   ├── logic/
│   │   │   └── gameLogic.ts      # 핵심 게임 룰 (매칭, 폭탄, 힌트)
│   │   ├── ui/
│   │   │   ├── gameViewCmpt.ts   # 게임플레이 뷰 (그리드 렌더링, 입력, 승패)
│   │   │   ├── gridManagerCmpt.ts # 배경 격자 생성/관리
│   │   │   └── item/
│   │   │       ├── gridCmpt.ts   # 개별 타일
│   │   │       └── bombCmpt.ts   # 폭탄 이펙트
│   │   └── control/
│   │       └── screenRayCmpt.ts  # 전역 터치 입력 캡처
│   └── const/
│       ├── enumConst.ts          # Bomb, Constant, LevelData 열거형
│       ├── levelConfig.ts        # 레벨 JSON 로드·변환
│       └── eventName.ts
├── resources/config/             # 레벨 데이터 JSON (1.json ~ 1700+.json)
└── localization/LocalizationManager.ts
tools/localization-extractor/     # 로컬라이제이션 키 추출 빌드 도구
```

---

## 핵심 모듈

### App 파사드 (`core/app.ts`)
모든 매니저를 게터로 집약하는 중앙 싱글턴. `App.event`, `App.view`, `App.audio`, `App.gameLogic`, `App.hi5`로 접근. `onInit`에서 SHOW_ALL 설정 + iOS 26 WebKit gl.flush 워크어라운드 처리.

### GameLogic (순수 게임 룰)
- **폭탄 타입 판별** (`getBombType`): 4개 가로/세로/비정렬 → `Bomb.ver/hor`, 5개+ 일직선 → `Bomb.bomb`, 십자 → `Bomb.allSame`
- **힌트 탐색** (`checkTipsGroup`): 기준 타일 4방향 2칸까지 3-매치 가능 조합 탐색
- **타일 랜덤 할당** (`setupRandomTiles`): Fisher-Yates 셔플, challengeView-gameView 동기화 캐시
- **맵 형태 10종**: 하드코딩 hideList 배열, 11레벨 이후 랜덤 선택

### LevelConfig
`resources/config/{id}.json` 비동기 로드. 레거시 ID 매핑 변환(`handleIdArr`) + `m_ct` 합산 정규화. 1700 초과 시 `% 1700 + 1` 순환.

### gameViewCmpt (게임플레이 뷰)
9×9 그리드 렌더링, 터치 입력, 타일 교환 애니메이션, 매칭 판정, 폭탄 연쇄, 승패 처리. 주요 상태 플래그:
- `_isBombProcessing`: 폭탄 처리 중 터치 차단
- `_isSynergyChain`: 시너지 체인 중 사운드 억제
- `_deferredCheckResult`: flyItem 비동기 완료 후 결과 판정

### 이중 격자 구조
- `gridManagerCmpt` + `blockCmpt`: 시각적 배경 격자 (테두리, 비활성 셀)
- `gameViewCmpt` + `gridCmpt`: 실제 타일 (타입, 매칭, 폭탄 상태)
두 2D 배열을 인덱스(h, v)로 동기화.

### AudioManager
클립을 0.1초 간격 대기열로 순차 재생 (`startPlayAudioList` 재귀 비동기). 승리 시 즉시 재생.

### Hi5SDK
- `window.self !== window.top`으로 Hi5 플랫폼 감지
- `INIT_SDK`, `SAVE_DATA`, `SUBMIT_SCORE`, `SHOW_AD`, `BUY_ITEM` 등 양방향 postMessage
- JSON 파싱 오류 시 `GameData` 자동 리셋

---

## 데이터 흐름

```
mainCmpt.onLoad()
  → App.init() → Hi5Mgr.init() → openView(eLoadingView)
  → 레벨 선택 → openView(eGameView)

gameViewCmpt.initData(level)
  → LevelConfig.getLevelData(level) → handleIdArr() 변환
  → GameLogic.resetHdeList() + setupRandomTiles()
  → gridManagerCmpt.initGrid() → gameViewCmpt.initLayout()

screenRayCmpt → EventName.Game.TouchStart/Move/End
  → 타일 선택 → 인접 교환 애니메이션
  → 매칭 판정 → getBombType() → 타일 제거
  → 목표 카운트 감소 → 중력 낙하 → 신규 타일 생성
  → 이동 수 소진 또는 목표 달성 → 결과 판정
```

---

## 개발 이력 요약

| 단계 | 내용 |
|------|------|
| 초기 | WebSocket 서버 연동 구조 (`LLKNet`, 현재 `return;`으로 비활성화) |
| 전환 | 오프라인 Match-3 퍼즐로 재설계 |
| 이식 흔적 | 카카오 물리 기반 과일 합체 모드 (`fruitCmpt.ts`) 비활성 잔존 |
| WeChat 추가 | 친구 랭킹 뷰 (`game/rank/`) 통합 |
| Hi5 이전 | Hi5SDK v1.0.12 통합, 광고 콜백, JSON 데이터 리셋 |
| 최근 | 타일 타입 13종으로 확장, iOS 26 WebKit 워크어라운드 |

---

## 기술적 특이사항

### 레거시 ID 매핑 테이블
구 레벨 데이터 비표준 ID(50, 51, 100, 201, 400~423 등)를 현재 0~4 범위로 변환. 이전 레벨 에디터 호환성 유지 목적.

### 오디오 직렬화 대기열
`cc.AudioSource` 동시 재생 음원 끊김 방지. 0.1초 간격 재귀 순차 재생.

### 맵 형태 하드코딩
`GameLogic.defaultHidelist`에 0~9번 맵 형태가 `[h, v]` 좌표 배열로 정의. 11레벨 이후 `hideFullList`에서 랜덤 선택.

### WebSocket 비활성화
`net.ts` `init()` 첫 줄 `return;`으로 즉시 반환. 서버 연동 코드 전체 사문화.

### 다국어 도구 체인
`tools/localization-extractor/`: 씬 프리팹(.prefab) + 스크립트(.ts)에서 텍스트 키 추출 → JSON 생성. 프리팹/스크립트/주석 파서 파이프라인 구조.
