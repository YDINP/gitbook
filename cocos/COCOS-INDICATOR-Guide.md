# Cocos Indicator — 로딩 인디케이터 컴포넌트

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

Cocos Creator 2.x / 3.x 프로젝트에 재사용 가능한 로딩 인디케이터 컴포넌트를 추가한다.
씬 전환 및 리소스 로딩 시 로딩 화면 표시에 사용한다.

---

## 파일 위치

```
~/.claude/skills/cocos-indicator/
├── cocos2x/
│   ├── indicator.js          (CC 컴포넌트 — 회전 애니메이션)
│   └── indicatorManager.js   (싱글톤 매니저)
└── cocos3x/
    ├── images/               (로딩 스프라이트)
    ├── prefab/               (indicator.prefab)
    └── scripts/
        ├── indicator.ts
        └── indicatorManager.ts
```

---

## Cocos Creator 2.x

### Step 1 — 파일 복사

```bash
cp ~/.claude/skills/cocos-indicator/cocos2x/indicator.js <프로젝트>/assets/scripts/
cp ~/.claude/skills/cocos-indicator/cocos2x/indicatorManager.js <프로젝트>/assets/scripts/
```

### Step 2 — 프리팹 구성

Cocos Creator 에디터에서:
1. 빈 노드 생성 → `indicator` 스크립트 컴포넌트 추가
2. 자식 노드 `loading` 추가 후 로딩 스프라이트 설정
3. 프리팹으로 저장: `assets/resources/prefab/ui/indicator.prefab`

### Step 3 — 스크립트에서 제어

```js
const IndicatorManager = require('indicatorManager');

// 로딩 시작
IndicatorManager.show(parentNode, function() {
    console.log('indicator shown');
});

// 로딩 완료
IndicatorManager.hide();

// 표시 여부 확인
IndicatorManager.isShowing(); // boolean
```

---

## Cocos Creator 3.x

### Step 1 — 파일 복사

```bash
cp -r ~/.claude/skills/cocos-indicator/cocos3x <프로젝트>/assets/Indicator
```

### Step 2 — 프리팹 인스턴스화

Cocos Creator 에디터에서:
1. `assets/Indicator/prefab/indicator.prefab`을 씬에 드래그
2. 루트 노드에 `Indicator` 컴포넌트 연결 확인

### Step 3 — 스크립트에서 제어

```ts
import { Indicator } from './Indicator/scripts/indicator';

// 로딩 시작
Indicator.instance.show();

// 로딩 완료
Indicator.instance.hide();

// 진행률 표시 (0~1)
Indicator.instance.setProgress(0.5);
```


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->