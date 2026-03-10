#!/bin/bash
# cocos-editor-server installer for Cocos Creator 2.x projects
# Usage: bash install.sh /path/to/your/cocos-project [port]
# If port is not specified, auto-detects an available port starting from 3000.

set -e

PROJECT_PATH="$1"
MANUAL_PORT="$2"

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: bash install.sh <project-path> [port]"
    echo "  project-path: Cocos Creator 2.x project root directory"
    echo "  port: HTTP server port (optional, auto-detects if omitted)"
    exit 1
fi

if [ ! -f "$PROJECT_PATH/project.json" ]; then
    echo "Error: project.json not found in $PROJECT_PATH"
    echo "Are you sure this is a Cocos Creator project?"
    exit 1
fi

# --- Auto-detect available port ---
find_available_port() {
    local port=$1
    local max_port=$((port + 100))
    while [ $port -lt $max_port ]; do
        if ! (echo >/dev/tcp/127.0.0.1/$port) 2>/dev/null; then
            echo $port
            return
        fi
        port=$((port + 1))
    done
    echo $1  # fallback to requested port
}

if [ -n "$MANUAL_PORT" ]; then
    PORT="$MANUAL_PORT"
    echo "Using specified port: $PORT"
else
    echo "Scanning for available port starting from 3000..."
    PORT=$(find_available_port 3000)
    echo "Found available port: $PORT"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$PROJECT_PATH/packages/cocos-editor-server"

echo ""
echo "Installing cocos-editor-server..."
echo "  Source: $SCRIPT_DIR"
echo "  Target: $DEST"
echo "  Port: $PORT"
echo ""

# Create directories
mkdir -p "$DEST/panel"
mkdir -p "$DEST/tools"

# Copy files
cp "$SCRIPT_DIR/package.json" "$DEST/"
cp "$SCRIPT_DIR/main.js" "$DEST/"
cp "$SCRIPT_DIR/scene-script.js" "$DEST/"
cp "$SCRIPT_DIR/panel/index.js" "$DEST/panel/"
cp "$SCRIPT_DIR/tools/base-tool.js" "$DEST/tools/"
cp "$SCRIPT_DIR/tools/scene-tools.js" "$DEST/tools/"
cp "$SCRIPT_DIR/tools/node-tools.js" "$DEST/tools/"
cp "$SCRIPT_DIR/tools/component-tools.js" "$DEST/tools/"
cp "$SCRIPT_DIR/tools/prefab-tools.js" "$DEST/tools/"
cp "$SCRIPT_DIR/tools/project-tools.js" "$DEST/tools/"
echo "  Extension files copied."

# Create settings file
LOCAL_DIR="$PROJECT_PATH/local"
mkdir -p "$LOCAL_DIR"
SETTINGS_FILE="$LOCAL_DIR/cocos-editor-server.json"
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "{\"port\": $PORT, \"autoStart\": true}" > "$SETTINGS_FILE"
    echo "  Created: $SETTINGS_FILE"
else
    echo "  Settings file already exists: $SETTINGS_FILE (skipped)"
fi

# Create/update .mcp.json
MCP_FILE="$PROJECT_PATH/.mcp.json"
if [ ! -f "$MCP_FILE" ]; then
    cat > "$MCP_FILE" << MCPEOF
{
  "mcpServers": {
    "cocos-creator": {
      "type": "url",
      "url": "http://127.0.0.1:$PORT/mcp"
    }
  }
}
MCPEOF
    echo "  Created: $MCP_FILE"
else
    echo "  .mcp.json already exists: $MCP_FILE (skipped)"
    echo "  Add manually if needed:"
    echo "    \"cocos-creator\": { \"type\": \"url\", \"url\": \"http://127.0.0.1:$PORT/mcp\" }"
fi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Open the project in Cocos Creator 2.x"
echo "  2. The server will auto-start on port $PORT"
echo "  3. Verify: curl http://127.0.0.1:$PORT/health"
