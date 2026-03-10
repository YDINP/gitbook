# cheat.js — 웹 게임 디버그 UI 라이브러리

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

웹 게임(Cocos Creator, Unity WebGL 등)에 Shift+Click(PC) / 트리플탭(모바일)으로 열리는
디버그 바텀시트 UI를 추가하는 라이브러리.

---

## 파일 위치

```
~/.claude/skills/cheatjs/
├── cheat.js        (메인 소스, ES5 호환)
├── cheat.min.js    (프로덕션용 minified)
└── cheat.d.ts      (TypeScript 타입 선언)
```

---

## Step 1 — 파일 복사

```bash
# Cocos Creator 프로젝트
cp ~/.claude/skills/cheatjs/cheat.js <프로젝트>/assets/scripts/cheat.js

# TypeScript 타입 사용 시
cp ~/.claude/skills/cheatjs/cheat.d.ts <프로젝트>/assets/scripts/cheat.d.ts
```

---

## Step 2 — HTML에 로드 (웹 빌드)

```html
<script src="cheat.js"></script>
```

또는 Cocos Creator `build-templates/web-mobile/index.html`에 추가.

---

## Step 3 — 기본 초기화

```js
// 버튼 추가
cheat.add('God Mode', function() {
    player.hp = 99999;
});

// 설명 포함
cheat.add('Max Gold', [function() {
    player.gold = 999999;
}, '골드 최대치로 설정']);
```

---

## Step 4 — 그룹(탭) 구성

```js
cheat.addGroup('Player', {
    'God Mode': function() { player.hp = 99999; },
    'Max Gold': [function() { player.gold = 999999; }, '골드 최대'],
    'Speed x2': function() { player.speed *= 2; return true; } // 토글 ON
});

cheat.addGroup('Stage', {
    'Clear Stage': function() { game.clearStage(); return 'close'; },
    'Next Stage': function() { game.nextStage(); }
});
```

---

## Step 5 — Select 드롭다운

```js
cheat.add('Language', {
    type: 'select',
    options: ['Korean', 'English', 'Japanese'],
    default: 'Korean',
    onChange: function(value, index) {
        LocalizationManager.setLanguage(value);
    }
});
```

---

## Step 6 — 상태라인 (버전/환경 표시)

```js
cheat.statusline(function(opt) {
    return ['v' + APP_VERSION, IS_DEV ? 'dev' : 'prod'];
});
```

---

## 버튼 반환값 가이드

| 반환값 | 동작 |
|--------|------|
| `undefined` | 성공 피드백(초록) 후 복귀 |
| `true` | 토글 ON (파란 배경 유지) |
| `false` | 토글 OFF |
| `'close'` | 바텀시트 자동 닫기 |
| `{ backgroundColor: '#f00' }` | 커스텀 색상 유지 |

---

## 열기 제스처

- **PC**: `Shift + Click`
- **모바일**: 같은 위치에서 트리플 탭 (20px 반경)

---

## postMessage API (iframe/webview)

```js
// 외부에서 명령 실행
iframe.contentWindow.postMessage({
    type: 'cheat',
    action: 'God Mode'
}, '*');
```

---

## 완료 기준

- 게임 실행 중 제스처로 바텀시트 열림 확인
- 추가한 버튼 클릭 시 기능 정상 동작
- 그룹 탭 전환 정상 동작


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->