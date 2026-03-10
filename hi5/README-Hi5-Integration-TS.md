# Hi5 SDK Integration Guide (TypeScript Version)

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

Cocos Creator 2.x/3.x 프로젝트에 Hi5 SDK를 통합하기 위한 TypeScript 가이드입니다.

## 파일 구조

```
assets/
├── Hi5/
│   ├── Hi5SDK.ts        # Hi5 SDK 메인 모듈
│   ├── Hi5Helper.ts     # Helper 유틸리티 (상품/광고 관리)
│   └── Hi5Crypto.ts     # 데이터 암호화 모듈
└── scripts/
    └── AppEntry.ts      # 게임 진입점 (Hi5 초기화)
```

---

## 1. Hi5SDK.ts - SDK 핵심 모듈

`assets/Hi5/Hi5SDK.ts` 파일을 생성하세요:

```typescript
// Hi5 SDK 메시지 타입
export enum Hi5Message {
  // 게임 → SDK
  INIT_SDK = "INIT_SDK",
  LOAD_END = "LOAD_END",
  GAME_START = "GAME_START",
  GAME_END = "GAME_END",
  SHOW_HELP = "SHOW_HELP",
  SAVE_DATA = "SAVE_DATA",
  SHOW_MAIN_MENU = "SHOW_MAIN_MENU",
  DATA_SET_ITEM = "DATA_SET_ITEM",
  ITEM_LIST = "ITEM_LIST",
  BUY_ITEM = "BUY_ITEM",
  LOAD_AD = "LOAD_AD",
  SHOW_AD = "SHOW_AD",
  SUBMIT_SCORE = "SUBMIT_SCORE",
  SHOW_RANK = "SHOW_RANK",
  VIBRATION = "VIBRATION",
  SET_Orientation = "SET_Orientation",
  SHARE_TEXT = "SHARE_TEXT",
  SHARE_APP_LINK = "SHARE_APP_LINK",
  INVITE_FRIEND_REWARDS = "INVITE_FRIEND_REWARDS",

  // SDK → 게임
  GAME_DATA = "GAME_DATA",
  START_GAME = "START_GAME",
  RESTART_GAME = "RESTART_GAME",
  SOUND = "SOUND",
  RANK_DATA = "RANK_DATA",
  GAME_SETTINGS = "GAME_SETTINGS"
}

export enum MainMenuType {
  GAME_FIRST = "GAME_FIRST",
  GAME_END = "GAME_END"
}

// Hi5 메시지 데이터 인터페이스
export interface Hi5MessageData {
  fromhi5action: Hi5Message;
  data: any;
}

export interface Hi5Product {
  pid: string;
  key: string;
  amount?: number;
  price?: string;
}

export interface Hi5Ad {
  aid: string;
  key: string;
  amount?: number;
  max?: number;
}

export interface SafeArea {
  top: number;
  bottom: number;
}

export interface PlatformData {
  platform?: string;
  os?: string;
  deviceid?: string;
  vibration?: number;
  SafeArea?: SafeArea;
  products?: { [key: string]: { pid: string } };
  ads?: { [key: string]: { aid: string } };
}

// 콜백 타입
export type Hi5Callback = (data: Hi5MessageData) => void;

// Hi5 SDK 클래스
class Hi5SDKClass {
  public MESSAGE = Hi5Message;
  public MainMenuType = MainMenuType;

  public GameData: { [key: string]: any } = {};
  public UserData: { [key: string]: any } = {};
  public PlatFormData: PlatformData = {};

  public current_time: number = 0;
  public lastProduct?: Hi5Product;
  public lastAd?: Hi5Ad;
  public lastShowAd: boolean = false;

  private callback: Hi5Callback | null = null;
  private timeInterval?: number;

  // SDK 초기화 (한번에)
  public Init_SDK(callback: Hi5Callback, localGameData: { [key: string]: any } = {}): void {
    this.Init_GameData(localGameData);
    this.Init_OnMessage(callback);
  }

  // 게임 데이터 초기화
  public Init_GameData(localGameData: { [key: string]: any }): void {
    (window as any)['Hi5'] = this;
    this.current_time = Math.round(Date.now() / 1000);

    for (const key in localGameData) {
      this.GameData[key] = localGameData[key];
    }

    this.timeInterval = window.setInterval(() => {
      this.current_time++;
    }, 1000);
  }

  // 메시지 리스너 초기화
  public Init_OnMessage(callback: Hi5Callback): void {
    this.callback = callback;

    window.addEventListener('message', (event: MessageEvent) => {
      this._OnMessage(event);
    });

    this.PostMessage(Hi5Message.INIT_SDK, this.GameData);
  }

  // 내부 메시지 처리
  private _OnMessage(event: MessageEvent): void {
    if (!event.data || !event.data.fromhi5action) return;

    const data = event.data as Hi5MessageData;

    if (data.fromhi5action === Hi5Message.GAME_DATA) {
      if (data.data.game_data) {
        this.GameData = data.data.game_data;
      }
      if (data.data.user_data) {
        this.UserData = data.data.user_data;
      }
      if (data.data.platform_data) {
        this.PlatFormData = data.data.platform_data;
      }
      if (data.data.current_time) {
        this.current_time = data.data.current_time;
      }
    }

    this.callback?.(data);
  }

  // 메시지 전송 (iframe 환경 대응)
  public PostMessage(action: Hi5Message, data: any): void {
    const msg = { tohi5action: action, data };

    if (window.self !== window.top) {
      window.parent.postMessage(msg, "*");
    } else {
      window.postMessage(msg, "*");
    }
  }

  // ============ 데이터 저장/로드 ============

  public getItem<T = any>(key: string, defaultVal?: T): T {
    return this.GameData[key] !== undefined ? this.GameData[key] : defaultVal;
  }

  public setItem(key: string, value: any, submit: boolean = true): void {
    this.GameData[key] = value;

    if (submit) {
      let valueToSend = value;

      // JSON 문자열이면 파싱해서 객체로 전송 (이중 직렬화 방지)
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            valueToSend = JSON.parse(value);
          } catch (e) {
            // 파싱 실패 시 원본 유지
          }
        }
      }

      this.PostMessage(Hi5Message.DATA_SET_ITEM, { key, value: valueToSend });
    }
  }

  public SaveData(): void {
    const dataToSend: { [key: string]: any } = {};

    for (const key in this.GameData) {
      if (this.GameData.hasOwnProperty(key)) {
        let value = this.GameData[key];

        if (typeof value === 'string') {
          const trimmed = value.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              dataToSend[key] = JSON.parse(value);
            } catch (e) {
              dataToSend[key] = value;
            }
          } else {
            dataToSend[key] = value;
          }
        } else {
          dataToSend[key] = value;
        }
      }
    }

    this.PostMessage(Hi5Message.SAVE_DATA, dataToSend);
  }

  // ============ 게임 플로우 ============

  public LoadEnd(): void {
    this.PostMessage(Hi5Message.LOAD_END, {});
  }

  public GameStart(): void {
    this.PostMessage(Hi5Message.GAME_START, {});
  }

  public GameEnd(): void {
    this.PostMessage(Hi5Message.GAME_END, {});
  }

  public ShowHelp(): void {
    this.PostMessage(Hi5Message.SHOW_HELP, {});
  }

  // ============ 광고 ============

  public loadAd(ad: Hi5Ad): void {
    if (this.lastAd) return;
    if (!ad.aid) {
      console.error('Hi5: aid not found');
      return;
    }

    this.lastShowAd = false;
    this.lastAd = ad;
    this.PostMessage(Hi5Message.LOAD_AD, { adGroupId: ad.aid });
  }

  public showAd(ad: Hi5Ad): void {
    if (!ad.aid) {
      console.error('Hi5: aid not found');
      return;
    }

    this.lastShowAd = false;
    this.lastAd = ad;
    this.PostMessage(Hi5Message.SHOW_AD, { adGroupId: ad.aid });
  }

  // ============ 인앱결제 ============

  public getProductItemList(): void {
    this.PostMessage(Hi5Message.ITEM_LIST, {});
  }

  public purchaseProduct(product: Hi5Product): void {
    if (this.lastProduct) return;
    if (!product.pid) {
      console.error('Hi5: pid not found');
      return;
    }

    this.lastProduct = product;
    this.PostMessage(Hi5Message.BUY_ITEM, { productId: product.pid });
  }

  // ============ 랭킹 ============

  public submitScore(score: number): void {
    this.PostMessage(Hi5Message.SUBMIT_SCORE, { score });
  }

  public showRank(): void {
    this.PostMessage(Hi5Message.SHOW_RANK, {});
  }

  // ============ 기타 기능 ============

  public vibration(): void {
    this.PostMessage(Hi5Message.VIBRATION, {});
  }

  public setDeviceOrientation(type: 'portrait' | 'landscape' = 'portrait'): void {
    this.PostMessage(Hi5Message.SET_Orientation, { type });
  }

  public shareText(message: string = ''): void {
    this.PostMessage(Hi5Message.SHARE_TEXT, { message });
  }

  public shareAppLink(appname: string = '', uri: string = ''): void {
    this.PostMessage(Hi5Message.SHARE_APP_LINK, { appname, uri });
  }

  public inviteRewards(id: string): void {
    this.PostMessage(Hi5Message.INVITE_FRIEND_REWARDS, { id });
  }

  public ShowMainMenu(mode: MainMenuType): void {
    setTimeout(() => {
      this.PostMessage(Hi5Message.SHOW_MAIN_MENU, { mode });
    }, 100);
  }

  // ============ 플랫폼 정보 ============

  public getTime(): number {
    return this.current_time;
  }

  public getPlatform(): string {
    return this.PlatFormData?.platform ?? '';
  }

  public getOS(): string {
    return this.PlatFormData?.os ?? '';
  }

  public getDeviceid(): string {
    return this.PlatFormData?.deviceid ?? '';
  }

  public isSupportVibration(): number {
    return this.PlatFormData?.vibration ?? 0;
  }

  public getSafeArea(): SafeArea {
    return this.PlatFormData?.SafeArea ?? { top: 0, bottom: 0 };
  }

  public log(text: any): void {
    console.log(JSON.stringify(text));
  }
}

// 싱글톤 인스턴스
export const Hi5SDK = new Hi5SDKClass();
export default Hi5SDK;
```

---

## 2. Hi5Helper.ts - 상품/광고 Helper

`assets/Hi5/Hi5Helper.ts` 파일을 생성하세요:

```typescript
import { Hi5Product, Hi5Ad } from './Hi5SDK';

// 상품 정의 (프로젝트에 맞게 수정)
const Products: { [key: string]: Hi5Product } = {
  gold_100: { pid: 'gold_100', key: 'gold_100', amount: 100 },
  gold_500: { pid: 'gold_500', key: 'gold_500', amount: 500 },
  remove_ads: { pid: 'remove_ads', key: 'remove_ads' }
};

// 광고 정의 (프로젝트에 맞게 수정)
const Ads: { [key: string]: Hi5Ad } = {
  reward_gold: { aid: 'reward_gold', key: 'reward_gold' },
  reward_revive: { aid: 'reward_revive', key: 'reward_revive' },
  reward_double: { aid: 'reward_double', key: 'reward_double' }
};

export class Hi5Helper {

  // 상품 정보 가져오기 (플랫폼 데이터 병합)
  static getProduct(key: string): Hi5Product | undefined {
    let item = Products[key];

    const Hi5 = (window as any)['Hi5'];
    if (Hi5?.PlatFormData?.products?.[key]) {
      item = item || { pid: '', key };
      item.key = key;
      item.pid = Hi5.PlatFormData.products[key].pid;
    }

    return item;
  }

  // 광고 정보 가져오기 (플랫폼 데이터 병합)
  static getAd(key: string): Hi5Ad | undefined {
    let item = Ads[key];

    const Hi5 = (window as any)['Hi5'];
    if (Hi5?.PlatFormData?.ads?.[key]) {
      item = item || { aid: '', key };
      item.key = key;
      item.aid = Hi5.PlatFormData.ads[key].aid;
    }

    return item;
  }

  // 상품 추가 (런타임에)
  static addProduct(key: string, product: Hi5Product): void {
    Products[key] = product;
  }

  // 광고 추가 (런타임에)
  static addAd(key: string, ad: Hi5Ad): void {
    Ads[key] = ad;
  }
}

export default Hi5Helper;
```

---

## 3. AppEntry.ts - 게임 진입점 (Entry Point)

로딩 씬의 메인 컴포넌트에 추가하세요:

```typescript
import { _decorator, Component, director, game, AudioSource, ProgressBar } from 'cc';
import Hi5SDK, { Hi5Message, Hi5MessageData, Hi5Product, Hi5Ad } from '../Hi5/Hi5SDK';
import Hi5Helper from '../Hi5/Hi5Helper';

const { ccclass, property } = _decorator;

// 플레이어 데이터 인터페이스 (프로젝트에 맞게 수정)
interface PlayerData {
  level: number;
  gold: number;
  noAds?: boolean;
  createTime: number;
}

// 게임 데이터 네임스페이스
declare global {
  interface Window {
    Hi5: typeof Hi5SDK;
  }

  namespace cc {
    namespace game {
      let data: {
        player: PlayerData;
      };
    }
    let appEntry: AppEntry;
  }
}

@ccclass('AppEntry')
export class AppEntry extends Component {

  @property(ProgressBar)
  loadingBar: ProgressBar | null = null;

  // 저장 키 (프로젝트에 맞게 수정)
  private readonly SAVE_KEY = 'mySaveData';

  // 콜백 저장
  private _adCallback: ((success: boolean) => void) | null = null;
  private _purchaseCallback: ((success: boolean, product: Hi5Product | null) => void) | null = null;

  onLoad(): void {
    // 전역 참조 설정
    cc.appEntry = this;
    cc.game.data = { player: null! };

    // Hi5 SDK 초기화
    this.initHi5SDK();
  }

  // ============ Hi5 SDK 초기화 ============

  private initHi5SDK(): void {
    console.log('[AppEntry] Initializing Hi5 SDK...');

    // 전역 Hi5 설정
    window.Hi5 = Hi5SDK;

    // SDK 초기화 및 콜백 등록
    Hi5SDK.Init_SDK(this.onHi5Message.bind(this), {});

    // 로딩 완료 알림
    Hi5SDK.LoadEnd();

    console.log('[AppEntry] Hi5 SDK initialized, waiting for GAME_DATA...');
  }

  // ============ Hi5 메시지 핸들러 (핵심!) ============

  private onHi5Message(data: Hi5MessageData): void {
    console.log('[Hi5] Message:', data.fromhi5action);

    switch (data.fromhi5action) {

      // -------- 게임 데이터 수신 --------
      case Hi5Message.GAME_DATA:
        this.onGameData(data.data);
        break;

      // -------- 광고 로드 결과 --------
      case Hi5Message.LOAD_AD:
        if (data.data.status === 0) {
          console.log('[Hi5] Ad loaded, showing...');
          this.pauseAudio();
          Hi5SDK.showAd(Hi5SDK.lastAd!);
        } else {
          console.error('[Hi5] Ad load failed:', data.data.msg);
          this.onAdResult(false);
          Hi5SDK.lastAd = undefined;
        }
        break;

      // -------- 광고 표시 결과 --------
      case Hi5Message.SHOW_AD:
        if (data.data.status === 0) {
          const adType = data.data.type as string;

          if (adType === 'show' || adType === 'userEarnedReward') {
            Hi5SDK.lastShowAd = true;
          } else if (adType === 'dismissed') {
            const success = Hi5SDK.lastShowAd;
            this.onAdResult(success);
            Hi5SDK.lastShowAd = false;
            Hi5SDK.lastAd = undefined;
            this.resumeAudio();
          }
        } else {
          console.error('[Hi5] Ad show failed:', data.data.msg);
          this.onAdResult(false);
          Hi5SDK.lastAd = undefined;
          this.resumeAudio();
        }
        break;

      // -------- 구매 결과 --------
      case Hi5Message.BUY_ITEM:
        if (data.data.status === 0 && Hi5SDK.lastProduct) {
          this.onPurchaseSuccess(Hi5SDK.lastProduct);
        } else {
          this.onPurchaseFailed(data.data.msg);
        }
        Hi5SDK.lastProduct = undefined;
        break;

      // -------- 점수 제출 결과 --------
      case Hi5Message.SUBMIT_SCORE:
        console.log('[Hi5] Score submitted:', data.data);
        break;

      // -------- 랭킹 표시 결과 --------
      case Hi5Message.SHOW_RANK:
        console.log('[Hi5] Rank shown:', data.data);
        break;

      // -------- 상품 목록 --------
      case Hi5Message.ITEM_LIST:
        console.log('[Hi5] Product list:', data.data.products);
        break;

      // -------- 공유 결과 --------
      case Hi5Message.SHARE_TEXT:
      case Hi5Message.SHARE_APP_LINK:
        console.log('[Hi5] Share result:', data.data);
        break;

      // -------- 초대 보상 --------
      case Hi5Message.INVITE_FRIEND_REWARDS:
        if (data.data.status === 0) {
          console.log('[Hi5] Invite reward:', data.data.reward);
        }
        break;

      // -------- SDK 메인 메뉴 이벤트 --------
      case Hi5Message.START_GAME:
        this.onStartGame();
        break;

      case Hi5Message.RESTART_GAME:
        this.onRestartGame();
        break;

      case Hi5Message.SOUND:
        this.onSoundToggle(data.data.sound === 'on');
        break;

      case Hi5Message.GAME_SETTINGS:
        this.onGameSettings();
        break;
    }
  }

  // ============ GAME_DATA 처리 ============

  private onGameData(data: any): void {
    console.log('[AppEntry] GAME_DATA received');

    if (data.game_data?.[this.SAVE_KEY]) {
      // 기존 데이터 복원
      let savedData = data.game_data[this.SAVE_KEY];

      try {
        if (typeof savedData === 'string') {
          savedData = JSON.parse(savedData);
        }

        console.log('[AppEntry] Restoring saved data...');
        cc.game.data.player = savedData as PlayerData;

        this.onDataRestored();

      } catch (e) {
        console.error('[AppEntry] Failed to parse saved data:', e);
        this.createNewGame();
      }
    } else {
      console.log('[AppEntry] No saved data, creating new game...');
      this.createNewGame();
    }

    this.goToMainScene();
  }

  private createNewGame(): void {
    // 새 플레이어 데이터 생성 (프로젝트에 맞게 수정)
    cc.game.data.player = {
      level: 1,
      gold: 0,
      createTime: Date.now()
    };

    this.saveGameData();
  }

  private onDataRestored(): void {
    console.log('[AppEntry] Data restored successfully');
  }

  private goToMainScene(): void {
    // 메인 씬으로 이동 (프로젝트에 맞게 수정)
    director.loadScene('mainScene');
  }

  // ============ 데이터 저장 ============

  public saveGameData(): void {
    const dataStr = JSON.stringify(cc.game.data.player);
    Hi5SDK.setItem(this.SAVE_KEY, dataStr);
  }

  public saveAllData(): void {
    this.saveGameData();
    Hi5SDK.SaveData();
  }

  // ============ 광고 처리 ============

  public showRewardAd(adKey: string, callback?: (success: boolean) => void): void {
    const ad = Hi5Helper.getAd(adKey);

    if (!ad) {
      console.error('[AppEntry] Ad not found:', adKey);
      callback?.(false);
      return;
    }

    this._adCallback = callback ?? null;
    Hi5SDK.loadAd(ad);
  }

  private onAdResult(success: boolean): void {
    console.log('[AppEntry] Ad result:', success);

    this._adCallback?.(success);
    this._adCallback = null;
  }

  // ============ 인앱결제 처리 ============

  public purchaseItem(productKey: string, callback?: (success: boolean, product: Hi5Product | null) => void): void {
    const product = Hi5Helper.getProduct(productKey);

    if (!product) {
      console.error('[AppEntry] Product not found:', productKey);
      callback?.(false, null);
      return;
    }

    this._purchaseCallback = callback ?? null;
    Hi5SDK.purchaseProduct(product);
  }

  private onPurchaseSuccess(product: Hi5Product): void {
    console.log('[AppEntry] Purchase success:', product.key);

    // 구매 처리 (프로젝트에 맞게 수정)
    switch (product.key) {
      case 'gold_100':
        cc.game.data.player.gold += 100;
        break;
      case 'gold_500':
        cc.game.data.player.gold += 500;
        break;
      case 'remove_ads':
        cc.game.data.player.noAds = true;
        break;
    }

    this.saveAllData();

    this._purchaseCallback?.(true, product);
    this._purchaseCallback = null;
  }

  private onPurchaseFailed(msg: string): void {
    console.error('[AppEntry] Purchase failed:', msg);

    this._purchaseCallback?.(false, null);
    this._purchaseCallback = null;
  }

  // ============ 게임 이벤트 ============

  private onStartGame(): void {
    console.log('[AppEntry] Start game from SDK menu');
  }

  private onRestartGame(): void {
    console.log('[AppEntry] Restart game from SDK menu');
  }

  private onSoundToggle(isOn: boolean): void {
    console.log('[AppEntry] Sound toggle:', isOn);
  }

  private onGameSettings(): void {
    console.log('[AppEntry] Game settings requested');
  }

  // ============ 오디오 제어 ============

  private pauseAudio(): void {
    // Cocos Creator 3.x
    // AudioSource.pauseAll();

    // Cocos Creator 2.x
    // cc.audioEngine.pauseMusic();
    // cc.audioEngine.pauseAllEffects();
  }

  private resumeAudio(): void {
    // Cocos Creator 3.x
    // AudioSource.resumeAll();

    // Cocos Creator 2.x
    // cc.audioEngine.resumeMusic();
    // cc.audioEngine.resumeAllEffects();
  }

  // ============ 라이프사이클 ============

  start(): void {
    // PersistRootNode로 설정 (씬 전환 시 유지)
    game.addPersistRootNode(this.node);

    this.setupLifecycleEvents();
  }

  private setupLifecycleEvents(): void {
    // Hi5 플랫폼
    if (window.Hi5?.getPlatform) {
      window.addEventListener('blur', () => this.onGameHide());
      window.addEventListener('focus', () => this.onGameShow());
    } else {
      // 기타 플랫폼
      game.on(game.EVENT_HIDE, () => this.onGameHide());
      game.on(game.EVENT_SHOW, () => this.onGameShow());
    }
  }

  private onGameHide(): void {
    console.log('[AppEntry] Game hide');
    this.pauseAudio();
    this.saveAllData();
  }

  private onGameShow(): void {
    console.log('[AppEntry] Game show');
    this.resumeAudio();
  }

  // ============ SafeArea 폴리필 ============

  public polyfillSafeArea(): void {
    const safeArea = Hi5SDK.getSafeArea();

    if (!safeArea.top && !safeArea.bottom) {
      // SafeArea 폴리필 로직 (필요시 구현)
    }
  }
}
```

---

## 4. 사용 예시

### 광고 표시
```typescript
cc.appEntry.showRewardAd('reward_gold', (success) => {
  if (success) {
    cc.game.data.player.gold += 100;
    cc.appEntry.saveGameData();
  }
});
```

### 상품 구매
```typescript
cc.appEntry.purchaseItem('gold_500', (success, product) => {
  if (success && product) {
    console.log('구매 완료:', product.key);
  }
});
```

### 점수 제출
```typescript
import Hi5SDK from '../Hi5/Hi5SDK';
Hi5SDK.submitScore(12345);
```

### 랭킹 표시
```typescript
import Hi5SDK from '../Hi5/Hi5SDK';
Hi5SDK.showRank();
```

### 데이터 저장
```typescript
cc.appEntry.saveGameData();   // 단일 키 저장
cc.appEntry.saveAllData();    // 전체 저장
```

---

## 5. 메시지 플로우

```
[게임 시작]
     │
     ▼
Init_SDK() ──────────► SDK (INIT_SDK)
     │
     ▼
LoadEnd() ───────────► SDK (LOAD_END)
     │
     ▼
SDK ─────────────────► GAME_DATA (저장 데이터 전달)
     │
     ▼
[게임 플레이]
     │
     ├── setItem() ──► SDK (DATA_SET_ITEM)
     └── SaveData() ─► SDK (SAVE_DATA)

[광고 요청]
loadAd() ────────────► SDK (LOAD_AD)
     │
     ▼
SDK ─────────────────► LOAD_AD (status: 0)
     │
     ▼
showAd() ────────────► SDK (SHOW_AD)
     │
     ▼
SDK ─────────────────► SHOW_AD (type: userEarnedReward/dismissed)
```

---

## 6. 체크리스트

- [ ] `assets/Hi5/Hi5SDK.ts` 생성
- [ ] `assets/Hi5/Hi5Helper.ts` 생성 (상품/광고 키 설정)
- [ ] `assets/Hi5/Hi5Crypto.ts` 생성 (암호화 키 설정)
- [ ] 로딩 씬에 Entry 컴포넌트 추가
- [ ] `onHi5Message` 핸들러 구현
- [ ] 저장 키(SAVE_KEY) 결정
- [ ] `PlayerData` 인터페이스 정의
- [ ] `createNewGame`에서 초기 데이터 구조 정의
- [ ] 구매 처리 로직 구현 (`onPurchaseSuccess`)
- [ ] 광고 콜백 처리 구현
- [ ] 게임 숨김 시 자동 저장 확인
- [ ] 오디오 pause/resume 메서드 구현 (CC 버전에 맞게)

---

## 7. Cocos Creator 버전별 차이점

### Cocos Creator 2.x
```typescript
// 오디오
cc.audioEngine.pauseMusic();
cc.audioEngine.resumeMusic();

// 씬 전환
cc.director.loadScene('mainScene');

// PersistRootNode
cc.game.addPersistRootNode(this.node);
```

### Cocos Creator 3.x
```typescript
import { AudioSource, director, game } from 'cc';

// 오디오
AudioSource.pauseAll();
AudioSource.resumeAll();

// 씬 전환
director.loadScene('mainScene');

// PersistRootNode
game.addPersistRootNode(this.node);
```

---

## 8. 데이터 암호화 (Hi5Crypto)

### Hi5Crypto.ts 사용법

```typescript
import Hi5Crypto from '../Hi5/Hi5Crypto';

// 1. 암호화 키 설정 (필수! 프로젝트별로 다르게)
Hi5Crypto.setSecretKey('MyProject_SecretKey_2024!@#');
```

### 기본 암호화/복호화

```typescript
// 문자열 암호화
const encrypted = Hi5Crypto.encrypt('Hello World');
console.log(encrypted);  // 'a8Hk3j...' (암호화된 문자열)

// 문자열 복호화
const decrypted = Hi5Crypto.decrypt(encrypted);
console.log(decrypted);  // 'Hello World'
```

### 객체 암호화/복호화 (제네릭 지원)

```typescript
interface PlayerData {
  level: number;
  gold: number;
  items: string[];
}

const playerData: PlayerData = {
  level: 10,
  gold: 5000,
  items: ['sword', 'shield']
};

// 객체 암호화
const encrypted = Hi5Crypto.encryptObject(playerData);

// 객체 복호화 (타입 지정)
const decrypted = Hi5Crypto.decryptObject<PlayerData>(encrypted);
console.log(decrypted?.level);  // 10
```

### 패키징 (암호화 + 해시 검증) - 권장

```typescript
interface PlayerData {
  level: number;
  gold: number;
}

const playerData: PlayerData = {
  level: 10,
  gold: 5000
};

// 패키징 (암호화 + 무결성 해시)
const packed = Hi5Crypto.pack(playerData);

// 언패키징 (검증 + 복호화)
const unpacked = Hi5Crypto.unpack<PlayerData>(packed);

if (unpacked === null) {
  // 데이터 변조 감지됨!
  console.error('Data has been tampered!');
} else {
  console.log(unpacked.level);  // 10
}
```

### Hi5 SDK와 함께 사용 (AppEntry.ts 수정)

```typescript
import Hi5Crypto from '../Hi5/Hi5Crypto';

// 암호화 키 설정 (onLoad에서)
Hi5Crypto.setSecretKey('MyGameSecretKey!@#2024');

// ============ 데이터 저장 (암호화) ============
public saveGameData(): void {
  // pack()으로 암호화 + 해시 추가
  const packedData = Hi5Crypto.pack(cc.game.data.player);
  Hi5SDK.setItem(this.SAVE_KEY, packedData);
}

// ============ 데이터 로드 (복호화) ============
private onGameData(data: any): void {
  if (data.game_data?.[this.SAVE_KEY]) {
    const packedData = data.game_data[this.SAVE_KEY];

    // unpack()으로 검증 + 복호화
    const playerData = Hi5Crypto.unpack<PlayerData>(packedData);

    if (playerData) {
      // 정상 데이터
      cc.game.data.player = playerData;
      this.onDataRestored();
    } else {
      // 데이터 변조 감지 또는 파싱 실패
      console.warn('Data corrupted, creating new game...');
      this.createNewGame();
    }
  } else {
    this.createNewGame();
  }

  this.goToMainScene();
}
```

### 암호화 옵션

| 메서드 | 용도 | 보안 수준 | 성능 |
|--------|------|-----------|------|
| `encrypt/decrypt` | 문자열 암호화 | 중 | 빠름 |
| `encryptObject<T>/decryptObject<T>` | 객체 암호화 | 중 | 빠름 |
| `pack<T>/unpack<T>` | 암호화 + 해시 검증 | 높음 | 보통 |
| `packLight<T>/unpackLight<T>` | 해시만 (암호화 없음) | 낮음 | 매우 빠름 |

### 타입 정의

```typescript
// PackedData 인터페이스 (내부 사용)
interface PackedData {
  d: string;  // encrypted data
  h: string;  // hash
  v: number;  // version
}
```

### 주의사항

1. **암호화 키는 반드시 변경하세요!**
   - 기본 키: `'YourSecretKey2024!@#$'`
   - 프로젝트별로 고유한 키 사용

2. **클라이언트 사이드 한계**
   - 완벽한 보안은 불가능 (코드 분석 시 키 노출)
   - 일반 사용자의 간단한 데이터 변조 방지 목적

3. **기존 데이터 마이그레이션**
   - 암호화 적용 전 데이터는 복호화 실패
   - 마이그레이션 로직 필요 시 별도 처리

4. **Null 체크 필수**
   - `decryptObject`, `unpack` 등은 실패 시 `null` 반환
   - 옵셔널 체이닝 또는 null 체크 권장


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->