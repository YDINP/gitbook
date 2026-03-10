# Cocos Creator 3.x CLI 빌드 가이드

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

## 핵심 차이점 (CC2.x vs CC3.x)

| 항목 | CC2.x | CC3.x |
|------|-------|-------|
| 플래그 | `--path` | `--project` |
| 빌드 옵션 | `buildPath` 직접 지정 가능 | `buildPath` + `outputName` 조합 필요 |
| 빌드 로그 | stdout | `temp/builder/log/*.log` |
| 빌드 실행 방식 | 동기 | 자식 프로세스(sub-process)로 비동기 실행 |

---

## 기본 명령어

```bash
"/c/ProgramData/cocos/editors/Creator/{VERSION}/CocosCreator.exe" \
  --project "C:/path/to/project" \
  --build "platform=web-mobile;outputName={OUTPUT_NAME};buildPath=C:\\path\\to\\build;debug=false"
```

### 옵션 설명

| 옵션 | 설명 | 예시 |
|------|------|------|
| `platform` | 빌드 플랫폼 | `web-mobile`, `web-desktop` |
| `outputName` | 출력 폴더명 | `48tangtang` |
| `buildPath` | 출력 상위 경로 (백슬래시 이스케이프 필요) | `C:\\Users\\a\\Desktop\\Build` |
| `debug` | 디버그 모드 | `false` (릴리즈), `true` (디버그) |

> **주의**: `buildPath`에서 백슬래시(`\`)는 `\\`로 이스케이프해야 함.
> 최종 출력 경로 = `buildPath` + `outputName`

---

## 빌드 설정 저장 위치

프로젝트의 빌드 프로필은 `profiles/v2/packages/web-mobile.json`에 저장됨.

```json
{
  "common": {
    "outputName": "48tangtang",
    "buildPath": "C:\\Users\\a\\Desktop\\Build",
    "platform": "web-mobile",
    "md5Cache": true,
    "debug": false,
    "scenes": [...]
  }
}
```

CLI `--build` 옵션이 이 파일의 설정을 오버라이드함.

---

## 빌드 결과 확인

CLI stdout에는 빌드 진행 상황이 나오지 않음. 빌드 로그는 별도 파일로 기록됨.

```bash
# 최신 빌드 로그 확인
ls {프로젝트}/temp/builder/log/

# 에러/성공 여부 확인
grep -i "error\|success\|fail" "{프로젝트}/temp/builder/log/{최신로그}.log" | tail -20
```

빌드 성공 시 `index.html`이 출력 경로에 생성됨:
```bash
ls {buildPath}/{outputName}/index.html
```

---

## 주의사항: assets 폴더의 .js 파일

CC3.x Rollup 번들러는 `assets/` 하위의 `.js` 파일을 모두 모듈로 처리하려 함.

**증상**: 빌드 로그에 아래 경고 발생
```
Unexpected: entry chunk name {filename}.mjs_cjs=&original= is not in list.
```

**원인**: IIFE 형태의 JS 파일(예: cheat.js, hi5.js 등)을 ESM/CJS 모듈로 처리 시 chunk 이름 충돌

**해결**:
- `assets/` 폴더에 번들링 불필요한 JS (전역 라이브러리, 런타임 스크립트 등)를 두지 않음
- 해당 파일은 `build-templates/web-mobile/`에만 두고 `<script src="...">` 태그로 로드
- 경고가 `warn` 수준이면 빌드 계속 진행되지만, `error` 수준이면 빌드 실패

---

## 실사용 예시 (Z-tangtang 프로젝트)

```bash
"/c/ProgramData/cocos/editors/Creator/3.6.1/CocosCreator.exe" \
  --project "C:/Users/a/Documents/Projects/Z-tangtang" \
  --build "platform=web-mobile;outputName=48tangtang;buildPath=C:\\Users\\a\\Desktop\\Build;debug=false"
```

백그라운드 실행 (Claude Code 환경):
```bash
"/c/ProgramData/cocos/editors/Creator/3.6.1/CocosCreator.exe" \
  --project "C:/Users/a/Documents/Projects/Z-tangtang" \
  --build "platform=web-mobile;outputName=48tangtang;buildPath=C:\\Users\\a\\Desktop\\Build;debug=false" &
```

---

## 설치된 CC 버전 목록 (이 머신)

```
C:\ProgramData\cocos\editors\Creator\
├── 2.4.3\CocosCreator.exe
├── 2.4.5\CocosCreator.exe
├── 2.4.13\CocosCreator.exe
├── 3.6.1\CocosCreator.exe
├── 3.7.1\CocosCreator.exe
├── 3.8.2\CocosCreator.exe
├── 3.8.6\CocosCreator.exe
└── 3.8.7\CocosCreator.exe
```


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->