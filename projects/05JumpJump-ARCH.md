# 05JumpJump 아키텍처

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | JumpJump (05JumpJump) |
| 엔진 | Cocos Creator 3.7.1 |
| 언어 | TypeScript |
| 현재 버전 | 0.0.7 (2026-02-20) |
| 장르 | 하이퍼캐주얼 점프 게임 |
| 플랫폼 SDK | Hi5 — 광고, 랭킹, 결제, 다국어 통합 |

위챗 미니게임 스타일의 점프 게임. 원작 코드베이스(중국 개발자)를 기반으로 Hi5 플랫폼 SDK 통합, QA 수정, 광고 수익화, 이어하기(부활) 시스템이 추가된 구조.

---

## 디렉토리 구조

```
assets/resources/scripts/
├── MainCtl.ts            # 메인 컨트롤러 (Canvas 최상위)
├── LogicCtl.ts           # 게임 루프 / 박스 생성 / 점프 처리
├── HeroCtl.ts            # 영웅 이동·애니메이션·충돌 판정
├── BoxCtl.ts             # 박스 프리팹 관리 / 착지 영역 판별
├── HeroColliderCtl.ts    # 물리 충돌 감지 (step score 계산)
├── GameData.ts           # 전역 상태·점수·부활 횟수 (정적 클래스)
├── EventDispatcher.ts    # 전역 이벤트 버스 (싱글턴)
├── OverCtl.ts            # 게임오버 / 이어하기 / 다시하기 UI
├── SoundCtl.ts           # BGM·SFX 관리 + iOS 오디오 복구
├── iOSAudioHelper.ts     # iOS AudioContext 복구 헬퍼
├── RankCtl.ts            # 랭킹 UI
├── DebugCtl.ts           # 치트 / 디버그 컨트롤 (개발용)
├── BMConfig.ts           # 광고·결제 ID 설정 레지스트리
├── GameVersion.ts        # 버전 관리 + 웹 타이틀 동기화
├── JumpTo.ts             # jump_to() 커스텀 트윈 확장
├── Hi5.ts                # Hi5 SDK 래퍼
└── Hi5Helper/i18n/
    ├── Hi5Lang.ts / Hi5Lang_Lable.ts / Hi5Lang_Sprite.ts
    └── langs/ ko.ts / en.ts / zh.ts
```

---

## 핵심 모듈

### GameData (전역 상태)
순수 정적 클래스. 인스턴스화 없이 모든 스크립트에서 직접 참조.

| game_state | 의미 |
|------------|------|
| -1 | 로비 자동 점프 중 |
| 1 | 플레이 대기 (터치 입력 수신) |
| 2 | 터치 누름 (충전 중) |
| 3 | 점프 비행 중 |
| 4 | 게임 오버 |

점수: 일반 착지 → 1점, 정중앙 착지 → 이전 점수 × 2 (연속 보너스).

### LogicCtl (게임 루프)
- 터치 시간 × 480으로 점프 거리 계산 (deltaTime 누적, 프레임레이트 독립)
- 박스 최대 5개 유지 (`step_clear`)로 draw call 절감
- `REVIVE_GAME` 수신 시 영웅을 마지막 착지 위치로 복원

### HeroCtl (영웅 물리·연출)
- 충전 중: scaleY 감소(min 0.8), scaleX 증가(max 1.2) 압축 효과
- 착지 0.2s 후 그림자 복원 시작 (AABB 기반 사전 예측)
- 파티클: 충전 중 볼 수렴(30개), 착지 성공 시 방사(30개)

### BoxCtl (박스 관리)
박스 프리팹에 27종 자식 노드를 내장, 생성 시 무작위로 1개만 `active=true`. `is_point_in_landing_zone()`으로 AABB + 15px 마진 착지 예측.

### 이벤트 버스

| 이벤트 | 발행자 | 구독자 | 목적 |
|--------|--------|--------|------|
| `UPDATE_SCORE_LABEL` | LogicCtl | MainCtl | 점수 UI 갱신 |
| `GAME_END` | LogicCtl | MainCtl | 게임 종료 |
| `START_GAME` | OverCtl | MainCtl | 재시작 |
| `REVIVE_GAME` | OverCtl | LogicCtl | 이어하기 부활 |

### 광고 (BMConfig)

| 광고 키 | 종류 | 트리거 |
|--------|------|--------|
| `interstitial_game_end` | 전면 | EndPanel, 3회 플레이마다 |
| `reward_revive` | 리워드 | 이어하기 버튼 (라운드당 1회) |

---

## 데이터 흐름

```
터치 시작 → LogicCtl.touch_start()
  → update()에서 touch_time += deltaTime
  → HeroCtl 압축 애니메이션

터치 종료 → LogicCtl.touch_end()
  → HeroCtl.jump_by_box(target_box, touch_time)
  → 착지 후 _handleJumpResult(score)
    ├── score > 0 → 점수 누적 → 다음 박스 생성 → 화면 스크롤
    └── score ≤ 0 → GAME_END
                  → canRevive() → ContinuePanel
                  → !canRevive() → EndPanel + 전면 광고

이어하기 → 리워드 광고 성공 → REVIVE_GAME
  → LogicCtl.revive_game()
  → 영웅 위치 복원 (Tween.stopAllByTarget 후)
  → state = 1 복귀
```

---

## 개발 이력 요약

| 버전 | 핵심 변경 |
|------|----------|
| 0.0.0 | 초기 버전 (SDK 광고, 다국어 기반) |
| 0.0.1 | QA 3건: 전면광고, 이어하기 리워드, i18n 개선 |
| 0.0.2 | 전면광고 EndPanel 타이밍 수정, play_count 통일 |
| 0.0.3 | 초기 폰트 깜빡임 수정, cheat.min.js |
| 0.0.4 | 점프 거리 기기 통일(deltaTime), iOS BGM 복구, 백그라운드 처리 |
| 0.0.5 | 충전/비행 중 버튼 입력 차단 |
| 0.0.6 | iOSAudioHelper 모듈, 그림자 연출 개선 |
| 0.0.7 | AABB 기반 착지 예측 정밀화, iOS SFX 복구 |

---

## 기술적 특이사항

### jump_to() 커스텀 트윈
Cocos 3.x 기본 tween에 없는 포물선 점프를 Node 프로토타입 확장(`JumpTo.ts`)으로 구현. `this.node.jump_to(target, height, duration)` 형태.

### 충돌 판정 폴링 방식
물리 이벤트 방식이 아닌, 비행 중 `hero_collider` 비활성화 → 착지 후 0.1s 지연 후 결과 읽기. 착지 직전 AABB 예측으로 시각 지연 최소화.

### iOS 오디오 이중 복구
BGM은 `HTML5 Audio` fallback, SFX는 `AudioContext.resume()`. `game.EVENT_SHOW`와 `visibilitychange` 두 경로 모두 처리.

### 이어하기 복원 안전성
`Tween.stopAllByTarget()`으로 진행 중 트윈 전부 중단 후 위치 복원. z-order도 최상위로 명시적 복원.

### 코드 계층 혼용
원작 중국어 주석 유지 → 한국어 주석(추가 기능) → 영문 태그(`QA-FIX-001~003`, QA 수정)로 3계층이 명확히 구분.
