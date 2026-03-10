# FriendsTileMatch 아키텍처

## 프로젝트 개요

- **장르/유형**: 3-매치 타일 퍼즐 (Match-3 Tile Puzzle, "Layer Tile" 변형 — 마작패 스타일)
- **엔진/기술 스택**:
  - Cocos Creator 3.x (TypeScript)
  - 플랫폼 타겟: Web Mobile (Hi5 게임 플랫폼)
  - 번들러: esbuild (agents 서브시스템)
  - AI 에이전트: Anthropic SDK (`claude-sonnet-4-20250514`)
- **게임 버전**: v0.2.24 (프로젝트명: `51FriendsTileMatch`)
- **레벨 규모**: 40개 이상의 JSON 레벨 데이터 (백업 기준), TSV 통합 파일로 관리

---

## 디렉토리 구조

```
FriendsTileMatch/
├── assets/
│   ├── scripts/          # 핵심 게임 로직 (TypeScript)
│   │   ├── config/       # GameVersion 등 설정 상수
│   │   ├── data/         # gameConfig (전역 상태), enmus (열거/상수)
│   │   ├── res/          # loadRes (에셋 로더), loadPool (오브젝트 풀)
│   │   ├── untils/       # 유틸리티 (audioTool, tools, indicator, bsDonghuaTs 등)
│   │   ├── prepab/       # 프리팹 컴포넌트 (perBlock, editAction, 팝업 등)
│   │   └── AD/           # 광고 시스템 (adMgr, hi5Ad, adConfig)
│   ├── bundles/
│   │   ├── prefabs/      # Cocos 프리팹 에셋
│   │   ├── leveJson/     # 개별 레벨 JSON (구형 포맷)
│   │   ├── leveJson_backup/ # 개별 레벨 JSON 백업 (40개)
│   │   ├── newLevelJson/ # TSV 통합 레벨 파일 (levels.tsv, lazy loading 대상)
│   │   └── music/        # 오디오 에셋 (BGM 2개, 효과음 4개)
│   ├── localization/     # 다국어 지원 (LocalizationManager, CDN 지원)
│   ├── Hi5/              # Hi5 플랫폼 SDK (Hi5SDK.ts, Hi5Crypto.ts)
│   └── scenes/           # 씬 파일 (load, home, main)
├── agents/               # Claude AI 에이전트 서브시스템 (Node.js/TypeScript)
│   └── src/
│       ├── agents/       # 개별 에이전트 (code-review, qa, localization, level-design 등)
│       └── runners/      # 에이전트 실행기
└── extensions/
    └── cocos-mcp-server/ # Cocos Editor HTTP API 서버 확장
```

---

## 핵심 모듈

### 1. 씬 진입 흐름 (`loadView` → `homeView` → `mainView`)

**loadView**
- Hi5 SDK 초기화 후 초기 게임 데이터(레벨, 사운드 설정, 스킨) 수신
- Prefabs 번들, 레벨 TSV(현재 레벨 + 5개 버퍼), 폰트 리소스를 병렬 로드
- 로드 완료 시 `LoadEnd()` 메시지를 Hi5 SDK로 전송하고 `home` 씬으로 전환

**homeView**
- Audio 번들을 백그라운드 로드, `main` 씬 프리로드
- 최초 방문자에 한해 LocalizationManager 초기화 완료를 폴링하며 로딩 화면 표시

**mainView**
- URL 파라미터 `edit=true`로 내장 레벨 에디터 활성화
- 레벨 시작 시 다음 `PRELOAD_AHEAD=2`개 레벨 즉시 프리로드
- 레벨 클리어마다 전면 광고 카운터 증가 (2레벨마다 전면 광고 노출)

### 2. 3-레이어 타일 시스템

| 레이어 | 역할 |
|--------|------|
| Layer 1 | 타일 풀. 모든 타일이 스폰되는 메인 게임 영역 |
| Layer 2 | 임시 저장소. "이동하기" 아이템으로 슬롯바 타일을 최대 5개 이동 |
| Layer 3 | 7슬롯 바. 같은 타입 3개 연속 → 소거, 7개 채워지면 게임 오버 |

`layerRootAction`이 세 레이어를 조율하는 컨트롤러로, 클릭 큐잉 시스템(최대 3개)과 `window.gameDebugAPI` 노출을 담당한다.

### 3. 레벨 데이터 시스템

- TSV 파일 전체를 라인 배열로 1회 캐시 후 온디맨드 파싱
- 구글 스프레드시트(TSV export URL) 원격 로드 지원
- `custom` 컬럼 → `default` 컬럼 우선순위 파싱

### 4. 광고 시스템

- `adMgr`: 광고 호출 시 로딩 인디케이터 표시 + 사운드 일시정지, 완료 후 복원
- 3가지 아이템(이동하기/되돌리기/섞기)은 광고 시청 후 사용 가능

### 5. AI 에이전트 서브시스템 (`agents/`)

Anthropic SDK 기반 독립 Node.js 서브시스템:

| 에이전트 | 역할 |
|----------|------|
| LevelDesignAgent | 레벨 JSON 생성/검증/패턴 분석 |
| CodeReviewAgent | TypeScript 코드 품질 검토 |
| QAAgent | 기능 테스트 자동화 |
| LocalizationAgent | 다국어 텍스트 검증 |
| ResourceCheckAgent | 에셋 참조 무결성 확인 |

---

## 데이터 흐름

### 씬 전환

```
load 씬 → Hi5 SDK 초기화 + 최소 리소스 로드
home 씬 → Audio 백그라운드 로드, main 씬 프리로드
main 씬 → 레벨 플레이 중 백그라운드 레벨 순차 로드 (500ms 간격)
        → 레벨 클리어 → nextLevel() → 레벨++, 저장
        → 게임 오버 → 부활 팝업 또는 게임오버 팝업
```

### 타일 클릭 처리

```
사용자 터치
  → 애니메이션 중이면 clickQueue에 적재 (최대 3개)
  → cloneItem(): 원본 숨김, 클론 생성
  → showShadowOptimized(): 영향 범위 타일만 겹침 재계산
  → tween 0.15s 이동 애니메이션 → Layer3 슬롯 배치
  → 같은 타입 3개 연속 시 소거
  → Layer3 7개 이상이면 게임 오버
```

### 전역 상태

`gameConfig` 정적 클래스가 전역 싱글턴. Hi5 SDK `GameData` + `localStorage` 이중 백업으로 저장.

---

## 개발 이력 요약

| 단계 | 내용 |
|------|------|
| 초기 | 3레이어 타일 매치 게임 기본 구조 (단일 JSON 레벨) |
| 중기 | Hi5 플랫폼 통합 (SDK 래퍼, 광고 시스템) |
| 후기 | 레벨 데이터 고도화 (개별 JSON → TSV 통합 + 구글 시트 연동) |
| 최근 | 성능 최적화 (lazy loading, 백그라운드 레벨 로드), AI 에이전트 서브시스템 구축, 다국어(CDN), iOS 오디오 대응 |

---

## 기술적 특이사항

### 그림자(겹침) 시스템 최적화
타일 소거마다 전체 O(n²) 재계산을 피하기 위해 제거된 타일 위치에서 1.5배 반경 내 타일만 재검사하는 `showShadowOptimized()` 구현.

### TSV 기반 레벨 Lazy Loading
초기에 현재 레벨 + 5개만 파싱, 이후 500ms 간격 백그라운드 순차 로드로 초기 로딩 시간 단축.

### iOS AudioContext 제한 대응
`setupUserGestureUnlock()`, `saveAudioState()` / `restoreAudioState()` 구현. Safari 4-context 한계에 대응해 Fallback AudioContext 생성 카운터(최대 3회) 적용.

### Hi5 SDK 이중 저장소 패턴
Hi5 `GameData` + `localStorage` 동시 저장으로 초기화 타이밍 문제 방지. JSON 파싱 에러 감지 시 초기값 자동 리셋.

### 내장 레벨 에디터
URL 파라미터 `?edit=true`로 활성화. 15×16 고정 그리드 위에서 타일 배치 후 JSON 내보내기/가져오기 지원.
