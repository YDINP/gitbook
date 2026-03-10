# Shareable 문서 인덱스

> 마지막 업데이트: 2026-03-11

---

## 작업별 빠른 진입점 (에이전트용)

| 이런 작업이라면 | 읽어야 할 파일 |
|----------------|---------------|
| Cocos 2.x CLI 빌드 | `cocos/CC2x-CLI-Build.md` |
| Cocos 3.x CLI 빌드 | `cocos/CC3x-CLI-Build.md` |
| Cocos UI 노드 배치/크기 설정 | `cocos-editor-server/docs/workflow-ui-reference.md` |
| 레퍼런스 이미지 기반 좌표 추론 | `.claude/skills/ref-layout.md` (7단계 절차) |
| SLICED 스프라이트 크기 결정 | `cocos/COCOS-SLICED-SPRITE.md` |
| prefab null/UUID 오류 | `cocos/CC2-PREFAB-DOCTOR-Guide.md` |
| 로딩 인디케이터 추가 | `cocos/COCOS-INDICATOR-Guide.md` |
| Hi5 SDK 연동 | `hi5/README-Hi5-Integration-TS.md` 또는 `hi5/README-Hi5-Integration-JS.md` |
| iOS 오디오 이슈 | `cocos/IOS-AUDIO-Guide.md` |
| 레터박스 해상도 대응 | `cocos/ARCH-LetterboxResolution-CocosCreator2x.md` |
| Claude Code 자체 오류 | `troubleshooting/TROUBLESHOOTING-ClaudeCode.md` |
| Hi5 PostMessage 오류 | `troubleshooting/TROUBLESHOOTING-Hi5-SDK-PostMessage.md` |
| 치트 UI 추가 | `cocos/CHEATJS-Guide.md` |
| 로컬라이징 적용 | `localization/README-Localization-Manager.md` |

---

## cocos/ — Cocos Creator 기술 가이드

| 문서 | 설명 |
|------|------|
| [ARCH-LetterboxResolution-CocosCreator2x.md](./cocos/ARCH-LetterboxResolution-CocosCreator2x.md) | SHOW_ALL 정책으로 레터박스 해상도 대응 구현 |
| [COCOS-SLICED-SPRITE.md](./cocos/COCOS-SLICED-SPRITE.md) | 9-slice 크기 결정 공식, border 추론, 버튼/토글/배경 구현 패턴 |
| [CC2x-CLI-Build.md](./cocos/CC2x-CLI-Build.md) | Cocos Creator 2.x CLI 빌드 (`--path`, stdout 성공 판정) |
| [CC3x-CLI-Build.md](./cocos/CC3x-CLI-Build.md) | Cocos Creator 3.x CLI 빌드 (`--project`, outputName 구조) |
| [CHEATJS-Guide.md](./cocos/CHEATJS-Guide.md) | 웹 게임용 치트 UI 바텀시트 통합 가이드 |
| [COCOS-INDICATOR-Guide.md](./cocos/COCOS-INDICATOR-Guide.md) | 2.x/3.x 로딩 인디케이터 컴포넌트 통합 가이드 |
| [CC2-PREFAB-DOCTOR-Guide.md](./cocos/CC2-PREFAB-DOCTOR-Guide.md) | CC 2.x prefab null/UUID 진단 및 수정 가이드 |
| [IOS-AUDIO-Guide.md](./cocos/IOS-AUDIO-Guide.md) | iOS 백그라운드 복귀 후 오디오 재생 문제 해결 가이드 |

---

## hi5/ — Hi5 SDK 통합

| 문서/파일 | 설명 |
|----------|------|
| [README-Hi5-Integration-TS.md](./hi5/README-Hi5-Integration-TS.md) | Hi5 SDK TypeScript 버전 통합 가이드 (CC 2.x / 3.x) |
| [README-Hi5-Integration-JS.md](./hi5/README-Hi5-Integration-JS.md) | Hi5 SDK JavaScript 버전 통합 가이드 (CC 2.x) |
| Hi5.ts / hi5.js / hi5Helper.js | SDK 소스 파일 |

---

## troubleshooting/ — 트러블슈팅

| 문서 | 설명 |
|------|------|
| [TROUBLESHOOTING-ClaudeCode.md](./troubleshooting/TROUBLESHOOTING-ClaudeCode.md) | Claude Code 사용 중 발생하는 문제 (Bun 크래시 등) |
| [TROUBLESHOOTING-Hi5-SDK-PostMessage.md](./troubleshooting/TROUBLESHOOTING-Hi5-SDK-PostMessage.md) | Hi5 SDK iframe 환경 PostMessage 광고 호출 실패 원인 및 해결 |

---

## cocos-editor-server/ — Cocos Creator 2.x 에디터 자동화

> Cocos Creator 2.x 전용 에디터 HTTP 서버 (REST API 툴)

| 문서 | 설명 |
|------|------|
| [README.md](./cocos-editor-server/README.md) | 설치, 설정, API 카테고리 개요 |
| [docs/workflow-ui-reference.md](./cocos-editor-server/docs/workflow-ui-reference.md) | 레퍼런스 이미지 기반 UI 배치 멀티에이전트 워크플로우 (Phase 0~4) |
| [docs/inference-settingpopup.md](./cocos-editor-server/docs/inference-settingpopup.md) | 설정 팝업 UI 배치 추론 작업 기록 |
| [docs/inference-settingpopup-size-method.md](./cocos-editor-server/docs/inference-settingpopup-size-method.md) | SLICED 스프라이트 크기 추론 방법론 |
| [docs/inference-settingpopup-postmortem.md](./cocos-editor-server/docs/inference-settingpopup-postmortem.md) | 설정 팝업 배치 작업 회고 및 교훈 |

---

## localization/ — 로컬라이징

| 문서 | 설명 |
|------|------|
| [README-Localization-Manager.md](./localization/README-Localization-Manager.md) | CDN 기반 다국어 LocalizationManager 통합 가이드 |

---

## dingco-ralph-wiggum/ — Todo 앱 풀스택 예제

| 문서 | 설명 |
|------|------|
| [README.md](./dingco-ralph-wiggum/README.md) | 프로젝트 개요 및 실행 방법 |
| [PROJECT_SUMMARY.md](./dingco-ralph-wiggum/PROJECT_SUMMARY.md) | 프로젝트 완료 보고서 |
