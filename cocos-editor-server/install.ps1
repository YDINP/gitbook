# cocos-editor-server installer for Cocos Creator 2.x projects
# Usage: .\install.ps1 -ProjectPath "C:\path\to\project" [-Port 0]
# If Port is 0 or omitted, auto-detects an available port starting from 3000.

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path "$ProjectPath\project.json")) {
    Write-Error "project.json not found in $ProjectPath. Is this a Cocos Creator project?"
    exit 1
}

# --- Auto-detect available port ---
function Find-AvailablePort {
    param([int]$StartPort = 3000)
    $port = $StartPort
    $maxPort = $StartPort + 100
    while ($port -lt $maxPort) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $port)
            $tcp.Close()
            # Port is in use, try next
            $port++
        } catch {
            # Connection failed = port is available
            return $port
        }
    }
    return $StartPort  # fallback
}

if ($Port -eq 0) {
    Write-Host "Scanning for available port starting from 3000..."
    $Port = Find-AvailablePort -StartPort 3000
    Write-Host "Found available port: $Port"
} else {
    Write-Host "Using specified port: $Port"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dest = Join-Path $ProjectPath "packages\cocos-editor-server"

Write-Host ""
Write-Host "Installing cocos-editor-server..."
Write-Host "  Source: $ScriptDir"
Write-Host "  Target: $Dest"
Write-Host "  Port: $Port"
Write-Host ""

# Create directories
New-Item -ItemType Directory -Force -Path "$Dest\panel" | Out-Null
New-Item -ItemType Directory -Force -Path "$Dest\tools" | Out-Null

# Copy files
Copy-Item "$ScriptDir\package.json" "$Dest\" -Force
Copy-Item "$ScriptDir\main.js" "$Dest\" -Force
Copy-Item "$ScriptDir\scene-script.js" "$Dest\" -Force
Copy-Item "$ScriptDir\panel\index.js" "$Dest\panel\" -Force
Copy-Item "$ScriptDir\tools\base-tool.js" "$Dest\tools\" -Force
Copy-Item "$ScriptDir\tools\scene-tools.js" "$Dest\tools\" -Force
Copy-Item "$ScriptDir\tools\node-tools.js" "$Dest\tools\" -Force
Copy-Item "$ScriptDir\tools\component-tools.js" "$Dest\tools\" -Force
Copy-Item "$ScriptDir\tools\prefab-tools.js" "$Dest\tools\" -Force
Copy-Item "$ScriptDir\tools\project-tools.js" "$Dest\tools\" -Force
Write-Host "  Extension files copied."

# Create settings file
$LocalDir = Join-Path $ProjectPath "local"
New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
$SettingsFile = Join-Path $LocalDir "cocos-editor-server.json"
if (-not (Test-Path $SettingsFile)) {
    $settingsJson = "{`"port`": $Port, `"autoStart`": true}"
    Set-Content $SettingsFile $settingsJson -Encoding UTF8
    Write-Host "  Created: $SettingsFile"
} else {
    Write-Host "  Settings file already exists: $SettingsFile (skipped)"
}

# Create .mcp.json
$McpFile = Join-Path $ProjectPath ".mcp.json"
if (-not (Test-Path $McpFile)) {
    $mcpContent = @"
{
  "mcpServers": {
    "cocos-creator": {
      "type": "url",
      "url": "http://127.0.0.1:${Port}/mcp"
    }
  }
}
"@
    Set-Content $McpFile $mcpContent -Encoding UTF8
    Write-Host "  Created: $McpFile"
} else {
    Write-Host "  .mcp.json already exists: $McpFile (skipped)"
    Write-Host "  Add manually: `"cocos-creator`": { `"type`": `"url`", `"url`": `"http://127.0.0.1:${Port}/mcp`" }"
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open the project in Cocos Creator 2.x"
Write-Host "  2. The server will auto-start on port $Port"
Write-Host "  3. Verify: curl http://127.0.0.1:${Port}/health"
