# Parkour 아키텍처

## 프로젝트 개요

- **장르**: 2D 사이드스크롤 러너 (자동 달리기 + 장애물 회피)
- **엔진**: Cocos Creator 2.4.13 (TypeScript)
- **모드**: Normal(스테이지 클리어) + Infinite(무한 달리기)
- **플랫폼**: WeChat, QQ, TikTok, Hi5

---

## 디렉토리 구조

```
assets/
├── framework/                    # 재사용 공통 프레임워크
│   ├── core/                     # DataCenter, FSM, PoolManager, Signal, Event
│   ├── fizzx/                    # 커스텀 물리 엔진 (Quadtree 기반)
│   │   ├── fizz.ts               # 물리 루프 (정적/동적/키네마틱 바디)
│   │   ├── shapes.ts             # 충돌 형상 정의
│   │   └── components/           # FizzBody, FizzHelper, PlayerController
│   ├── extension/
│   │   ├── buffs/                # 범용 버프 시스템
│   │   ├── sdks/                 # WeChat/QQ/TikTok SDK 어댑터
│   │   └── tilemap/              # TMX 맵 스트리밍 (MapLoader, TmxLayerWalker)
│   └── Hi5/                      # Hi5 SDK + LocalizationManager
└── Game/Script/
    ├── common/                   # GameConfigs, PersistNode, ResolutionManager
    ├── data/                     # PlayerInfo (DataCenter 기반)
    ├── game/
    │   ├── Game.ts               # 게임 루트 컨트롤러 (씬 진입점)
    │   ├── Player.ts             # 플레이어 컴포넌트
    │   ├── behaviors/            # LevelMode, InfiniteMode, 버프 모듈
    │   ├── model/                # CSV 데이터 모델 클래스
    │   └── objects/              # Item, Obstacle, Pet
    └── ui/                       # 팝업 UI (29종)
```

---

## 핵심 모듈

### Game (게임 루트)
싱글턴(`Game.instance`). TMX 맵 로드/세그먼트 스트리밍, FizzX 충돌 레이어 생성, 게임 상태 FSM 운영.

FSM: `Run ↔ Pause → Resume(3초 카운트다운) → Run`, `Run → Stop → End`

### Player
`FizzCollideInterface` 구현. 자체 FSM(Normal/Scaling)과 스킬 FSM(CD/Ready) 별도 보유.
- `controller`: 점프/이동/슬라이드 물리 제어
- `buffSystem`: 버프/스킬 실행
- `gun`: 투사체 발사

사망: `pdata.hp=0` → 1.5초 후 → `UIRevive` 또는 `UIFail`

### PlayerInfo (DataCenter)
`@dc("pdata")` / `@field()` 데코레이터로 로컬 스토리지 자동 직렬화. 전역 `pdata`로 접근.

### FizzX 물리 엔진
Cocos 내장 Box2D 대신 커스텀 경량 2D 물리 라이브러리. Quadtree/HashBounds 두 가지 브로드 페이즈 지원. 원웨이 플랫폼, 중력 방향 전환, 키네마틱 바디 직접 구현.

### BuffSystem
등록 → 시작 → 일시정지/재개/중지 라이프사이클 프레임워크.

| 버프 | 효과 |
|------|------|
| `magnet` | 아이템 자석 흡수 |
| `strong` | 거인화 (히트박스 2배) |
| `rush` | 속도 부스트 |
| `star` | 무적 |
| `shield` | 실드 |
| `fire/fire3` | 투사체 스킬 |
| `the_undead` | 사망 후 대시 |

### LevelMode / InfiniteMode
- **LevelMode**: CSV `Level` 테이블에서 세그먼트 배열 순차 로드, 완료 시 `endTrigger` 배치
- **InfiniteMode**: 1초 주기로 TMX 남은 수 체크, 2개 이하면 새 세그먼트 비동기 로드. 확률 기반 showtime 이벤트 삽입

### 데이터 모델 (CSV 기반)

| 파일 | 설명 |
|------|------|
| `LevelData` | 레벨 정의 (세그먼트 목록, 보상) |
| `HeroData` | 영웅 스탯, 스킬, 무기 |
| `PetData` | 펫 스탯, 레벨별 데이터 |
| `ItemData` | 아이템 정의 및 버프 |
| `WeaponData` | 무기 속도, 데미지, 투사체 |

---

## 데이터 흐름

```
LoadingScene → Game.start()
  → pdata.enterGame() → hp/score 초기화
  → loadMap()
    → PoolSpawner 프리로드 (몬스터 15종)
    → TMX 맵 로드 → 충돌 레이어 생성
    → Player.set(heroId) → 스켈레톤 교체
    → equipPet(petId)
  → LevelMode 또는 InfiniteMode 추가
  → FSM.changeState(Run)

update_Run() (매 프레임)
  → player.move() → PlayerController.move(xMove)
  → 화면 밖 TMX 노드 제거

pdata.hp = 0
  → PlayerDeadDetector → Player.handleDead()
  → 1.5s → pdata.endGame() → UIRevive/UIFail
```

---

## 개발 이력 요약

| 시기 | 내용 |
|------|------|
| 초기 | 프로젝트 기반, 로컬라이징 시스템 구축 |
| 중기 | Hi5 SDK 통합 (v1.0.12), CDN 다국어 |
| v0.1.2 | ResolutionManager(반응형 해상도) 추가 |
| 후기 | 맵/설정/텍스처 대규모 업데이트, cheat.js 통합 |

---

## 기술적 특이사항

### 커스텀 물리 엔진 (FizzX)
Cocos 2.x 내장 Box2D 대신 자체 제작. Quadtree/HashBounds 두 종류 공간 분할, 원웨이 플랫폼(TMX 속성 `platform==2/3`), 키네마틱 날아오는 몬스터 직접 구현.

### DataCenter 패턴
`@dc` / `@field` 데코레이터 기반 자체 데이터 레이어. `pdata.save("gold")`처럼 필드 단위 선택적 영속화.

### SortedCursorLayer
화면 밖 오브젝트를 커서 인덱스로 추적해 O(n) 탐색 없이 폐기. 버프 활성화 시 `startIndex` 스냅샷으로 버프 이전/이후 오브젝트 구분.

### 멀티플랫폼 SDK 추상화
`SDKInterface` 기준으로 WeChat, QQ, TikTok 설정 분리. Hi5는 `Hi5.ts`를 통해 `GameStart/End/submitScore/SaveData` 호출.

### 에디터 자동화 스크립트
`update_labels.js`, `replace_*.js` 등 30여 개의 일회성 에디터 자동화 스크립트. 씬/프리팹 대량 수정을 JSON 조작으로 처리한 개발 편의 도구.
