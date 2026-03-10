# iOS 오디오 이슈 해결 가이드

Cocos Creator 3.x 프로젝트에서 iOS 앱이 백그라운드로 갔다가 복귀할 때
오디오가 재생되지 않는 문제를 해결하는 구현 가이드.

---

## 모듈화된 코드

| 파일 | 설명 |
|------|------|
| `templates/iOSAudioHelper.ts` | 독립 모듈 - 복사해서 사용 |
| `templates/INTEGRATION.md` | 통합 가이드 |

### 빠른 적용 방법

1. `iOSAudioHelper.ts`를 프로젝트에 복사
2. 오디오 매니저에서 import 및 초기화
3. `setupUserGestureUnlock()` 호출
4. 상세 내용은 `INTEGRATION.md` 참조

---

## 문제 원인

### iOS의 Web Audio API 제한

1. **AudioContext 상태 변화**
   - 백그라운드 진입 시: `running` → `interrupted` 또는 `suspended`
   - 포그라운드 복귀 시: AudioContext가 손상되어 resume() 실패
   - DOMException 발생: "The operation was aborted"

2. **iOS 제한사항**
   - AudioContext 인스턴스 최대 4개 제한
   - 사용자 제스처 없이 오디오 재생 불가
   - 백그라운드에서 AudioContext 자동 중단

3. **관련 WebKit 버그**
   - WebKit Bug #237878: AudioContext suspended on iOS backgrounding
   - WebKit Bug #263627: AudioContext resume fails after background

---

## 해결 전략

### HTML5 Audio Fallback

Web Audio API가 손상되면 HTML5 Audio (DOM Audio)로 대체한다.

```
백그라운드 → 포그라운드 복귀
         │
         ▼
    iOS 플랫폼 체크
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  iOS       기타 플랫폼
HTML Audio  AudioContext
Fallback    resume()
    │
    ▼
사용자 터치 대기
→ HTML Audio 재생
```

---

## 구현 가이드

### Step 1: 플랫폼 감지

```typescript
private isIOSPlatform(): boolean {
    return sys.isBrowser && sys.os === sys.OS.IOS;
}
```

### Step 2: 상태 변수 추가

```typescript
/** iOS에서 Cocos Audio 사용 불가 상태 */
private _iOSAudioDisabled: boolean = false;

/** iOS용 HTML Audio fallback */
private _htmlAudio: HTMLAudioElement | null = null;
private _usingHTMLAudio: boolean = false;

/** BGM 복구 필요 플래그 */
private _needsBGMRecovery: boolean = false;

/** 마지막으로 성공한 오디오 URL */
private _lastWorkingAudioUrl: string = '';

/** 백업용 AudioClip 참조 */
private _cachedClip: any = null;

/** 백그라운드 진입 전 재생 상태 */
private _wasPlayingBeforeBackground: boolean = false;
```

### Step 3: Visibility 이벤트 핸들러

```typescript
private setupVisibilityHandler() {
    // Document visibility
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            this.resumeAudioOnForeground();
        } else {
            this.pauseForBackground();
        }
    });

    // Window focus/blur
    window.addEventListener('focus', () => this.resumeAudioOnForeground());
    window.addEventListener('blur', () => this.pauseForBackground());

    // Safari bfcache
    window.addEventListener('pageshow', (e: PageTransitionEvent) => {
        if (e.persisted) this.resumeAudioOnForeground();
    }, { passive: true });

    // Cocos Game events
    game.on(Game.EVENT_SHOW, () => this.resumeAudioOnForeground());
    game.on(Game.EVENT_HIDE, () => this.pauseForBackground());
}
```

### Step 4: 백그라운드 진입 처리

```typescript
private pauseForBackground(): void {
    // HTML Audio 일시정지
    if (this._htmlAudio && !this._htmlAudio.paused) {
        this._htmlAudio.pause();
        this._wasPlayingBeforeBackground = true;
    }
    // Cocos BGM 상태 저장
    else if (this.bgmComp?.playing) {
        this._wasPlayingBeforeBackground = true;
    } else {
        this._wasPlayingBeforeBackground = false;
    }
}
```

### Step 5: 포그라운드 복귀 처리 (iOS)

```typescript
private async resumeAudioOnForeground(): Promise<void> {
    // Debounce 처리 (500ms)
    const now = Date.now();
    if (now - this._lastResumeTime < 500) return;
    this._lastResumeTime = now;

    if (this.isIOSPlatform()) {
        // Cocos Audio 비활성화
        this._iOSAudioDisabled = true;

        // 기존 Cocos BGM 정지 (에러 무시)
        try {
            if (this.bgmComp) {
                this.bgmComp.stop();
                this.bgmComp.clip = null;
            }
        } catch (e) { /* ignore */ }

        // HTML Audio가 있고 일시정지 상태면 재개 시도
        if (this._htmlAudio && this._htmlAudio.paused && this._wasPlayingBeforeBackground) {
            try {
                await this._htmlAudio.play();
                return; // 성공
            } catch (e) {
                // 실패 → 사용자 제스처 필요
            }
        }

        // 사용자 터치 대기
        this._needsBGMRecovery = true;
        return;
    }

    // 비-iOS: 기존 AudioContext resume 로직
    // ...
}
```

### Step 6: 사용자 제스처 기반 오디오 unlock

```typescript
public setupUserGestureUnlock(): void {
    if (!this.isIOSPlatform()) return;
    if (this._touchListenerAdded) return;
    this._touchListenerAdded = true;

    const onUserGesture = async () => {
        if (!gameConfig.isBgm) return;

        // HTML Audio가 이미 재생 중이면 스킵
        if (this._usingHTMLAudio && this._htmlAudio && !this._htmlAudio.paused) {
            return;
        }

        // 복구 필요 시 HTML Audio 재생
        if (this._iOSAudioDisabled || this._needsBGMRecovery) {
            await this.playBGMWithHTMLAudio();
        }
    };

    // Canvas에 리스너 추가 (중요!)
    const canvas = document.getElementById('GameCanvas')
        || document.querySelector('canvas')
        || document.body;

    canvas.addEventListener('touchstart', onUserGesture, { passive: true });
    canvas.addEventListener('touchend', onUserGesture, { passive: true });
    canvas.addEventListener('click', onUserGesture, { passive: true });

    // document에도 fallback 추가
    document.addEventListener('touchstart', onUserGesture, { passive: true });
}
```

### Step 7: HTML5 Audio로 BGM 재생

```typescript
private async playBGMWithHTMLAudio(): Promise<void> {
    try {
        // 기존 HTML Audio 정리
        if (this._htmlAudio) {
            this._htmlAudio.pause();
            this._htmlAudio.src = '';
            this._htmlAudio = null;
        }

        // 방법 1: 캐시된 clip에서 내부 audio element 복제
        const clipToUse = this._cachedClip || this.bgmComp?.clip;
        if (clipToUse) {
            const innerAudio = this.findInnerAudioElement(clipToUse);
            if (innerAudio?.src) {
                this._htmlAudio = innerAudio.cloneNode(true) as HTMLAudioElement;
                this._htmlAudio.loop = true;
                this._htmlAudio.volume = gameConfig.bgmVol;
                await this._htmlAudio.play();

                this._usingHTMLAudio = true;
                this._needsBGMRecovery = false;
                this._iOSAudioDisabled = false; // SFX용 Cocos 재활성화
                this.tryResumeForSFX();
                return;
            }
        }

        // 방법 2: 캐시된 URL 사용
        if (this._lastWorkingAudioUrl) {
            this._htmlAudio = new Audio(this._lastWorkingAudioUrl);
            this._htmlAudio.loop = true;
            this._htmlAudio.volume = gameConfig.bgmVol;
            await this._htmlAudio.play();
            // ... 상태 업데이트
            return;
        }

        // 방법 3: 새로 로드
        if (this._currentBgmName) {
            const clip = await loadRes.ins.getClip(this._currentBgmName);
            // ... clip에서 audio 추출 후 재생
        }

    } catch (e: any) {
        // AbortError는 정상 취소
        if (e?.message?.includes('abort')) return;
        this._needsBGMRecovery = true;
    }
}
```

### Step 8: AudioClip에서 HTMLAudioElement 찾기

```typescript
private findInnerAudioElement(clip: any): HTMLAudioElement | null {
    if (!clip) return null;

    // Cocos 3.x 내부 구조 탐색
    if (clip._audio instanceof HTMLAudioElement) return clip._audio;
    if (clip._player?._audio instanceof HTMLAudioElement) return clip._player._audio;
    if (clip._nativeAsset instanceof HTMLAudioElement) return clip._nativeAsset;

    // 재귀 탐색 (depth 3까지)
    const findAudio = (obj: any, depth: number = 0): HTMLAudioElement | null => {
        if (depth > 3 || !obj) return null;
        if (obj instanceof HTMLAudioElement) return obj;

        for (const key of Object.keys(obj)) {
            try {
                const val = obj[key];
                if (val instanceof HTMLAudioElement) return val;
                if (typeof val === 'object' && val !== null) {
                    const found = findAudio(val, depth + 1);
                    if (found) return found;
                }
            } catch (e) { /* ignore */ }
        }
        return null;
    };

    return findAudio(clip);
}
```

### Step 9: 효과음용 AudioContext resume

```typescript
private tryResumeForSFX(): void {
    try {
        const ctx = (window as any).__cc_audioContext
            || (globalThis as any).__audioSupport?.context
            || (window as any).cc?.audioEngine?._context;

        if (ctx && (ctx.state as string) !== 'running') {
            ctx.resume().catch(() => {});
        }
    } catch (e) { /* ignore */ }
}
```

### Step 10: BGM 설정 ON/OFF 핸들러

```typescript
public onBgmSettingChanged(isOn: boolean): void {
    if (isOn) {
        // 기본 BGM 이름 설정
        if (!this._currentBgmName) {
            this._currentBgmName = 'music_bg';
        }

        // HTML Audio 재개 시도
        if (this._htmlAudio?.paused) {
            this._htmlAudio.volume = gameConfig.bgmVol;
            this._htmlAudio.play().catch(() => {
                this.playMusic(this._currentBgmName);
            });
            return;
        }

        // Cocos BGM 재개 시도
        if (this.bgmComp?.clip && !this._iOSAudioDisabled) {
            this.bgmComp.volume = gameConfig.bgmVol;
            this.bgmComp.play();
            return;
        }

        // 새로 재생
        this.playMusic(this._currentBgmName);
    } else {
        // 모든 오디오 정지
        this._htmlAudio?.pause();
        this.bgmComp?.pause();
    }
}
```

---

## 주의사항

### 1. Canvas 리스너 필수

```typescript
// 잘못된 예: document.body만 사용
document.body.addEventListener('touchstart', onGesture);

// 올바른 예: Canvas에 직접 추가
const canvas = document.getElementById('GameCanvas') || document.querySelector('canvas');
canvas.addEventListener('touchstart', onGesture, { passive: true });
```

### 2. 씬 전환 시 이전 오디오 정지

```typescript
public async playMusic(audio: string) {
    // 이전 HTML Audio 반드시 정지
    if (this._htmlAudio) {
        this._htmlAudio.pause();
        this._htmlAudio.src = '';
        this._htmlAudio = null;
        this._usingHTMLAudio = false;
    }
    // ...
}
```

### 3. AudioContext 인스턴스 제한

```typescript
private readonly _MAX_CONTEXTS = 3; // iOS 제한: 4개

if (this._contextCreationCount >= this._MAX_CONTEXTS) {
    console.warn('[audioTool] Context limit reached');
    return this._audioContext; // 기존 것 재사용
}
```

### 4. TypeScript 타입 캐스팅

```typescript
// AudioContext.state는 iOS에서 'interrupted' 값이 있음
const state = ctx.state as string; // 'running' | 'suspended' | 'closed' | 'interrupted'

if (state === 'running') { ... }
```

---

## 호출 위치

| 메서드 | 호출 위치 | 설명 |
|--------|----------|------|
| `setupUserGestureUnlock()` | `loadView.ts` 초기화 | iOS 터치 리스너 등록 |
| `onBgmSettingChanged()` | `soundSetting.ts` | BGM 설정 토글 시 |
| `saveAudioState()` | `adMgr.ts` 광고 시작 | 광고 전 상태 저장 |
| `restoreAudioState()` | `adMgr.ts` 광고 종료 | 광고 후 상태 복원 |

---

## 테스트 시나리오

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | 백그라운드 → 포그라운드 (터치) | BGM 재생됨 |
| 2 | BGM OFF → 재접속 → ON | BGM 재생됨 |
| 3 | 로비 → 게임 씬 전환 | 게임 BGM으로 전환 |
| 4 | 광고 시청 후 복귀 | BGM 재생됨 |
| 5 | 백그라운드 복귀 후 효과음 | 효과음 재생됨 |
| 6 | BGM ON/OFF 토글 | 즉시 반영됨 |

---

## 디버깅

콘솔 로그 프리픽스: `[audioTool]`

```typescript
console.log('[audioTool] Touch detected:', {
    isBgm: gameConfig.isBgm,
    bgmName: this._currentBgmName,
    iOSDisabled: this._iOSAudioDisabled,
    needsRecovery: this._needsBGMRecovery,
    usingHTML: this._usingHTMLAudio,
    htmlPaused: this._htmlAudio?.paused
});
```

---

## 참조 파일

- `assets/scripts/untils/audioTool.ts` - 오디오 매니저 (구현체)
- `assets/scripts/prepab/soundSetting.ts` - 사운드 설정 UI
- `assets/scripts/loadView.ts` - 초기화 시 unlock 설정
- `assets/scripts/AD/adMgr.ts` - 광고 오디오 상태 관리


---

## 적용 결과

> 해결 후 확인된 동작, 스크린샷, 로그 등을 첨부합니다.

<!-- TODO: 작성 필요 -->