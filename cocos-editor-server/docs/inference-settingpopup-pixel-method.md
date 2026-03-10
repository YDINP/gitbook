# Pixel-Based UI Layout Inference Method

**Document Type**: Technical Post-Mortem / Methodology
**Project**: Z-wuhuarou (Cocos Creator 2.4.13)
**Design Resolution**: 750×1334
**Server**: cocos-editor-server (localhost:3001)
**Date**: 2026-02-26

---

## Context

SettingPopup UI element alignment required precise coordinate and dimension measurement against a reference image. Initial attempts using multimodal vision AI produced systematically incorrect measurements, prompting development of a direct pixel analysis method using pngjs PNG reading.

---

## Key Discovery: Screenshot = Design Resolution (1:1)

The foundation of this method is a critical observation about the capture pipeline:

- `capture_scene_screenshot` produces exactly **750×1334 PNG** (byte-for-byte match to design resolution)
- **Pixel coordinates in screenshot directly map to Cocos design coordinates** with no scaling
- **No scaling factor needed** between screenshot pixels and Cocos units
- **Formula for Y-axis**: `Cocos_y = 667 - pixel_y` (center anchor at Y=667, screen top at pixel Y=0)

This 1:1 mapping eliminates a major source of multimodal error: dimension confusion.

---

## Method: pngjs Pixel Band Analysis

The core approach scans the PNG image to identify UI elements as contiguous color bands, then measures their bounds and properties.

### 1. Background Color Identification

First, establish what "background" means for the target image:

- **Reference image**: brown background approximately **rgb(205,144,114)**
  - Full brown range: rgb(150-200, 95-140, 70-120)
  - Slightly darker browns are considered part of the background

- **Implementation screenshot**: light beige approximately **rgb(244,237,237)** with gray elements **rgb(135,135,135)**
  - More muted color palette
  - Clearly distinguishable from reference brown

Any pixel **outside** these ranges is considered a UI element.

### 2. Vertical Band Detection (findBandAt)

Scan vertically to isolate UI elements:

1. **Focus on center column**: x = 375 (image width 750 ÷ 2)
2. **Scan top-to-bottom** through all Y values
3. **Identify contiguous non-background pixels** as one band
4. **Record for each band**:
   - Top boundary pixel Y
   - Bottom boundary pixel Y
   - Band height (bottom - top)
   - Center Y = (top + bottom) ÷ 2
   - Convert to Cocos Y: `667 - center_Y`

Each band represents one UI element (button, toggle, label, etc.) in the vertical stack.

### 3. Horizontal Span Measurement (findCenterSpan)

Determine the width of each element:

1. **For each Y value within a band**:
   - Start at center column (x = 375)
   - Scan **left** until background is found
   - Scan **right** until background is found
   - Record the contiguous span (right - left)

2. **Take the maximum span** across all Y rows in the band
   - This gives the true max width (handles uneven edges)

3. **Estimate horizontal center** from left/right boundaries

### 4. Direct Color Sampling

For ambiguous cases (e.g., multiple candidate assets with similar shapes), sample specific pixel RGB values:

1. **Identify target element** at a known position (e.g., arrow in LevelInfo)
2. **Sample RGB at one or more positions** within that element
3. **Compare against known asset colors** in the project
4. **Use color as tiebreaker** when form is ambiguous

**Example**: Both arrow candidates appeared visually similar, but direct RGB sampling at pixel (700, 834) yielded **rgb(255, 219, 203)** (pink), not blue. This definitively identified `icon_ingame_next` asset.

---

## Why This Method Works Better Than Multimodal Vision

### Multimodal Vision Failures

Several attempts with Claude's vision API produced **systematically wrong measurements**:

- **Misidentified resolution**: Reported screenshot as "420×746" instead of 750×1334
- **Direction errors**: Confused vertical direction (top vs. bottom)
- **Scale cascades**: All dimensions off by ~1.78× (ratio of reported vs. actual width)
- **Ambiguous terminology**: Described positions vaguely ("upper-middle") without precise pixels

### Why Pixel Analysis Is Superior

1. **Exact, reproducible numbers** — no subjective interpretation
2. **Automated scanning** — no human eye bias
3. **Numeric output** — direct feed to coordinate calculations
4. **Verifiable at every step** — can visually inspect intermediate PNG analysis

---

## Reference Measurements (Proven Accurate)

These measurements were verified by visual inspection of overlay comparisons (reference at 50% opacity over implementation):

| Element | Pixel Center Y | Cocos Y | Width | Height | Notes |
|---------|---|---|---|---|---|
| SoundToggle | ~326 | 341 | ~143 | ~132 | Upper toggle |
| EffectToggle | ~298 | 369 | ~140 | ~72 | Second toggle |
| LobbyButton | 494 | 173 | 396 | 132 | Button row 1 |
| ChapterButton | 670 | -3 | 396 | 132 | Button row 2 |
| LevelInfo | 834 | -167 | ~390 | ~15 (text only) | Label, no buttons |
| SkipButton | 955 | -288 | 382 | 65 | Truncated below |
| RankButton | 1172 | -505 | 396 | 132 | Button row 3 |

**Note on SkipButton**: Height appears truncated (65 vs. expected 132) because the button's bottom edge extends beyond the reference screenshot visible area. Pixel band detection stopped when encountering the reference image boundary.

---

## Asset Verification via Pixel Color

### Arrow Color Discovery

Both arrow elements in LevelInfo had the same visual shape but ambiguous color in the reference image due to brown background blending. Direct RGB sampling resolved this:

- **Sampled position**: pixel (700, 834) within left arrow
- **RGB result**: (255, 219, 203) — **pink/salmon tone**
- **Not blue** (as initially assumed by visual inspection)
- **Asset identified**: `icon_ingame_next` (with scaleX=-1 for left-pointing version)

### Color Tinting Limitation

An important finding: color tinting on pre-colored sprite assets produces **multiplication darkening** rather than true hue shifts in Cocos 2.x. This means:

- Setting tint color on a pre-colored sprite darkens it
- Cannot achieve light pastel shades via tint alone
- Recommend using distinct asset variants instead

---

## Tools and Workflow

### NPM Dependencies

```json
{
  "devDependencies": {
    "pngjs": "^7.0.0"
  }
}
```

### Execution Method

1. **Create Node.js script** (e.g., `tmp_analyze_bands.js`)
2. **Load PNG files** using pngjs
3. **Scan pixels** programmatically
4. **Output measurements** to stdout and/or CSV
5. **Execute**: `node tmp_analyze_bands.js`

### Image Comparison Pipeline

Three image types used:

1. **Implementation-only**: Current build screenshot
2. **Reference-only**: Target reference image
3. **Overlay**: Reference at 50% opacity composited over implementation
   - Visually confirms alignment accuracy
   - Used for final verification before commit

---

## Lessons Learned

### What Worked

- Pixel-level analysis avoids subjective interpretation
- pngjs PNG reading provides reliable data
- Center column scanning is robust (minimal background noise)
- Direct color sampling resolves ambiguities

### What Didn't Work

- Multimodal vision made fundamental measurement errors
- Scaling factors from vision output were unreliable
- Visual descriptions without numeric coordinates led to errors
- Asset guessing based on name keywords (not form) caused wrong selections

### Best Practices Established

1. Always verify screenshot resolution matches design resolution
2. Establish and document background color ranges first
3. Scan center column for vertical structure before measuring widths
4. Use color sampling as a verification step for ambiguous elements
5. Create overlay images to visually validate measurements before implementation

---

## Conclusion

Pixel-based analysis using pngjs provides a reliable, reproducible method for UI layout inference when a PNG reference screenshot is available. The 1:1 mapping between screenshot pixels and Cocos design coordinates eliminates scaling ambiguity. This method proved significantly more accurate than multimodal vision approaches for the SettingPopup alignment task.

The technique is most effective when:
- Design resolution matches screenshot resolution exactly
- Background colors are sufficiently distinct from UI elements
- Color values are needed to disambiguate similar-looking assets
- Numeric precision is critical (pixel-perfect alignment required)
