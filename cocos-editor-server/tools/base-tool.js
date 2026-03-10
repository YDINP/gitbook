'use strict';

/**
 * BaseTool - Base class for all MCP tool categories.
 *
 * Each tool category extends this class and implements:
 * - getTools(): returns array of tool definitions
 * - execute(toolName, args): dispatches to the appropriate handler
 */
function BaseTool() {
    // Base constructor
}

/**
 * Returns the list of tool definitions for this category.
 * Each tool definition has: { name, description, inputSchema }
 * @returns {Array} Tool definitions
 */
BaseTool.prototype.getTools = function () {
    return [];
};

/**
 * Execute a tool by name with given arguments.
 * @param {string} toolName - The tool name (without category prefix)
 * @param {object} args - The tool arguments
 * @returns {Promise<object>} The tool result
 */
BaseTool.prototype.execute = function (toolName, args) {
    return Promise.reject(new Error('Tool not implemented: ' + toolName));
};

/**
 * Helper: call a scene script method and return a Promise.
 * @param {string} method - The scene script method name
 * @param {*} arg - The argument to pass
 * @returns {Promise<*>}
 */
BaseTool.prototype.callSceneScript = function (method, arg) {
    // Ensure arg is always a string — Editor.Scene.callSceneScript requires string data argument
    var safeArg;
    if (arg === null || arg === undefined) {
        safeArg = '';
    } else if (typeof arg === 'string') {
        // Escape non-ASCII to \uXXXX to prevent Electron IPC encoding corruption
        safeArg = arg.replace(/[\u0080-\uffff]/g, function (ch) {
            return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
        });
    } else {
        // object, number, boolean 등 — JSON 직렬화
        safeArg = JSON.stringify(arg);
    }
    return new Promise(function (resolve, reject) {
        Editor.Scene.callSceneScript('cocos-editor-server', method, safeArg, function (err, result) {
            if (err) {
                reject(err);
            } else {
                // Decode __SAFE_JSON__ wrapped responses (IPC-safe encoding)
                if (typeof result === 'string' && result.indexOf('__SAFE_JSON__') === 0) {
                    try {
                        result = JSON.parse(result.slice(13));
                    } catch (e) { /* keep as-is */ }
                }
                resolve(result);
            }
        });
    });
};

/**
 * Helper: create a success response
 * @param {*} data - Response data
 * @param {string} [message] - Optional message
 * @returns {object}
 */
BaseTool.prototype.success = function (data, message) {
    var result = { success: true };
    if (data !== undefined) {
        result.data = data;
    }
    if (message) {
        result.message = message;
    }
    return result;
};

/**
 * Helper: create an error response
 * @param {string} errorMsg - Error message
 * @returns {object}
 */
BaseTool.prototype.error = function (errorMsg) {
    return { success: false, error: errorMsg };
};

module.exports = BaseTool;
