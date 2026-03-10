# LocalizationManager — CDN 기반 다국어 시스템

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

Cocos Creator 프로젝트에 런타임 다국어 지원을 추가하는 모듈.
CDN 기반 실시간 로컬라이징 데이터 로드, LocalStorage 캐싱, 동적 언어 변경을 지원한다.

---

## 파일 위치

```
~/.claude/skills/localization-manager/
├── LocalizationManager.ts       (TypeScript용)
├── LocalizationManager.js       (JavaScript용)
├── LocalizationManager3x.ts     (Cocos 3.x 전용)
├── LocalizationManager-Guide.md (통합 가이드)
└── tsv-to-json.js               (TSV → JSON 변환 유틸)
```

---

## 빠른 시작

### Step 1 — 파일 복사

```bash
# TypeScript 프로젝트 (Cocos 3.x)
cp ~/.claude/skills/localization-manager/LocalizationManager3x.ts <프로젝트>/assets/scripts/

# JavaScript 프로젝트 (Cocos 2.x)
cp ~/.claude/skills/localization-manager/LocalizationManager.js <프로젝트>/assets/scripts/
```

### Step 2 — CDN URL 설정

`LocalizationManager` 파일 내 CDN_BASE_URL을 프로젝트용 GitHub Raw URL로 수정:

```ts
private static CDN_BASE_URL = 'https://raw.githubusercontent.com/<org>/<repo>/main/localization/';
```

### Step 3 — 초기화

게임 진입점에서 초기화:

```ts
await LocalizationManager.init('ko'); // 기본 언어
const text = LocalizationManager.get('key_name');
```

### Step 4 — 언어 JSON 준비

```json
{
  "key_name": "표시할 텍스트",
  "btn_start": "시작"
}
```

CDN 레포에 `localization/ko.json`, `localization/en.json` 등으로 업로드.

---

## 파일 구조 (로컬 방식)

```
assets/Localization/
├── LocalizationManager.ts      # 로컬라이징 매니저 (TypeScript)
├── LocalizationManager.js      # 로컬라이징 매니저 (JavaScript)
└── [ProjectName] - main.json   # 로컬라이징 데이터
```

---

## JSON 파일 형식

### 로컬 방식 (언어 포함)

```json
{
  "ko": {
    "btn.confirm": "확인",
    "btn.cancel": "취소",
    "text.level": "레벨 {0}"
  },
  "en": {
    "btn.confirm": "Confirm",
    "btn.cancel": "Cancel",
    "text.level": "Level {0}"
  },
  "cn": {
    "btn.confirm": "确定",
    "btn.cancel": "取消",
    "text.level": "等级 {0}"
  }
}
```

### CDN 방식 (언어별 파일 분리)

**ko.json:**
```json
{
  "btn.confirm": "확인",
  "text.level": "레벨 {0}"
}
```

### 지원 언어 코드

| 코드 | 언어 |
|------|------|
| `ko` | 한국어 |
| `en` | 영어 |
| `cn` | 중국어 (간체) |

---

## 씬에 추가 (로컬 방식)

### Inspector 설정

1. 로딩 씬에 빈 노드 생성 → `LocalizationManager` 컴포넌트 추가
2. JSON 파일들을 `localizationJsonFiles` 배열에 드래그

| 속성 | 설명 | 기본값 |
|------|------|--------|
| `localizationJsonFiles` | JSON 파일 배열 | `[]` |
| `defaultLanguage` | 기본 언어 코드 | `"ko"` |
| `autoLocalizeOnStart` | 시작 시 자동 로컬라이징 | `true` |
| `autoLocalizeOnSceneLoaded` | 씬 로드 시 자동 로컬라이징 | `true` |
| `keyPrefix` | 로컬라이징 키 접두사 | `"@"` |
| `debugMode` | 디버그 로그 출력 | `false` |
| `warnOnDuplicate` | 중복 키 경고 | `true` |
| `localizedImages` | 이미지 로컬라이징 목록 | `[]` |

---

## Label 로컬라이징 (자동)

Label의 String 필드에 `@` 접두사 + 키를 입력하면 자동으로 로컬라이징된다.

```
Label.string = "@btn.confirm"    →  "확인" (ko)
Label.string = "@mode.challenge" →  "챌린지 모드" (ko)
```

---

## 코드에서 텍스트 가져오기

### 기본 텍스트

**TypeScript:**
```typescript
import { LocalizationManager } from "../../Localization/LocalizationManager";

const text1 = LocalizationManager.getText("@btn.confirm");  // @ 접두사 포함
const text2 = LocalizationManager.getText("btn.confirm");   // @ 없이도 동일
```

**JavaScript:**
```javascript
const LocalizationManager = require("LocalizationManager");
const text = LocalizationManager.getText("btn.confirm");
```

### 인자가 있는 텍스트

JSON에서 `{0}`, `{1}` 플레이스홀더 사용:

```json
{
  "ko": {
    "unlockEndlessLevel": "레벨 {0}에 도달시 잠금 해제",
    "reward.message": "{0}님이 {1}골드를 획득했습니다!"
  }
}
```

```typescript
const text = LocalizationManager.getTextWithArgs("@unlockEndlessLevel", 10);
// 결과: "레벨 10에 도달시 잠금 해제"

const msg = LocalizationManager.getTextWithArgs("@reward.message", "플레이어", 500);
// 결과: "플레이어님이 500골드를 획득했습니다!"
```

### 특수 문자

`\\n` → 줄바꿈, `\\s` → 공백으로 자동 변환된다.

---

## 노드/Label 수동 로컬라이징

```typescript
// 단일 Label
LocalizationManager.localizeLabel(label);

// 노드와 모든 자식
const count = LocalizationManager.localizeNode(parentNode);

// 현재 씬 전체
LocalizationManager.localizeScene();
```

---

## 프리팹 인스턴스화 (자동 로컬라이징)

```typescript
// 프리팹 생성 + 자동 로컬라이징
const node = LocalizationManager.instantiatePrefab(prefab);
parent.addChild(node);

// 자식 추가 + 자동 로컬라이징
const node = cc.instantiate(prefab);
LocalizationManager.addChildWithLocalization(node, parent);
```

---

## 이미지 로컬라이징

### Inspector 설정

```
LocalizationManager (Node)
└── localizedImages:
    ├── [0] key: "flag_icon"
    │       ko: flag_ko.png (SpriteFrame)
    │       en: flag_en.png (SpriteFrame)
    │       cn: flag_cn.png (SpriteFrame)
    └── [1] key: "btn_start"
            ko: btn_start_ko.png
            en: btn_start_en.png
```

### 코드에서 이미지 사용

```typescript
// SpriteFrame만 가져오기
const spriteFrame = LocalizationManager.getImage("flag_icon");
this.spr_flag.spriteFrame = spriteFrame;

// 노드에 키 설정 (언어 변경 시 자동 업데이트)
LocalizationManager.setImageKey(this.spr_flag.node, "flag_icon");

// 추적 해제
LocalizationManager.removeImageKey(this.spr_flag.node);
```

폴백: 언어별 이미지가 없으면 자동으로 `ko` 이미지 사용.

---

## 언어 변경

```typescript
LocalizationManager.setLanguage("en");  // 영어로 변경

const currentLang = LocalizationManager.getLanguage();
const languages = LocalizationManager.getSupportedLanguages(); // ["ko", "en", "cn"]
```

언어 변경 시:
1. 현재 씬의 모든 로컬라이징된 Label 자동 업데이트
2. `setImageKey()`로 등록된 모든 이미지 자동 업데이트
3. `localStorage`에 선택한 언어 저장 (`game_language` 키)

---

## 동적 JSON 추가 (런타임)

```typescript
LocalizationManager.addJsonData({
  ko: { "custom.key": "커스텀 텍스트" },
  en: { "custom.key": "Custom Text" },
  cn: { "custom.key": "自定义文本" }
});

// 기존 키 덮어쓰기 허용
LocalizationManager.addJsonData(newData, true);

// JsonAsset 병합
cc.resources.load("Localization/extra", cc.JsonAsset, (err, jsonAsset) => {
  LocalizationManager.mergeJsonAsset(jsonAsset);
});
```

---

## 주요 API 참조

| 메서드 | 설명 |
|--------|------|
| `getText(key)` | 현재 언어의 텍스트 반환 |
| `getTextWithArgs(key, ...args)` | `{0}`, `{1}` 플레이스홀더 대체 |
| `setLabelText(label, key)` | Label에 텍스트 설정 (동적 변경 지원) |
| `setLanguage(lang)` | 언어 변경 및 전체 Label 업데이트 |
| `localizeScene()` | 씬 전체 로컬라이징 |
| `localizeNode(node)` | 특정 노드 하위 로컬라이징 |
| `waitForInitialization(callback)` | 초기화 완료 대기 |
| `getImage(key)` | 현재 언어의 SpriteFrame 반환 |
| `setImageKey(node, key)` | 노드에 이미지 키 설정 (자동 업데이트) |

---

## CDN 방식

### 시스템 아키텍처

```
Game Client  →  jsdelivr CDN  →  GitHub Repository
                                 TinycellCorp/kakao_localization
                                 ├── version.json
                                 ├── {ProjectId}/
                                 │   ├── ko.json
                                 │   ├── en.json
                                 │   └── cn.json
                                 └── scripts/
                                     ├── setup-localization.js
                                     └── bump-version.js
```

### CDN 관련 Inspector 속성

| 속성 | 설명 | 기본값 |
|------|------|--------|
| `useCDN` | CDN 사용 여부 | `true` |
| `cdnProjectId` | 프로젝트 ID | 셋업 시 자동 설정 |
| `cdnBaseUrl` | CDN 베이스 URL | `https://cdn.jsdelivr.net/gh/TinycellCorp/kakao_localization@main` |
| `useCache` | LocalStorage 캐시 사용 | `true` |
| `useFallback` | CDN 실패 시 로컬 폴백 | `true` |
| `cacheExpireSeconds` | 캐시 만료 시간 (초) | `3600` |

### 프로젝트 ID 규칙

| 프로젝트 | ID |
|----------|-----|
| FriendsDefense | 47FriendsDefense |
| TangTang | 48TangTang |
| FriendsRunner (Parkour) | 49FriendsRunner |
| FriendsBongBong | 50FriendsBongBong |
| FriendsTileMatch | 51FriendsTileMatch |
| FriendsMatchPuzzle | 52FriendsMatchPuzzle |

### 신규 프로젝트 셋업

```bash
cd C:\Users\a\Documents\kakao_localization\scripts

# Cocos Creator 3.x 프로젝트
node setup-localization.js --id 53NewProject --path "C:\Projects\NewGame" --engine 3

# Cocos Creator 2.x JS 프로젝트
node setup-localization.js --id 53NewProject --path "C:\Projects\NewGame" --engine 2 --lang js
```

자동 수행 작업:
1. 프로젝트에 LocalizationManager 파일 생성 (cdnProjectId 자동 설정)
2. CDN 레포에 프로젝트 폴더 생성 (ko.json, en.json, cn.json)
3. version.json에 프로젝트 추가
4. Git 커밋 및 푸시

### 버전 기반 캐싱 흐름

```
1. version.json fetch (캐시 버스팅)
2. 서버 버전 vs 로컬 캐시 버전 비교
3. 버전 동일 → 캐시 사용
   버전 다름 → CDN에서 새로 fetch → 캐시 저장
4. fetch 실패 → 기존 캐시 사용 (만료되어도)
5. 캐시도 없음 → 로컬 폴백 (useFallback=true 시)
```

### 버전 업데이트

```bash
# 패치 버전 증가 (1.0.0 → 1.0.1)
node bump-version.js --id 48TangTang

# 마이너 버전 증가 (1.0.0 → 1.1.0)
node bump-version.js --id 48TangTang --type minor

# 프로젝트 목록 확인
node bump-version.js --list
```

### CDN 캐시 퍼지 (긴급 업데이트)

```bash
# version.json 캐시 퍼지
curl -X POST "https://purge.jsdelivr.net/gh/TinycellCorp/kakao_localization@main/version.json"

# 특정 언어 파일 캐시 퍼지
curl -X POST "https://purge.jsdelivr.net/gh/TinycellCorp/kakao_localization@main/48TangTang/ko.json"
```

---

## 키 네이밍 컨벤션

| 패턴 | 용도 | 예시 |
|------|------|------|
| `UI이름.요소` | UI별 텍스트 | `UILevel.gamestart`, `UIPet.title` |
| `btn.동작` | 버튼 텍스트 | `btn.confirm`, `btn.cancel` |
| `text.설명` | 일반 텍스트 | `text.not_enough_silver` |
| `엔티티.id.속성` | 엔티티 데이터 | `hero.1.name`, `pet.1.desc` |
| `currency.타입` | 재화 이름 | `currency.dia`, `currency.silver` |
| `mode.모드명` | 게임 모드 | `mode.challenge`, `mode.eternal` |

---

## 주의사항

1. **초기화 순서**: `LocalizationManager`는 다른 컴포넌트보다 먼저 초기화되어야 한다. 로딩 씬에 배치하고 `PersistRootNode`로 유지.

2. **키 중복**: 여러 JSON 파일에서 같은 키가 있으면 나중에 로드된 파일이 우선.
   `warnOnDuplicate = true`면 콘솔에 경고가 출력됨.

3. **키를 찾을 수 없을 때**: 해당 키 문자열이 그대로 반환된다. 디버그 모드에서 경고 로그 출력.

4. **@ 접두사**: `getText()`는 `@` 접두사를 자동으로 제거함.
   `getText("@btn.confirm")` === `getText("btn.confirm")`

5. **동적 생성 노드**: `cc.instantiate()` 후 반드시 `localizeNode()` 호출 필요.
   또는 `LocalizationManager.instantiatePrefab()` 사용.

6. **CDN vs 로컬**: CDN JSON은 언어별 파일로 분리되고, 로컬 JSON은 `{ "ko": {...}, "en": {...} }` 형식.

---

## 디버그 모드 출력 예시

```
[LocalizationManager] 초기화 완료
  - 로드된 파일: 8개
  - 현재 언어: ko
  - 지원 언어: ko, en, cn
  - ko: 245개 키
[LocalizationManager] 45개 Label 로컬라이징 (12ms)
```

---

## 체크리스트

- [ ] 로딩 씬에 `LocalizationManager` 컴포넌트 추가
- [ ] JSON 파일들을 `localizationJsonFiles` 배열에 등록
- [ ] `defaultLanguage` 설정 (ko/en/cn)
- [ ] Label의 String에 `@키이름` 형식으로 입력
- [ ] 코드에서 `LocalizationManager.getText()` 사용
- [ ] 인자가 필요한 경우 `getTextWithArgs()` 사용
- [ ] 언어 변경 UI 구현 시 `setLanguage()` 호출

---

## 유틸리티

### TSV → JSON 변환

```bash
node ~/.claude/skills/localization-manager/tsv-to-json.js
```

### 로컬라이징 텍스트 추출 도구 (선택)

```
tools/localization-extractor/
├── index.ts                    # CLI 진입점
├── extractors/
│   ├── PrefabExtractor.ts      # Prefab 텍스트 추출
│   └── ScriptExtractor.ts      # TypeScript 텍스트 추출
├── generators/
│   ├── KeyGenerator.ts         # 키 생성
│   └── JsonGenerator.ts        # JSON 파일 생성
└── transformers/
    ├── PrefabTransformer.ts    # Prefab 변환
    └── ScriptTransformer.ts    # Script 변환
```

미리보기:
```bash
npx ts-node index.ts --preview
```

적용:
```bash
npx ts-node index.ts --apply
```


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->