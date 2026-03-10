# Hi5 SDK PostMessage 문제 해결

## 문제 현상

Hi5 SDK iframe 환경에서 광고 호출 시 SDK가 응답하지 않음:
- `LOAD_AD` 메시지 전송 후 10초 타임아웃 발생
- Home 씬에서는 작동하지만 Main 씬으로 이동 후 모든 광고 실패
- 콘솔에서 `isRealPlatform: true`로 표시되지만 SDK 응답 없음

## 원인 분석

### 1. window.parent 오염 문제

Cocos Creator가 런타임에 `window.parent`를 `cc_Scene` 객체로 덮어씌움:

```
[Hi5] window.parent: cc_Scene {_name: 'Main', _objFlags: 0, ...}
[Hi5] window.parent.postMessage: undefined
```

이로 인해 `window.parent.postMessage()`가 함수가 아니게 되어 SDK와 통신 불가.

### 2. 메시지가 자기 자신에게 전송됨

`window.parent.postMessage` 실패 시 fallback으로 `window.postMessage` 사용:
- 메시지가 부모 창(SDK)으로 가지 않고 자기 자신에게 전송
- `tohi5action` 메시지가 자신에게 돌아옴 (SDK 응답인 `fromhi5action`이 아님)

```
[Hi5] Raw message received: {"tohi5action":"LOAD_AD","data":{"adGroupId":"reward"}}
```

## 해결 방법

### Hi5.ts 파일 수정

**핵심**: 모듈 로드 시점(Cocos Creator가 덮어씌우기 전)에 실제 `window.parent` 저장

```typescript
// Hi5 SDK 모듈 - Cocos Creator 호환 export

// 실제 window.parent 저장 (Cocos Creator가 덮어씌우기 전에)
const _realWindowParent = (typeof window !== 'undefined' && window.parent && typeof window.parent.postMessage === 'function')
    ? window.parent
    : null;

const _Hi5: any = {
    // ... 기존 코드 ...

    // PostMessage - 실제 window.parent 사용 (Cocos Creator가 덮어씌우기 전 저장된 값)
    PostMessage(action, data) {
        try {
            if (_realWindowParent) {
                _realWindowParent.postMessage({tohi5action: action, data: data}, "*");
            } else {
                window.postMessage({tohi5action: action, data: data}, "*");
            }
        } catch (e) {
            console.warn("[Hi5] PostMessage error:", action, e);
        }
    },

    // ... 기존 코드 ...
};
```

## 추가 수정 사항

### 1. onHi5Message 모듈 레벨로 이동 (LoadingScene.ts)

씬 전환 시 콜백 손상 방지:
- `this.hi5Initialized` 같은 인스턴스 참조 제거
- `setHi5Flag('hi5Initialized', true)` 처럼 window 객체에 플래그 저장

```typescript
// 모듈 레벨에 정의 (클래스 외부)
const onHi5Message = (data) => {
    if (data.fromhi5action === Hi5.MESSAGE.GAME_DATA) {
        setHi5Flag('hi5Initialized', true);  // window 객체에 저장
    }
    // ... 나머지 메시지 처리
};
```

### 2. window['Hi5'] 이중 등록 제거

FriendMaker 패턴 적용:
- 파일 끝에서 `window['Hi5'] = _Hi5` 제거
- `Init_GameData()`에서만 등록

```typescript
// 파일 끝 (제거됨)
// if (typeof window !== 'undefined') {
//     (window as any)['Hi5'] = _Hi5;
// }

// Init_GameData() 내부에서만 등록
Init_GameData(localGameData) {
    window['Hi5'] = this;
    // ...
}
```

### 3. 빌드 환경용 index.html 수정 (중요!)

**에디터에서는 작동하지만 빌드 후 업로드하면 안되는 경우:**

모듈 로드 타이밍이 빌드 환경에서 다를 수 있음.
`build-templates/web-mobile/index.html`에 Cocos 스크립트 로드 **전에** `window.parent`를 저장해야 함:

```html
<!-- Hi5 SDK Real Parent Saving (MUST be first, before Cocos overwrites window.parent) -->
<script type="text/javascript">
    // 실제 window.parent 저장 (Cocos Creator가 덮어씌우기 전에!)
    // Cocos Creator는 런타임에 window.parent를 cc_Scene 객체로 덮어씌움
    // 이 코드는 가장 먼저 실행되어야 함
    (function() {
        if (window.parent && typeof window.parent.postMessage === 'function') {
            window._hi5RealParent = window.parent;
            console.log('[Hi5] Real window.parent saved in index.html');
        } else {
            console.log('[Hi5] window.parent not available in index.html');
        }
    })();
</script>

<!-- 그 다음에 Hi5 Polyfill 및 Cocos 스크립트 -->
```

**Hi5.ts에서 fallback으로 사용:**

```typescript
PostMessage(action, data) {
    // 1차: 모듈 로드 시 저장된 값 시도
    if (_realWindowParent && typeof _realWindowParent.postMessage === 'function') {
        _realWindowParent.postMessage({tohi5action: action, data: data}, "*");
        return;
    }

    // 2차: index.html에서 저장된 값 시도
    const savedParent = (window as any)._hi5RealParent;
    if (savedParent && typeof savedParent.postMessage === 'function') {
        _realWindowParent = savedParent;
        _realWindowParent.postMessage({tohi5action: action, data: data}, "*");
        return;
    }

    // 모두 실패
    console.warn("[Hi5] No valid parent");
}
```

## 디버깅 팁

### PostMessage 체크

```typescript
PostMessage(action, data) {
    const isIframe = window.self != window.top;
    console.log("[Hi5] PostMessage - isIframe:", isIframe);
    console.log("[Hi5] window.parent:", window.parent);
    console.log("[Hi5] typeof postMessage:", typeof window.parent?.postMessage);
    // ...
}
```

### 메시지 수신 확인

```typescript
_OnMessage(event) {
    if (event.data && typeof event.data === 'object') {
        console.log('[Hi5] Raw message:', JSON.stringify(event.data).substring(0, 200));
    }
    // tohi5action = 게임→SDK (자기 메시지)
    // fromhi5action = SDK→게임 (SDK 응답)
}
```

## 관련 프로젝트 참조

| 프로젝트 | Hi5 파일 | 특징 |
|---------|---------|------|
| Kapi | `assets/Hi5/Hi5.js` | JavaScript, 가장 단순 |
| FriendMaker | `assets/script/game/Hi5.ts` | TypeScript, 이중 등록 없음 |
| FriendsTileMatch | `assets/Hi5/Hi5SDK.ts` | 클래스 기반 싱글톤 |
| Parkour | `assets/framework/Hi5/Hi5.ts` | TypeScript, 수정 필요 |

## 적용 프로젝트

- **Parkour (49FriendsRunner)**: 2025-01-30 수정 완료

---

*작성일: 2025-01-30*


---

## 적용 결과

> 해결 후 확인된 동작, 스크린샷, 로그 등을 첨부합니다.

<!-- TODO: 작성 필요 -->