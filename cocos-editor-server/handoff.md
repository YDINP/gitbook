# Handoff - cocos-editor-server
> 마지막 업데이트: 2026-02-25

## 현재 이슈
- scene-tools.js에 추가된 기능들이 README에 미반영 (set_spriteframe, set_label_font, place/remove_reference_image 등)
- 도구 수가 52개 → 57개로 증가했으나 README에 "52 tools"로 표기됨
- ~~save_scene API 버그: `"data" argument must be of type string` 에러~~ → 수정 완료 (base-tool.js callSceneScript)

## 최근 주요 변경 사항

### 1. `_resolveMetaInfo` (scene-tools.js)
**기존**: `_resolveSpriteFrameUuid` — Texture UUID → SpriteFrame UUID 변환만 수행
**변경**: UUID + border + 이미지 크기 + .meta 파일 경로를 객체로 반환

```javascript
// 반환 형태
{
    spriteFrameUuid: 'ff4267fb-...',
    metaPath: 'C:/.../btn_blue.png.meta',
    subMetaKey: 'btn_blue',
    width: 230, height: 203,
    borderTop: 0, borderBottom: 0, borderLeft: 100, borderRight: 100
}
```

**영향 범위**: `setSpriteFrame`, `placeReferenceImage` 두 메서드의 반환값 처리 변경

### 2. `_ensureSlicedBorder` (scene-tools.js)
SLICED 모드(spriteType=1) 설정 시, 대상 SpriteFrame의 .meta 파일에 border가 모두 0이면 자동 추론하여 기록.

**추론 휴리스틱**: 이미지 형태(aspect ratio)에 따라 분기
- 정사각/원형 (aspect 0.8~1.25): `min(w,h) × 0.43` — 4방향
- 가로 pill (aspect > 2.0): `height × 0.47` — 좌우만
- 세로 pill (aspect < 0.5): `width × 0.47` — 상하만
- 일반 라운드렉트 (그 외): `min(w,h) × 0.30` — 4방향
- 근거: 프로젝트 에셋 10개 분석 (btn_blue 43%, img_chapter_coinB h×0.47, img_chapter_slot 31%)

**동작 흐름**:
1. border가 이미 설정되어 있으면 스킵
2. width/height 기반 border 값 계산
3. .meta 파일에 borderLeft/Right/Top/Bottom 기록
4. `Editor.assetdb.refresh(dbUrl)` 호출로 에셋 DB 갱신

### 3. `setSpriteFrame` 수정
```javascript
// 기존: UUID 변환만
this._resolveSpriteFrameUuid(uuid).then(function(sfUuid) { ... })

// 변경: metaInfo 기반 + SLICED 시 autoBorder 체인
this._resolveMetaInfo(uuid).then(function(metaInfo) {
    args.spriteFrameUuid = metaInfo.spriteFrameUuid;
    if (args.spriteType === 1 && args.autoBorder !== false) {
        return self._ensureSlicedBorder(metaInfo);
    }
}).then(function() {
    return self.callSceneScript('setSpriteFrame', JSON.stringify(args));
});
```

### 4. `set_spriteframe` 스키마에 `autoBorder` 옵션 추가
```javascript
autoBorder: {
    type: 'boolean',
    description: 'When spriteType=SLICED and borders are 0, auto-infer from image dimensions (default: true)'
}
```

### 5. `placeReferenceImage` 수정
반환값 접근을 `metaInfo.spriteFrameUuid`로 변경 (string → object 호환).

## 추론 방법론 문서화 (별도 저장)

### ref-layout.md (`.claude/skills/ref-layout.md`)
- Step 4.5 신설: 시각적 형태 기반 속성 추론 기법 5개 섹션
  - 4.5.1 이미지 배치 (위치 추론) — 정렬 패턴 인식, 등간격/대칭/가장자리 정렬, 실전 예시
  - 4.5.2 이미지 크기 추론 — sizeMode 분기표, Sliced+Scale 복합 크기, 아이콘 크기 비교법
  - 4.5.3 색상/폰트 추론 (LabelOutline 색상 = 배경색 명도 -40~60%)
  - 4.5.4 레이아웃 패턴 인식 (5가지 UI 패턴 테이블)
  - 4.5.5 에셋 시각 매칭 실전 프로세스 (4단계)

### CLAUDE.md (`Ben_Claude/.claude/CLAUDE.md`)
- Visual Inference Rules 섹션 추가
  - 시각적 형태 > 이름 매칭 원칙
  - 에셋 선택 점수 체계 (형태+3, 색상+2, 비율+1, 이름+0.5)
  - 금지 사항 (이름 단독 선택 금지, 프리팹 값 복사 금지)
  - 학습된 휴리스틱 (border 43%, outline 색상, 화살표 scaleX 반전, Sliced+Scale)

## 작업 상태
- [x] _resolveMetaInfo 구현
- [x] _ensureSlicedBorder 구현
- [x] setSpriteFrame autoBorder 연동
- [x] placeReferenceImage 호환 수정
- [x] set_spriteframe 스키마 autoBorder 추가
- [x] ref-layout.md 시각적 추론 방법론 고도화
- [x] CLAUDE.md Visual Inference Rules 추가
- [x] Z-wuhuarou 프로젝트에 동기화
- [x] cocos-mcp-server → cocos-editor-server 리네임 (전체 12개 파일 + Z-wuhuarou 동기화)
- [x] SettingPopup Widget 수정 (LRTB=0) + 스크립트 바인딩 (18개 속성)
- [x] Visual Inference Rules ↔ ref-layout.md ↔ cocos-editor-server 문서 연계 구조화
- [ ] README.md에 새 도구/기능 반영
- [x] save_scene API 버그 수정

## 참고 사항
- scene-tools.js는 Ben_Claude 소스 수정 후 Z-wuhuarou/packages/cocos-editor-server/에 수동 복사로 동기화
- MCP 서버 포트: 기본 3000, EADDRINUSE 시 자동 증가 (3001, 3002...)
- Cocos Creator 2.x 환경에서만 동작 (Editor.*, cc.* API 의존)
