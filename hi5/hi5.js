// Hi5 SDK 정의
var Hi5 = {
  MESSAGE: {
    //game -> sdk
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
    //sdk -> game
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
  GameData: {
    high_score: 0,
    score: 0
  },
  UserData: {},
  PlatFormData: {},
  current_time: 0,
  callback: null,
  lastProductId: '',
  lastShowAd: false,
  lastProduct: undefined,
  lastAd: undefined,

  // v1.0.12 추가: 콜백 지원
  lastPurchaseCallback: undefined,
  lastAdCallback: null,
  onlyLoad: false,

  // 커스텀: 플랫폼 감지 및 데이터 보호
  _isRealHi5Platform: false,
  _initialGameData: {},
  _dataCorrupted: false,
  // 커스텀: 플랫폼 확인
  isRealPlatform: function() {
    return this._isRealHi5Platform;
  },
  Init_GameData: function(localGameData) {
    window['Hi5'] = this;
    this.current_time = Math.round(new Date().getTime() / 1000);

    // 커스텀: 플랫폼 감지
    try {
      this._isRealHi5Platform = (window.self !== window.top) && (typeof window.parent.postMessage === 'function');
    } catch (e) {
      this._isRealHi5Platform = false;
    }
    console.log("[Hi5] Platform detection - isRealPlatform:", this._isRealHi5Platform);

    // 커스텀: 초기 데이터 백업
    this._initialGameData = JSON.parse(JSON.stringify(localGameData));

    for (var key in localGameData) {
      this.GameData[key] = localGameData[key];
    }
    var self = this;
    setInterval(function() {
      self.current_time++;
    }, 1000);
  },
  Init_OnMessage: function(callback) {
    this.callback = callback;
    var self = this;
    window.addEventListener('message', function(event) {
      self._OnMessage(event);
    });

    // 커스텀: 에러 핸들러 설정
    this._setupErrorHandler();

    this.PostMessage(this.MESSAGE.INIT_SDK, this.GameData);
  },
  // 커스텀: 에러 핸들러 설정
  _setupErrorHandler: function() {
    var self = this;

    // 실제 Hi5 플랫폼에서만 에러 핸들러 활성화
    if (!self._isRealHi5Platform) {
      console.log('[Hi5] Error handler disabled (not real Hi5 platform)');
      return;
    }

    window.addEventListener('error', function(event) {
      if (event.message && event.message.indexOf('JSON') !== -1 &&
          (event.message.indexOf('position') !== -1 || event.message.indexOf('SyntaxError') !== -1) &&
          event.message.indexOf('GameData') !== -1) {
        console.error('[Hi5] JSON parsing error detected, resetting game data...');
        self._dataCorrupted = true;
        self.resetGameData();
      }
    });

    window.addEventListener('unhandledrejection', function(event) {
      if (event.reason && event.reason.message &&
          event.reason.message.indexOf('JSON') !== -1 &&
          event.reason.message.indexOf('GameData') !== -1) {
        console.error('[Hi5] JSON parsing error in promise, resetting game data...');
        self._dataCorrupted = true;
        self.resetGameData();
      }
    });
  },
  // 커스텀: 게임 데이터 리셋
  resetGameData: function() {
    console.log('[Hi5] Resetting game data to initial values...');
    this.GameData = JSON.parse(JSON.stringify(this._initialGameData));
    this.SaveData();
    console.log('[Hi5] Game data reset complete. New data:', this.GameData);
  },
  Init_SDK: function(callback, localGameData) {
    this.Init_GameData(localGameData);
    this.Init_OnMessage(callback);
  },
  _OnMessage: function(event) {
    if (!event.data) return;
    if (!event.data.fromhi5action) return;
    if (event.data.fromhi5action == this.MESSAGE.GAME_DATA) {
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
  getItem: function(key, defalut) {
    defalut = defalut || undefined;
    return this.GameData[key] !== undefined ? this.GameData[key] : defalut;
  },
  setItem: function(key, value, submit) {
    submit = submit !== undefined ? submit : true;
    console.log({key: key, value: value});
    this.GameData[key] = value;
    if (submit) {
      // 이중 문자열화 방지: 문자열 값이 JSON 형식이면 파싱해서 객체로 변환
      var valueToSend = value;
      if (value !== null && value !== undefined && typeof value === 'string') {
        var trimmed = value.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            valueToSend = JSON.parse(value);
          } catch (e) {
            // 파싱 실패 시 원본 문자열 유지
            valueToSend = value;
          }
        }
      }
      this.PostMessage(this.MESSAGE.DATA_SET_ITEM, {key: key, value: valueToSend});
    }
  },
  SaveData: function() {
    // GameData를 복사하여 전송 (이중 문자열화 방지)
    // 문자열로 저장된 JSON 값들을 파싱해서 객체로 변환
    var dataToSend = {};
    for (var key in this.GameData) {
      if (this.GameData.hasOwnProperty(key)) {
        var value = this.GameData[key];
        // null이거나 undefined가 아니고, 문자열이고, JSON 형식인 경우 파싱
        if (value !== null && value !== undefined && typeof value === 'string') {
          // JSON 형식인지 확인 (시작이 { 또는 [)
          var trimmed = value.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              // JSON 문자열을 파싱해서 객체로 변환
              dataToSend[key] = JSON.parse(value);
            } catch (e) {
              // 파싱 실패 시 원본 문자열 유지
              dataToSend[key] = value;
            }
          } else {
            // JSON 형식이 아니면 그대로 유지
            dataToSend[key] = value;
          }
        } else {
          // 문자열이 아니면 그대로 유지
          dataToSend[key] = value;
        }
      }
    }
    // 파싱된 객체를 전송 (postMessage가 자동으로 JSON.stringify)
    this.PostMessage(this.MESSAGE.SAVE_DATA, dataToSend);
  },
  getTime: function() {
    return this.current_time;
  },
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
  getProductItemList: function() {
    this.PostMessage(this.MESSAGE.ITEM_LIST, {});
  },
  purchaseProduct: function(product, callback) {
    if (this.lastProduct) {
      return;
    }
    if (!product.hasOwnProperty('pid')) {
      alert('pid not found.');
      return;
    }
    this.lastProduct = product;
    this.lastPurchaseCallback = callback;
    this.PostMessage(this.MESSAGE.BUY_ITEM, {productId: this.lastProduct.pid});
  },
  // v1.0.12 추가: 구매 완료 콜백
  purchaseEnd: function(data) {
    if (this.lastPurchaseCallback) {
      this.lastPurchaseCallback(data);
      this.lastPurchaseCallback = undefined;
    }
    this.lastProduct = undefined;
  },
  loadAd: function(ad) {
    if (!ad.hasOwnProperty('aid')) {
      alert('aid not found.');
      return;
    }
    this.lastShowAd = false;
    this.lastAd = ad;
    this.onlyLoad = true;
    this.PostMessage(this.MESSAGE.LOAD_AD, {adGroupId: this.lastAd.aid});
  },
  showAd: function(ad) {
    if (!ad.hasOwnProperty('aid')) {
      alert('aid not found.');
      return;
    }
    this.lastShowAd = false;
    this.lastAd = ad;
    this.onlyLoad = false;
    this.PostMessage(this.MESSAGE.SHOW_AD, {adGroupId: this.lastAd.aid});
  },
  // v1.0.12 추가: 광고 콜백 방식
  showAdCallback: function(ad, callback) {
    if (this.lastAd) {
      return;
    }
    if (!ad.hasOwnProperty('aid')) {
      alert('aid not found.');
      return;
    }
    this.lastShowAd = false;
    this.lastAd = ad;
    this.onlyLoad = false;
    this.lastAdCallback = callback;
    this.PostMessage(this.MESSAGE.LOAD_AD, {adGroupId: this.lastAd.aid});
  },
  // v1.0.12 추가: 광고 종료 콜백
  ShowAdEnd: function(data) {
    if (this.lastAdCallback) {
      this.lastAdCallback(data);
      this.lastAdCallback = null;
    }
    this.lastShowAd = false;
    this.lastAd = undefined;
  },
  submitScore: function(score) {
    this.PostMessage(this.MESSAGE.SUBMIT_SCORE, {score: score});
  },
  showRank: function() {
    this.PostMessage(this.MESSAGE.SHOW_RANK, {});
  },
  vibration: function() {
    this.PostMessage(this.MESSAGE.VIBRATION, {});
  },
  setDeviceOrientation: function(type) {
    type = type || 'portrait';
    this.PostMessage(this.MESSAGE.SET_Orientation, {type: type});
  },
  shareText: function(message) {
    message = message || '';
    this.PostMessage(this.MESSAGE.SHARE_TEXT, {message: message});
  },
  shareAppLink: function(appname, uri) {
    appname = appname || '';
    uri = uri || '';
    this.PostMessage(this.MESSAGE.SHARE_APP_LINK, {appname: appname, uri: uri});
  },
  inviteRewards: function(id) {
    this.PostMessage(this.MESSAGE.INVITE_FRIEND_REWARDS, {id: id});
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
  ShowMainMenu: function(mode) {
    var self = this;
    setTimeout(function() {
      var _data = {
        mode: mode
      };
      self.PostMessage(self.MESSAGE.SHOW_MAIN_MENU, _data);
    }, 100);
  },
  PostMessage: function(action, data) {
    if (window.self != window.top) {
      window.parent.postMessage({tohi5action: action, data: data}, "*");
    } else {
      window.postMessage({tohi5action: action, data: data}, "*");
    }
  },
  log: function(text) {
    console.log(JSON.stringify(text));
  }
};

// 디버그 모드 체크 함수 (필요시 구현)
function isDebugMode() {
  // 개발 환경 체크 로직 추가 가능
  return false;
}

cc.pvz = cc.pvz || {};
cc.pvz.Hi5 = Hi5;
module.exports = Hi5;

