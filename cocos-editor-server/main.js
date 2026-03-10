'use strict';

// ============================================================================
// Cocos Editor Server - Main Process Entry Point (Cocos Creator 2.x)
//
// Creates an HTTP server implementing the MCP (Model Context Protocol)
// JSON-RPC 2.0 interface for AI-powered editor control.
//
// Endpoints:
//   POST /mcp    - JSON-RPC 2.0 MCP protocol
//   GET  /health - Health check
//   POST /api/{category}/{tool} - Simple REST API
//   GET  /api/tools - List available tools
// ============================================================================

var http = require('http');
var url = require('url');
var Path = require('path');
var Fs = require('fs');

// Tool modules (with cache clearing for hot-reload support)
function requireFresh(modulePath) {
    var resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    return require(modulePath);
}
// Clear base-tool cache first so tool modules get the updated version
requireFresh('./tools/base-tool');
var SceneTools = requireFresh('./tools/scene-tools');
var NodeTools = requireFresh('./tools/node-tools');
var ComponentTools = requireFresh('./tools/component-tools');
var PrefabTools = requireFresh('./tools/prefab-tools');
var ProjectTools = requireFresh('./tools/project-tools');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
var httpServer = null;
var tools = {};
var toolsList = [];
var settings = {
    port: 3000,
    autoStart: false
};

// Settings file path
var settingsFilePath = '';

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------
function getSettingsPath() {
    if (settingsFilePath) return settingsFilePath;
    try {
        var projectPath = Editor.Project.path || Editor.projectPath || '';
        settingsFilePath = Path.join(projectPath, 'local', 'cocos-editor-server.json');
    } catch (e) {
        settingsFilePath = Path.join(__dirname, 'settings.json');
    }
    return settingsFilePath;
}

function loadSettings() {
    try {
        var filePath = getSettingsPath();
        if (Fs.existsSync(filePath)) {
            var data = JSON.parse(Fs.readFileSync(filePath, 'utf-8'));
            settings.port = data.port || 3000;
            settings.autoStart = data.autoStart || false;
        }
    } catch (e) {
        Editor.warn('[MCP] Failed to load settings: ' + e.message);
    }
    return settings;
}

function saveSettings(newSettings) {
    try {
        if (newSettings) {
            if (newSettings.port !== undefined) settings.port = newSettings.port;
            if (newSettings.autoStart !== undefined) settings.autoStart = newSettings.autoStart;
        }
        var filePath = getSettingsPath();
        var dir = Path.dirname(filePath);
        if (!Fs.existsSync(dir)) {
            Fs.mkdirSync(dir, { recursive: true });
        }
        Fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (e) {
        Editor.warn('[MCP] Failed to save settings: ' + e.message);
    }
}

// ---------------------------------------------------------------------------
// Tool initialization
// ---------------------------------------------------------------------------
function initializeTools() {
    tools = {};
    toolsList = [];

    try {
        tools.scene = new SceneTools();
        tools.node = new NodeTools();
        tools.component = new ComponentTools();
        tools.prefab = new PrefabTools();
        tools.project = new ProjectTools();

        // Build the flat tools list with category prefixes
        var categories = Object.keys(tools);
        for (var c = 0; c < categories.length; c++) {
            var category = categories[c];
            var categoryTools = tools[category].getTools();
            for (var t = 0; t < categoryTools.length; t++) {
                var tool = categoryTools[t];
                toolsList.push({
                    name: category + '_' + tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                });
            }
        }

        Editor.log('[MCP] Tools initialized: ' + toolsList.length + ' tools available');
    } catch (err) {
        Editor.error('[MCP] Failed to initialize tools: ' + err.message);
    }
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------
function executeToolCall(toolName, args) {
    var parts = toolName.split('_');
    var category = parts[0];
    var methodName = parts.slice(1).join('_');

    if (tools[category]) {
        return tools[category].execute(methodName, args || {});
    }

    return Promise.reject(new Error('Tool not found: ' + toolName));
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------
function handleHttpRequest(req, res) {
    var parsedUrl = url.parse(req.url || '', true);
    var pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        if (pathname === '/mcp' && req.method === 'POST') {
            handleMCPRequest(req, res);
        } else if (pathname === '/health' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'ok',
                tools: toolsList.length,
                port: settings.port
            }));
        } else if (pathname === '/api/tools' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({ tools: getSimplifiedToolsList() }));
        } else if (pathname && pathname.indexOf('/api/') === 0 && req.method === 'POST') {
            handleSimpleAPIRequest(req, res, pathname);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    } catch (error) {
        Editor.error('[MCP] HTTP request error: ' + error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

function handleMCPRequest(req, res) {
    var chunks = [];

    req.on('data', function (chunk) {
        chunks.push(chunk);
    });

    req.on('end', function () {
        var body = Buffer.concat(chunks).toString('utf8');
        try {
            var message;
            try {
                message = JSON.parse(body);
            } catch (parseError) {
                var fixedBody = fixCommonJsonIssues(body);
                try {
                    message = JSON.parse(fixedBody);
                } catch (secondError) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: null,
                        error: {
                            code: -32700,
                            message: 'Parse error: ' + parseError.message
                        }
                    }));
                    return;
                }
            }

            handleMessage(message).then(function (response) {
                res.writeHead(200);
                res.end(JSON.stringify(response));
            }).catch(function (err) {
                res.writeHead(500);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: message ? message.id : null,
                    error: {
                        code: -32603,
                        message: err.message || 'Internal error'
                    }
                }));
            });
        } catch (error) {
            Editor.error('[MCP] Error handling MCP request: ' + error.message);
            res.writeHead(400);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32700,
                    message: 'Parse error: ' + error.message
                }
            }));
        }
    });
}

function handleMessage(message) {
    var id = message.id;
    var method = message.method;
    var params = message.params || {};

    try {
        switch (method) {
            case 'initialize':
                return Promise.resolve({
                    jsonrpc: '2.0',
                    id: id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: 'cocos-editor-server',
                            version: '1.0.0'
                        }
                    }
                });

            case 'tools/list':
                return Promise.resolve({
                    jsonrpc: '2.0',
                    id: id,
                    result: {
                        tools: toolsList
                    }
                });

            case 'tools/call':
                var toolName = params.name;
                var toolArgs = params.arguments || {};
                return executeToolCall(toolName, toolArgs).then(function (toolResult) {
                    return {
                        jsonrpc: '2.0',
                        id: id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(toolResult)
                                }
                            ]
                        }
                    };
                }).catch(function (err) {
                    return {
                        jsonrpc: '2.0',
                        id: id,
                        error: {
                            code: -32603,
                            message: err.message || 'Tool execution failed'
                        }
                    };
                });

            case 'notifications/initialized':
                // Client notification that initialization is complete - no response needed
                return Promise.resolve({
                    jsonrpc: '2.0',
                    id: id,
                    result: {}
                });

            default:
                return Promise.resolve({
                    jsonrpc: '2.0',
                    id: id,
                    error: {
                        code: -32601,
                        message: 'Method not found: ' + method
                    }
                });
        }
    } catch (err) {
        return Promise.resolve({
            jsonrpc: '2.0',
            id: id,
            error: {
                code: -32603,
                message: err.message || 'Internal error'
            }
        });
    }
}

function handleSimpleAPIRequest(req, res, pathname) {
    var chunks = [];

    req.on('data', function (chunk) {
        chunks.push(chunk);
    });

    req.on('end', function () {
        var body = Buffer.concat(chunks).toString('utf8');
        try {
            var pathParts = pathname.split('/').filter(function (p) { return p; });
            if (pathParts.length < 3) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid API path. Use /api/{category}/{tool_name}' }));
                return;
            }

            var category = pathParts[1];
            var toolMethodName = pathParts[2];
            var fullToolName = category + '_' + toolMethodName;

            var params;
            try {
                params = body ? JSON.parse(body) : {};
            } catch (parseError) {
                var fixedBody = fixCommonJsonIssues(body);
                try {
                    params = JSON.parse(fixedBody);
                } catch (secondError) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
                    return;
                }
            }

            executeToolCall(fullToolName, params).then(function (result) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    tool: fullToolName,
                    result: result
                }));
            }).catch(function (err) {
                res.writeHead(500);
                res.end(JSON.stringify({
                    success: false,
                    error: err.message,
                    tool: fullToolName
                }));
            });
        } catch (error) {
            Editor.error('[MCP] Simple API error: ' + error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
    });
}

function fixCommonJsonIssues(jsonStr) {
    var fixed = jsonStr;
    // Fix trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    return fixed;
}

function getSimplifiedToolsList() {
    return toolsList.map(function (tool) {
        var parts = tool.name.split('_');
        var category = parts[0];
        var toolMethodName = parts.slice(1).join('_');
        return {
            name: tool.name,
            category: category,
            toolName: toolMethodName,
            description: tool.description,
            apiPath: '/api/' + category + '/' + toolMethodName
        };
    });
}

// ---------------------------------------------------------------------------
// Server start/stop
// ---------------------------------------------------------------------------
function startServer() {
    if (httpServer) {
        Editor.log('[MCP] Server is already running on port ' + settings.port);
        return;
    }

    initializeTools();

    tryListenOnPort(settings.port, 0);
}

function tryListenOnPort(port, retries) {
    var maxRetries = 20;
    httpServer = http.createServer(handleHttpRequest);

    httpServer.listen(port, '127.0.0.1', function () {
        settings.port = port;
        saveSettings();
        Editor.log('[MCP] HTTP server started on http://127.0.0.1:' + port);
        Editor.log('[MCP] Health check: http://127.0.0.1:' + port + '/health');
        Editor.log('[MCP] MCP endpoint: http://127.0.0.1:' + port + '/mcp');
        Editor.log('[MCP] Tools available: ' + toolsList.length);

        // Notify panel
        Editor.Ipc.sendToPanel('cocos-editor-server', 'update-status', {
            running: true,
            port: port,
            tools: toolsList.length
        });
    });

    httpServer.on('error', function (err) {
        httpServer = null;
        if (err.code === 'EADDRINUSE' && retries < maxRetries) {
            var nextPort = port + 1;
            Editor.warn('[MCP] Port ' + port + ' in use, trying ' + nextPort + '...');
            tryListenOnPort(nextPort, retries + 1);
        } else {
            Editor.error('[MCP] Failed to start server: ' + err.message);
            Editor.Ipc.sendToPanel('cocos-editor-server', 'update-status', {
                running: false,
                port: port,
                tools: toolsList.length,
                error: err.message
            });
        }
    });
}

function stopServer() {
    if (httpServer) {
        httpServer.close(function () {
            Editor.log('[MCP] HTTP server stopped');
        });
        httpServer = null;
    }

    // Notify panel
    Editor.Ipc.sendToPanel('cocos-editor-server', 'update-status', {
        running: false,
        port: settings.port,
        tools: toolsList.length
    });
}

function getServerStatus() {
    return {
        running: !!httpServer,
        port: settings.port,
        tools: toolsList.length,
        settings: settings
    };
}

// ============================================================================
// Module exports (Cocos Creator 2.x extension format)
// ============================================================================
module.exports = {
    load: function () {
        Editor.log('[MCP] Cocos Editor Server extension loaded');
        loadSettings();
        initializeTools();

        if (settings.autoStart) {
            // Delay auto-start slightly to let editor finish initializing
            setTimeout(function () {
                startServer();
            }, 2000);
        }
    },

    unload: function () {
        stopServer();
        Editor.log('[MCP] Cocos Editor Server extension unloaded');
    },

    messages: {
        'open': function () {
            Editor.Panel.open('cocos-editor-server');
        },

        'start-server': function () {
            startServer();
        },

        'stop-server': function () {
            stopServer();
        },

        'get-server-status': function (event) {
            var status = getServerStatus();
            if (event.reply) {
                event.reply(null, status);
            }
        },

        'update-settings': function (event, newSettings) {
            var wasRunning = !!httpServer;
            if (wasRunning) {
                stopServer();
            }
            saveSettings(newSettings);
            if (wasRunning || (newSettings && newSettings.autoStart)) {
                startServer();
            }
            if (event.reply) {
                event.reply(null, { success: true, settings: settings });
            }
        },

        'get-tools-list': function (event) {
            if (event.reply) {
                event.reply(null, toolsList);
            }
        }
    }
};
