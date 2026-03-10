# Cocos Editor Server

[![Cocos Creator](https://img.shields.io/badge/Cocos%20Creator-2.x-blue)](https://www.cocos.com/creator)
[![Node.js](https://img.shields.io/badge/Node.js-Built--in%20http-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](#license)

An HTTP server extension for **Cocos Creator 2.x** that exposes 61 editor automation tools via REST API. Enables AI-powered editor control without external dependencies.

> **Cocos Creator 2.x 전용** — 3.x는 에디터 확장 API 구조가 완전히 다르므로 지원하지 않습니다.
> (`Editor.Scene.callSceneScript()`, `Editor.assetdb.*`, `cc.*` 등 2.x API에 의존)

## Overview

Cocos Editor Server runs as an extension inside the Cocos Creator 2.x editor process, providing remote access to editor APIs through:

- **REST API** - Simple HTTP POST interface for direct tool invocation
- **Editor Panel UI** - Visual dashboard for server status and settings

### Key Features

- **61 Tools** across 5 categories (Scene, Node, Component, Prefab, Project)
- **Zero External Dependencies** - Uses Node.js built-in `http` module only
- **Dynamic Port Allocation** - Auto-detects available port (3000+) on startup
- **CORS Enabled** - Full cross-origin support for web-based clients
- **Editor Integration** - Dockable panel with real-time server status
- **Auto-Start** - Configurable automatic launch on editor startup
- **Bidirectional Communication** - Full scene read/write access via IPC

## System Requirements

- **Cocos Creator 2.x** (tested on 2.4.13 and compatible versions)
- **No npm install** required - extension runs with built-in Node.js
- **Windows, macOS, or Linux** support

## Installation

### Quick Install - Windows PowerShell

```powershell
cd path\to\cocos-editor-server
.\install.ps1 -ProjectPath "C:\path\to\your\cocos\project"
```

Auto-detects an available port starting from 3000.

### Quick Install - macOS/Linux

```bash
cd path/to/cocos-editor-server
bash install.sh /path/to/your/cocos/project
```

### Manual Installation

1. **Copy extension files** to your project:

```bash
# Create the extension directory
mkdir -p {project}/packages/cocos-editor-server/tools
mkdir -p {project}/packages/cocos-editor-server/panel

# Copy files
cp package.json main.js scene-script.js {project}/packages/cocos-editor-server/
cp panel/index.js {project}/packages/cocos-editor-server/panel/
cp tools/*.js {project}/packages/cocos-editor-server/tools/
```

2. **Create settings file** at `{project}/local/cocos-editor-server.json`:

```json
{
  "port": 3000,
  "autoStart": true
}
```

3. **Open the project** in Cocos Creator 2.x. The extension will auto-load and start the server.

## Architecture

The server uses a two-process architecture:

```
External Client (Claude Code, curl, etc.)
         |
         v
    HTTP Server (main.js)
    [127.0.0.1:3000]
         |
    +--> Editor.assetdb.*        (read assets, search)
    |    Editor.Ipc              (send messages to panel)
    |
    +--> Editor.Scene.callSceneScript()
         |
         v
    Scene Process (scene-script.js)
         |
         v
    cc.* API Access             (full Cocos runtime)
```

### Components

| File | Purpose |
|------|---------|
| `main.js` | HTTP server, tool execution router |
| `scene-script.js` | Scene process bridge for cc.* runtime API access |
| `panel/index.js` | Editor panel UI - status display and settings |
| `tools/base-tool.js` | Base class for all tool implementations |
| `tools/scene-tools.js` | 22 tools for scene management |
| `tools/node-tools.js` | 15 tools for node operations |
| `tools/component-tools.js` | 5 tools for component management |
| `tools/prefab-tools.js` | 4 tools for prefab handling |
| `tools/project-tools.js` | 15 tools for assets and project settings |

## Claude Code 연동

이 서버는 Cocos Creator 에디터 프로세스 내부에서 동작하는 **HTTP 서버**입니다.
Claude Code의 Electron MCP(`mcp__electron__*`)가 아닌, **Bash `curl`을 통한 HTTP REST API 호출**로 사용합니다.

### 왜 Electron MCP가 아닌가?

| | Electron MCP | cocos-editor-server |
|---|---|---|
| **연결 방식** | Chrome DevTools Protocol (port 9222) | HTTP REST API (port 3000+) |
| **요구사항** | `--remote-debugging-port=9222`로 앱 실행 | Cocos Creator 에디터 내 확장으로 자동 실행 |
| **프로토콜** | WebSocket (CDP) | HTTP POST (JSON) |
| **대상** | 범용 Electron 앱 | Cocos Creator 2.x 에디터 전용 |

Cocos Creator는 `--remote-debugging-port`로 실행하지 않으므로 Electron MCP로 접근할 수 없습니다.
대신 에디터 내부에서 `http` 모듈로 직접 HTTP 서버를 띄워 61개 도구를 노출합니다.

### Claude Code에서 사용하기

```bash
# 1. 서버 상태 확인
curl -s http://localhost:3001/health
# → {"status":"ok","tools":61,"port":3001}

# 2. 도구 목록 조회
curl -s http://localhost:3001/api/tools | python -m json.tool

# 3. 도구 호출 (POST + JSON body)
curl -s -X POST http://localhost:3001/api/scene/get_current_scene \
  -H "Content-Type: application/json" -d '{}'

curl -s -X POST http://localhost:3001/api/node/set_node_property \
  -H "Content-Type: application/json" \
  -d '{"uuid":"node-uuid","property":"x","value":100}'
```

### 포트 확인

기본 포트 3000, `EADDRINUSE` 시 자동 증가 (3001, 3002...).
프로젝트별 설정: `{project}/local/cocos-editor-server.json`

```bash
# 포트 스캔
for port in 3000 3001 3002 3003; do
  result=$(curl -s --max-time 1 "http://localhost:$port/health" 2>/dev/null)
  [ -n "$result" ] && echo "PORT $port: $result"
done
```

## Quick Start

### 1. Start the Server

The server auto-starts if `autoStart: true` in settings. Manually start via the editor menu:

```
Main Menu > Cocos Editor Server > Start Server
```

### 2. Verify Server is Running

```bash
curl http://127.0.0.1:3000/health
```

Response:
```json
{
  "status": "ok",
  "tools": 61,
  "port": 3000
}
```

### 3. List Available Tools

```bash
curl http://127.0.0.1:3000/api/tools
```

### 4. Call a Tool (REST API Example)

Get current scene info:

```bash
curl -X POST http://127.0.0.1:3000/api/scene/get_current_scene \
  -H "Content-Type: application/json" \
  -d '{}'
```

Create a new node:

```bash
curl -X POST http://127.0.0.1:3000/api/node/create_node \
  -H "Content-Type: application/json" \
  -d '{"name":"MyNode","parentUuid":"canvas-uuid"}'
```

## API Reference

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health check |
| `/api/tools` | GET | List all available tools |
| `/api/{category}/{tool}` | POST | Execute a tool |

### Tool Categories (61 Total)

#### Scene Tools (22)

Manage scenes, sprites, fonts, and project preview.

| Tool | Parameters | Description |
|------|------------|-------------|
| `get_current_scene` | none | Get current scene info (name, uuid, node count) |
| `get_scene_list` | `folder` | List all scene files |
| `open_scene` | `sceneUrl` | Open a scene by URL |
| `save_scene` | none | Save current scene |
| `create_scene` | `scenePath` | Create new scene file |
| `get_scene_hierarchy` | `includeComponents` | Get full node tree with optional components |
| `close_scene` | none | Close current scene, create empty one |
| `save_scene_as` | `savePath` | Save scene to new path |
| `open_prefab` | `prefabPath` | Open prefab in editor |
| `set_spriteframe` | `nodeUuid`, `spriteFrameUuid`, `spriteType`, `sizeMode`, `autoBorder` | Set sprite image with type (SIMPLE/SLICED/TILED/FILLED) and size mode. Auto-infers 9-slice border when SLICED + border=0 |
| `set_label_font` | `nodeUuid`, `fontUuid` | Set Label font asset by UUID (auto-disables useSystemFont) |
| `place_reference_image` | `textureUuid`, `opacity` | Place reference image overlay in scene for visual alignment |
| `remove_reference_image` | none | Remove reference image overlay |
| `undo` | none | Undo last action |
| `redo` | none | Redo last action |
| `start_preview` | none | Start scene preview |
| `stop_preview` | none | Stop scene preview |
| `get_label_text` | `nodeUuid` | Read cc.Label text as codepoint array (IPC encoding bypass for CJK) |
| `set_label_text` | `nodeUuid`, `text` | Set cc.Label text via codepoint encoding (IPC encoding bypass for CJK) |
| `capture_scene_screenshot` | `outputPath`, `width`, `height` | Capture scene screenshot to PNG file |
| `analyze_reference_layout` | `parentUuid`, `includeInactive` | Get detailed layout snapshot of all nodes for reference comparison (position, size, components, hierarchy) |
| `delete_screenshot` | `filePath` | Delete a previously captured screenshot file |

**Example - Get current scene:**

```bash
curl -X POST http://127.0.0.1:3000/api/scene/get_current_scene \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:
```json
{
  "success": true,
  "result": {
    "name": "Main",
    "uuid": "abc123def456",
    "nodeCount": 42
  }
}
```

#### Node Tools (15)

Create, query, and modify nodes in the scene.

| Tool | Parameters | Description |
|------|------------|-------------|
| `create_node` | `name`, `parentUuid`, `parentPath` | Create new node (parentPath preferred) |
| `get_node_info` | `uuid` | Get detailed node info (position, rotation, components) |
| `find_node_by_name` | `name` | Find first node matching name |
| `find_nodes` | `pattern`, `exactMatch` | Find all matching nodes |
| `get_all_nodes` | none | Get all nodes in scene |
| `set_node_property` | `uuid`, `property`, `value` | Set node property (name, position, rotation, etc.) |
| `set_node_transform` | `uuid`, `x`, `y`, `rotation`, `scaleX`, `scaleY` | Set transform properties |
| `delete_node` | `uuid` | Delete node and children |
| `move_node` | `uuid`, `parentUuid`, `index` | Move node to new parent |
| `duplicate_node` | `uuid`, `parentUuid` | Duplicate node |
| `select_node` | `uuid` | Select node in editor |
| `get_selected_nodes` | none | Get currently selected nodes |
| `focus_node` | `uuid` | Pan editor to focus on node |
| `reorder_node` | `uuid`, `targetIndex` | Reorder child in parent |
| `find_node_by_path` | `path` | Find node by path (e.g., "Canvas/Panel/Button") |

**Supported node properties:** `name`, `active`, `x`, `y`, `rotation`, `scaleX`, `scaleY`, `anchorX`, `anchorY`, `width`, `height`, `opacity`, `color`, `skewX`, `skewY`, `zIndex`

**Example - Create node:**

```bash
curl -X POST http://127.0.0.1:3000/api/node/create_node \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Button",
    "parentUuid": "canvas-uuid"
  }'
```

**Example - Set node property:**

```bash
curl -X POST http://127.0.0.1:3000/api/node/set_node_property \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "node-uuid",
    "property": "x",
    "value": 100
  }'
```

#### Component Tools (5)

Add, remove, and configure components on nodes.

| Tool | Parameters | Description |
|------|------------|-------------|
| `add_component` | `nodeUuid`, `componentType` | Add component to node |
| `remove_component` | `nodeUuid`, `componentType` | Remove component |
| `get_components` | `nodeUuid` | Get all components on node |
| `get_component_info` | `nodeUuid`, `componentType` | Get component details and properties |
| `set_component_property` | `nodeUuid`, `componentType`, `property`, `value` | Set component property |

**Common component types (Cocos Creator 2.x):**

- `cc.Sprite` - Render images
- `cc.Label` - Display text
- `cc.Button` - Clickable button
- `cc.Widget` - Layout alignment
- `cc.Layout` - Container layout
- `cc.ScrollView` - Scrollable area
- `cc.Animation` - Sprite animation
- `cc.Mask` - Alpha masking
- `cc.AudioSource` - Play audio
- `cc.ParticleSystem` - Particle effects
- `cc.RichText` - Rich formatted text
- `cc.EditBox` - Text input
- `cc.TiledMap` - Tilemap rendering
- `cc.VideoPlayer` - Video playback
- `cc.WebView` - Web content

**Example - Add component:**

```bash
curl -X POST http://127.0.0.1:3000/api/component/add_component \
  -H "Content-Type: application/json" \
  -d '{
    "nodeUuid": "button-uuid",
    "componentType": "cc.Button"
  }'
```

**Example - Set component property:**

```bash
curl -X POST http://127.0.0.1:3000/api/component/set_component_property \
  -H "Content-Type: application/json" \
  -d '{
    "nodeUuid": "label-uuid",
    "componentType": "cc.Label",
    "property": "string",
    "value": "Hello World"
  }'
```

#### Prefab Tools (4)

Work with prefab files.

| Tool | Parameters | Description |
|------|------------|-------------|
| `get_prefab_list` | `folder` | List all prefab files |
| `load_prefab` | `prefabPath` | Load and inspect prefab structure |
| `instantiate_prefab` | `prefabUuid`, `parentUuid`, `position` | Create instance in scene |
| `create_prefab` | `nodeUuid`, `savePath` | Create prefab from node |

**Example - Instantiate prefab:**

```bash
curl -X POST http://127.0.0.1:3000/api/prefab/instantiate_prefab \
  -H "Content-Type: application/json" \
  -d '{
    "prefabUuid": "prefab-uuid",
    "parentUuid": "canvas-uuid",
    "position": {"x": 100, "y": 200}
  }'
```

#### Project Tools (15)

Manage assets and project settings.

| Tool | Parameters | Description |
|------|------------|-------------|
| `get_project_info` | none | Get project metadata |
| `get_project_settings` | none | Get project.json settings |
| `refresh_assets` | `folder` | Reimport assets |
| `import_asset` | `sourcePath`, `targetFolder` | Import external file |
| `get_asset_info` | `assetUrl`, `assetUuid` | Get asset metadata |
| `browse_assets` | `folder`, `type` | Browse asset folder structure |
| `reveal_in_assets` | `assetUrl` | Highlight asset in editor |
| `delete_asset` | `assetUrl` | Delete asset |
| `move_asset` | `assetUrl`, `targetFolder` | Move asset |
| `create_folder` | `folderPath` | Create asset folder |
| `copy_asset` | `sourceUrl`, `targetFolder` | Copy asset |
| `get_asset_meta` | `assetUrl` | Get asset metadata file |
| `create_script` | `scriptPath`, `templateType` | Create new script file |
| `read_script` | `scriptPath` | Read script content |
| `update_script` | `scriptPath`, `content` | Update script file |

**Example - Browse assets:**

```bash
curl -X POST http://127.0.0.1:3000/api/project/browse_assets \
  -H "Content-Type: application/json" \
  -d '{
    "folder": "db://assets/textures",
    "type": "sprite-frame"
  }'
```

**Example - Create script:**

```bash
curl -X POST http://127.0.0.1:3000/api/project/create_script \
  -H "Content-Type: application/json" \
  -d '{
    "scriptPath": "db://assets/scripts/MyScript.js",
    "templateType": "component"
  }'
```


## Auto 9-Slice Border Inference

When using `set_spriteframe` with `spriteType=1` (SLICED), the server automatically checks if the target SpriteFrame's `.meta` file has border values set to 0. If so, it infers appropriate border values from the image dimensions.

### How It Works

1. `_resolveMetaInfo()` reads the `.meta` file and extracts border/size/dimension info
2. If all borders are 0, `_ensureSlicedBorder()` calls `_inferBorderFromShape(w, h)`
3. Border is inferred from the image's **aspect ratio** (shape classification)
4. Writes the inferred values to the `.meta` file
5. Calls `Editor.assetdb.refresh()` to update the asset database

### Shape-Based Inference

The border represents the **corner radius** of the image. Different shapes have different corner radii:

| Shape | Aspect Ratio | Formula | Border Direction | Example |
|-------|-------------|---------|-----------------|---------|
| Square/Circle | 0.8 ~ 1.25 | `min(w,h) × 0.43` | All 4 sides | btn_blue 230×203 → 87 |
| Wide pill | > 2.0 | `height × 0.47` | Left/Right only | img_chapter_coinB 291×83 → L/R=39 |
| Tall pill | < 0.5 | `width × 0.47` | Top/Bottom only | (vertical stretch) |
| Rounded rect | other | `min(w,h) × 0.30` | All 4 sides | img_chapter_slot 108×130 → 32 |

### Validation Data

| Asset | Size | Aspect | Actual Border | Inferred | Match |
|-------|------|--------|--------------|----------|-------|
| btn_blue | 230×203 | 1.13 | L/R=100 | L/R=87 | ~87% |
| button_2 | 61×61 | 1.0 | 27 all | 26 all | ~96% |
| friendFrame | 30×30 | 1.0 | 13 all | 13 all | 100% |
| img_chapter_coinB | 291×83 | 3.5 | L/R=39 | L/R=39 | 100% |
| img_chapter_slot | 108×130 | 0.83 | 33 all | 32 all | ~97% |

> **Note:** Decorative/asymmetric images (e.g., popup with header decoration) cannot be reliably auto-inferred. Use `autoBorder: false` and set borders manually for such cases.

### Opt-Out

Set `autoBorder: false` to skip auto-inference:

```bash
curl -X POST http://127.0.0.1:3000/api/scene/set_spriteframe \
  -H "Content-Type: application/json" \
  -d '{
    "nodeUuid": "sprite-node-uuid",
    "spriteFrameUuid": "texture-uuid",
    "spriteType": 1,
    "sizeMode": 0,
    "autoBorder": false
  }'
```

## Component Property Reference Binding

When setting component properties that reference other nodes or components, use special syntax:

### Node References

```json
{
  "nodeUuid": "sprite-uuid",
  "componentType": "cc.Button",
  "property": "target",
  "value": {
    "__type__": "cc.Node",
    "__id__": "button-target-uuid"
  }
}
```

### Component References

```json
{
  "nodeUuid": "event-source-uuid",
  "componentType": "cc.Button",
  "property": "clickEvents",
  "value": [
    {
      "handler": {
        "__type__": "cc.Component",
        "__id__": "handler-component-uuid"
      },
      "customEventData": "onButtonClicked"
    }
  ]
}
```

The server resolves UUID to actual node/component during property assignment.

## Server Configuration

Settings are stored in `{project}/local/cocos-editor-server.json`:

```json
{
  "port": 3000,
  "autoStart": true
}
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `port` | number | 3000 | HTTP server port |
| `autoStart` | boolean | false | Auto-start on editor launch |

### Change Settings

Via editor menu:

```
Main Menu > Cocos Editor Server > Open Panel
```

Then use the panel UI to adjust settings.

Via direct file edit:

1. Stop the server
2. Edit `local/cocos-editor-server.json`
3. Restart the server

## Troubleshooting

### Port Conflicts

**Problem:** Server fails to start with "EADDRINUSE"

**Solution:** The server automatically retries the next port (3001, 3002, etc.) up to 20 attempts. Check which port it settled on:

```bash
curl http://127.0.0.1:3001/health  # try 3001
curl http://127.0.0.1:3002/health  # try 3002
```

Or manually specify a port in `local/cocos-editor-server.json`.

### Server Not Starting

**Problem:** Server doesn't start, extension reports error

**Solutions:**

1. Verify Cocos Creator is fully loaded - wait 3-5 seconds after opening project
2. Check extension was properly copied: `packages/cocos-editor-server/package.json` exists
3. Reload extension: `Main Menu > Extensions > Reload (Ctrl+R)`
4. Check console for errors: `View > Developer > Console`

### Connection Refused

**Problem:** `curl http://127.0.0.1:3000/health` returns "Connection refused"

**Solutions:**

1. Verify server is running - check panel status or logs
2. Verify correct port - check `local/cocos-editor-server.json`
3. Ensure Cocos Creator window is active and not sleeping
4. Try health endpoint to confirm server is alive

### Non-ASCII Text (CJK) Corruption via IPC

**Problem:** Korean/Japanese/Chinese characters sent through `Editor.Scene.callSceneScript()` arrive as `U+FFFD` replacement characters (e.g., `???` or `���`).

**Cause:** Electron IPC serializes strings through a C++ layer that does not preserve non-ASCII UTF-8 bytes correctly.

**Solution:** Use `set_label_text` / `get_label_text` instead of `set_component_property`:

```bash
# WRONG - IPC will corrupt Korean characters
curl -X POST http://127.0.0.1:3001/api/component/set_component_property \
  -H "Content-Type: application/json" \
  -d '{"nodeUuid":"label-uuid","componentType":"cc.Label","property":"string","value":"안녕하세요"}'

# CORRECT - codepoints (numbers) are never corrupted by IPC
curl -X POST http://127.0.0.1:3001/api/scene/set_label_text \
  -H "Content-Type: application/json" \
  -d '{"nodeUuid":"label-uuid","text":"안녕하세요"}'
```

**Windows terminal note:** On Windows, `curl` may encode the JSON body in CP949 instead of UTF-8. Use a Node.js script for reliable CJK text delivery:

```javascript
// set-label.js
const http = require('http');
const body = JSON.stringify({ nodeUuid: 'label-uuid', text: '안녕하세요' });
const req = http.request({
  hostname: '127.0.0.1', port: 3001, path: '/api/scene/set_label_text',
  method: 'POST', headers: { 'Content-Type': 'application/json' }
}, res => res.on('data', d => console.log(d.toString())));
req.write(body); req.end();
```

```bash
node set-label.js
```

**How it works internally:**
- Write path (`base-tool.js`): non-ASCII chars are escaped to `\uXXXX` before IPC
- Read path (`scene-script.js`): responses use `__SAFE_JSON__` prefix + ASCII-safe JSON encoding
- `set_label_text` / `get_label_text`: pass codepoint arrays (pure numbers) — never corrupted

### Scene Script Methods Not Available

**Problem:** Tools fail with "scene-script method error"

**Solution:** Scene script is cached in the scene process. Restart Cocos Creator:

1. Stop the server
2. Close the editor
3. Reopen project
4. Server will auto-start (or manually start)

### Extension Not Loading

**Problem:** Extension doesn't appear in menu, panel won't open

**Solutions:**

1. Verify file structure:
   ```
   packages/cocos-editor-server/
   ├── package.json
   ├── main.js
   ├── scene-script.js
   ├── panel/index.js
   └── tools/
       ├── base-tool.js
       ├── scene-tools.js
       ├── node-tools.js
       ├── component-tools.js
       ├── prefab-tools.js
       └── project-tools.js
   ```

2. Reload extension: `View > Developer > Reload (Ctrl+R)`

3. Check package.json is valid JSON (no trailing commas)

4. Check console for syntax errors

## Usage Examples

### Create a Complete UI Layout

```bash
# 1. Get current scene
SCENE=$(curl -s -X POST http://127.0.0.1:3000/api/scene/get_current_scene \
  -H "Content-Type: application/json" -d '{}' | jq -r '.result.uuid')

# 2. Create Canvas
CANVAS=$(curl -s -X POST http://127.0.0.1:3000/api/node/create_node \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Canvas\"}" | jq -r '.result.uuid')

# 3. Create Button under Canvas
BUTTON=$(curl -s -X POST http://127.0.0.1:3000/api/node/create_node \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Button\",\"parentUuid\":\"$CANVAS\"}" | jq -r '.result.uuid')

# 4. Add Button component
curl -s -X POST http://127.0.0.1:3000/api/component/add_component \
  -H "Content-Type: application/json" \
  -d "{\"nodeUuid\":\"$BUTTON\",\"componentType\":\"cc.Button\"}" | jq .

# 5. Set button properties
curl -s -X POST http://127.0.0.1:3000/api/node/set_node_property \
  -H "Content-Type: application/json" \
  -d "{\"uuid\":\"$BUTTON\",\"property\":\"x\",\"value\":0}" | jq .
```

### Import and Use Prefab

```bash
# 1. Get prefab list
curl -s http://127.0.0.1:3000/api/project/browse_assets \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"folder\":\"db://assets\",\"type\":\"prefab\"}" | jq .

# 2. Instantiate prefab
INSTANCE=$(curl -s -X POST http://127.0.0.1:3000/api/prefab/instantiate_prefab \
  -H "Content-Type: application/json" \
  -d '{"prefabUuid":"prefab-uuid-here","parentUuid":"canvas-uuid"}' \
  | jq -r '.result.uuid')

# 3. Modify instance
curl -s -X POST http://127.0.0.1:3000/api/node/set_node_property \
  -H "Content-Type: application/json" \
  -d "{\"uuid\":\"$INSTANCE\",\"property\":\"x\",\"value\":100}" | jq .
```

### Set CJK Label Text

```bash
# Set Korean/Japanese/Chinese text on a Label node (IPC-safe)
curl -X POST http://127.0.0.1:3001/api/scene/set_label_text \
  -H "Content-Type: application/json" \
  -d '{"nodeUuid":"label-node-uuid","text":"안녕하세요"}'

# Read the label text back as codepoints + string
curl -X POST http://127.0.0.1:3001/api/scene/get_label_text \
  -H "Content-Type: application/json" \
  -d '{"nodeUuid":"label-node-uuid"}'
# → {"success":true,"result":{"codepoints":[50504,45397,54616,49464,50836],"text":"안녕하세요","length":5}}
```

### Capture Scene Screenshot

```bash
curl -X POST http://127.0.0.1:3001/api/scene/capture_scene_screenshot \
  -H "Content-Type: application/json" \
  -d '{"outputPath":"C:/tmp/scene.png","width":1280,"height":720}'
# → {"success":true,"result":{"filePath":"C:/tmp/scene.png","width":1280,"height":720}}
```

### Script Creation and Management

```bash
# 1. Create new script
curl -s -X POST http://127.0.0.1:3000/api/project/create_script \
  -H "Content-Type: application/json" \
  -d '{"scriptPath":"db://assets/scripts/MyScript.js","templateType":"component"}'

# 2. Read script
curl -s -X POST http://127.0.0.1:3000/api/project/read_script \
  -H "Content-Type: application/json" \
  -d '{"scriptPath":"db://assets/scripts/MyScript.js"}'

# 3. Update script
curl -s -X POST http://127.0.0.1:3000/api/project/update_script \
  -H "Content-Type: application/json" \
  -d '{"scriptPath":"db://assets/scripts/MyScript.js","content":"cc.Class({...})"}'
```

## Development and Contributing

### Understanding the Architecture

1. **main.js** runs in the editor main process with access to:
   - `Editor.Project.*` - project and asset management
   - `Editor.assetdb.*` - asset database queries
   - `Editor.Scene.callSceneScript()` - bridge to scene process

2. **scene-script.js** runs in the scene renderer process with full access to:
   - `cc.*` - Cocos Creator 2.x runtime API
   - Direct node manipulation
   - Component access and modification

3. **tool/*.js** files define the 61 available tools with:
   - `getTools()` - returns tool definitions (name, description, inputSchema)
   - `execute(toolName, args)` - executes the requested tool

### Adding New Tools

1. Edit the appropriate `tools/*-tools.js` file
2. Add tool definition to `getTools()` array
3. Add execution logic to `execute()` switch statement
4. Use `Editor.Scene.callSceneScript()` for scene access if needed

### Testing Changes

1. Edit file in `packages/cocos-editor-server/` (or symlink to source)
2. Reload extension: `View > Developer > Reload (Ctrl+R)`
3. Restart server or test with `curl` directly

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.2.0 | 2026-02 | 61 tools. Added: `set_label_text`, `get_label_text` (codepoint-based IPC encoding bypass for CJK text), `capture_scene_screenshot`, `analyze_reference_layout`, `delete_screenshot`. Removed: `get_scene_settings`. Fixed: Electron IPC encoding corruption for non-ASCII characters via `__SAFE_JSON__` protocol. `requireFresh` base-tool cache clearing. |
| 1.1.0 | 2025-02 | 57 tools. Added: `set_spriteframe` (SLICED/autoBorder), `set_label_font`, `place/remove_reference_image`, `get_scene_settings`. `_resolveMetaInfo` replaces `_resolveSpriteFrameUuid` with border/size info. Auto 9-slice border inference (43% heuristic). |
| 1.0.0 | 2024 | Initial release - 52 tools, MCP + REST API support |

## License

MIT License - see LICENSE file for details

## Support and Feedback

For issues, questions, or feature requests:

1. Check troubleshooting section above
2. Review server logs in editor console
3. Verify correct API endpoints and parameters
4. Check `.mcp.json` configuration for client setup

## Documentation

- [UI Reference-Based Layout Workflow](docs/workflow-ui-reference.md) — Multi-agent orchestration for building UI from reference images
- [Visual Inference Methodology](docs/ref-layout.md) — Coordinate conversion, asset matching, SLICED+Scale technique

## Related Resources

- [Cocos Creator 2.x Documentation](https://docs.cocos.com/creator/2.x/)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Cocos Creator Editor Extension API](https://docs.cocos.com/creator/2.x/manual/en/extension/)
