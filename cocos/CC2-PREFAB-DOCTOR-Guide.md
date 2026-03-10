# cc2-prefab-doctor — Cocos Creator 2.x Prefab 진단 도구

Cocos Creator 2.x prefab 파일의 구조적 문제를 진단하고 수정하는 CLI 도구.

사용 시점:
- CC2.x 에디터가 "Importing assets, please wait..."에서 무한 hang할 때
- prefab null 슬롯 문제
- 잘못된 스크립트 UUID 참조 문제

---

## Step 0 — 도구 확인

프로젝트 루트에 `cc2-prefab-doctor.js`가 있는지 확인한다.

```bash
ls cc2-prefab-doctor.js 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

없으면 스킬 패키지에서 복사한다:
```bash
cp ~/.claude/skills/cc2-prefab-doctor/cc2-prefab-doctor.js ./cc2-prefab-doctor.js
```

---

## Step 1 — 전체 스캔

문제 파일이 불명확한 경우:

```bash
node cc2-prefab-doctor.js scan
```

`[ISSUE]`로 표시된 파일과 문제 유형을 확인한다.

---

## Step 2 — null 슬롯 수정

`null slots at indices` 항목이 있으면:

```bash
node cc2-prefab-doctor.js fix-null <파일경로>
```

수정 후 유효성 검사:
```bash
node -e "JSON.parse(require('fs').readFileSync('<파일경로>', 'utf8')); console.log('OK')"
```

---

## Step 3 — 잘못된 스크립트 UUID 교체

`bad __id__ ref` 항목이 있거나 hang이 재발하면:

```bash
# 현재 올바른 UUID 확인 (.meta에서)
grep -r '"uuid"' assets/scripts/path/to/Component.ts.meta

# UUID → 압축값 변환
node cc2-prefab-doctor.js compress-uuid <uuid>

# 전체 prefab에서 일괄 교체
node cc2-prefab-doctor.js fix-uuid <구압축UUID> <새압축UUID>
```

---

## Step 4 — 캐시 삭제 안내

> `library/`, `temp/` 폴더를 삭제한 후 에디터를 재시작하세요.

---

## 판단 기준

| 증상 | 원인 | 해결 |
|------|------|------|
| 진행바 없는 무한 hang | prefab null 슬롯 | `fix-null` |
| 스크립트 컴포넌트 없어짐 | UUID 불일치 | `fix-uuid` |
| JSON parse 에러 | 파일 손상 | 백업 복원 |

---

## 완료 기준

- `scan` 결과에 `[ISSUE]` 없음
- 모든 수정 파일 JSON 파싱 OK
- 캐시 삭제 + 에디터 재시작

에디터 실제 동작은 사용자가 직접 확인 (에디터 캐시 상태 신뢰 불가).


---

## 적용 결과

> 해결 후 확인된 동작, 스크린샷, 로그 등을 첨부합니다.

<!-- TODO: 작성 필요 -->