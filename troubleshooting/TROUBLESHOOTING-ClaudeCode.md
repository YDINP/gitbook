# Claude Code 트러블슈팅 가이드

## 문제 1: Bun 크래시 — `cast causes pointer to be null`

**날짜:** 2026-02-06

**증상:**
```
panic(thread XXXXX): cast causes pointer to be null
oh no: Bun has crashed. This indicates a bug in Bun, not your code.
```
Claude Code 실행 시 Bun 런타임이 즉시 크래시됨.

**원인:**
프로젝트 내 **깨진 심볼릭 링크(broken symlink)**.

`npx skills add <url>` 명령이 다음 구조로 파일을 생성:
```
.agents/skills/<skill-name>/SKILL.md    ← 실제 파일
.claude/skills/<skill-name>             ← 심볼릭 링크 → .agents/skills/
.cursor/skills/<skill-name>             ← 심볼릭 링크 → .agents/skills/
```

`.agents/` 폴더가 삭제되면 링크 대상이 소실되어 Bun이 디렉토리 스캔 중 널 포인터 크래시 발생.

**해결:**
```bash
# 깨진 심볼릭 링크 탐지
find <project-dir> -type l ! -exec test -e {} \; -print

# 깨진 링크 삭제
rm <broken-symlink-path>
```

실제 사례:
```bash
rm "C:/Users/a/Documents/Ben_Claude/.claude/skills/cocos-mcp-setup"
rm -rf "C:/Users/a/Documents/Ben_Claude/.cursor/"
```

**예방:**
- `npx skills add`로 스킬 추가 후 `.agents/` 폴더를 임의로 삭제하지 말 것
- 스킬을 제거할 때는 `.agents/`, `.claude/skills/`, `.cursor/skills/` 세 곳 모두에서 제거

---

## 문제 2: Bun 크래시 — `integer does not fit in destination type`

**날짜:** 2026-01-12

**증상:**
```
panic(thread XXXXX): integer does not fit in destination type
oh no: Bun has crashed.
RSS: 9.23GB
```

**원인:**
Bun v1.3.4의 메모리 관련 버그 (정수 오버플로우).

**해결:**
```bash
bun upgrade
```


---

## 적용 결과

> 해결 후 확인된 동작, 스크린샷, 로그 등을 첨부합니다.

<!-- TODO: 작성 필요 -->