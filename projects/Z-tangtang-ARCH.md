# Z-tangtang 아키텍처

## 프로젝트 개요

- **장르**: 서바이벌 액션 (Vampire Survivors 류)
- **엔진**: Cocos Creator 3.6.1 (TypeScript)
- **내부 코드명**: `mrtgd`
- **플랫폼**: WeChat 미니게임, Vivo, Hi5, 4399 등
- **핵심 루프**: 조이스틱 → 자동 전투 → 경험치 → 레벨업 스킬 선택 → 보스 처치 → 다음 맵
- **맵 타입**: 일반 맵(main) + 무한 층 타워(tower)

---

## 디렉토리 구조

```
assets/
├── hi5/                          # Hi5 SDK
├── localization/                 # CDN 기반 다국어
├── res/
│   ├── bullet/                   # 총알 프리팹 40종+
│   ├── design/                   # 기획 테이블 JSON (단일 파일)
│   ├── monster/                  # 몬스터 프리팹 24종
│   ├── layer/                    # UI 레이어 프리팹 (동적 로드)
│   ├── spine/                    # Spine 애니메이션
│   └── weapon/                   # 무기 프리팹
└── scripts/
    ├── game/
    │   ├── GameLaunch.ts         # 씬 루트 진입점
    │   ├── compoment/
    │   │   ├── item/
    │   │   │   ├── Player.ts     # 플레이어 엔티티
    │   │   │   ├── GameCtrl.ts   # 조이스틱 입력
    │   │   │   ├── bullet/       # Bullet + Bullet1~22·Bullet10xx (40종+)
    │   │   │   ├── monsters/     # Monster + Monster3~23 (15종+)
    │   │   │   ├── skill/        # Skill + Skill1~10
    │   │   │   └── weapon/       # Weapon + Weapon1~8
    │   │   ├── layer/            # UI 레이어 30+ 종
    │   │   └── sys/              # 전투 서브시스템 8종
    │   ├── manager/
    │   │   ├── eventManager.ts   # 커스텀 이벤트 버스
    │   │   ├── designManager.ts  # JSON 기획 테이블 파싱
    │   │   ├── layerManager.ts   # UI 레이어 생명주기·풀링
    │   │   ├── LetterboxManager.ts  # 해상도 레터박스
    │   │   └── resManager.ts     # Asset Bundle 비동기 로드
    │   └── model/
    │       ├── UserData.ts       # 영구 저장 플레이어 데이터
    │       ├── playerModel.ts    # 세션 상태
    │       └── mapModel.ts       # 전투 상태 허브
    └── tyqSDK/                   # TYQ 플랫폼 SDK (광고, 서버 통신)
```

---

## 핵심 모듈

### GameLaunch (진입점)
`BaseLayer` 상속. `layerManager`, `audioManager` 초기화 후 서버 메시지 수신(`GNetCmd` 열거값 분기).

### EventManager (이벤트 버스)
전역 싱글턴 pub-sub. sender 기준 중복 등록 방지, `offWithSender`로 컴포넌트 해제 시 일괄 정리.

| 이벤트 범위 | 도메인 |
|------------|--------|
| 101-125 | 공용 (레이어 열기, 조이스틱 등) |
| 1000-1999 | 플레이어 관련 |
| 2000-2999 | 맵/전투 관련 |

### MapModel (전투 상태 허브)
모든 서브시스템 참조 중앙 집중 싱글턴. 맵 진입 요청, 에셋 3개 병렬 로드, 카메라 줌 스케일 계산, 웨이브 레코드 필터링 담당.

### 전투 서브시스템 8종

| 클래스 | 역할 |
|--------|------|
| `MapSystem` | 맵 배경·타일·시간 진행 |
| `MonsterSystem` | 웨이브 스폰(0.1초 주기), 보스 관리 |
| `BulletSystem` | 총알 풀·발사·충돌 처리 |
| `WeaponSystem` | 무기 자동 공격 타이머 |
| `SkillSystem` | 패시브/액티브 스킬 발동 |
| `PropSystem` | 코인·경험치·장비 드롭 |
| `NumSystem` | 데미지 수치 텍스트 표시 |
| `HintSystem` | 이펙트 힌트 풀링 |

### LayerManager
- **풀링**: HomeLayer 등 6종을 destroy 없이 비활성화 후 재사용
- 레이어 열기 시 병렬 에셋 프리로드 후 연결
- `openSingleLayer`로 이미 열린 레이어 데이터만 갱신

### DesignManager
단일 `design.json`을 파싱하여 16개 테이블 (map, level, monster, weapon, bullet, skill, expLv, prop 등) 인덱스 사전 구성.

### LetterboxManager
9:16 타겟 비율 ±10% 초과 시 Graphics로 레터박스 오버레이. Safe Area(노치/펀치홀) 추가 고려.

---

## 데이터 흐름

```
GameCtrl (조이스틱)
  → eventManager.send(msgac.joystick, JoystickData)
  → Player.touchMove → 이동 벡터 적용

WeaponSystem / SkillSystem (타이머 기반 자동 발동)
  → BulletSystem.addBullet()
  → Bullet (BoxCollider2D 충돌)
  → Monster.takeDamage()

MonsterSystem (사망 처리)
  → PropSystem.dropProp() → 경험치/코인 드롭
  → Player 경험치 흡수 → 레벨업 조건 충족
  → SkillSelectLayer (스킬/무기 3선택 UI)

세이브 흐름
  → eventManager.send(msgac.saveDataBefore)
  → playerModel + mapModel.getSaveData()
  → UserData 갱신 → localStorage (5분 자동 저장)
```

---

## 개발 이력 요약

| 커밋 시기 | 내용 |
|-----------|------|
| 초기 (1~6) | CDN 다국어 시스템 구축, 버그 수정 |
| 중기 (8~9) | Hi5 SDK v1.0.12 대규모 통합 |
| v0.2.x 시리즈 | 0.2.0~0.2.10 점진적 기능 추가 |
| 후기 | cheat.js 바텀시트 통합, 광고 오디오 버그 수정, 에너지 충전 개선 |

---

## 기술적 특이사항

### 번호 기반 파생 클래스 구조
Bullet(40종+), Monster(15종+), Weapon(8종), Skill(10종) 모두 숫자 ID로 개별 TypeScript 파일 분리. 기획 테이블 `prefab` 경로와 1:1 대응. 기획 추가 시 코드 충돌 최소화.

### Vec3 캐시 패턴
`Monster`, `Bullet` 클래스에 `vec3Obj` 멤버 선언으로 매 프레임 `new Vec3()` 할당 회피. 모바일 GC 부하 절감.

### 물리 충돌 비트마스크 설계
`PLAYER_BULLET`(1<<3)과 `PLAYER_BULLET2`(1<<7) 분리로 관통/비관통 총알 속성 처리.

### 레이어 풀링 선택적 적용
전체 30+ 레이어 중 빈번히 열리는 6종만 풀링. 메모리↔로드 성능 트레이드오프 명시적 관리.

### 웨이브 휴식 시스템
`WAVE_INTENSITY_THRESHOLD=120` 몬스터 누적 후 `WAVE_REST_DURATION=2.0초` 휴식 삽입으로 난이도 곡선 조율.

### 코드 언어 혼재
원작 중국어 주석 유지 + 한국어 팀 인수 후 한국어 주석 혼재. 클래스명/변수명은 영어 일관.
