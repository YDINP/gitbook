'use strict';

// ============================================================================
// Cocos Editor Server Panel (Cocos Creator 2.x)
//
// Simple HTML/CSS panel using Editor.Panel.extend().
// Shows server status, port config, start/stop controls.
// ============================================================================

Editor.Panel.extend({

    style: '\n' +
        ':host {\n' +
        '  display: flex;\n' +
        '  flex-direction: column;\n' +
        '  padding: 10px;\n' +
        '  font-family: Arial, sans-serif;\n' +
        '  color: #ccc;\n' +
        '  overflow-y: auto;\n' +
        '}\n' +
        '\n' +
        '.header {\n' +
        '  text-align: center;\n' +
        '  margin-bottom: 15px;\n' +
        '  padding-bottom: 10px;\n' +
        '  border-bottom: 1px solid #444;\n' +
        '}\n' +
        '\n' +
        '.header h2 {\n' +
        '  margin: 0 0 5px 0;\n' +
        '  font-size: 18px;\n' +
        '  color: #eee;\n' +
        '}\n' +
        '\n' +
        '.header .subtitle {\n' +
        '  font-size: 11px;\n' +
        '  color: #888;\n' +
        '}\n' +
        '\n' +
        '.status-card {\n' +
        '  background: #2a2a2a;\n' +
        '  border-radius: 6px;\n' +
        '  padding: 12px;\n' +
        '  margin-bottom: 12px;\n' +
        '}\n' +
        '\n' +
        '.status-card h3 {\n' +
        '  margin: 0 0 8px 0;\n' +
        '  font-size: 13px;\n' +
        '  color: #aaa;\n' +
        '  text-transform: uppercase;\n' +
        '  letter-spacing: 1px;\n' +
        '}\n' +
        '\n' +
        '.status-indicator {\n' +
        '  display: flex;\n' +
        '  align-items: center;\n' +
        '  margin-bottom: 8px;\n' +
        '}\n' +
        '\n' +
        '.status-dot {\n' +
        '  width: 10px;\n' +
        '  height: 10px;\n' +
        '  border-radius: 50%;\n' +
        '  margin-right: 8px;\n' +
        '}\n' +
        '\n' +
        '.status-dot.running {\n' +
        '  background: #4caf50;\n' +
        '  box-shadow: 0 0 6px #4caf50;\n' +
        '}\n' +
        '\n' +
        '.status-dot.stopped {\n' +
        '  background: #f44336;\n' +
        '}\n' +
        '\n' +
        '.status-text {\n' +
        '  font-size: 14px;\n' +
        '  font-weight: bold;\n' +
        '}\n' +
        '\n' +
        '.status-text.running {\n' +
        '  color: #4caf50;\n' +
        '}\n' +
        '\n' +
        '.status-text.stopped {\n' +
        '  color: #f44336;\n' +
        '}\n' +
        '\n' +
        '.info-row {\n' +
        '  display: flex;\n' +
        '  justify-content: space-between;\n' +
        '  margin-bottom: 4px;\n' +
        '  font-size: 12px;\n' +
        '}\n' +
        '\n' +
        '.info-label {\n' +
        '  color: #888;\n' +
        '}\n' +
        '\n' +
        '.info-value {\n' +
        '  color: #ddd;\n' +
        '  font-family: monospace;\n' +
        '}\n' +
        '\n' +
        '.url-row {\n' +
        '  display: flex;\n' +
        '  align-items: center;\n' +
        '  margin-top: 6px;\n' +
        '  background: #1e1e1e;\n' +
        '  border-radius: 4px;\n' +
        '  padding: 6px 10px;\n' +
        '}\n' +
        '\n' +
        '.url-text {\n' +
        '  flex: 1;\n' +
        '  font-family: monospace;\n' +
        '  font-size: 12px;\n' +
        '  color: #64b5f6;\n' +
        '}\n' +
        '\n' +
        '.settings-group {\n' +
        '  margin-bottom: 10px;\n' +
        '}\n' +
        '\n' +
        '.settings-group label {\n' +
        '  display: block;\n' +
        '  font-size: 12px;\n' +
        '  color: #888;\n' +
        '  margin-bottom: 4px;\n' +
        '}\n' +
        '\n' +
        '.settings-group input[type="number"] {\n' +
        '  width: 100px;\n' +
        '  padding: 4px 8px;\n' +
        '  background: #1e1e1e;\n' +
        '  border: 1px solid #444;\n' +
        '  border-radius: 4px;\n' +
        '  color: #ddd;\n' +
        '  font-family: monospace;\n' +
        '  font-size: 13px;\n' +
        '}\n' +
        '\n' +
        '.checkbox-row {\n' +
        '  display: flex;\n' +
        '  align-items: center;\n' +
        '  margin-top: 6px;\n' +
        '}\n' +
        '\n' +
        '.checkbox-row input[type="checkbox"] {\n' +
        '  margin-right: 8px;\n' +
        '}\n' +
        '\n' +
        '.checkbox-row label {\n' +
        '  font-size: 12px;\n' +
        '  color: #ccc;\n' +
        '  margin-bottom: 0;\n' +
        '}\n' +
        '\n' +
        '.btn {\n' +
        '  padding: 8px 16px;\n' +
        '  border: none;\n' +
        '  border-radius: 4px;\n' +
        '  cursor: pointer;\n' +
        '  font-size: 13px;\n' +
        '  font-weight: bold;\n' +
        '  margin-right: 8px;\n' +
        '  transition: background 0.2s;\n' +
        '}\n' +
        '\n' +
        '.btn-start {\n' +
        '  background: #4caf50;\n' +
        '  color: #fff;\n' +
        '}\n' +
        '\n' +
        '.btn-start:hover {\n' +
        '  background: #66bb6a;\n' +
        '}\n' +
        '\n' +
        '.btn-stop {\n' +
        '  background: #f44336;\n' +
        '  color: #fff;\n' +
        '}\n' +
        '\n' +
        '.btn-stop:hover {\n' +
        '  background: #ef5350;\n' +
        '}\n' +
        '\n' +
        '.btn-save {\n' +
        '  background: #2196f3;\n' +
        '  color: #fff;\n' +
        '}\n' +
        '\n' +
        '.btn-save:hover {\n' +
        '  background: #42a5f5;\n' +
        '}\n' +
        '\n' +
        '.btn-group {\n' +
        '  display: flex;\n' +
        '  margin-top: 10px;\n' +
        '}\n' +
        '\n' +
        '.tools-list {\n' +
        '  max-height: 200px;\n' +
        '  overflow-y: auto;\n' +
        '  background: #1e1e1e;\n' +
        '  border-radius: 4px;\n' +
        '  padding: 6px;\n' +
        '  font-size: 11px;\n' +
        '  font-family: monospace;\n' +
        '}\n' +
        '\n' +
        '.tools-list .tool-item {\n' +
        '  padding: 2px 4px;\n' +
        '  color: #bbb;\n' +
        '}\n' +
        '\n' +
        '.tools-list .tool-item:hover {\n' +
        '  background: #333;\n' +
        '}\n' +
        '\n' +
        '.error-msg {\n' +
        '  color: #f44336;\n' +
        '  font-size: 12px;\n' +
        '  margin-top: 4px;\n' +
        '}\n' +
        '\n' +
        '.mcp-config {\n' +
        '  margin-top: 8px;\n' +
        '  padding: 8px;\n' +
        '  background: #1e1e1e;\n' +
        '  border-radius: 4px;\n' +
        '  font-size: 11px;\n' +
        '  font-family: monospace;\n' +
        '  color: #999;\n' +
        '  white-space: pre;\n' +
        '  overflow-x: auto;\n' +
        '}\n',

    template: '' +
        '<div class="header">' +
        '  <h2>Cocos Editor Server</h2>' +
        '  <div class="subtitle">Model Context Protocol for Cocos Creator 2.x</div>' +
        '</div>' +
        '' +
        '<div class="status-card">' +
        '  <h3>Server Status</h3>' +
        '  <div class="status-indicator">' +
        '    <div id="statusDot" class="status-dot stopped"></div>' +
        '    <span id="statusText" class="status-text stopped">Stopped</span>' +
        '  </div>' +
        '  <div class="info-row">' +
        '    <span class="info-label">Port:</span>' +
        '    <span id="infoPort" class="info-value">3000</span>' +
        '  </div>' +
        '  <div class="info-row">' +
        '    <span class="info-label">Tools:</span>' +
        '    <span id="infoTools" class="info-value">0</span>' +
        '  </div>' +
        '  <div id="urlRow" class="url-row" style="display:none;">' +
        '    <span class="url-text" id="serverUrl"></span>' +
        '  </div>' +
        '  <div id="errorMsg" class="error-msg" style="display:none;"></div>' +
        '  <div class="btn-group">' +
        '    <button id="btnStart" class="btn btn-start">Start</button>' +
        '    <button id="btnStop" class="btn btn-stop" style="display:none;">Stop</button>' +
        '  </div>' +
        '</div>' +
        '' +
        '<div class="status-card">' +
        '  <h3>Settings</h3>' +
        '  <div class="settings-group">' +
        '    <label>Server Port</label>' +
        '    <input type="number" id="inputPort" value="3000" min="1024" max="65535" />' +
        '  </div>' +
        '  <div class="checkbox-row">' +
        '    <input type="checkbox" id="checkAutoStart" />' +
        '    <label for="checkAutoStart">Auto-start on extension load</label>' +
        '  </div>' +
        '  <div class="btn-group">' +
        '    <button id="btnSave" class="btn btn-save">Save Settings</button>' +
        '  </div>' +
        '</div>' +
        '' +
        '<div class="status-card">' +
        '  <h3>MCP Configuration</h3>' +
        '  <div class="mcp-config" id="mcpConfig">{\n' +
        '  "mcpServers": {\n' +
        '    "cocos-creator": {\n' +
        '      "url": "http://127.0.0.1:3000/mcp"\n' +
        '    }\n' +
        '  }\n' +
        '}</div>' +
        '</div>' +
        '' +
        '<div class="status-card">' +
        '  <h3>Available Tools</h3>' +
        '  <div id="toolsList" class="tools-list">' +
        '    <div class="tool-item">Loading...</div>' +
        '  </div>' +
        '</div>',

    $: {
        statusDot: '#statusDot',
        statusText: '#statusText',
        infoPort: '#infoPort',
        infoTools: '#infoTools',
        urlRow: '#urlRow',
        serverUrl: '#serverUrl',
        errorMsg: '#errorMsg',
        btnStart: '#btnStart',
        btnStop: '#btnStop',
        inputPort: '#inputPort',
        checkAutoStart: '#checkAutoStart',
        btnSave: '#btnSave',
        toolsList: '#toolsList',
        mcpConfig: '#mcpConfig'
    },

    ready: function () {
        var self = this;

        // Start button
        this.$btnStart.addEventListener('click', function () {
            Editor.Ipc.sendToMain('cocos-editor-server:start-server');
        });

        // Stop button
        this.$btnStop.addEventListener('click', function () {
            Editor.Ipc.sendToMain('cocos-editor-server:stop-server');
        });

        // Save settings button
        this.$btnSave.addEventListener('click', function () {
            var port = parseInt(self.$inputPort.value, 10) || 3000;
            var autoStart = self.$checkAutoStart.checked;
            Editor.Ipc.sendToMain('cocos-editor-server:update-settings', {
                port: port,
                autoStart: autoStart
            });
        });

        // Load initial status
        this._refreshStatus();

        // Periodic status refresh
        this._statusInterval = setInterval(function () {
            self._refreshStatus();
        }, 2000);
    },

    _refreshStatus: function () {
        var self = this;
        Editor.Ipc.sendToMain('cocos-editor-server:get-server-status', function (err, status) {
            if (err || !status) return;
            self._updateUI(status);
        });
    },

    _updateUI: function (status) {
        var running = status.running;

        // Status indicator
        if (running) {
            this.$statusDot.className = 'status-dot running';
            this.$statusText.className = 'status-text running';
            this.$statusText.textContent = 'Running';
        } else {
            this.$statusDot.className = 'status-dot stopped';
            this.$statusText.className = 'status-text stopped';
            this.$statusText.textContent = 'Stopped';
        }

        // Info
        this.$infoPort.textContent = String(status.port || 3000);
        this.$infoTools.textContent = String(status.tools || 0);

        // URL
        if (running) {
            this.$urlRow.style.display = 'flex';
            this.$serverUrl.textContent = 'http://127.0.0.1:' + status.port + '/mcp';
        } else {
            this.$urlRow.style.display = 'none';
        }

        // Error
        if (status.error) {
            this.$errorMsg.style.display = 'block';
            this.$errorMsg.textContent = status.error;
        } else {
            this.$errorMsg.style.display = 'none';
        }

        // Buttons
        this.$btnStart.style.display = running ? 'none' : 'inline-block';
        this.$btnStop.style.display = running ? 'inline-block' : 'none';

        // Settings
        if (status.settings) {
            this.$inputPort.value = String(status.settings.port || 3000);
            this.$checkAutoStart.checked = !!status.settings.autoStart;
        }

        // MCP config
        var port = status.port || 3000;
        this.$mcpConfig.textContent =
            '{\n' +
            '  "mcpServers": {\n' +
            '    "cocos-creator": {\n' +
            '      "url": "http://127.0.0.1:' + port + '/mcp"\n' +
            '    }\n' +
            '  }\n' +
            '}';

        // Load tools list
        if (status.tools > 0) {
            this._refreshToolsList();
        }
    },

    _refreshToolsList: function () {
        var self = this;
        Editor.Ipc.sendToMain('cocos-editor-server:get-tools-list', function (err, tools) {
            if (err || !tools) return;

            var html = '';
            for (var i = 0; i < tools.length; i++) {
                html += '<div class="tool-item">' +
                    tools[i].name +
                    ' - ' + (tools[i].description || '').substring(0, 60) +
                    '</div>';
            }
            self.$toolsList.innerHTML = html || '<div class="tool-item">No tools available</div>';
        });
    },

    close: function () {
        if (this._statusInterval) {
            clearInterval(this._statusInterval);
            this._statusInterval = null;
        }
    },

    messages: {
        'cocos-editor-server:update-status': function (event, data) {
            if (data) {
                this._updateUI(data);
            }
        }
    }
});
