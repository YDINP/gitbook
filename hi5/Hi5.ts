// Hi5 SDK 모듈 - Cocos Creator 호환 export
const _Hi5: any = {
    //
    MESSAGE:{
        //game -> sdk
        INIT_SDK : "INIT_SDK", // 게임 로딩 전 초기화
        LOAD_END : "LOAD_END", // 게임 로딩 끝낫을때 호출 , 초기화
        GAME_START: "GAME_START",
        GAME_END: "GAME_END",
        SHOW_HELP: "SHOW_HELP",
        SAVE_DATA : "SAVE_DATA",
        SHOW_MAIN_MENU: "SHOW_MAIN_MENU",
        // GET_RANK : "GET_RANK",// 링킹 정보 요청.

        //
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
        GAME_DATA : "GAME_DATA", // 게임 정보




        //
        START_GAME: "START_GAME", // 게임시작
	    RESTART_GAME: "RESTART_GAME", // 게임 재시작
        SOUND : "SOUND",  //
        RANK_DATA : "RANK_DATA",
    	GAME_SETTINGS : "GAME_SETTINGS",

    },
    MainMenuType:{
        GAME_FIRST: "GAME_FIRST",
        GAME_END: "GAME_END",
    },
    GameData:{
        high_score: 0, // 최고 점수. [고정]
        score: 0,    // 현재 점수. [고정]
        // 기타 데이타
    },
    _initialGameData: {}, // 초기 게임 데이터 백업
    _dataCorrupted: false, // 데이터 손상 플래그
    _isRealHi5Platform: false, // 실제 Hi5 플랫폼 여부 (iframe 내부에서 실행 중인지)
    UserData:{},
    PlatFormData:{},
    current_time:0,
    callback: null,

    lastProductId: '',
    lastShowAd: false,

    lastProduct: undefined as any,
    lastAd: undefined as any,

    // v1.0.12 추가: 콜백 지원
    lastPurchaseCallback: undefined as ((data: any) => void) | undefined,
    lastAdCallback: null as ((data: any) => void) | null,
    onlyLoad: false,

    // 실제 Hi5 플랫폼에서 실행 중인지 확인
    isRealPlatform() {
        return this._isRealHi5Platform;
    },

    // Init_SDK 으로 한번에 초기화 할수 없는 상황 .
    // 먼저 저장하는 데이터 구조 초기화 , 다음 onMessage 콜백 함수 초기화 .
    Init_GameData(localGameData) {
        window['Hi5'] = this;
        this.current_time = Math.round(new Date().getTime() / 1000);

        // 실제 Hi5 플랫폼 여부 확인 (iframe 내부에서 실행 중인지)
        try {
            this._isRealHi5Platform = (window.self !== window.top) && (typeof window.parent.postMessage === 'function');
        } catch (e) {
            this._isRealHi5Platform = false;
        }
        console.log("[Hi5] Platform detection - isRealPlatform:", this._isRealHi5Platform);

        // 초기 데이터 백업 (데이터 리셋용)
        this._initialGameData = JSON.parse(JSON.stringify(localGameData));
	    for(let key in localGameData){
			this.GameData[key] = localGameData[key];
		}
        setInterval(()=>{
            this.current_time++;//
        },1000);
    },
    Init_OnMessage(callback) {
        this.callback = callback;
        window.addEventListener('message', (event)=>{
            this._OnMessage(event);
        });

        // JSON 파싱 에러 감지 및 데이터 리셋 핸들러
        this._setupErrorHandler();

        this.PostMessage(this.MESSAGE.INIT_SDK, this.GameData);
    },
    // 에러 핸들러 설정 - JSON 파싱 에러 발생 시 데이터 리셋 (실제 Hi5 플랫폼에서만)
    _setupErrorHandler() {
        const self = this;

        // 실제 Hi5 플랫폼에서만 에러 핸들러 활성화
        if (!self._isRealHi5Platform) {
            console.log('[Hi5] Error handler disabled (not real Hi5 platform)');
            return;
        }

        window.addEventListener('error', function(event) {
            // JSON 파싱 에러 감지 (net_GameDataLoadEnd 관련)
            if (event.message && event.message.includes('JSON') &&
                (event.message.includes('position') || event.message.includes('SyntaxError')) &&
                event.message.includes('GameData')) {
                console.error('[Hi5] JSON parsing error detected, resetting game data...');
                self._dataCorrupted = true;
                self.resetGameData();
            }
        });

        // unhandledrejection 에러도 처리
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason && event.reason.message &&
                event.reason.message.includes('JSON') &&
                event.reason.message.includes('GameData')) {
                console.error('[Hi5] JSON parsing error in promise, resetting game data...');
                self._dataCorrupted = true;
                self.resetGameData();
            }
        });
    },
    // 게임 데이터 리셋 - 손상된 데이터를 초기값으로 복원
    resetGameData() {
        console.log('[Hi5] Resetting game data to initial values...');
        // GameData를 초기값으로 리셋
        this.GameData = JSON.parse(JSON.stringify(this._initialGameData));
        // 서버에 리셋된 데이터 저장
        this.SaveData();
        console.log('[Hi5] Game data reset complete. New data:', this.GameData);
    },
    // Hi5Game SDK 초기화
    Init_SDK(callback, localGameData) {
        this.Init_GameData(localGameData);
        this.Init_OnMessage(callback);
    },
    // on message 내부 처리.
    _OnMessage(event) {
        if (!event.data) return;
        if (!event.data.fromhi5action) return;
        // console.log('Message received:', event.data);
        // console.log('Is trusted:', event.isTrusted);
        if(event.data.fromhi5action == this.MESSAGE.GAME_DATA){
            if(event.data.data.game_data){
                this.GameData = event.data.data.game_data;//
            }
            if(event.data.data.user_data){
                this.UserData = event.data.data.user_data;//
            }
            if(event.data.data.platform_data){
                this.PlatFormData = event.data.data.platform_data;//
            }
            if(event.data.data.current_time){
                // 서버 초 단위 타임.
                this.current_time = event.data.data.current_time;//
            }
        }
        this.callback(event.data);
    },
    // localStorage
    getItem(key, defalut=undefined) {
        return this.GameData[key] ?? defalut;
    },
    setItem(key, value, submit=true) {
        console.log({key, value});

        this.GameData[key] = value;
        if(submit){
            this.PostMessage(this.MESSAGE.DATA_SET_ITEM, {key:key, value:value});
        }
    },
    SaveData() {
         this.PostMessage(this.MESSAGE.SAVE_DATA, this.GameData);
    },
    // 서버 기준 초 단위 타임 리턴.
    getTime() {
        return this.current_time;
    },
    //Message_
    LoadEnd() {
        this.PostMessage(this.MESSAGE.LOAD_END, {});
    },

    GameStart() {
        this.PostMessage(this.MESSAGE.GAME_START, {});
    },

    GameEnd() {
        this.PostMessage(this.MESSAGE.GAME_END, {});
    },

    ShowHelp() {
        this.PostMessage(this.MESSAGE.SHOW_HELP, {});
    },
    
    GetRank() {
        this.PostMessage(this.MESSAGE.GET_RANK, {});
    },
    //
    getProductItemList() {
        this.PostMessage(this.MESSAGE.ITEM_LIST, {});
    },
    purchaseProduct(product: any, callback?: (data: any) => void) {
        if(this.lastProduct) {
            return;
        }
        if(!product.hasOwnProperty('pid')){
            alert('pid not found.');
            return;
        }
        this.lastProduct = product;
        this.lastPurchaseCallback = callback;
        this.PostMessage(this.MESSAGE.BUY_ITEM, {productId:this.lastProduct.pid});
    },
    // v1.0.12 추가: 구매 완료 콜백
    purchaseEnd(data: any) {
        if (this.lastPurchaseCallback) {
            this.lastPurchaseCallback(data);
            this.lastPurchaseCallback = undefined;
        }
        this.lastProduct = undefined;
    },
    loadAd(ad: any) {
        if(!ad.hasOwnProperty('aid')){
            alert('aid not found.');
            return;
        }
        this.lastShowAd = false;
        this.lastAd = ad;
        this.onlyLoad = true;
        this.PostMessage(this.MESSAGE.LOAD_AD, {adGroupId:this.lastAd.aid});
    },
    showAd(ad: any) {
        if(!ad.hasOwnProperty('aid')){
            alert('aid not found.');
            return;
        }
        this.lastShowAd = false;
        this.lastAd = ad;
        this.onlyLoad = false;
        this.PostMessage(this.MESSAGE.SHOW_AD, {adGroupId:this.lastAd.aid});
    },
    // v1.0.12 추가: 광고 콜백 방식
    showAdCallback(ad: any, callback: (data: any) => void) {
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
    ShowAdEnd(data: any) {
        if (this.lastAdCallback) {
            this.lastAdCallback(data);
            this.lastAdCallback = null;
        }
        this.lastShowAd = false;
        this.lastAd = undefined;
    },
    submitScore(score) {
        this.PostMessage(this.MESSAGE.SUBMIT_SCORE, {score:score});
    },
    showRank() {
        this.PostMessage(this.MESSAGE.SHOW_RANK, {});
    },
    vibration() {
        this.PostMessage(this.MESSAGE.VIBRATION, {});
    },
    //'portrait' | 'landscape';
    setDeviceOrientation(type='portrait') {
        this.PostMessage(this.MESSAGE.SET_Orientation, {type:type});
    },
    shareText(message='') {
        this.PostMessage(this.MESSAGE.SHARE_TEXT, {message:message});
    },
    shareAppLink(appname='', uri='') {
        this.PostMessage(this.MESSAGE.SHARE_APP_LINK, {appname:appname, uri:uri});
    },
    inviteRewards(id) {
        this.PostMessage(this.MESSAGE.INVITE_FRIEND_REWARDS, {id:id});
    },
    getPlatform(){// 현재 플래새폼 toss , kakao , hi5games 등
        return this.PlatFormData?.platform??'';
    },
    getOS(){// ios | android
        return this.PlatFormData?.os??'';
    },
    getDeviceid(){// string
        return this.PlatFormData?.deviceid??'';
    },
    isSupportVibration(){ // 0 진동지원 안함 , 1 진동 지원 함.
        return this.PlatFormData?.vibration??0;
    },
    getSafeArea(){
        return this.PlatFormData?.SafeArea??{"top":0, "bottom":0};
    },
    //
    ShowMainMenu(mode) {
        setTimeout(()=>{
            const _data = {
                mode: mode, // 게임 어느 시점에서 호출햇는지. 게임시작시 game_start, 게임 끝나고 game_end, 기타 other 
            }
            this.PostMessage(this.MESSAGE.SHOW_MAIN_MENU, _data);
        },100);
    },
    
    //
    PostMessage(action,data) {
        try {
            if(window.self != window.top && window.parent && typeof window.parent.postMessage === 'function'){
                window.parent.postMessage({tohi5action:action,data:data},"*");
            }else if(typeof window.postMessage === 'function'){
                window.postMessage({tohi5action:action,data:data},"*");
            }else{
                console.log("[Hi5] PostMessage not available (editor mode?):", action);
            }
        } catch (e) {
            console.log("[Hi5] PostMessage error (editor mode?):", action, e);
        }
    },

    log(text){
        //console.log(`%cGAME: %c${JSON.stringify(text)}`,'color: yellow;background:black;','color: white;background:black;')
        console.log(JSON.stringify(text))
    },
    // Hi5Game SDK 통신 End
}

// 전역 객체에 등록 (빌드 시 import 실패 대비)
if (typeof window !== 'undefined') {
    (window as any)['_Hi5Module'] = _Hi5;
}

// CommonJS와 ES6 모듈 모두 지원
export default _Hi5;
export { _Hi5 };