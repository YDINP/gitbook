# Cocos Creator 2.x CLI 빌드 가이드

## 배경

> 어떤 프로젝트/상황에서 필요했는지, 기존 방식의 한계가 무엇이었는지 서술합니다.

<!-- TODO: 작성 필요 -->

---

## 핵심 차이점 (CC2.x vs CC3.x)

| 항목 | CC2.x | CC3.x |
|------|-------|-------|
| 플래그 | `--path` | `--project` |
| 빌드 옵션 | `--build "key=value;..."` 세미콜론 구분 | 동일 |
| `buildPath` | 최종 출력 경로 직접 지정 | `buildPath` + `outputName` 조합 |
| 빌드 로그 | stdout에 직접 출력 | `temp/builder/log/*.log` 별도 파일 |
| 빌드 실행 | 동기 (완료까지 프로세스 유지) | 자식 프로세스로 비동기 실행 |
| 성공 판정 | stdout에 `Built to "..." successfully` 출력 | 로그 파일 확인 필요 |

---

## 기본 명령어

```bash
"C:/ProgramData/cocos/editors/Creator/{VERSION}/CocosCreator.exe" \
  --path "C:/path/to/project" \
  --build "platform=web-mobile;buildPath=C:/path/to/output;debug=false"
```

### 옵션 설명

| 옵션 | 설명 | 예시 |
|------|------|------|
| `platform` | 빌드 플랫폼 | `web-mobile`, `web-desktop` |
| `buildPath` | 최종 출력 경로 | `C:/Users/a/Desktop/Build/MyGame` |
| `debug` | 디버그 모드 | `false` (릴리즈), `true` (디버그) |
| `md5Cache` | 에셋 MD5 캐시 활성화 | `true` |

> **참고**: CC2.x는 `buildPath`가 최종 출력 폴더 자체임. CC3.x처럼 `outputName`이 따로 없음.

---

## 빌드 성공 판정

CC2.x는 빌드가 stdout에 직접 출력됨:

```
Built to "C:/path/to/output" successfully
```

exit code `0` + 위 문자열 포함 → 성공.
exit code `!= 0` 또는 `error` 포함 → 실패 → 에디터에서 수동 빌드.

---

## 빌드 설정 저장 위치

프로젝트의 기본 빌드 설정은 `settings/builder.json`에 저장됨:

```json
{
  "platform": "web-mobile",
  "buildPath": "C:/path/to/output",
  "debug": false,
  "md5Cache": true
}
```

CLI `--build` 옵션이 이 파일의 설정을 오버라이드함.

---

## 에러 처리

| 상황 | 해결 |
|------|------|
| `EPERM: unlink CocosCreator.log` | 무시 가능 (로그 파일 잠금, 빌드에 영향 없음) |
| exit code `!= 0` | 에디터에서 수동 빌드 실행 |
| `cc.NodePool is not a constructor` | 프로젝트 설정에서 NodePool 모듈 제외됨 → 배열 풀 사용으로 교체 |
| 빌드 후 에셋 캐시 문제 | `md5Cache=true` 옵션 추가 |

---

## 사용 예시

```bash
# 릴리즈 빌드
"C:/ProgramData/cocos/editors/Creator/2.4.13/CocosCreator.exe" \
  --path "C:/path/to/MyProject" \
  --build "platform=web-mobile;buildPath=C:/output/MyGame;debug=false;md5Cache=true"

# 백그라운드 실행 (Claude Code 환경)
"C:/ProgramData/cocos/editors/Creator/2.4.13/CocosCreator.exe" \
  --path "C:/path/to/MyProject" \
  --build "platform=web-mobile;buildPath=C:/output/MyGame;debug=false" &
```

---

## CC3.x와의 주요 차이 요약

```
CC2.x:  --path <project>  --build "platform=web-mobile;buildPath=<output>"
CC3.x:  --project <project>  --build "platform=web-mobile;outputName=<name>;buildPath=<parent>"
```


---

## 적용 결과

> 도입 전/후 비교, 개선 수치, 스크린샷 등을 첨부합니다.

<!-- TODO: 작성 필요 -->

---

## 관련 작업 기록

<!-- 관련 케이스 스터디나 추론 기록 링크 -->