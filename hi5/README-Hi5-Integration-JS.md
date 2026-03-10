# Hi5 SDK Integration Guide (JavaScript Version)

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

Cocos Creator 2.x 프로젝트에 Hi5 SDK를 통합하기 위한 가이드입니다.

## 파일 구조

```
assets/
├── Hi5/
│   ├── hi5.js           # Hi5 SDK 메인 모듈
│   ├── hi5Helper.js     # Helper 유틸리티 (상품/광고 관리)
│   └── Hi5Crypto.js     # 데이터 암호화 모듈
└── _script/
    └── AppEntry.js      # 게임 진입점 (Hi5 초기화)
```

---

## 1. hi5.js - SDK 핵심 모듈

`assets/Hi5/hi5.js` 파일을 생성하세요:

```javascript
// Hi5 SDK 정의
var Hi5 = {
  MESSAGE: {
    // 게임 → SDK
    INIT_SDK: "INIT_SDK",
    LOAD_END: "LOAD_END",
    GAME_START: "GAME_START",
    GAME_END: "GAME_END",
    SHOW_HELP: "SHOW_HELP",
    SAVE_DATA: "SAVE_DATA",
    SHOW_MAIN_MENU: "SHOW_MAIN_MENU",
    DATA_SET_ITEM: "DATA_SET_ITEM",
    ITEM_LIST: "ITEM_LIST",
    BUY_ITEM: "BUY_ITEM",
    LOAD_AD: "LOAD_AD",
    SHOW_AD: "SHOW_AD",
    SUBMIT_SCORE: "SUBMIT_SCORE",
    SHOW_RANK: "SHOW_RANK",
    VIBRATION: "VIBRATION",
    SET_Orientation: "SET_Orientation",
    SHARE_TEXT: "SHARE_TEXT",
    SHARE_APP_LINK: "SHARE_APP_LINK",
    INVITE_FRIEND_REWARDS: "INVITE_FRIEND_REWARDS",

    // SDK → 게임
    GAME_DATA: "GAME_DATA",
    START_GAME: "START_GAME",
    RESTART_GAME: "RESTART_GAME",
    SOUND: "SOUND",
    RANK_DATA: "RANK_DATA",
    GAME_SETTINGS: "GAME_SETTINGS"
  },

  MainMenuType: {
    GAME_FIRST: "GAME_FIRST",
    GAME_END: "GAME_END"
  },

  GameData: {},
  UserData: {},
  PlatFormData: {},
  current_time: 0,
  callback: null,
  lastProduct: undefined,
  lastAd: undefined,
  lastShowAd: false,

  // SDK 초기화 (한번에)
  Init_SDK: function(callback, localGameData) {
    this.Init_GameData(localGameData);
    this.Init_OnMessage(callback);
  },

  // 게임 데이터 초기화
  Init_GameData: function(localGameData) {
    window['Hi5'] = this;
    this.current_time = Math.round(new Date().getTime() / 1000);

    for (var key in localGameData) {
      this.GameData[key] = localGameData[key];
    }

    var self = this;
    setInterval(function() {
      self.current_time++;
    }, 1000);
  },

  // 메시지 리스너 초기화
  Init_OnMessage: function(callback) {
    this.callback = callback;
    var self = this;

    window.addEventListener('message', function(event) {
      self._OnMessage(event);
    });

    this.PostMessage(this.MESSAGE.INIT_SDK, this.GameData);
  },

  // 내부 메시지 처리
  _OnMessage: function(event) {
    if (!event.data) return;
    if (!event.data.fromhi5action) return;

    if (event.data.fromhi5action === this.MESSAGE.GAME_DATA) {
      if (event.data.data.game_data) {
        this.GameData = event.data.data.game_data;
      }
      if (event.data.data.user_data) {
        this.UserData = event.data.data.user_data;
      }
      if (event.data.data.platform_data) {
        this.PlatFormData = event.data.data.platform_data;
      }
      if (event.data.data.current_time) {
        this.current_time = event.data.data.current_time;
      }
    }

    this.callback(event.data);
  },

  // 메시지 전송 (iframe 환경 대응)
  PostMessage: function(action, data) {
    var msg = {tohi5action: action, data: data};
    if (window.self !== window.top) {
      window.parent.postMessage(msg, "*");
    } else {
      window.postMessage(msg, "*");
    }
  },

  // ============ 데이터 저장/로드 ============

  getItem: function(key, defaultVal) {
    defaultVal = defaultVal || undefined;
    return this.GameData[key] !== undefined ? this.GameData[key] : defaultVal;
  },

  setItem: function(key, value, submit) {
    submit = submit !== undefined ? submit : true;
    this.GameData[key] = value;

    if (submit) {
      var valueToSend = value;
      // JSON 문자열이면 파싱해서 객체로 전송 (이중 직렬화 방지)
      if (typeof value === 'string') {
        var trimmed = value.trim();
        if ((trimmed.charAt(0) === '{' && trimmed.charAt(trimmed.length-1) === '}') ||
            (trimmed.charAt(0) === '[' && trimmed.charAt(trimmed.length-1) === ']')) {
          try {
            valueToSend = JSON.parse(value);
          } catch (e) {}
        }
      }
      this.PostMessage(this.MESSAGE.DATA_SET_ITEM, {key: key, value: valueToSend});
    }
  },

  SaveData: function() {
    var dataToSend = {};
    for (var key in this.GameData) {
      if (this.GameData.hasOwnProperty(key)) {
        var value = this.GameData[key];
        if (typeof value === 'string') {
          var trimmed = value.trim();
          if ((trimmed.charAt(0) === '{' && trimmed.charAt(trimmed.length-1) === '}') ||
              (trimmed.charAt(0) === '[' && trimmed.charAt(trimmed.length-1) === ']')) {
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
    this.PostMessage(this.MESSAGE.SAVE_DATA, dataToSend);
  },

  // ============ 게임 플로우 ============

  LoadEnd: function() {
    this.PostMessage(this.MESSAGE.LOAD_END, {});
  },

  GameStart: function() {
    this.PostMessage(this.MESSAGE.GAME_START, {});
  },

  GameEnd: function() {
    this.PostMessage(this.MESSAGE.GAME_END, {});
  },

  ShowHelp: function() {
    this.PostMessage(this.MESSAGE.SHOW_HELP, {});
  },

  // ============ 광고 ============

  loadAd: function(ad) {
    if (this.lastAd) return;
    if (!ad.hasOwnProperty('aid')) {
      console.error('Hi5: aid not found');
      return;
    }
    this.lastShowAd = false;
    this.lastAd = ad;
    this.PostMessage(this.MESSAGE.LOAD_AD, {adGroupId: this.lastAd.aid});
  },

  showAd: function(ad) {
    if (!ad.hasOwnProperty('aid')) {
      console.error('Hi5: aid not found');
      return;
    }
    this.lastShowAd = false;
    this.lastAd = ad;
    this.PostMessage(this.MESSAGE.SHOW_AD, {adGroupId: this.lastAd.aid});
  },

  // ============ 인앱결제 ============

  getProductItemList: function() {
    this.PostMessage(this.MESSAGE.ITEM_LIST, {});
  },

  purchaseProduct: function(product) {
    if (this.lastProduct) return;
    if (!product.hasOwnProperty('pid')) {
      console.error('Hi5: pid not found');
      return;
    }
    this.lastProduct = product;
    this.PostMessage(this.MESSAGE.BUY_ITEM, {productId: this.lastProduct.pid});
  },

  // ============ 랭킹 ============

  submitScore: function(score) {
    this.PostMessage(this.MESSAGE.SUBMIT_SCORE, {score: score});
  },

  showRank: function() {
    this.PostMessage(this.MESSAGE.SHOW_RANK, {});
  },

  // ============ 기타 기능 ============

  vibration: function() {
    this.PostMessage(this.MESSAGE.VIBRATION, {});
  },

  setDeviceOrientation: function(type) {
    type = type || 'portrait';
    this.PostMessage(this.MESSAGE.SET_Orientation, {type: type});
  },

  shareText: function(message) {
    this.PostMessage(this.MESSAGE.SHARE_TEXT, {message: message || ''});
  },

  shareAppLink: function(appname, uri) {
    this.PostMessage(this.MESSAGE.SHARE_APP_LINK, {appname: appname || '', uri: uri || ''});
  },

  inviteRewards: function(id) {
    this.PostMessage(this.MESSAGE.INVITE_FRIEND_REWARDS, {id: id});
  },

  ShowMainMenu: function(mode) {
    var self = this;
    setTimeout(function() {
      self.PostMessage(self.MESSAGE.SHOW_MAIN_MENU, {mode: mode});
    }, 100);
  },

  // ============ 플랫폼 정보 ============

  getTime: function() {
    return this.current_time;
  },

  getPlatform: function() {
    return (this.PlatFormData && this.PlatFormData.platform) ? this.PlatFormData.platform : '';
  },

  getOS: function() {
    return (this.PlatFormData && this.PlatFormData.os) ? this.PlatFormData.os : '';
  },

  getDeviceid: function() {
    return (this.PlatFormData && this.PlatFormData.deviceid) ? this.PlatFormData.deviceid : '';
  },

  isSupportVibration: function() {
    return (this.PlatFormData && this.PlatFormData.vibration) ? this.PlatFormData.vibration : 0;
  },

  getSafeArea: function() {
    return (this.PlatFormData && this.PlatFormData.SafeArea) ? this.PlatFormData.SafeArea : {top: 0, bottom: 0};
  },

  log: function(text) {
    console.log(JSON.stringify(text));
  }
};

module.exports = Hi5;
```

---

## 2. hi5Helper.js - 상품/광고 Helper

`assets/Hi5/hi5Helper.js` 파일을 생성하세요:

```javascript
var Hi5Helper = {
  // 상품 정의 (프로젝트에 맞게 수정)
  Product: {
    gold_100: {pid: 'gold_100', key: 'gold_100', amount: 100},
    gold_500: {pid: 'gold_500', key: 'gold_500', amount: 500},
    remove_ads: {pid: 'remove_ads', key: 'remove_ads'}
  },

  // 광고 정의 (프로젝트에 맞게 수정)
  Ad: {
    reward_gold: {aid: 'reward_gold', key: 'reward_gold'},
    reward_revive: {aid: 'reward_revive', key: 'reward_revive'},
    reward_double: {aid: 'reward_double', key: 'reward_double'}
  },

  // 상품 정보 가져오기 (플랫폼 데이터 병합)
  getProduct: function(key) {
    var item = this.Product[key];
    if (window['Hi5'] && window['Hi5'].PlatFormData &&
        window['Hi5'].PlatFormData.products &&
        window['Hi5'].PlatFormData.products[key]) {
      item = item || {};
      item.key = key;
      item.pid = window['Hi5'].PlatFormData.products[key].pid;
    }
    return item;
  },

  // 광고 정보 가져오기 (플랫폼 데이터 병합)
  getAd: function(key) {
    var item = this.Ad[key];
    if (window['Hi5'] && window['Hi5'].PlatFormData &&
        window['Hi5'].PlatFormData.ads &&
        window['Hi5'].PlatFormData.ads[key]) {
      item = item || {};
      item.key = key;
      item.aid = window['Hi5'].PlatFormData.ads[key].aid;
    }
    return item;
  }
};

module.exports = Hi5Helper;
```

---

## 3. AppEntry.js - 게임 진입점 (Entry Point)

로딩 씬의 메인 컴포넌트에 추가하세요:

```javascript
var Hi5 = require("hi5");
var Hi5Helper = require("hi5Helper");

cc.Class({
  extends: cc.Component,

  properties: {
    loadingBar: cc.ProgressBar
  },

  onLoad: function() {
    // 전역 참조 설정
    cc.appEntry = this;

    // 네임스페이스 초기화 (프로젝트에 맞게 수정)
    cc.game.data = cc.game.data || {};

    // Hi5 SDK 초기화
    this.initHi5SDK();
  },

  // ============ Hi5 SDK 초기화 ============

  initHi5SDK: function() {
    console.log("[AppEntry] Initializing Hi5 SDK...");

    // 전역 Hi5 설정
    window['Hi5'] = Hi5;

    // 로컬 초기 데이터 (필요시)
    var localGameData = {};

    // SDK 초기화 및 콜백 등록
    window['Hi5'].Init_SDK(this.onHi5Message.bind(this), localGameData);

    // 로딩 완료 알림
    window['Hi5'].LoadEnd();

    console.log("[AppEntry] Hi5 SDK initialized, waiting for GAME_DATA...");
  },

  // ============ Hi5 메시지 핸들러 (핵심!) ============

  onHi5Message: function(data) {
    var Hi5 = window['Hi5'];
    console.log("[Hi5] Message:", data.fromhi5action);

    switch (data.fromhi5action) {

      // -------- 게임 데이터 수신 --------
      case Hi5.MESSAGE.GAME_DATA:
        this.onGameData(data.data);
        break;

      // -------- 광고 로드 결과 --------
      case Hi5.MESSAGE.LOAD_AD:
        if (data.data.status === 0) {
          console.log("[Hi5] Ad loaded, showing...");
          this.pauseAudio();
          Hi5.showAd(Hi5.lastAd);
        } else {
          console.error("[Hi5] Ad load failed:", data.data.msg);
          this.onAdResult(false);
          Hi5.lastAd = undefined;
        }
        break;

      // -------- 광고 표시 결과 --------
      case Hi5.MESSAGE.SHOW_AD:
        if (data.data.status === 0) {
          var adType = data.data.type;

          if (adType === "show" || adType === "userEarnedReward") {
            Hi5.lastShowAd = true;
          } else if (adType === "dismissed") {
            var success = Hi5.lastShowAd;
            this.onAdResult(success);
            Hi5.lastShowAd = false;
            Hi5.lastAd = undefined;
            this.resumeAudio();
          }
        } else {
          console.error("[Hi5] Ad show failed:", data.data.msg);
          this.onAdResult(false);
          Hi5.lastAd = undefined;
          this.resumeAudio();
        }
        break;

      // -------- 구매 결과 --------
      case Hi5.MESSAGE.BUY_ITEM:
        if (data.data.status === 0 && Hi5.lastProduct) {
          this.onPurchaseSuccess(Hi5.lastProduct);
        } else {
          this.onPurchaseFailed(data.data.msg);
        }
        Hi5.lastProduct = undefined;
        break;

      // -------- 점수 제출 결과 --------
      case Hi5.MESSAGE.SUBMIT_SCORE:
        console.log("[Hi5] Score submitted:", data.data);
        break;

      // -------- 랭킹 표시 결과 --------
      case Hi5.MESSAGE.SHOW_RANK:
        console.log("[Hi5] Rank shown:", data.data);
        break;

      // -------- 상품 목록 --------
      case Hi5.MESSAGE.ITEM_LIST:
        console.log("[Hi5] Product list:", data.data.products);
        break;

      // -------- 공유 결과 --------
      case Hi5.MESSAGE.SHARE_TEXT:
      case Hi5.MESSAGE.SHARE_APP_LINK:
        console.log("[Hi5] Share result:", data.data);
        break;

      // -------- 초대 보상 --------
      case Hi5.MESSAGE.INVITE_FRIEND_REWARDS:
        if (data.data.status === 0) {
          console.log("[Hi5] Invite reward:", data.data.reward);
        }
        break;

      // -------- SDK 메인 메뉴 이벤트 --------
      case Hi5.MESSAGE.START_GAME:
        this.onStartGame();
        break;

      case Hi5.MESSAGE.RESTART_GAME:
        this.onRestartGame();
        break;

      case Hi5.MESSAGE.SOUND:
        this.onSoundToggle(data.data.sound === 'on');
        break;

      case Hi5.MESSAGE.GAME_SETTINGS:
        this.onGameSettings();
        break;
    }
  },

  // ============ GAME_DATA 처리 ============

  onGameData: function(data) {
    console.log("[AppEntry] GAME_DATA received");

    // 저장 키 이름 (프로젝트에 맞게 수정)
    var SAVE_KEY = 'mySaveData';

    if (data.game_data && data.game_data[SAVE_KEY]) {
      // 기존 데이터 복원
      var savedData = data.game_data[SAVE_KEY];

      try {
        if (typeof savedData === 'string') {
          savedData = JSON.parse(savedData);
        }

        console.log("[AppEntry] Restoring saved data...");
        cc.game.data.player = savedData;

        // 복원 후 처리 (프로젝트에 맞게 수정)
        this.onDataRestored();

      } catch (e) {
        console.error("[AppEntry] Failed to parse saved data:", e);
        this.createNewGame();
      }
    } else {
      // 새 게임 생성
      console.log("[AppEntry] No saved data, creating new game...");
      this.createNewGame();
    }

    // 초기화 완료 후 메인 씬으로 이동
    this.goToMainScene();
  },

  createNewGame: function() {
    // 새 플레이어 데이터 생성 (프로젝트에 맞게 수정)
    cc.game.data.player = {
      level: 1,
      gold: 0,
      createTime: Date.now()
    };

    // 즉시 저장
    this.saveGameData();
  },

  onDataRestored: function() {
    // 데이터 복원 후 추가 처리 (프로젝트에 맞게 수정)
    console.log("[AppEntry] Data restored successfully");
  },

  goToMainScene: function() {
    // 메인 씬으로 이동 (프로젝트에 맞게 수정)
    cc.director.loadScene("mainScene");
  },

  // ============ 데이터 저장 ============

  saveGameData: function() {
    var SAVE_KEY = 'mySaveData';
    var dataStr = JSON.stringify(cc.game.data.player);
    window['Hi5'].setItem(SAVE_KEY, dataStr);
  },

  saveAllData: function() {
    this.saveGameData();
    window['Hi5'].SaveData();
  },

  // ============ 광고 처리 ============

  // 광고 콜백 저장용
  _adCallback: null,

  // 보상형 광고 요청
  showRewardAd: function(adKey, callback) {
    var ad = Hi5Helper.getAd(adKey);

    if (!ad) {
      console.error("[AppEntry] Ad not found:", adKey);
      callback && callback(false);
      return;
    }

    this._adCallback = callback;
    window['Hi5'].loadAd(ad);
  },

  // 광고 결과 처리
  onAdResult: function(success) {
    console.log("[AppEntry] Ad result:", success);

    if (this._adCallback) {
      this._adCallback(success);
      this._adCallback = null;
    }
  },

  // ============ 인앱결제 처리 ============

  _purchaseCallback: null,

  // 상품 구매 요청
  purchaseItem: function(productKey, callback) {
    var product = Hi5Helper.getProduct(productKey);

    if (!product) {
      console.error("[AppEntry] Product not found:", productKey);
      callback && callback(false, null);
      return;
    }

    this._purchaseCallback = callback;
    window['Hi5'].purchaseProduct(product);
  },

  onPurchaseSuccess: function(product) {
    console.log("[AppEntry] Purchase success:", product.key);

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

    if (this._purchaseCallback) {
      this._purchaseCallback(true, product);
      this._purchaseCallback = null;
    }
  },

  onPurchaseFailed: function(msg) {
    console.error("[AppEntry] Purchase failed:", msg);

    if (this._purchaseCallback) {
      this._purchaseCallback(false, null);
      this._purchaseCallback = null;
    }
  },

  // ============ 게임 이벤트 ============

  onStartGame: function() {
    // SDK 메인메뉴에서 게임 시작 클릭 시
    console.log("[AppEntry] Start game from SDK menu");
  },

  onRestartGame: function() {
    // SDK 메인메뉴에서 다시 시작 클릭 시
    console.log("[AppEntry] Restart game from SDK menu");
  },

  onSoundToggle: function(isOn) {
    // SDK에서 사운드 토글 시
    console.log("[AppEntry] Sound toggle:", isOn);
  },

  onGameSettings: function() {
    // SDK에서 설정 호출 시
    console.log("[AppEntry] Game settings requested");
  },

  // ============ 오디오 제어 ============

  pauseAudio: function() {
    cc.audioEngine.pauseMusic();
    cc.audioEngine.pauseAllEffects();
  },

  resumeAudio: function() {
    cc.audioEngine.resumeMusic();
    cc.audioEngine.resumeAllEffects();
  },

  // ============ 라이프사이클 ============

  start: function() {
    // PersistRootNode로 설정 (씬 전환 시 유지)
    cc.game.addPersistRootNode(this.node);

    // 게임 숨김/표시 이벤트
    this.setupLifecycleEvents();
  },

  setupLifecycleEvents: function() {
    var self = this;

    // Hi5 플랫폼
    if (window['Hi5'] && window['Hi5'].getPlatform) {
      window.addEventListener('blur', function() {
        self.onGameHide();
      });
      window.addEventListener('focus', function() {
        self.onGameShow();
      });
    }
    // 기타 플랫폼
    else {
      cc.game.on(cc.game.EVENT_HIDE, function() {
        self.onGameHide();
      });
      cc.game.on(cc.game.EVENT_SHOW, function() {
        self.onGameShow();
      });
    }
  },

  onGameHide: function() {
    console.log("[AppEntry] Game hide");
    this.pauseAudio();
    this.saveAllData();
  },

  onGameShow: function() {
    console.log("[AppEntry] Game show");
    this.resumeAudio();
  },

  // ============ SafeArea 폴리필 ============

  polyfillSafeArea: function() {
    var safeArea = window['Hi5'] ? window['Hi5'].getSafeArea() : null;

    if (!safeArea || (!safeArea.top && !safeArea.bottom)) {
      cc.sys.getSafeAreaRect = function() {
        var size = cc.view.getVisibleSize();
        return cc.rect(0, 0, size.width, size.height);
      };
    }
  }
});
```

---

## 4. 사용 예시

### 광고 표시
```javascript
cc.appEntry.showRewardAd('reward_gold', function(success) {
  if (success) {
    // 보상 지급
    cc.game.data.player.gold += 100;
    cc.appEntry.saveGameData();
  }
});
```

### 상품 구매
```javascript
cc.appEntry.purchaseItem('gold_500', function(success, product) {
  if (success) {
    console.log("구매 완료:", product.key);
  }
});
```

### 점수 제출
```javascript
window['Hi5'].submitScore(12345);
```

### 랭킹 표시
```javascript
window['Hi5'].showRank();
```

### 데이터 저장
```javascript
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

- [ ] `assets/Hi5/hi5.js` 생성
- [ ] `assets/Hi5/hi5Helper.js` 생성 (상품/광고 키 설정)
- [ ] `assets/Hi5/Hi5Crypto.js` 생성 (암호화 키 설정)
- [ ] 로딩 씬에 Entry 컴포넌트 추가
- [ ] `onHi5Message` 핸들러 구현
- [ ] 저장 키(SAVE_KEY) 결정
- [ ] `createNewGame`에서 초기 데이터 구조 정의
- [ ] 구매 처리 로직 구현 (`onPurchaseSuccess`)
- [ ] 광고 콜백 처리 구현
- [ ] 게임 숨김 시 자동 저장 확인
- [ ] 암호화 키 변경 (`Hi5Crypto._secretKey`)

---

## 7. 데이터 암호화 (Hi5Crypto)

### Hi5Crypto.js 사용법

```javascript
var Hi5Crypto = require("Hi5Crypto");

// 1. 암호화 키 설정 (필수! 프로젝트별로 다르게)
Hi5Crypto.setSecretKey('MyProject_SecretKey_2024!@#');
```

### 기본 암호화/복호화

```javascript
// 문자열 암호화
var encrypted = Hi5Crypto.encrypt('Hello World');
console.log(encrypted);  // 'a8Hk3j...' (암호화된 문자열)

// 문자열 복호화
var decrypted = Hi5Crypto.decrypt(encrypted);
console.log(decrypted);  // 'Hello World'
```

### 객체 암호화/복호화

```javascript
var playerData = {
  level: 10,
  gold: 5000,
  items: ['sword', 'shield']
};

// 객체 암호화
var encrypted = Hi5Crypto.encryptObject(playerData);

// 객체 복호화
var decrypted = Hi5Crypto.decryptObject(encrypted);
console.log(decrypted.level);  // 10
```

### 패키징 (암호화 + 해시 검증) - 권장

```javascript
var playerData = {
  level: 10,
  gold: 5000
};

// 패키징 (암호화 + 무결성 해시)
var packed = Hi5Crypto.pack(playerData);

// 언패키징 (검증 + 복호화)
var unpacked = Hi5Crypto.unpack(packed);

if (unpacked === null) {
  // 데이터 변조 감지됨!
  console.error('Data has been tampered!');
} else {
  console.log(unpacked.level);  // 10
}
```

### Hi5 SDK와 함께 사용 (AppEntry.js 수정)

```javascript
var Hi5Crypto = require("Hi5Crypto");

// 암호화 키 설정
Hi5Crypto.setSecretKey('MyGameSecretKey!@#2024');

// ============ 데이터 저장 (암호화) ============
saveGameData: function() {
  // pack()으로 암호화 + 해시 추가
  var packedData = Hi5Crypto.pack(cc.game.data.player);
  window['Hi5'].setItem(this.SAVE_KEY, packedData);
},

// ============ 데이터 로드 (복호화) ============
onGameData: function(data) {
  if (data.game_data && data.game_data[this.SAVE_KEY]) {
    var packedData = data.game_data[this.SAVE_KEY];

    // unpack()으로 검증 + 복호화
    var playerData = Hi5Crypto.unpack(packedData);

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
},
```

### 암호화 옵션

| 메서드 | 용도 | 보안 수준 | 성능 |
|--------|------|-----------|------|
| `encrypt/decrypt` | 문자열 암호화 | 중 | 빠름 |
| `encryptObject/decryptObject` | 객체 암호화 | 중 | 빠름 |
| `pack/unpack` | 암호화 + 해시 검증 | 높음 | 보통 |
| `packLight/unpackLight` | 해시만 (암호화 없음) | 낮음 | 매우 빠름 |

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


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->