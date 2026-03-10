// Cocos Creator 환경 변수 체크
var EDITOR = typeof cc !== 'undefined' && cc.EDITOR;

var Helper = function() {
  this.debugInfo = [];
  this.index = 0;
  this.searchIndex = 0;
  this.Language = "English";
  
  this.Product = {
    gold: {pid: 'gold', amount: 15000, price: '￦4,400'},
    ads: {pid: 'ads', amount: 1, price: '￦3,300'}
  };
  
  this.Ad = {
    reward_Tips: {aid: 'reward_Tips', amount: 1, max: 5},
    reward_Refresh: {aid: 'reward_Refresh', amount: 1, max: 5},
    reward_Login: {aid: 'reward_Login', amount: 1000, max: 5},
    default_ad: {aid: 'default_ad', amount: 1, max: -1}
  };
};

Helper.prototype.getProduct = function(key) {
  var item = this.Product[key];
  if (window['Hi5'] && window['Hi5'].PlatFormData && window['Hi5'].PlatFormData.products && window['Hi5'].PlatFormData.products.hasOwnProperty(key)) {
    item = item || {};
    item['key'] = key;
    item['pid'] = window['Hi5'].PlatFormData.products[key].pid;
  }
  return item;
};

Helper.prototype.getAd = function(key) {
  var item = this.Ad[key];
  if (window['Hi5'] && window['Hi5'].PlatFormData && window['Hi5'].PlatFormData.ads && window['Hi5'].PlatFormData.ads.hasOwnProperty(key)) {
    item = item || {};
    item['key'] = key;
    item['aid'] = window['Hi5'].PlatFormData.ads[key].aid;
  }
  // 디버그 모드일 때는 key를 항상 설정 (Mock 환경에서도 동작하도록)
  if (isDebugMode() && item && !item['key']) {
    item['key'] = key;
  }
  return item;
};

/** debug info */
Helper.prototype.pushDebugInfo = function(str) {
  this.debugInfo.push(str);
  if (this.debugInfo.length > 10000) {
    this.debugInfo.shift();
  }
};

Helper.prototype.getDebugInfo = function() {
  return this.debugInfo;
};

Helper.prototype.clearDebugInfo = function() {
  this.debugInfo.splice(0);
};

/** create and get index */
Helper.prototype.getTileIndex = function() {
  return this.index++;
};

Helper.prototype.getSearchIndex = function() {
  return this.searchIndex++;
};

Helper.prototype.getGold = function() {
  var gold = 0;
  if (window.StorageHelper && window.StorageHelperKey) {
    gold = window.StorageHelper.getData(window.StorageHelperKey.Gold, 0);
  } else if (window['Hi5']) {
    gold = window['Hi5'].getItem('Gold', 0);
  }
  console.log("gold:" + gold);
  return gold;
};

Helper.prototype.setGold = function(gold) {
  var curent = +this.getGold();
  if (window.StorageHelper && window.StorageHelperKey) {
    window.StorageHelper.setData(window.StorageHelperKey.Gold, (gold + curent));
  } else if (window['Hi5']) {
    window['Hi5'].setItem('Gold', (gold + curent));
  }
  
  // TODO: App.event.emit 구현 필요
  // App.event.emit(EventName.Game.UpdataGold)
  if (typeof cc !== 'undefined' && cc.butler && cc.butler.node) {
    cc.butler.node.emit("gold-update");
  }
  
  // TODO: App.audio 구현 필요
  // if (gold > 0) {
  //   App.audio.play('coinin');
  // } else {
  //   App.audio.play('coinout');
  // }
  
  // window['Hi5'].SaveData();
};

/** 显示失败界面 */
Helper.prototype.showLoseView = function() {
  // TODO: App.view 구현 필요
  // App.view.openView(ViewName.Single.eResultView, false);
  console.log("showLoseView - TODO: 구현 필요");
};

var GlobalFuncHelper = new Helper();

/**
 * 디버그 모드 체크 함수
 * @returns 디버그 모드 여부
 */
function isDebugMode() {
  if (typeof window === 'undefined') return false;
  
  var urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === 'true' || 
         urlParams.get('skipSDK') === 'true' ||
         (typeof localStorage !== 'undefined' && localStorage.getItem('H5_DEBUG_MODE') === 'true') ||
         (typeof EDITOR !== 'undefined' && EDITOR);
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GlobalFuncHelper: GlobalFuncHelper,
    isDebugMode: isDebugMode
  };
}

// ========== StorageHelper ==========

/** 本地储存key */
var StorageKey = function() {
  this.Audio_Open = 'Audio_Open';
  this.Audio_Volume = 'Audio_Volume';
  /** 背景音乐开关 */
  this.Music_Status = "Music_Status";
  /** 音效开关 */
  this.Music_Eff_Status = "Music_Eff_Status";
  /** 震动开关 */
  this.Zhen_Dong_Status = "Zhen_Dong_Status";
  /** (收集模式)当前关卡ID */
  this.LevelId = "LevelId_2";
  /** 星数 */
  this.StarScore = "StarScore";
  /** 等级奖励 */
  this.LevelReward = "LevelReward";
  /** 金币 */
  this.Gold = "Gold";
  /** 刷新道具  */
  this.RefreshTools = "RefreshTools";
  /** 提示道具  */
  this.TipsTool = "TipsTool";
  /** 撤回道具  */
  this.ReplaceTool = "ReplaceTool";
  this.Date = "Date";
  /** 抽奖次数 */
  this.LuckSpinTimes = "LuckSpinTimes";
  /** 抽奖5次奖励 */
  this.isGotLuckBox = "isGotLuckBox";
  /** 签到次数 */
  this.SignTimes = "SignTimes";
  /** 是否已领取签到奖励 */
  this.isGotSignReward = "isGotSignReward";
  /** isGotks快手侧边栏奖励 */
  this.KuaishouCebianReward = "KuaishouCebianReward";
  this.KuoZhanGrid = "KuoZhanGrid";
  this.Cur_language = "Cur_language";
  this.sign = "sign";
  this.signDay = "signDay";
  this.FreeTimes = "FreeTimes";
  /** 已经授权 */
  this.IsAuthored = "IsAuthored";
  /** 광고제거 */
  this.Ads = "Ads";
};

var StorageHelper = function() {};

/** 初始化一些必要的设置 */
StorageHelper.prototype.initData = function() {
  var StorageHelperKey = window.StorageHelperKey;
  if (!StorageHelperKey) {
    console.error("StorageHelperKey is not defined");
    return;
  }
  
  var data = window['Hi5'].getItem(StorageHelperKey.LevelId);
  if (data === undefined || data == null) {
    window['Hi5'].setItem(StorageHelperKey.Music_Status, "1", false);
    window['Hi5'].setItem(StorageHelperKey.Music_Eff_Status, "1", false);
    window['Hi5'].setItem(StorageHelperKey.Zhen_Dong_Status, "1", false);
    window['Hi5'].setItem(StorageHelperKey.LevelId, 1, false);
    window['Hi5'].setItem(StorageHelperKey.Gold, 2000, false);
    window['Hi5'].setItem(StorageHelperKey.RefreshTools, 0, false);
    window['Hi5'].setItem(StorageHelperKey.TipsTool, 0, false);
    window['Hi5'].setItem(StorageHelperKey.ReplaceTool, 2, false);
    window['Hi5'].setItem(StorageHelperKey.StarScore, 0, false);
    window['Hi5'].setItem(StorageHelperKey.FreeTimes, 3, false);
    window['Hi5'].SaveData();
  }
  
  // TODO: ToolsHelper.checkIsSameDay 구현 필요
  // let isSameDay = ToolsHelper.checkIsSameDay("9991");
  var isSameDay = false; // 임시 구현
  if (!isSameDay) {
    window['Hi5'].setItem(StorageHelperKey.KuaishouCebianReward, "0");
    window['Hi5'].setItem(StorageHelperKey.FreeTimes, 3);
  }
};

StorageHelper.prototype.getBooleanData = function(key, defData) {
  var data = this.getData(key, defData);
  if (!data) {
    return false;
  }
  return !!+data;
};

StorageHelper.prototype.setBooleanData = function(key, defData) {
  // '1'表示true, '0'表示false
  var data = defData ? '1' : '0';
  window['Hi5'].setItem(key, data);
  
  var StorageHelperKey = window.StorageHelperKey;
  if (key == StorageHelperKey.Music_Status) {
    // TODO: App.audio 구현 필요
    // if (defData) {
    //   App.audio.resumeMusic();
    // } else {
    //   App.audio.stopMusic();
    // }
    if (typeof cc !== 'undefined' && cc.butler) {
      if (defData) {
        cc.butler.resumeMusic();
      } else {
        cc.butler.pauseMusic();
      }
    }
  }
};

StorageHelper.prototype.getData = function(key, defData) {
  if (!key) {
    console.error("StorageHelper: storage key cannot be empty");
    return;
  }
  
  var data = window['Hi5'].getItem(key);
  if (data === undefined || data == null) {
    return defData;
  }
  
  return data;
};

StorageHelper.prototype.setData = function(key, data) {
  if (!key) {
    console.error("StorageHelper: storage key cannot be empty");
    return;
  }
  
  if (!data && data != 0) {
    console.error("StorageHelper: data is empty");
    return;
  }
  
  window['Hi5'].setItem(key, data, false);
};

var StorageHelperInstance = new StorageHelper();
var StorageHelperKeyInstance = new StorageKey();

// 전역 변수로도 사용 가능하도록
if (typeof window !== 'undefined') {
  window.GlobalFuncHelper = GlobalFuncHelper;
  window.isDebugMode = isDebugMode;
  window.StorageHelper = StorageHelperInstance;
  window.StorageHelperKey = StorageHelperKeyInstance;
}

// 모듈 내보내기 업데이트
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GlobalFuncHelper: GlobalFuncHelper,
    isDebugMode: isDebugMode,
    StorageHelper: StorageHelperInstance,
    StorageHelperKey: StorageHelperKeyInstance
  };
}

