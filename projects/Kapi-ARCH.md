# Kapi 아키텍처

## 프로젝트 개요

- **장르/유형**: PvZ(Plants vs. Zombies) 스타일 타워 디펜스 — 카피바라 테마 모바일 게임
- **엔진/기술 스택**: Cocos Creator 2.x, JavaScript (ES5 스타일 cc.Class), TypeScript 일부, Spine 스켈레탈 애니메이션, Hi5 SDK
- **개발 규모**: 44 커밋, 단일 브랜치 개발

---

## 디렉토리 구조

```
assets/
├── _script/              # 전역 싱글턴 및 공유 유틸리티
│   ├── RuntimeData.js        # 게임 세션 상태 전역 객체 (cc.pvz.runtimeData)
│   ├── GameConfig.js         # 게임 상수/enum 정의 (cc.pvz.GameConfig)
│   ├── Subpub.js             # 자체 구현 Pub/Sub 이벤트 버스
│   ├── PopupManager.js       # 팝업 스택 관리
│   ├── LocalizationManager.js
│   ├── SoundManager.js
│   ├── Pool.js               # 오브젝트 풀링
│   └── AdUtils.js
├── game/_script/         # 전투 씬 전용 스크립트
│   ├── GameHub.js            # 씬 최상위 오케스트레이터
│   ├── game.js               # 전투 루프 컨트롤러
│   ├── game1.js              # 배치 화면(bag) 컨트롤러
│   ├── Hero.js               # 영웅(식물) 컴포넌트
│   ├── Enemy.js              # 적(좀비) 컴포넌트
│   ├── Bullet.js             # 투사체 컴포넌트
│   ├── Block.js / BlockRoot.js  # 배치 격자
│   ├── BuffItem.js           # 버프 아이템 UI
│   └── UIGame*.js
├── mainUI/_script/       # 메인 메뉴 및 외부 UI
│   ├── MainUI.js / LevelMap.js
│   ├── UIShop.js / UIFund.js
│   ├── UITask.js / UISign.js
│   └── UIRank*.js
├── rank/_script/         # 랭크 모드 전용 UI
├── game2/_script/        # 랭크 전투 씬 (별도 모드)
├── game/config/          # 레벨 데이터 (JSON)
│   ├── Level1~18.json / Level1B.json
│   ├── TiaoZhanLevel1~2.json # 도전 레벨
│   └── GameBuff.json         # 버프 정의 테이블
├── actors/
│   ├── kapi/             # 영웅 Spine 에셋 (hero1~12)
│   └── Zombie/           # 적 Spine 에셋 (e1~e9)
└── Hi5/
    ├── Hi5.js / Hi5Crypto.js
```

---

## 핵심 모듈

### GameHub (씬 오케스트레이터)
전투 씬의 최상위 컨트롤러. `game1`(배치 화면)과 `game`(전투)을 소유하고, 두 컨트롤러에 서로의 참조를 주입하여 상호 통신 가능하게 한다.

### RuntimeData (세션 상태)
`cc.pvz.runtimeData`는 전역 싱글톤 객체로 전투 세션 전체 상태를 보유한다:
- mode (0=일반, 1=도전, 2=랭크), level, wave, money, anger, exp
- items[], buffs[], buffValues{}, stats[]
- Hi5 SDK + localStorage 이중 저장 방식

### Hero / Enemy 전투 엔진

- **Hero**: 영웅 ID별 12가지 공격 메커니즘을 `tryShoot()` switch문으로 분기. Spine IK 본(`findBone("IK")`)으로 발사 방향을 애니메이션에 실시간 반영
- **Enemy**: FSM 기반 이동(0) → 추적(1) → 공격(2) 상태 전환. ID 101~109는 보스 버전
- **버프 시스템**: 버프 ID = (영웅ID × 100) + 버프번호. `Math.floor(t / 100)`로 영웅 ID 추출

### 게임 모드

| 모드 | 코드 | 설명 |
|------|------|------|
| 0 | 일반 | 스토리 레벨 (Level1~18) |
| 1 | 도전 | 버프 스택 변형 레벨 |
| 2 | 랭크 | 무한 웨이브, 별도 game2 씬 |

### Pub/Sub 이벤트 버스
`Subpub.js`는 독자 구현된 발행-구독 패턴. `cc.butler.node`(EventTarget)와 병행하여 사용한다.

---

## 데이터 흐름

```
MainUI.js
  → 레벨 선택 → cc.pvz.runtimeData.init(mode, level) → 씬 전환

GameHub.js (씬 로드)
  ├── game1(bag) 초기화: 영웅 배치 UI → 배치 완료 → GameHub.startGame()
  └── game(전투) 시작
        ├── EnemySpawner: JSON 스케줄 기반 적 스폰
        ├── Hero.update() → tryShoot() → Bullet 생성
        ├── Bullet 충돌 → Enemy.hurtBy() → FSM 상태 변경
        ├── Enemy 사망 → doDieLogic() → 서브 유닛 스폰 (보스)
        └── 승리/패배 → runtimeData.saveData() (Hi5 SDK + localStorage)
```

---

## 개발 이력 요약

| 단계 | 내용 |
|------|------|
| 초기 | CC2.x 프로젝트 기반, Hi5 SDK 연동, 기본 전투 씬 구성 |
| 중기 | Hero/Enemy/Bullet 컴포넌트, 레벨 JSON 데이터 체계 |
| UI 확장 | MainUI, 상점, 임무, 출석, 랭크 시스템 |
| 모드 추가 | 도전 모드(TiaoZhan), 랭크 모드(game2) 씬 분기 |
| 버프 | GameBuff.json 기반 20+ 버프 / 도전 버프(actBuff1, actBuff2) |
| 최적화 | 다국어(LocalizationManager), Hi5 + localStorage 이중 저장 도입 |

---

## 기술적 특이사항

### cc.pvz 전역 네임스페이스
Cocos의 전역 `cc` 객체에 `pvz` 하위 네임스페이스 주입 (`cc.pvz.runtimeData`, `cc.pvz.GameConfig`). 모듈 시스템 없이 전역 공유하는 레거시 패턴.

### Spine IK 본 직접 제어
`spine.findBone("IK")` 또는 `spine.findBone("뼈")`로 본을 직접 조작하여 발사 방향 표현. 한국어 본 이름(`"뼈"`)이 혼재하는 것이 특징.

### 커스텀 타이머 시스템
`scene.setTimeout`, `scene.setInterval`을 통해 게임 타임스케일이 반영된 타이머 구현. `cc.pvz.time` 전역 변수가 게임 내 시간 기준.

### 보스 ID 체계
`enemy.id > 99` 조건으로 일반/보스 구분. 보스 사망 시 `subEnemys` 배열에서 하위 유닛을 스폰하는 연쇄 사망 메커니즘.

### 버프 ID 인코딩
버프 ID = (영웅ID × 100) + 버프번호. `checkBuff(t)` 내부에서 `Math.floor(t / 100)`으로 영웅 ID 추출하여 현재 영웅의 버프인지 검증.
