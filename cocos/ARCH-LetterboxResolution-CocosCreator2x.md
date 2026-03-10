# ARCH: Letterbox 해상도 대응 — Cocos Creator 2.x

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

> 작성일: 2026-03-10
> 적용 프로젝트: 102-color-ball-sort
> 대상 엔진: Cocos Creator 2.4.x (TypeScript)

---

## 목적

다양한 기기 해상도(세로 긴 폰, 아이패드형 정사각, 가로 모드 등)에서
**디자인 해상도를 유지하면서 비율을 보존**하고, 남는 공간은 검정 레터박스로 채운다.

---

## 핵심 원리

### CC2.x Canvas 컴포넌트 fitWidth/fitHeight 실제 동작

| fitWidth | fitHeight | 실제 ResolutionPolicy |
|----------|-----------|----------------------|
| true     | false     | FIXED_WIDTH          |
| false    | true      | FIXED_HEIGHT         |
| true     | true      | **NO_BORDER** (꽉 채움, 짤림 발생) ⚠️ |
| false    | false     | FIXED_HEIGHT (기본)   |

> **주의**: `fitWidth + fitHeight = true`는 `SHOW_ALL`이 아니라 `NO_BORDER`다.
> `SHOW_ALL`은 Canvas 컴포넌트로 설정 불가 — 코드에서 직접 설정해야 한다.

---

## 구현 방법

### 1. `GameEntry.ts` (또는 루트 컴포넌트 `start()` 최상단)

```typescript
start() {
    cc.view.setResolutionPolicy(cc.ResolutionPolicy.SHOW_ALL);
    // ... 이후 초기화 코드
}
```

Canvas 컴포넌트가 `onLoad()`에서 policy를 설정하므로,
`start()`에서 덮어쓰면 항상 SHOW_ALL이 최종 적용된다.

### 2. `settings/project.json`

```json
{
  "design-resolution-width": 640,
  "design-resolution-height": 1136,
  "fit-width": false,
  "fit-height": true
}
```

### 3. `assets/main/game.fire` (Canvas 컴포넌트)

```json
"_fitWidth": false,
"_fitHeight": true
```

> `project.json`과 `game.fire`는 에디터 표시용 설정.
> 런타임은 `cc.view.setResolutionPolicy(SHOW_ALL)`이 우선 적용된다.

### 4. `build-templates/web-mobile/index.html`

```html
<style>
  * { margin: 0; padding: 0; }
  html, body {
    width: 100%; height: 100%;
    background: #000; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  canvas { display: block; }
</style>
```

- `body` flexbox 중앙 정렬 → 캔버스가 화면 중앙에 배치됨
- `background: #000` → 남는 공간이 검정 레터박스로 표시됨
- `overflow: hidden` → 스크롤 방지

---

## 동작 예시

| 기기 | 화면 해상도 | 게임 표시 크기 | 레터박스 방향 |
|------|------------|--------------|-------------|
| 일반 스마트폰 (9:16) | 360×640 | 360×640 | 없음 (딱 맞음) |
| 긴 스마트폰 (9:19.5) | 390×844 | 390×693 | 상하 레터박스 |
| iPad (3:4) 세로 | 768×1024 | 577×1024 | 좌우 레터박스 |
| iPad (4:3) 가로 | 1024×768 | 432×768 | 좌우 레터박스 |

SHOW_ALL은 항상 작은 scale을 선택하므로 절대 짤리지 않는다.
`scale = min(screenW / designW, screenH / designH)`

---

## 적용 체크리스트

- [ ] `GameEntry.start()` 맨 앞에 `cc.view.setResolutionPolicy(cc.ResolutionPolicy.SHOW_ALL)` 추가
- [ ] `build-templates/web-mobile/index.html` CSS — body flexbox + background #000
- [ ] `settings/project.json` — fit-width: false, fit-height: true
- [ ] `assets/main/game.fire` — _fitWidth: false, _fitHeight: true

---

## 레터박스 색상 변경

`index.html`의 `body { background: #000; }` 값을 변경하면 된다.

```css
body { background: #1a1a2e; }  /* 어두운 남색 */
body { background: #2d2d2d; }  /* 진한 회색 */
```

---

## 관련 파일 (102-color-ball-sort 기준)

| 파일 | 역할 |
|------|------|
| `assets/scripts/modules/GameEntry.ts` | SHOW_ALL 정책 적용 |
| `build-templates/web-mobile/index.html` | CSS 레터박스 레이아웃 |
| `settings/project.json` | 에디터 해상도 설정 |
| `assets/main/game.fire` | Canvas 컴포넌트 설정 |


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->