'use strict';

/**
 * pixel-diff.js
 * Cocos Creator UI 작업용 픽셀 분석/비교 유틸리티
 *
 * 사용법 (모듈):
 *   const pd = require('./pixel-diff');
 *   const ref = pd.loadPng('ref.png');
 *   const bands = pd.findVerticalBands(ref, 375, pd.isRefBg);
 *
 * 사용법 (CLI):
 *   node pixel-diff.js capture --overlay <uuid> --impl <uuid> --out-impl impl.png --out-ref ref.png
 *   node pixel-diff.js measure <image.png> [--type ref|impl] [--scan-x 375]
 *   node pixel-diff.js diff <ref.png> <impl.png>
 *   node pixel-diff.js offset <ref.png> <impl.png>
 *   node pixel-diff.js nodes <uuid1> [uuid2 ...]
 */

const fs   = require('fs');
const http = require('http');
const PNG  = require('pngjs').PNG;

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const CANVAS_CENTER_X = 375;  // 750px 캔버스 중심
const CANVAS_HEIGHT   = 1334; // 디자인 해상도 높이

// ─────────────────────────────────────────────────────────────────
// Coordinate Conversion
// ─────────────────────────────────────────────────────────────────

/** 픽셀 좌표 → Cocos 상대 좌표 (Canvas 기준) */
function pixelToCocos(pixelX, pixelY) {
  return {
    x: pixelX - CANVAS_CENTER_X,
    y: CANVAS_HEIGHT / 2 - pixelY,  // Y축 반전
  };
}

/** Cocos 상대 좌표 → 픽셀 좌표 */
function cocosToPixel(cocosX, cocosY) {
  return {
    x: cocosX + CANVAS_CENTER_X,
    y: CANVAS_HEIGHT / 2 - cocosY,
  };
}

// ─────────────────────────────────────────────────────────────────
// API Layer (cocos-editor-server)
// ─────────────────────────────────────────────────────────────────

/** cocos-editor-server REST API 호출 */
function apiCall(apiPath, body, port = 3001) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port,
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch (e) { reject(new Error(`JSON parse error: ${buf}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/** 노드 속성 설정 단축 함수 */
function setProp(uuid, prop, val, port = 3001) {
  return apiCall('/api/node/set_node_property', { uuid, property: prop, value: val }, port);
}

/** 노드 정보 조회 (응답 정규화 포함) */
async function getNodeInfo(uuid, port = 3001) {
  const res = await apiCall('/api/node/get_node_info', { uuid }, port);
  return (res.result || res).data;
}

/**
 * 노드 + 컴포넌트 재귀 조회 (콘솔 출력)
 * @param {string} uuid
 * @param {number} [port]
 * @param {string} [indent]
 */
async function getNodeFull(uuid, port = 3001, indent = '') {
  const d = await getNodeInfo(uuid, port);
  console.log(`${indent}${d.name}: x=${d.x} y=${d.y} w=${d.width} h=${d.height} scaleX=${d.scaleX} scaleY=${d.scaleY}`);

  if (d.components?.some(c => c.type === 'cc.Sprite')) {
    const r = await apiCall('/api/component/get_component_info', { nodeUuid: uuid, componentType: 'cc.Sprite' }, port);
    const sp = r.result?.data;
    if (sp) console.log(`${indent}  Sprite: ${JSON.stringify(sp.properties)}`);
  }
  if (d.components?.some(c => c.type === 'cc.Button')) {
    const r = await apiCall('/api/component/get_component_info', { nodeUuid: uuid, componentType: 'cc.Button' }, port);
    const btn = r.result?.data;
    if (btn) console.log(`${indent}  Button: ${JSON.stringify(btn.properties)}`);
  }
  if (d.children) {
    for (const child of d.children) {
      await getNodeFull(child.uuid, port, indent + '  ');
    }
  }
  return d;
}

/**
 * 3-shot 스크린샷 캡처 패턴 (구현 단독 / 레퍼런스 단독 / 오버레이 복원)
 * @param {object} opts
 * @param {string}   opts.overlayUuid  - 레퍼런스 오버레이 노드 UUID
 * @param {string}   opts.implUuid     - 구현 루트 노드 UUID (숨겼다 다시 표시)
 * @param {string}   opts.implOut      - impl 스크린샷 저장 경로
 * @param {string}   opts.refOut       - ref 스크린샷 저장 경로
 * @param {number}  [opts.overlayOpacity=128]
 * @param {number}  [opts.port=3001]
 */
async function captureScreenshots(opts) {
  const { overlayUuid, implUuid, implOut, refOut, overlayOpacity = 128, port = 3001 } = opts;

  // 1. impl만 표시
  await setProp(overlayUuid, 'active', false, port);
  await setProp(implUuid, 'active', true, port);
  await apiCall('/api/scene/capture_scene_screenshot', { outputPath: implOut }, port);

  // 2. ref(overlay)만 표시
  await setProp(implUuid, 'active', false, port);
  await setProp(overlayUuid, 'active', true, port);
  await setProp(overlayUuid, 'opacity', 255, port);
  await apiCall('/api/scene/capture_scene_screenshot', { outputPath: refOut }, port);

  // 3. 복원 (overlay 반투명)
  await setProp(implUuid, 'active', true, port);
  await setProp(overlayUuid, 'opacity', overlayOpacity, port);

  console.log(`Captured: ${implOut}, ${refOut}`);
}

// ─────────────────────────────────────────────────────────────────
// Image I/O
// ─────────────────────────────────────────────────────────────────

/** PNG 파일 로드 */
function loadPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

/**
 * 픽셀 RGB 반환 (경계 체크 포함)
 * @returns {[number, number, number]}
 */
function getPixel(png, x, y) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return [0, 0, 0];
  const idx = (y * png.width + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
}

// ─────────────────────────────────────────────────────────────────
// Background Detection
// ─────────────────────────────────────────────────────────────────

/** 레퍼런스 이미지 배경 (갈색/탄색 계열) */
function isRefBg(r, g, b) {
  if (Math.abs(r - 205) < 30 && Math.abs(g - 144) < 30 && Math.abs(b - 114) < 30) return true;
  if (r > 140 && r < 230 && g > 80 && g < 170 && b > 60 && b < 140 && (r - b) > 40) return true;
  return false;
}

/** 구현 이미지 배경 (베이지/회색 계열) */
function isImplBg(r, g, b) {
  if (Math.abs(r - 135) < 15 && Math.abs(g - 135) < 15 && Math.abs(b - 135) < 15) return true;
  if (Math.abs(r - 135) < 20 && Math.abs(g - 128) < 20 && Math.abs(b - 115) < 25) return true;
  if (r < 80 && g < 80 && b < 110) return true;
  return false;
}

/**
 * 특정 색상 판별 함수 생성기
 * @param {number} tr - 타겟 R
 * @param {number} tg - 타겟 G
 * @param {number} tb - 타겟 B
 * @param {number} [tolerance=20]
 */
function makeColorTest(tr, tg, tb, tolerance = 20) {
  return (r, g, b) =>
    Math.abs(r - tr) < tolerance &&
    Math.abs(g - tg) < tolerance &&
    Math.abs(b - tb) < tolerance;
}

// ─────────────────────────────────────────────────────────────────
// Measurement
// ─────────────────────────────────────────────────────────────────

/**
 * 특정 X 컬럼을 스캔해 수직 밴드 배열 반환
 * @returns {{ start, end, center, h }[]}
 */
function findVerticalBands(png, x, bgFn, minHeight = 15) {
  const bands = [];
  let inBand = false, start = 0;
  for (let y = 0; y < png.height; y++) {
    const [r, g, b] = getPixel(png, x, y);
    const bg = bgFn(r, g, b);
    if (!bg && !inBand) { inBand = true; start = y; }
    if (bg && inBand) {
      inBand = false;
      if (y - start >= minHeight) {
        bands.push({ start, end: y - 1, center: Math.round((start + y - 1) / 2), h: y - start });
      }
    }
  }
  if (inBand && png.height - start >= minHeight) {
    bands.push({ start, end: png.height - 1, center: Math.round((start + png.height - 1) / 2), h: png.height - start });
  }
  return bands;
}

/**
 * 특정 Y 행을 스캔해 수평 스팬 배열 반환
 * @returns {{ left, right, w }[]}
 */
function findHorizontalSpans(png, y, bgFn, minWidth = 20) {
  const spans = [];
  let inSpan = false, start = 0;
  for (let x = 0; x < png.width; x++) {
    const [r, g, b] = getPixel(png, x, y);
    const bg = bgFn(r, g, b);
    if (!bg && !inSpan) { inSpan = true; start = x; }
    if (bg && inSpan) {
      inSpan = false;
      if (x - start >= minWidth) spans.push({ left: start, right: x - 1, w: x - start });
    }
  }
  if (inSpan && png.width - start >= minWidth) {
    spans.push({ left: start, right: png.width - 1, w: png.width - start });
  }
  return spans;
}

/**
 * 근사 Y에서 ±searchRange 범위를 탐색해 단일 수직 밴드 반환
 * @returns {{ top, bottom, h, center } | null}
 */
function findBandAt(png, x, approxY, bgFn, searchRange = 40) {
  for (let dy = 0; dy <= searchRange; dy++) {
    for (const y of [approxY + dy, approxY - dy]) {
      if (y < 0 || y >= png.height) continue;
      const [r, g, b] = getPixel(png, x, y);
      if (bgFn(r, g, b)) continue;

      let top = y, bottom = y;
      for (let yy = y - 1; yy >= 0; yy--) {
        const [rr, gg, bb] = getPixel(png, x, yy);
        if (bgFn(rr, gg, bb)) break;
        top = yy;
      }
      for (let yy = y + 1; yy < png.height; yy++) {
        const [rr, gg, bb] = getPixel(png, x, yy);
        if (bgFn(rr, gg, bb)) break;
        bottom = yy;
      }
      return { top, bottom, h: bottom - top + 1, center: Math.round((top + bottom) / 2) };
    }
  }
  return null;
}

/**
 * 중심점에서 4방향으로 확장해 bounding box 반환
 * @returns {{ left, right, top, bottom, w, h, cx, cy }}
 */
function measureBBox(png, cx, cy, bgFn) {
  let top = cy, bottom = cy, left = cx, right = cx;
  for (let y = cy; y >= 0; y--) {
    const [r, g, b] = getPixel(png, cx, y);
    if (bgFn(r, g, b)) { top = y + 1; break; }
    if (y === 0) top = 0;
  }
  for (let y = cy; y < png.height; y++) {
    const [r, g, b] = getPixel(png, cx, y);
    if (bgFn(r, g, b)) { bottom = y - 1; break; }
    if (y === png.height - 1) bottom = png.height - 1;
  }
  for (let x = cx; x >= 0; x--) {
    const [r, g, b] = getPixel(png, x, cy);
    if (bgFn(r, g, b)) { left = x + 1; break; }
    if (x === 0) left = 0;
  }
  for (let x = cx; x < png.width; x++) {
    const [r, g, b] = getPixel(png, x, cy);
    if (bgFn(r, g, b)) { right = x - 1; break; }
    if (x === png.width - 1) right = png.width - 1;
  }
  return {
    left, right, top, bottom,
    w: right - left + 1,
    h: bottom - top + 1,
    cx: Math.round((left + right) / 2),
    cy: Math.round((top + bottom) / 2),
  };
}

/**
 * 요소 bounding box + 전체 행 스캔으로 최대 폭 측정
 * @returns {{ top, bottom, left, right, w, h, maxW }}
 */
function measureElement(png, cx, cy, halfW, halfH, bgFn) {
  let top = cy, bottom = cy;
  for (let y = cy - 1; y >= cy - halfH; y--) {
    const [r, g, b] = getPixel(png, cx, y);
    if (bgFn(r, g, b)) { top = y + 1; break; }
    top = y;
  }
  for (let y = cy + 1; y <= cy + halfH; y++) {
    const [r, g, b] = getPixel(png, cx, y);
    if (bgFn(r, g, b)) { bottom = y - 1; break; }
    bottom = y;
  }
  const midY = Math.round((top + bottom) / 2);
  let left = cx, right = cx;
  for (let x = cx - 1; x >= cx - halfW; x--) {
    const [r, g, b] = getPixel(png, x, midY);
    if (bgFn(r, g, b)) { left = x + 1; break; }
    left = x;
  }
  for (let x = cx + 1; x <= cx + halfW; x++) {
    const [r, g, b] = getPixel(png, x, midY);
    if (bgFn(r, g, b)) { right = x - 1; break; }
    right = x;
  }

  let maxW = 0;
  for (let y = top; y <= bottom; y += 2) {
    let l = cx, r2 = cx;
    for (let x = cx - 1; x >= cx - halfW; x--) {
      const [r, g, b] = getPixel(png, x, y);
      if (bgFn(r, g, b)) break;
      l = x;
    }
    for (let x = cx + 1; x <= cx + halfW; x++) {
      const [r, g, b] = getPixel(png, x, y);
      if (bgFn(r, g, b)) break;
      r2 = x;
    }
    if (r2 - l + 1 > maxW) maxW = r2 - l + 1;
  }

  return { top, bottom, left, right, w: right - left + 1, h: bottom - top + 1, maxW };
}

/**
 * 원형 요소 측정 (전체 행 스캔으로 최대 폭 탐색)
 * @returns {{ top, bottom, h, maxW, left, right }}
 */
function measureCircle(png, cx, cy, maxR, bgFn) {
  let top = cy, bottom = cy;
  for (let y = cy - 1; y >= cy - maxR; y--) {
    const [r, g, b] = getPixel(png, cx, y);
    if (bgFn(r, g, b)) { top = y + 1; break; }
    top = y;
  }
  for (let y = cy + 1; y <= cy + maxR; y++) {
    const [r, g, b] = getPixel(png, cx, y);
    if (bgFn(r, g, b)) { bottom = y - 1; break; }
    bottom = y;
  }
  let maxW = 0, bestL = cx, bestR = cx;
  for (let y = top; y <= bottom; y++) {
    let l = cx, r2 = cx;
    for (let x = cx - 1; x >= cx - maxR; x--) {
      const [r, g, b] = getPixel(png, x, y);
      if (bgFn(r, g, b)) break;
      l = x;
    }
    for (let x = cx + 1; x <= cx + maxR; x++) {
      const [r, g, b] = getPixel(png, x, y);
      if (bgFn(r, g, b)) break;
      r2 = x;
    }
    if (r2 - l + 1 > maxW) { maxW = r2 - l + 1; bestL = l; bestR = r2; }
  }
  return { top, bottom, h: bottom - top + 1, maxW, left: bestL, right: bestR };
}

/**
 * 전체 이미지에서 특정 색상 픽셀의 bounding box 탐색
 * @param {Function} colorTest (r,g,b) => boolean
 * @returns {{ minX, maxX, minY, maxY, cx, cy, w, h } | null}
 */
function findColorRegions(png, colorTest) {
  let minX = png.width, maxX = 0, minY = png.height, maxY = 0, found = false;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b] = getPixel(png, x, y);
      if (colorTest(r, g, b)) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  return {
    minX, maxX, minY, maxY,
    cx: Math.round((minX + maxX) / 2),
    cy: Math.round((minY + maxY) / 2),
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

// ─────────────────────────────────────────────────────────────────
// Diff / Comparison
// ─────────────────────────────────────────────────────────────────

/** 단일 픽셀 채널 합산 차이 */
function pixelDiff(img1, img2, x, y) {
  const [r1, g1, b1] = getPixel(img1, x, y);
  const [r2, g2, b2] = getPixel(img2, x, y);
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

/** 사각형 영역 평균 픽셀 차이 */
function regionDiff(img1, img2, x1, y1, x2, y2) {
  let total = 0, count = 0;
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const [r1, g1, b1] = getPixel(img1, x, y);
      const [r2, g2, b2] = getPixel(img2, x, y);
      total += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      count++;
    }
  }
  return count > 0 ? Math.round(total / count) : 0;
}

/**
 * ref 영역을 impl 위에서 수직으로 슬라이드해 픽셀 차이 최소 Y 오프셋 탐색
 * @returns {{ offset: number, diff: number }}
 */
function findBestYOffset(ref, impl, cx, refTop, refBot, searchRange = 30) {
  const sampleW = 60;
  let bestOff = 0, bestDiff = Infinity;
  for (let dy = -searchRange; dy <= searchRange; dy++) {
    let total = 0, count = 0;
    for (let y = refTop; y <= refBot; y += 2) {
      for (let x = cx - sampleW; x <= cx + sampleW; x += 4) {
        const [r1, g1, b1] = getPixel(ref, x, y);
        const [r2, g2, b2] = getPixel(impl, x, y + dy);
        total += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        count++;
      }
    }
    const avg = total / count;
    if (avg < bestDiff) { bestDiff = avg; bestOff = dy; }
  }
  return { offset: bestOff, diff: Math.round(bestDiff) };
}

/**
 * ref 영역을 impl 위에서 수평으로 슬라이드해 픽셀 차이 최소 X 오프셋 탐색
 * @returns {{ offset: number, diff: number }}
 */
function findBestXOffset(ref, impl, cy, refLeft, refRight, searchRange = 30) {
  const sampleH = 30;
  let bestOff = 0, bestDiff = Infinity;
  for (let dx = -searchRange; dx <= searchRange; dx++) {
    let total = 0, count = 0;
    for (let y = cy - sampleH; y <= cy + sampleH; y += 4) {
      for (let x = refLeft; x <= refRight; x += 2) {
        const [r1, g1, b1] = getPixel(ref, x, y);
        const [r2, g2, b2] = getPixel(impl, x + dx, y);
        total += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        count++;
      }
    }
    const avg = total / count;
    if (avg < bestDiff) { bestDiff = avg; bestOff = dx; }
  }
  return { offset: bestOff, diff: Math.round(bestDiff) };
}

/**
 * ref 밴드와 impl 밴드 크기 비교 (콘솔 출력 포함)
 * @param {{ start, end, center, h }[]} refBands
 * @param {{ start, end, center, h }[]} implBands
 */
function compareBandSizes(refBands, implBands, ref, impl) {
  const count = Math.min(refBands.length, implBands.length);
  for (let i = 0; i < count; i++) {
    const rb = refBands[i], ib = implBands[i];
    const rSpans = findHorizontalSpans(ref, rb.center, isRefBg, 15);
    const iSpans = findHorizontalSpans(impl, ib.center, isImplBg, 15);
    const rw = rSpans.length > 0 ? rSpans.reduce((a, b) => a.w > b.w ? a : b).w : 0;
    const iw = iSpans.length > 0 ? iSpans.reduce((a, b) => a.w > b.w ? a : b).w : 0;
    const dw = rw - iw, dh = rb.h - ib.h;
    const marker = (Math.abs(dw) > 5 || Math.abs(dh) > 5) ? ' ← diff' : '';
    console.log(`  Band ${i}: REF ${rw}×${rb.h} vs IMPL ${iw}×${ib.h}  Δw=${dw} Δh=${dh}${marker}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd  = args[0];

  function parseArgs(arr) {
    const opts = {};
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].startsWith('--')) {
        opts[arr[i].slice(2)] = arr[i + 1] || true;
        i++;
      } else {
        opts._positional = opts._positional || [];
        opts._positional.push(arr[i]);
      }
    }
    return opts;
  }

  const opts = parseArgs(args.slice(1));

  (async () => {
    switch (cmd) {

      // ── capture ─────────────────────────────────────────────────
      // node pixel-diff.js capture --overlay <uuid> --impl <uuid>
      //   --out-impl impl.png --out-ref ref.png [--port 3001]
      case 'capture': {
        if (!opts.overlay || !opts.impl || !opts['out-impl'] || !opts['out-ref']) {
          console.error('Usage: capture --overlay <uuid> --impl <uuid> --out-impl <path> --out-ref <path>');
          process.exit(1);
        }
        await captureScreenshots({
          overlayUuid: opts.overlay,
          implUuid: opts.impl,
          implOut: opts['out-impl'],
          refOut: opts['out-ref'],
          port: Number(opts.port || 3001),
        });
        break;
      }

      // ── measure ──────────────────────────────────────────────────
      // node pixel-diff.js measure <image.png> [--type ref|impl] [--scan-x 375]
      case 'measure': {
        const imgPath = opts._positional?.[0];
        if (!imgPath) { console.error('Usage: measure <image.png> [--type ref|impl] [--scan-x 375]'); process.exit(1); }
        const png    = loadPng(imgPath);
        const bgFn   = (opts.type === 'impl') ? isImplBg : isRefBg;
        const scanX  = Number(opts['scan-x'] || CANVAS_CENTER_X);

        console.log(`Image: ${png.width}×${png.height}`);
        console.log(`\n=== Vertical bands at x=${scanX} ===`);
        const bands = findVerticalBands(png, scanX, bgFn);
        bands.forEach((b, i) => {
          const cocos = pixelToCocos(scanX, b.center);
          console.log(`  Band ${i}: y=${b.start}-${b.end} h=${b.h} center=${b.center}  Cocos=(${cocos.x}, ${cocos.y})`);
        });

        console.log('\n=== Bounding boxes ===');
        for (const [i, band] of bands.entries()) {
          let minLeft = 999, maxRight = 0;
          for (let y = band.start; y <= band.end; y += 2) {
            const spans = findHorizontalSpans(png, y, bgFn, 15);
            if (spans.length > 0) {
              const main = spans.reduce((a, b) => a.w > b.w ? a : b);
              if (main.left < minLeft) minLeft = main.left;
              if (main.right > maxRight) maxRight = main.right;
            }
          }
          const w = maxRight - minLeft + 1;
          const cx = Math.round((minLeft + maxRight) / 2);
          const cocos = pixelToCocos(cx, band.center);
          console.log(`  Band ${i}: px(${minLeft},${band.start})-(${maxRight},${band.end}) ${w}×${band.h}  Cocos center=(${cocos.x}, ${cocos.y})`);
        }
        break;
      }

      // ── diff ─────────────────────────────────────────────────────
      // node pixel-diff.js diff <ref.png> <impl.png> [--scan-x 375]
      case 'diff': {
        const [refPath, implPath] = opts._positional || [];
        if (!refPath || !implPath) { console.error('Usage: diff <ref.png> <impl.png> [--scan-x 375]'); process.exit(1); }
        const ref    = loadPng(refPath);
        const impl   = loadPng(implPath);
        const scanX  = Number(opts['scan-x'] || CANVAS_CENTER_X);

        console.log(`ref=${ref.width}×${ref.height}  impl=${impl.width}×${impl.height}`);

        const refBands  = findVerticalBands(ref, scanX, isRefBg);
        const implBands = findVerticalBands(impl, scanX, isImplBg);
        console.log(`\nRef bands: ${refBands.length}  Impl bands: ${implBands.length}`);

        console.log('\n=== Band size comparison ===');
        compareBandSizes(refBands, implBands, ref, impl);

        console.log('\n=== Overall region diff ===');
        const overall = regionDiff(ref, impl, 0, 0, Math.min(ref.width, impl.width) - 1, Math.min(ref.height, impl.height) - 1);
        console.log(`  Average pixel diff: ${overall}`);
        break;
      }

      // ── offset ───────────────────────────────────────────────────
      // node pixel-diff.js offset <ref.png> <impl.png> [--elements <json-file>]
      case 'offset': {
        const [refPath, implPath] = opts._positional || [];
        if (!refPath || !implPath) { console.error('Usage: offset <ref.png> <impl.png> [--elements elements.json]'); process.exit(1); }
        const ref  = loadPng(refPath);
        const impl = loadPng(implPath);

        let elements;
        if (opts.elements) {
          elements = JSON.parse(fs.readFileSync(opts.elements, 'utf8'));
        } else {
          // elements.json 없으면 ref 밴드 자동 탐지
          const bands = findVerticalBands(ref, CANVAS_CENTER_X, isRefBg, 30);
          elements = bands.map((b, i) => ({
            name: `Band${i}`,
            cx: CANVAS_CENTER_X,
            top: b.start, bot: b.end,
            left: CANVAS_CENTER_X - 200, right: CANVAS_CENTER_X + 200,
            cy: b.center,
          }));
        }

        console.log('=== Best offsets (ref → impl) ===\n');
        for (const el of elements) {
          const yRes = findBestYOffset(ref, impl, el.cx, el.top, el.bot);
          const xRes = findBestXOffset(ref, impl, el.cy, el.left || el.cx - 200, el.right || el.cx + 200);
          const needsAdj = Math.abs(yRes.offset) > 2 || Math.abs(xRes.offset) > 2;
          console.log(`${el.name}:`);
          console.log(`  Y offset: ${yRes.offset}px (diff=${yRes.diff})  X offset: ${xRes.offset}px (diff=${xRes.diff})`);
          if (needsAdj) {
            console.log(`  → Cocos adjustment: dx=${-xRes.offset}  dy=${yRes.offset}`);
          } else {
            console.log(`  → Within tolerance`);
          }
        }
        break;
      }

      // ── nodes ────────────────────────────────────────────────────
      // node pixel-diff.js nodes <uuid1> [uuid2 ...] [--port 3001]
      case 'nodes': {
        const uuids = opts._positional || [];
        if (uuids.length === 0) { console.error('Usage: nodes <uuid1> [uuid2 ...] [--port 3001]'); process.exit(1); }
        const port = Number(opts.port || 3001);
        for (const uuid of uuids) {
          console.log(`\n=== ${uuid} ===`);
          await getNodeFull(uuid, port);
        }
        break;
      }

      default:
        console.log(`
pixel-diff.js — Cocos Creator UI pixel analysis tool

Commands:
  capture  --overlay <uuid> --impl <uuid> --out-impl <path> --out-ref <path> [--port 3001]
  measure  <image.png> [--type ref|impl] [--scan-x 375]
  diff     <ref.png> <impl.png> [--scan-x 375]
  offset   <ref.png> <impl.png> [--elements elements.json]
  nodes    <uuid1> [uuid2 ...] [--port 3001]
`);
    }
  })().catch(e => { console.error(e.message); process.exit(1); });
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  CANVAS_CENTER_X,
  CANVAS_HEIGHT,
  // Coordinates
  pixelToCocos,
  cocosToPixel,
  // API
  apiCall,
  setProp,
  getNodeInfo,
  getNodeFull,
  captureScreenshots,
  // Image
  loadPng,
  getPixel,
  // Background
  isRefBg,
  isImplBg,
  makeColorTest,
  // Measurement
  findVerticalBands,
  findHorizontalSpans,
  findBandAt,
  measureBBox,
  measureElement,
  measureCircle,
  findColorRegions,
  // Diff
  pixelDiff,
  regionDiff,
  findBestYOffset,
  findBestXOffset,
  compareBandSizes,
};
