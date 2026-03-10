# SettingPopup 사이즈 추론 방법 (Scale + Size + SLICED)

## 1. 3-Screenshot 비교 기법

정확한 위치와 크기 비교를 위해 3가지 상태의 스크린샷을 캡처합니다.

### 스크린샷 상태 정의
- **impl**: SettingPopup만 활성화, REF_OVERLAY 비활성화
- **ref**: REF_OVERLAY만 활성화 (opacity 255), SettingPopup 비활성화
- **overlay**: 둘 다 활성화, REF_OVERLAY opacity=128 (50% 투명)

오버레이에서 ghosting(이중 이미지)이 보이면 위치/크기 불일치를 의미합니다.

### 스크린샷 캡처 코드 패턴

```javascript
// impl: 현재 구현체만 표시
await setProp(REF_OVERLAY_UUID, 'active', false);
await setProp(POPUP_UUID, 'active', true);
await apiCall('/api/scene/capture_scene_screenshot', { outputPath: 'impl.png' });

// ref: 레퍼런스만 표시
await setProp(POPUP_UUID, 'active', false);
await setProp(REF_OVERLAY_UUID, 'active', true);
await setProp(REF_OVERLAY_UUID, 'opacity', 255);
await apiCall('/api/scene/capture_scene_screenshot', { outputPath: 'ref.png' });

// overlay: 두 요소 동시 표시 (50% 투명으로 겹침 비교)
await setProp(POPUP_UUID, 'active', true);
await setProp(REF_OVERLAY_UUID, 'opacity', 128);
await apiCall('/api/scene/capture_scene_screenshot', { outputPath: 'overlay.png' });
```

---

## 2. pngjs 픽셀 분석으로 정밀 측정

### 배경색 판별

ref 오버레이의 배경은 tan/brown 계열입니다.

```javascript
function isRefBg(r, g, b) {
  return r > 150 && r < 230 &&
         g > 100 && g < 170 &&
         b > 60 && b < 140 &&
         (r - b) > 40;
}
```

주의: SkipButton(노란색) 같은 요소는 배경과 색상이 유사하여 감지 실패 가능합니다. 별도 처리 필요합니다.

### 요소 경계 측정 패턴

중심점에서 상하좌우로 확장하며 배경 픽셀을 만날 때까지 스캔합니다.

```javascript
function measureElement(name, cx, cy, halfW, halfH) {
  // 상단 경계 스캔
  for (let y = cy - 1; y >= cy - halfH; y--) {
    if (isRefBg(getPixel(ref, cx, y))) {
      top = y + 1;
      break;
    }
  }

  // 하단 경계 스캔
  for (let y = cy + 1; y <= cy + halfH; y++) {
    if (isRefBg(getPixel(ref, cx, y))) {
      bottom = y - 1;
      break;
    }
  }

  // 좌측 경계 스캔
  for (let x = cx - 1; x >= cx - halfW; x--) {
    if (isRefBg(getPixel(ref, x, cy))) {
      left = x + 1;
      break;
    }
  }

  // 우측 경계 스캔
  for (let x = cx + 1; x <= cx + halfW; x++) {
    if (isRefBg(getPixel(ref, x, cy))) {
      right = x - 1;
      break;
    }
  }

  return {
    width: right - left + 1,
    height: bottom - top + 1,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  };
}
```

### 좌표 변환

디자인 해상도 750×1334, 스크린샷 1:1 매핑 기준입니다.

```javascript
function pixelToCocosCoord(px, py) {
  const cocosX = px - 375;        // 화면 중앙 = 0
  const cocosY = 667 - py;        // 화면 중앙 = 0, y 반전
  return { x: cocosX, y: cocosY };
}
```

---

## 3. Scale vs Size + SLICED 모드 발견

### 핵심 발견

버튼 Bg 스프라이트의 렌더링 방식이 중요합니다.

**기존(잘못된) 설정:**
- Sprite type: 1 (SLICED)
- Node scale: 0.5
- Node size: 855×203 (원본 atlas 크기)
- 렌더링 결과: 427.5×101.5

문제점: scale이 9-slice 보더까지 축소시켜 테두리 비율이 왜곡됩니다.

### ⚠️ 수정된 이해 (사용자 검증 결과 반영)

**이전 결론(CUSTOM size + scale=1)은 부분적으로만 올바릅니다.**

실제로는 **노드 기본 크기 유지 + scale 축소**가 레퍼런스와 완벽 일치하는 방식입니다.
상세 분석은 섹션 5.1과 7(근본 원인 분석)을 참조하세요.

```javascript
// 레퍼런스와 일치하는 실제 설정
// 노드 크기: 원본/TRIMMED 자동값 유지
// scale: 목표 렌더 크기에 맞춰 조정
await setProp(bgUuid, 'width', 563.6);    // TRIMMED 자동 크기
await setProp(bgUuid, 'height', 203);
await setProp(bgUuid, 'scaleX', 0.741);   // 렌더: 417.6
await setProp(bgUuid, 'scaleY', 0.741);   // 렌더: 150.4
```

---

## 4. 최종 측정 결과 (레퍼런스 기준)

SettingPopup의 레이아웃 요소별 최종 측정값입니다.

| 요소 | 너비 | 높이 | 픽셀 중심X | 픽셀 중심Y | Cocos X | Cocos Y |
|------|------|------|-----------|-----------|---------|---------|
| SoundToggle | 143 | 134 | 278 | 328 | -97 | 339 |
| EffectToggle | 143 | 134 | 488 | 328 | 113 | 339 |
| LobbyButton | 396 | 134 | 389 | 495 | 14 | 172 |
| ChapterButton | 396 | 134 | 389 | 671 | 14 | -4 |
| LevelInfo | 415 | 128 | 394 | 826 | 19 | -159 |
| SkipButton | 388 | 132 | 389 | 990 | 14 | -323 |
| RankButton | 396 | 134 | 389 | 1173 | 14 | -506 |

이 값들은 픽셀 분석으로 추출되었으며, 최종 구현에서 일부 조정될 수 있습니다.

---

## 5. 교훈 및 주의사항

### 5.1 SLICED + scale: 두 가지 접근법

SLICED 스프라이트의 크기 조정에는 두 가지 유효한 접근법이 있습니다.

#### 접근법 A: CUSTOM size + scale=1 (AI 초기 접근)

```javascript
// sizeMode=CUSTOM, 노드 크기로 직접 제어
await setComp(bgUuid, 'cc.Sprite', 'sizeMode', 0);
await setProp(bgUuid, 'width', 396);   // 목표 크기
await setProp(bgUuid, 'height', 134);
await setProp(bgUuid, 'scaleX', 1);
await setProp(bgUuid, 'scaleY', 1);
```

**9-slice 보더 동작:** 보더가 **원본 픽셀 크기 그대로** 유지됨. 내부 영역만 신축.
- 장점: 보더가 항상 선명
- 단점: 노드가 작을수록 보더가 **상대적으로 두꺼워짐** → 비율 왜곡

#### 접근법 B: 원본 크기 유지 + scale 축소 (사용자 최종 접근 ✅)

```javascript
// 노드 크기는 원본(또는 TRIMMED 자동값), scale로 렌더 크기 제어
await setProp(bgUuid, 'width', 563.6);   // 원본/TRIMMED 크기
await setProp(bgUuid, 'height', 203);
await setProp(bgUuid, 'scaleX', 0.741);  // 비율 축소
await setProp(bgUuid, 'scaleY', 0.741);
```

**9-slice 보더 동작:** 보더가 scale과 함께 **비례 축소**됨.
- 장점: 보더 두께가 전체 크기에 비례하여 **시각적 비율 유지**
- 결과: 레퍼런스와 완벽 일치

#### 왜 접근법 B가 레퍼런스와 일치하는가?

레퍼런스 이미지는 원본 프로젝트에서 캡처된 것이며, 원본 프로젝트의 렌더링 방식을 반영합니다.
Cocos Creator 에디터에서 사용자가 노드를 드래그하여 크기를 조정하면,
**노드의 기본 크기(TRIMMED 또는 원본)를 유지한 채 scale을 변경**하는 것이 기본 동작입니다.

따라서 레퍼런스와 동일한 렌더링을 재현하려면:
1. 원본 스프라이트의 기본 크기를 유지
2. scale로 시각적 크기를 조정
3. 9-slice 보더가 비례 축소되어 원본과 동일한 비율 유지

### 5.2 배경 노드 구조 파악

UI 노드 계층은 시각적으로는 같아 보여도 구조가 다를 수 있습니다.

- panel 노드 자체에 Sprite가 있더라도 실제 배경은 bg 자식 노드일 수 있음
- 색상이 color tint로 적용된 경우, white(255,255,255)로 복원하면 원본 스프라이트 색상이 드러남
- 항상 노드 계층과 컴포넌트를 확인하세요.

### 5.3 에이전트 출력 비 경우 대비

서브에이전트의 병렬 실행은 효율적이지만 결과가 예상과 다를 수 있습니다.

- 서브에이전트 결과가 비어있을 수 있음 → 직접 스크립트 실행으로 fallback
- 병렬 출력 비 시 일부만 성공할 수 있으므로 항상 검증 필수

### 5.4 원형 요소(토글) 측정 주의

원형 요소의 bounding box 측정은 주의가 필요합니다.

- 원형 요소의 폭과 높이를 정확히 측정하려면 maxW(최대폭)와 height를 별도로 계산
- 배경 감지 함수가 그림자/하이라이트까지 포함하여 실제보다 크게 측정될 수 있음
- 검증: 오버레이 스크린샷에서 시각적으로 확인하세요.

### 5.5 어두운 배경(SkipButton) 감지 실패

노란색 SkipButton 같은 요소는 brown 배경과 색상이 유사하여 감지 실패합니다.

**해결 전략:**
- 요소색 기준으로 배경을 역탐지 (배경이 아닌 영역 우선 찾기)
- 알려진 갭 영역에서 brown bg 색상 확인 후 역추적
- 마지막 수단: 요소 주변의 갭 영역 픽셀로 경계값 추정

---

## 6. 워크플로우 요약

SettingPopup 사이즈 조정의 전체 워크플로우입니다.

```
1. REF_OVERLAY 노드 배치 및 초기 테스트
   └─ 3-screenshot 캡처 (impl, ref, overlay)

2. 픽셀 분석으로 요소별 측정
   └─ pngjs로 ref 이미지 로드
   └─ isRefBg 함수로 배경색 판별
   └─ 각 요소의 경계 스캔 → bounding box 추출
   └─ 중심점과 크기 계산

3. 현재 구현 분석
   └─ get_node_info로 모든 노드 정보 수집
   └─ get_component_info로 Sprite 타입/설정 확인

4. Sprite 설정 결정
   ├─ SLICED 모드: size 조정 (scale=1)
   └─ SIMPLE 모드: scale 조정

5. 레퍼런스 → Cocos 좌표 변환
   └─ pixelToCocosCoord 함수로 변환
   └─ set_node_property로 위치/크기 적용

6. 검증 및 반복
   └─ 3-screenshot 재캡처
   └─ 오버레이에서 겹침 비교
   └─ ghosting이 없을 때까지 미세조정
```

---

## 참고: API 호출 예시

### 노드 정보 조회

```javascript
const nodeInfo = await apiCall('/api/node/get_node_info', {
  uuid: nodeUuid
});
```

### 컴포넌트 속성 설정

```javascript
await apiCall('/api/component/set_component_property', {
  nodeUuid: spriteUuid,
  componentName: 'cc.Sprite',
  propertyName: 'type',
  value: 1  // 1 = SLICED
});
```

### 노드 속성 설정

```javascript
await apiCall('/api/node/set_node_property', {
  uuid: nodeUuid,
  propertyName: 'width',
  value: 396
});
```

### 스크린샷 캡처

```javascript
await apiCall('/api/scene/capture_scene_screenshot', {
  outputPath: 'path/to/screenshot.png'
});
```

---

## 7. 근본 원인 분석: 왜 사용자 수정이 레퍼런스와 완벽 일치하는가

### 7.1 세 가지 접근법 비교

| 접근 | 노드 w | 노드 h | scaleX | scaleY | 렌더 크기 | 9-slice 보더 |
|------|--------|--------|--------|--------|----------|-------------|
| **원본 프리팹** | 590.9 | 203 | 1 | 1 | 590.9×203 | 원본 크기 |
| **AI (fix17-18)** | 396 | 134 | 1 | 1 | 396×134 | 원본 크기 (상대적으로 두꺼움) |
| **사용자 최종** | 563.6 | 203 | 0.741 | 0.741 | 417.6×150.4 | 0.741배 축소 |

### 7.2 핵심 발견: 사용자 값 ≠ 프리팹 원본값

사용자가 설정한 값은 원본 프리팹을 그대로 복원한 것이 **아닙니다**.

```
프리팹 btn_blue:    w=590.9  h=203  scale=1     → 렌더 590.9×203
사용자 LobbyBtn/Bg: w=563.6  h=203  scale=0.741 → 렌더 417.6×150.4
프리팹 btn_yellow:  w=590.1  h=203  scale=1     → 렌더 590.1×203
사용자 SkipBtn/Bg:  w=547.7  h=203  scale=0.769 → 렌더 421.2×156.1
```

사용자는 **에디터에서 시각적으로 직접 조정**하여 레퍼런스와 일치시켰습니다.

### 7.3 소수점 값의 의미 — sizeMode=TRIMMED의 증거

사용자 값의 소수점 패턴은 **sizeMode=TRIMMED(1)** 모드의 결과입니다:

- `563.6`, `163.9`, `154.9`, `249.4` → **엔진이 sprite의 trimmed rect에서 자동 계산한 노드 크기**
- `0.741`, `0.769`, `1.538` → 원본 개발자가 시각적 크기를 맞추기 위해 설정한 scale
- `-189.855`, `-3.739`, `2.243` → 엔진이 앵커 오프셋에서 직렬화한 sub-pixel 좌표

**sizeMode=TRIMMED(1) 동작 원리:**
1. Cocos Creator가 sprite의 trimmed rect(투명 영역 제거 후 실제 픽셀 영역)를 읽음
2. 노드 크기를 trimmed rect 크기로 **자동 설정** (개발자가 직접 입력하지 않음)
3. 개발자는 **scale만 조정**하여 원하는 시각적 크기를 달성

이것이 사람이 수동 입력(164, 0.74 등)이 아닌 기계 생성 정밀 값인 이유입니다.

### 7.4 9-slice 보더 비례 축소 원리

Cocos Creator 2.x에서 SLICED(9-slice) 스프라이트의 크기 변경 방식에 따라 보더 렌더링이 달라집니다:

#### sizeMode=CUSTOM + scale=1 (AI 접근)
```
┌─────────────────────────┐
│ Corner │   Edge   │Corner│  ← 보더: 원본 40px 유지
│  40px  │          │ 40px │
├────────┼──────────┼──────┤
│        │          │      │
│ Edge   │  Center  │ Edge │  ← 내부만 신축
│        │ (stretch)│      │
├────────┼──────────┼──────┤
│ Corner │   Edge   │Corner│  ← 보더: 원본 40px 유지
│  40px  │          │ 40px │
└─────────────────────────┘
  총 396px 중 보더 80px = 20% → 보더가 상대적으로 두꺼움
```

#### 원본 크기 + scale=0.741 (사용자 접근)
```
┌─────────────────────────────────────┐
│ Corner │      Edge       │  Corner  │  ← 보더: 원본 40px
│  40px  │                 │   40px   │
├────────┼─────────────────┼──────────┤
│        │                 │          │
│ Edge   │     Center      │   Edge   │
│        │   (stretch)     │          │
├────────┼─────────────────┼──────────┤
│ Corner │      Edge       │  Corner  │
│  40px  │                 │   40px   │
└─────────────────────────────────────┘
  총 563.6px 중 보더 80px = 14%

  → scale 0.741 적용 후:
  총 렌더 417.6px, 보더 29.6px = 7% → 보더가 얇고 세련됨
```

**차이점:**
- AI 방식: 보더 40px가 396px 안에서 차지하는 비율이 높아 **보더가 두꺼워** 보임
- 사용자 방식: 전체가 축소되어 보더도 29.6px로 줄어들며 **원본 비율 유지**

### 7.5 왜 TRIMMED+scale이 9-slice에서 올바른 결과를 내는가

**sizeMode=TRIMMED에서의 9-slice 렌더링:**

1. 9-slice 보더 값은 **sprite-local 픽셀 좌표**(trim rect 좌표계)로 정의됨
2. sizeMode=TRIMMED일 때 노드 크기 = trim rect 크기 → 보더 픽셀 값이 실제 sprite 픽셀에 정확히 대응
3. scale이 전체 렌더링을 균일하게 축소 → 보더 비율이 원본과 동일하게 유지

**sizeMode=CUSTOM에서의 9-slice 렌더링 (AI 접근):**

1. 노드 크기를 수동으로 설정 (예: 396×134)
2. 보더 값은 여전히 원본 sprite 기준 → 노드가 작아져도 보더는 원본 크기 유지
3. 결과: 보더가 전체 대비 상대적으로 두꺼워짐

**원본 프리팹 개발자의 워크플로우:**
1. sizeMode=TRIMMED 설정 → 엔진이 trim rect에서 노드 크기 자동 계산
2. scale 조정 → 원하는 시각적 크기 달성
3. 9-slice 보더가 자연스럽게 비례 축소됨

레퍼런스 이미지는 이 프리팹의 렌더링 결과이므로, 동일 값을 복원하면 완벽 일치합니다.

### 7.6 AI 접근이 실패한 근본 원인

1. **"SLICED는 size로, SIMPLE은 scale로"라는 규칙은 불완전**
   - SLICED+CUSTOM+scale=1은 *기술적으로* 올바르지만, 9-slice 보더 비율이 원본과 달라짐
   - 레퍼런스가 scale 방식으로 만들어졌다면, 동일 방식을 재현해야 일치

2. **렌더 크기 ≠ 시각적 일치 (9-slice 보더 비율 문제)**
   - AI가 픽셀 측정으로 구한 "목표 크기"(396×134)는 요소의 **렌더링 결과 외곽 경계**
   - 이 값을 CUSTOM size에 직접 대입하면 9-slice 보더가 원본 픽셀 크기(~87px)로 고정
   - 보더 비율: 87/396 ≈ 22% (AI) vs 64/417 ≈ 15% (사용자) → 시각적으로 다름

3. **픽셀 측정의 근본적 한계** (Critical)
   ```
   인과관계:
   원본 프리팹 (size=563.6, scale=0.741)
     → Cocos가 렌더링 (9-slice + scale 적용)
       → 스크린샷 = 레퍼런스 이미지
         → AI가 픽셀 측정 → "396×134"
           → AI가 CUSTOM size=396×134, scale=1 설정
             → 9-slice 보더 비율이 달라짐 → 불일치!
   ```
   픽셀 측정은 **(node_size × scale)의 결과물**을 측정한 것이다.
   이 결과물을 CUSTOM size에 직접 대입하면 원본 파라미터 조합을 복원할 수 없다.
   **레퍼런스가 동일 프로젝트 스크린샷이면, 원본 프리팹 값을 직접 읽는 것이 유일하게 정확한 방법이다.**

4. **에디터의 인터랙티브 조작 vs 프로그래밍적 설정**
   - 에디터에서 드래그 → 엔진이 자동으로 최적의 size/scale 조합을 결정
   - API에서 직접 설정 → 개발자가 size/scale/sizeMode를 명시적으로 결정해야 함
   - 두 방식이 동일한 결과를 내려면 엔진의 내부 로직을 정확히 이해해야 함

### 7.7 향후 AI 추론 시 적용할 교훈

1. **원본 프리팹의 sizeMode와 scale 패턴을 먼저 분석**
   - 프리팹에서 sizeMode, type, scale, size 조합을 확인
   - 동일한 조합 패턴을 유지하면서 값만 조정

2. **SLICED 스프라이트는 두 가지 접근법 모두 테스트**
   - 접근법 A (CUSTOM+scale=1): 빠르지만 보더 비율이 다를 수 있음
   - 접근법 B (원본 크기+scale 조정): 보더 비율 유지, 레퍼런스와 일치 가능성 높음
   - 오버레이 비교로 어느 것이 더 일치하는지 검증

3. **소수점 값은 에디터 자동 계산의 흔적**
   - 사용자가 설정한 소수점 값은 존중하고, 임의로 반올림하지 않음
   - 레퍼런스 프로젝트의 에디터 조작 방식을 추정하는 단서로 활용

4. **"픽셀 정확한 크기"보다 "렌더링 방식의 일치"가 중요**
   - 같은 396×134 크기라도 렌더 방식(CUSTOM vs scale)에 따라 시각적 결과가 다름
   - 최종 검증은 항상 오버레이 비교로 수행

5. **레퍼런스가 동일 프로젝트 스크린샷이면, 원본 프리팹 값을 우선 참조**
   - 픽셀 측정값 → CUSTOM size 직접 대입은 9-slice 보더 비율을 망가뜨림
   - 원본 프리팹의 (node_size, scale, sizeMode) 조합을 읽고 재현하는 것이 정확
   - 원본 프리팹 접근 불가 시: SLICED + Scale 조합 사용
     - `scale = target_h / original_h`
     - `node.width = target_w / scale`

---

## 8. 최종 상태 기록 (사용자 수정 후)

### Before (AI fix18) → After (사용자 최종)

| 노드 | Before w×h (scale) | After w×h (scale) | 변경 내용 |
|------|--------------------|--------------------|----------|
| SoundToggle/Bg | 143×134 (1.0) | 163.9×154.9 (1.0) | 크기 확대, TRIMMED 자동값 |
| SoundToggle/Icon | 82×82 (1.0) | 59.6×59.6 (1.0) | 크기 축소, 위치 미세조정 |
| EffectToggle/Bg | 143×134 (1.0) | 163.1×151.9 (1.0) | 크기 확대, TRIMMED 자동값 |
| EffectToggle/Icon | 98×81 (1.0) | 69.3×59.2 (1.0) | 크기 축소 |
| EffectToggle/OffMark | 89×90 (1.0) | 63.2×67.8 (1.0) | 크기 축소 |
| LobbyButton/Bg | 396×134 (1.0) | 563.6×203 (0.741) | CUSTOM→원본크기+scale |
| SkipButton/Bg | 388×132 (1.0) | 547.7×203 (0.769) | CUSTOM→원본크기+scale |
| LevelInfo/Bg | 415×128 (1.0) | 249.4×83 (1.538) | 축소+scale확대 |
| LevelInfo/Arrows | 33×36 | 46.6×53.5 | 크기 확대 |

### 변경되지 않은 값 (위치 등)

| 노드 | x | y | w | h |
|------|---|---|---|---|
| CloseButton | -317 | 614 | 82 | 86 |
| SoundToggle | -97 | 339 | 140 | 140 |
| EffectToggle | 113 | 339 | 140 | 140 |
| LobbyButton | 14 | 172 | 396 | 134 |
| ChapterButton | 14 | -4 | 396 | 134 |
| LevelInfo | 19 | -159 | 415 | 128 |
| SkipButton | 14 | -323 | 388 | 132 |
| RankButton | 14 | -506 | 396 | 134 |
