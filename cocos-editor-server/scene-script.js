'use strict';

// ============================================================================
// Scene Script for cocos-editor-server (Cocos Creator 2.x)
//
// Runs inside the scene renderer process. Has full access to cc.* globals.
// Methods are called via:
//   Editor.Scene.callSceneScript('cocos-editor-server', 'methodName', arg, callback)
//
// Each method receives (event, arg) and MUST call event.reply(null, result)
// to return data. The arg is always a string (JSON serialized from main process).
// ============================================================================

// ---------------------------------------------------------------------------
// Utility: Recursive UUID search (2.x has no node.getChildByUuid)
// ---------------------------------------------------------------------------
function findNodeByUuid(root, uuid) {
    if (!root) return null;
    if (root.uuid === uuid) return root;
    var children = root.children;
    for (var i = 0; i < children.length; i++) {
        var found = findNodeByUuid(children[i], uuid);
        if (found) return found;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Utility: Get the full path of a node from scene root
// ---------------------------------------------------------------------------
function getNodePath(node) {
    var parts = [];
    var current = node;
    while (current && current.parent) {
        parts.unshift(current.name);
        current = current.parent;
    }
    return parts.join('/');
}

// ---------------------------------------------------------------------------
// Utility: Safe JSON parse for arguments
// ---------------------------------------------------------------------------
// Escape non-ASCII chars to \uXXXX to survive Electron IPC encoding
function escapeNonAscii(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[\u0080-\uffff]/g, function (ch) {
        return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
    });
}

function parseArg(arg) {
    if (typeof arg === 'string') {
        try {
            return JSON.parse(arg);
        } catch (e) {
            return arg;
        }
    }
    return arg;
}

// ---------------------------------------------------------------------------
// Utility: Get component class from type string
// In 2.x, component names like "cc.Sprite" map to cc.Sprite
// ---------------------------------------------------------------------------
function getComponentClass(typeName) {
    if (!typeName) return null;

    // Handle "cc.XXX" format
    if (typeName.indexOf('cc.') === 0) {
        var className = typeName.substring(3);
        if (cc[className]) {
            return cc[className];
        }
    }

    // Try cc.js.getClassByName
    if (cc.js && cc.js.getClassByName) {
        var cls = cc.js.getClassByName(typeName);
        if (cls) return cls;
    }

    // Try direct property on cc
    if (cc[typeName]) {
        return cc[typeName];
    }

    return null;
}

// ---------------------------------------------------------------------------
// Utility: Get the constructor/class name of a component
// ---------------------------------------------------------------------------
function getComponentTypeName(comp) {
    if (!comp) return 'Unknown';

    // Try __classname__
    if (comp.__classname__) return comp.__classname__;

    // Try constructor name via cc.js
    if (cc.js && cc.js.getClassName) {
        var name = cc.js.getClassName(comp);
        if (name) return name;
    }

    // Fallback to constructor name
    if (comp.constructor && comp.constructor.name) {
        return comp.constructor.name;
    }

    return 'Unknown';
}

// ---------------------------------------------------------------------------
// Utility: Serialize a node for JSON transport
// ---------------------------------------------------------------------------
function serializeNode(node, includeComponents) {
    if (!node) return null;
    var result = {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
        x: node.x,
        y: node.y,
        rotation: node.rotation,
        scaleX: node.scaleX,
        scaleY: node.scaleY,
        anchorX: node.anchorX,
        anchorY: node.anchorY,
        width: node.width,
        height: node.height,
        opacity: node.opacity,
        color: node.color ? { r: node.color.r, g: node.color.g, b: node.color.b, a: node.color.a } : null,
        zIndex: node.zIndex,
        childCount: node.childrenCount,
        parentUuid: node.parent ? node.parent.uuid : null,
        path: getNodePath(node)
    };

    if (includeComponents) {
        result.components = [];
        var comps = node._components || [];
        for (var i = 0; i < comps.length; i++) {
            result.components.push({
                type: getComponentTypeName(comps[i]),
                enabled: comps[i].enabled,
                uuid: comps[i].uuid
            });
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Utility: Serialize a component with its properties
// ---------------------------------------------------------------------------
function serializeComponent(comp) {
    if (!comp) return null;
    var result = {
        type: getComponentTypeName(comp),
        uuid: comp.uuid,
        enabled: comp.enabled,
        properties: {}
    };

    // Get all enumerable properties that are not internal
    var keys = Object.keys(comp);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        // Skip internal/private properties
        if (key.charAt(0) === '_') continue;
        if (key === 'node' || key === 'uuid' || key === '__scriptAsset') continue;
        try {
            var val = comp[key];
            var type = typeof val;
            if (type === 'function') continue;
            if (type === 'object' && val !== null) {
                // For cc.Node references, just store uuid
                if (val instanceof cc.Node) {
                    result.properties[key] = { type: 'node', uuid: val.uuid, name: val.name };
                } else if (val instanceof cc.Asset) {
                    result.properties[key] = { type: 'asset', uuid: val._uuid || 'unknown' };
                } else if (val instanceof cc.Color) {
                    result.properties[key] = { r: val.r, g: val.g, b: val.b, a: val.a };
                } else if (val instanceof cc.Vec2) {
                    result.properties[key] = { x: val.x, y: val.y };
                } else if (val instanceof cc.Size) {
                    result.properties[key] = { width: val.width, height: val.height };
                } else {
                    // Try to serialize, but skip if it causes issues
                    try {
                        JSON.stringify(val);
                        result.properties[key] = val;
                    } catch (e) {
                        result.properties[key] = '[complex object]';
                    }
                }
            } else {
                result.properties[key] = val;
            }
        } catch (e) {
            // Skip properties that throw on access
        }
    }

    return result;
}

// ============================================================================
// Exported scene script methods
// ============================================================================
module.exports = {

    // -----------------------------------------------------------------------
    // Scene info
    // -----------------------------------------------------------------------
    getCurrentSceneInfo: function (event) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            // Count total nodes recursively
            var count = 0;
            var countNodes = function (node) {
                count++;
                var children = node.children;
                for (var i = 0; i < children.length; i++) {
                    countNodes(children[i]);
                }
            };
            var sceneChildren = scene.children;
            for (var i = 0; i < sceneChildren.length; i++) {
                countNodes(sceneChildren[i]);
            }

            var result = {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    childCount: scene.childrenCount,
                    totalNodeCount: count
                }
            };
            if (event.reply) event.reply(null, result);
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Scene hierarchy
    // -----------------------------------------------------------------------
    getSceneHierarchy: function (event, includeComponents) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var processNode = function (node) {
                var result = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    children: []
                };

                if (includeComponents) {
                    result.components = [];
                    var comps = node._components || [];
                    for (var i = 0; i < comps.length; i++) {
                        result.components.push({
                            type: getComponentTypeName(comps[i]),
                            enabled: comps[i].enabled
                        });
                    }
                }

                var children = node.children;
                for (var j = 0; j < children.length; j++) {
                    result.children.push(processNode(children[j]));
                }

                return result;
            };

            var hierarchy = [];
            var sceneChildren = scene.children;
            for (var i = 0; i < sceneChildren.length; i++) {
                hierarchy.push(processNode(sceneChildren[i]));
            }

            if (event.reply) event.reply(null, { success: true, data: hierarchy });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Get all nodes
    // -----------------------------------------------------------------------
    getAllNodes: function (event) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var nodes = [];
            var collectNodes = function (node) {
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    path: getNodePath(node),
                    parentUuid: node.parent ? node.parent.uuid : null
                });
                var children = node.children;
                for (var i = 0; i < children.length; i++) {
                    collectNodes(children[i]);
                }
            };

            var sceneChildren = scene.children;
            for (var i = 0; i < sceneChildren.length; i++) {
                collectNodes(sceneChildren[i]);
            }

            if (event.reply) event.reply(null, {
                success: true,
                data: { totalNodes: nodes.length, nodes: nodes }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Find node by name
    // -----------------------------------------------------------------------
    findNodeByName: function (event, name) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var found = null;
            var search = function (node) {
                if (found) return;
                if (node.name === name) {
                    found = node;
                    return;
                }
                var children = node.children;
                for (var i = 0; i < children.length; i++) {
                    search(children[i]);
                    if (found) return;
                }
            };

            var sceneChildren = scene.children;
            for (var i = 0; i < sceneChildren.length; i++) {
                search(sceneChildren[i]);
                if (found) break;
            }

            if (found) {
                if (event.reply) event.reply(null, {
                    success: true,
                    data: serializeNode(found, true)
                });
            } else {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + name });
            }
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Find nodes by pattern
    // -----------------------------------------------------------------------
    findNodes: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var pattern = args.pattern;
            var exactMatch = args.exactMatch;
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var results = [];
            var lowerPattern = pattern.toLowerCase();

            var search = function (node) {
                var matches = exactMatch ?
                    node.name === pattern :
                    node.name.toLowerCase().indexOf(lowerPattern) !== -1;

                if (matches) {
                    results.push({
                        uuid: node.uuid,
                        name: node.name,
                        active: node.active,
                        path: getNodePath(node)
                    });
                }

                var children = node.children;
                for (var i = 0; i < children.length; i++) {
                    search(children[i]);
                }
            };

            var sceneChildren = scene.children;
            for (var i = 0; i < sceneChildren.length; i++) {
                search(sceneChildren[i]);
            }

            if (event.reply) event.reply(null, {
                success: true,
                data: { nodes: results, count: results.length }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Get node info
    // -----------------------------------------------------------------------
    getNodeInfo: function (event, uuid) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, uuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + uuid });
                return;
            }

            var info = serializeNode(node, true);
            // Also include children uuids
            info.children = [];
            var nodeChildren = node.children;
            for (var i = 0; i < nodeChildren.length; i++) {
                info.children.push({
                    uuid: nodeChildren[i].uuid,
                    name: nodeChildren[i].name,
                    active: nodeChildren[i].active
                });
            }

            if (event.reply) event.reply(null, { success: true, data: info });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Set node property
    // -----------------------------------------------------------------------
    setNodeProperty: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.uuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.uuid });
                return;
            }

            var prop = args.property;
            var val = args.value;

            // Handle special properties
            switch (prop) {
                case 'position':
                    if (val && typeof val === 'object') {
                        node.x = val.x !== undefined ? val.x : node.x;
                        node.y = val.y !== undefined ? val.y : node.y;
                    }
                    break;
                case 'scale':
                    if (val && typeof val === 'object') {
                        node.scaleX = val.scaleX !== undefined ? val.scaleX : (val.x !== undefined ? val.x : node.scaleX);
                        node.scaleY = val.scaleY !== undefined ? val.scaleY : (val.y !== undefined ? val.y : node.scaleY);
                    } else if (typeof val === 'number') {
                        node.scaleX = val;
                        node.scaleY = val;
                    }
                    break;
                case 'color':
                    if (val && typeof val === 'object') {
                        node.color = new cc.Color(
                            val.r !== undefined ? val.r : 255,
                            val.g !== undefined ? val.g : 255,
                            val.b !== undefined ? val.b : 255,
                            val.a !== undefined ? val.a : 255
                        );
                    }
                    break;
                default:
                    // Direct property assignment for: name, active, x, y, rotation,
                    // scaleX, scaleY, anchorX, anchorY, width, height, opacity,
                    // skewX, skewY, zIndex
                    if (node[prop] !== undefined || prop === 'active' || prop === 'name') {
                        node[prop] = val;
                    } else {
                        if (event.reply) event.reply(null, {
                            success: false,
                            error: 'Unknown property: ' + prop
                        });
                        return;
                    }
                    break;
            }

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Property \'' + prop + '\' set successfully',
                data: serializeNode(node, false)
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Set node transform (batch)
    // -----------------------------------------------------------------------
    setNodeTransform: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.uuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.uuid });
                return;
            }

            var updated = [];

            if (args.position) {
                if (args.position.x !== undefined) node.x = args.position.x;
                if (args.position.y !== undefined) node.y = args.position.y;
                updated.push('position');
            }

            if (args.rotation !== undefined) {
                node.rotation = args.rotation;
                updated.push('rotation');
            }

            if (args.scale) {
                if (args.scale.scaleX !== undefined) node.scaleX = args.scale.scaleX;
                if (args.scale.scaleY !== undefined) node.scaleY = args.scale.scaleY;
                // Also accept x/y aliases
                if (args.scale.x !== undefined && args.scale.scaleX === undefined) node.scaleX = args.scale.x;
                if (args.scale.y !== undefined && args.scale.scaleY === undefined) node.scaleY = args.scale.y;
                updated.push('scale');
            }

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Transform updated: ' + updated.join(', '),
                data: serializeNode(node, false)
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Create node
    // -----------------------------------------------------------------------
    createNode: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var newNode = new cc.Node(args.name || 'New Node');

            var parent = scene;
            if (args.parentPath) {
                // Path-based parent lookup (more reliable than UUID)
                var pathParts = args.parentPath.split('/');
                var current = null;
                var sceneChildren = scene.children;
                for (var pi = 0; pi < sceneChildren.length; pi++) {
                    if (sceneChildren[pi].name === pathParts[0]) {
                        current = sceneChildren[pi];
                        break;
                    }
                }
                for (var pj = 1; pj < pathParts.length && current; pj++) {
                    var found = false;
                    for (var pk = 0; pk < current.children.length; pk++) {
                        if (current.children[pk].name === pathParts[pj]) {
                            current = current.children[pk];
                            found = true;
                            break;
                        }
                    }
                    if (!found) { current = null; break; }
                }
                if (current) parent = current;
            } else if (args.parentUuid) {
                var foundParent = findNodeByUuid(scene, args.parentUuid);
                if (foundParent) {
                    parent = foundParent;
                }
            }

            parent.addChild(newNode);

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Node created: ' + newNode.name,
                data: {
                    uuid: newNode.uuid,
                    name: newNode.name,
                    parentUuid: parent.uuid,
                    path: getNodePath(newNode)
                }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Delete node
    // -----------------------------------------------------------------------
    deleteNode: function (event, uuid) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, uuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + uuid });
                return;
            }

            var nodeName = node.name;
            node.removeFromParent(true);
            node.destroy();

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Node deleted: ' + nodeName
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Duplicate node
    // -----------------------------------------------------------------------
    duplicateNode: function (event, uuid) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, uuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + uuid });
                return;
            }

            var cloned = cc.instantiate(node);
            cloned.name = node.name + '_copy';
            if (node.parent) {
                node.parent.addChild(cloned);
            } else {
                scene.addChild(cloned);
            }

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Node duplicated: ' + cloned.name,
                data: {
                    uuid: cloned.uuid,
                    name: cloned.name,
                    originalUuid: uuid,
                    path: getNodePath(cloned)
                }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Move/reparent node
    // -----------------------------------------------------------------------
    moveNode: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            var newParent = findNodeByUuid(scene, args.newParentUuid);
            if (!newParent) {
                if (event.reply) event.reply(null, { success: false, error: 'Parent not found: ' + args.newParentUuid });
                return;
            }

            node.removeFromParent(false);
            newParent.addChild(node);

            if (args.siblingIndex !== undefined && args.siblingIndex >= 0) {
                node.setSiblingIndex(args.siblingIndex);
            }

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Node moved to: ' + newParent.name,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    newParentUuid: newParent.uuid,
                    path: getNodePath(node)
                }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Add component
    // -----------------------------------------------------------------------
    addComponent: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            var CompClass = getComponentClass(args.componentType);
            if (!CompClass) {
                if (event.reply) event.reply(null, { success: false, error: 'Component type not found: ' + args.componentType });
                return;
            }

            var comp = node.addComponent(CompClass);
            if (event.reply) event.reply(null, {
                success: true,
                message: 'Component added: ' + args.componentType,
                data: {
                    nodeUuid: node.uuid,
                    componentType: getComponentTypeName(comp),
                    componentUuid: comp.uuid
                }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Remove component
    // -----------------------------------------------------------------------
    removeComponent: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            var CompClass = getComponentClass(args.componentType);
            if (!CompClass) {
                if (event.reply) event.reply(null, { success: false, error: 'Component type not found: ' + args.componentType });
                return;
            }

            var comp = node.getComponent(CompClass);
            if (!comp) {
                if (event.reply) event.reply(null, { success: false, error: 'Component not found on node: ' + args.componentType });
                return;
            }

            node.removeComponent(comp);
            if (event.reply) event.reply(null, {
                success: true,
                message: 'Component removed: ' + args.componentType
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Get components
    // -----------------------------------------------------------------------
    getComponents: function (event, nodeUuid) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + nodeUuid });
                return;
            }

            var components = [];
            var comps = node._components || [];
            for (var i = 0; i < comps.length; i++) {
                components.push({
                    type: getComponentTypeName(comps[i]),
                    enabled: comps[i].enabled,
                    uuid: comps[i].uuid
                });
            }

            if (event.reply) event.reply(null, {
                success: true,
                data: {
                    nodeUuid: nodeUuid,
                    nodeName: node.name,
                    components: components,
                    count: components.length
                }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Get component info (detailed)
    // -----------------------------------------------------------------------
    getComponentInfo: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            var CompClass = getComponentClass(args.componentType);
            if (!CompClass) {
                if (event.reply) event.reply(null, { success: false, error: 'Component type not found: ' + args.componentType });
                return;
            }

            var comp = node.getComponent(CompClass);
            if (!comp) {
                if (event.reply) event.reply(null, { success: false, error: 'Component not found on node: ' + args.componentType });
                return;
            }

            var info = serializeComponent(comp);
            if (event.reply) event.reply(null, { success: true, data: info });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Set component property
    // -----------------------------------------------------------------------
    setComponentProperty: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            var CompClass = getComponentClass(args.componentType);
            if (!CompClass) {
                if (event.reply) event.reply(null, { success: false, error: 'Component type not found: ' + args.componentType });
                return;
            }

            var comp = node.getComponent(CompClass);
            if (!comp) {
                if (event.reply) event.reply(null, { success: false, error: 'Component not found on node: ' + args.componentType });
                return;
            }

            var prop = args.property;
            var val = args.value;

            // Handle cc.Color values
            if (prop.toLowerCase().indexOf('color') !== -1 && val && typeof val === 'object' && val.r !== undefined) {
                comp[prop] = new cc.Color(val.r, val.g, val.b, val.a !== undefined ? val.a : 255);
            } else if (val && typeof val === 'object' && val.__type__ && val.__id__) {
                // Handle node/component reference by UUID
                var refNode = findNodeByUuid(scene, val.__id__);
                if (!refNode) {
                    if (event.reply) event.reply(null, { success: false, error: 'Referenced node not found: ' + val.__id__ });
                    return;
                }
                if (val.__type__ === 'cc.Node') {
                    comp[prop] = refNode;
                } else {
                    // Property expects a component type (cc.Button, cc.Label, etc.)
                    var RefClass = getComponentClass(val.__type__);
                    if (RefClass) {
                        var refComp = refNode.getComponent(RefClass);
                        if (refComp) {
                            comp[prop] = refComp;
                        } else {
                            if (event.reply) event.reply(null, { success: false, error: 'Component ' + val.__type__ + ' not found on node: ' + refNode.name });
                            return;
                        }
                    } else {
                        // Unknown type, try assigning node directly
                        comp[prop] = refNode;
                    }
                }
            } else {
                comp[prop] = val;
            }

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Component property set: ' + args.componentType + '.' + prop
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Instantiate prefab
    // -----------------------------------------------------------------------
    instantiatePrefab: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            // Load the prefab by UUID using cc.assetManager or cc.loader
            var prefabUuid = args.prefabUuid;

            // In 2.x, use cc.loader.loadRes or cc.assetManager
            // Since we have a UUID, use cc.loader.load with uuid
            var loadCallback = function (err, prefab) {
                if (err) {
                    if (event.reply) event.reply(null, { success: false, error: 'Failed to load prefab: ' + err });
                    return;
                }

                var instance = cc.instantiate(prefab);

                var parent = scene;
                if (args.parentUuid) {
                    var foundParent = findNodeByUuid(scene, args.parentUuid);
                    if (foundParent) {
                        parent = foundParent;
                    }
                }

                parent.addChild(instance);

                if (args.position) {
                    if (args.position.x !== undefined) instance.x = args.position.x;
                    if (args.position.y !== undefined) instance.y = args.position.y;
                }

                if (event.reply) event.reply(null, {
                    success: true,
                    message: 'Prefab instantiated: ' + instance.name,
                    data: {
                        uuid: instance.uuid,
                        name: instance.name,
                        parentUuid: parent.uuid,
                        path: getNodePath(instance)
                    }
                });
            };

            // Try cc.assetManager first (2.4+), then fall back to cc.loader
            if (cc.assetManager) {
                cc.assetManager.loadAny({ uuid: prefabUuid }, function (err, asset) {
                    loadCallback(err, asset);
                });
            } else if (cc.loader) {
                cc.loader.load({ uuid: prefabUuid, type: 'uuid' }, loadCallback);
            } else {
                if (event.reply) event.reply(null, { success: false, error: 'No asset loading API available' });
            }
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Create prefab from node
    // -----------------------------------------------------------------------
    createPrefabFromNode: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            // In the scene script context, we cannot directly write to asset DB.
            // We serialize the node info and let the main process handle the file creation.
            // For now, reply with the serialized node data that main.js can use.
            var nodeData = serializeNode(node, true);

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Node data collected for prefab creation. Note: actual .prefab file creation is handled by the main process via Editor.assetdb.',
                data: {
                    nodeUuid: args.nodeUuid,
                    savePath: args.savePath,
                    nodeName: node.name,
                    nodeInfo: nodeData
                }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    reorderNode: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.uuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.uuid });
                return;
            }

            node.setSiblingIndex(args.siblingIndex);

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Node reordered to index ' + args.siblingIndex,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    siblingIndex: node.getSiblingIndex(),
                    path: getNodePath(node)
                }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Set SpriteFrame on a node's cc.Sprite component
    // -----------------------------------------------------------------------
    setSpriteFrame: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            var sprite = node.getComponent(cc.Sprite);
            if (!sprite) {
                sprite = node.addComponent(cc.Sprite);
            }

            var loadCallback = function (err, asset) {
                if (err) {
                    if (event.reply) event.reply(null, { success: false, error: 'Failed to load asset: ' + err });
                    return;
                }

                if (asset instanceof cc.SpriteFrame) {
                    sprite.spriteFrame = asset;
                } else if (asset instanceof cc.Texture2D) {
                    sprite.spriteFrame = new cc.SpriteFrame(asset);
                } else {
                    if (event.reply) event.reply(null, { success: false, error: 'Asset is not a SpriteFrame or Texture2D' });
                    return;
                }

                if (args.spriteType !== undefined) {
                    sprite.type = args.spriteType;
                }
                if (args.sizeMode !== undefined) {
                    sprite.sizeMode = args.sizeMode;
                }

                if (event.reply) event.reply(null, {
                    success: true,
                    message: 'SpriteFrame set on node: ' + node.name,
                    data: {
                        uuid: node.uuid,
                        name: node.name,
                        spriteFrameUuid: args.spriteFrameUuid,
                        spriteType: args.spriteType,
                        sizeMode: args.sizeMode
                    }
                });
            };

            if (cc.assetManager) {
                cc.assetManager.loadAny({ uuid: args.spriteFrameUuid }, loadCallback);
            } else if (cc.loader) {
                cc.loader.load({ uuid: args.spriteFrameUuid, type: 'uuid' }, loadCallback);
            } else {
                if (event.reply) event.reply(null, { success: false, error: 'No asset loading API available' });
            }
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Get label text as codepoint array to bypass IPC encoding issues
    // -----------------------------------------------------------------------
    getLabelText: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }
            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }
            var label = node.getComponent(cc.Label);
            if (!label) {
                if (event.reply) event.reply(null, { success: false, error: 'No cc.Label on node: ' + node.name });
                return;
            }
            var text = label.string || '';
            var codepoints = [];
            for (var i = 0; i < text.length; i++) {
                codepoints.push(text.charCodeAt(i));
            }
            if (event.reply) event.reply(null, {
                success: true,
                data: { nodeName: node.name, codepoints: codepoints, length: text.length }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Set label text using codepoint array to bypass IPC encoding issues
    // Args: { nodeUuid, codepoints: [number, ...] }
    // -----------------------------------------------------------------------
    setLabelText: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }
            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }
            var label = node.getComponent(cc.Label);
            if (!label) {
                if (event.reply) event.reply(null, { success: false, error: 'No cc.Label on node: ' + node.name });
                return;
            }
            var text = '';
            if (args.codepoints && Array.isArray(args.codepoints)) {
                text = String.fromCharCode.apply(null, args.codepoints);
            } else if (args.text) {
                text = args.text;
            }
            label.string = text;
            if (event.reply) event.reply(null, {
                success: true,
                message: 'Label text set on: ' + node.name,
                data: { nodeName: node.name, textLength: text.length }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Set font asset on a node's cc.Label component
    // -----------------------------------------------------------------------
    setLabelFont: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var node = findNodeByUuid(scene, args.nodeUuid);
            if (!node) {
                if (event.reply) event.reply(null, { success: false, error: 'Node not found: ' + args.nodeUuid });
                return;
            }

            var label = node.getComponent(cc.Label);
            if (!label) {
                if (event.reply) event.reply(null, { success: false, error: 'No cc.Label component on node: ' + node.name });
                return;
            }

            var loadCallback = function (err, asset) {
                if (err) {
                    if (event.reply) event.reply(null, { success: false, error: 'Failed to load font asset: ' + err });
                    return;
                }

                if (asset instanceof cc.Font || asset instanceof cc.TTFFont || asset instanceof cc.BitmapFont || asset instanceof cc.LabelAtlas) {
                    label.font = asset;
                    label.useSystemFont = false;
                } else {
                    if (event.reply) event.reply(null, { success: false, error: 'Asset is not a Font type: ' + (asset && asset.constructor && asset.constructor.name) });
                    return;
                }

                if (event.reply) event.reply(null, {
                    success: true,
                    message: 'Font set on label: ' + node.name,
                    data: {
                        uuid: node.uuid,
                        name: node.name,
                        fontUuid: args.fontUuid
                    }
                });
            };

            if (cc.assetManager) {
                cc.assetManager.loadAny({ uuid: args.fontUuid }, loadCallback);
            } else if (cc.loader) {
                cc.loader.load({ uuid: args.fontUuid, type: 'uuid' }, loadCallback);
            } else {
                if (event.reply) event.reply(null, { success: false, error: 'No asset loading API available' });
            }
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Place reference image overlay
    // -----------------------------------------------------------------------
    placeReferenceImage: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var parent = null;
            if (args.parentUuid) {
                parent = findNodeByUuid(scene, args.parentUuid);
            }
            if (!parent) {
                // Find first Canvas node as default parent
                var findCanvas = function (node) {
                    if (node.getComponent && node.getComponent(cc.Canvas)) return node;
                    var children = node.children || [];
                    for (var i = 0; i < children.length; i++) {
                        var found = findCanvas(children[i]);
                        if (found) return found;
                    }
                    return null;
                };
                parent = findCanvas(scene) || scene;
            }

            var nodeName = args.name || '__REF_OVERLAY__';
            var overlayNode = new cc.Node(nodeName);
            parent.addChild(overlayNode);

            // Position at bottom of sibling order
            overlayNode.setSiblingIndex(0);
            overlayNode.zIndex = -9999;

            // Set position
            overlayNode.x = args.x || 0;
            overlayNode.y = args.y || 0;

            // Set opacity
            overlayNode.opacity = (args.opacity !== undefined) ? args.opacity : 100;

            var sprite = overlayNode.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

            var loadCallback = function (err, asset) {
                if (err) {
                    if (event.reply) event.reply(null, { success: false, error: 'Failed to load texture: ' + err });
                    return;
                }

                var sf;
                if (asset instanceof cc.SpriteFrame) {
                    sf = asset;
                } else if (asset instanceof cc.Texture2D) {
                    sf = new cc.SpriteFrame(asset);
                } else {
                    if (event.reply) event.reply(null, { success: false, error: 'Asset is not a SpriteFrame or Texture2D' });
                    return;
                }

                sprite.spriteFrame = sf;

                // Set size: use provided dimensions or original texture size
                if (args.width !== undefined) {
                    overlayNode.width = args.width;
                } else {
                    overlayNode.width = sf.getRect().width;
                }
                if (args.height !== undefined) {
                    overlayNode.height = args.height;
                } else {
                    overlayNode.height = sf.getRect().height;
                }

                if (event.reply) event.reply(null, {
                    success: true,
                    message: 'Reference image placed: ' + nodeName,
                    data: {
                        uuid: overlayNode.uuid,
                        name: overlayNode.name,
                        path: getNodePath(overlayNode),
                        width: overlayNode.width,
                        height: overlayNode.height,
                        opacity: overlayNode.opacity
                    }
                });
            };

            if (cc.assetManager) {
                cc.assetManager.loadAny({ uuid: args.textureUuid }, loadCallback);
            } else if (cc.loader) {
                cc.loader.load({ uuid: args.textureUuid, type: 'uuid' }, loadCallback);
            } else {
                if (event.reply) event.reply(null, { success: false, error: 'No asset loading API available' });
            }
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Remove reference image overlay(s)
    // -----------------------------------------------------------------------
    removeReferenceImage: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var removed = [];

            if (args.uuid) {
                // Remove specific node by UUID
                var node = findNodeByUuid(scene, args.uuid);
                if (node) {
                    removed.push({ uuid: node.uuid, name: node.name });
                    node.removeFromParent(true);
                    node.destroy();
                }
            } else {
                // Remove all __REF_OVERLAY__ nodes
                var overlays = [];
                var findOverlays = function (parent) {
                    var children = parent.children || [];
                    for (var i = children.length - 1; i >= 0; i--) {
                        var child = children[i];
                        if (child.name === '__REF_OVERLAY__') {
                            overlays.push(child);
                        }
                        findOverlays(child);
                    }
                };
                findOverlays(scene);

                for (var i = 0; i < overlays.length; i++) {
                    removed.push({ uuid: overlays[i].uuid, name: overlays[i].name });
                    overlays[i].removeFromParent(true);
                    overlays[i].destroy();
                }
            }

            if (event.reply) event.reply(null, {
                success: true,
                message: 'Removed ' + removed.length + ' reference overlay(s)',
                data: { removed: removed, count: removed.length }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    // -----------------------------------------------------------------------
    // Analyze layout for reference image comparison
    // -----------------------------------------------------------------------
    analyzeLayout: function (event, argStr) {
        try {
            var args = parseArg(argStr);
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var root = scene;
            if (args.parentUuid) {
                var found = findNodeByUuid(scene, args.parentUuid);
                if (found) root = found;
            }

            var includeInactive = args.includeInactive || false;

            var analyzeNode = function (node, depth) {
                if (!node) return null;
                if (!includeInactive && !node.active) return null;
                // Skip editor internal nodes
                if (node.name === 'Editor Scene Background' || node.name === 'Editor Scene Foreground') return null;

                var info = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    x: Math.round(node.x),
                    y: Math.round(node.y),
                    width: Math.round(node.width),
                    height: Math.round(node.height),
                    anchorX: node.anchorX,
                    anchorY: node.anchorY,
                    scaleX: node.scaleX,
                    scaleY: node.scaleY,
                    rotation: node.rotation,
                    opacity: node.opacity,
                    zIndex: node.zIndex,
                    siblingIndex: node.getSiblingIndex(),
                    components: [],
                    children: []
                };

                // Collect component info
                var comps = node._components || [];
                for (var c = 0; c < comps.length; c++) {
                    var comp = comps[c];
                    var compInfo = {
                        type: cc.js.getClassName(comp) || comp.__classname__ || 'Unknown'
                    };

                    // Extract key properties based on component type
                    if (comp instanceof cc.Label) {
                        compInfo.string = comp.string;
                        compInfo.fontSize = comp.fontSize;
                        compInfo.horizontalAlign = comp.horizontalAlign;
                        compInfo.verticalAlign = comp.verticalAlign;
                    } else if (comp instanceof cc.Sprite) {
                        compInfo.sizeMode = comp.sizeMode;
                        compInfo.hasSpriteFrame = !!comp.spriteFrame;
                        compInfo.type = comp.type;
                    } else if (comp instanceof cc.Button) {
                        compInfo.interactable = comp.interactable;
                        compInfo.transition = comp.transition;
                    } else if (comp instanceof cc.Widget) {
                        compInfo.isAlignTop = comp.isAlignTop;
                        compInfo.isAlignBottom = comp.isAlignBottom;
                        compInfo.isAlignLeft = comp.isAlignLeft;
                        compInfo.isAlignRight = comp.isAlignRight;
                        compInfo.top = comp.top;
                        compInfo.bottom = comp.bottom;
                        compInfo.left = comp.left;
                        compInfo.right = comp.right;
                    } else if (comp instanceof cc.Layout) {
                        compInfo.layoutType = comp.type;
                        compInfo.resizeMode = comp.resizeMode;
                        compInfo.spacingX = comp.spacingX;
                        compInfo.spacingY = comp.spacingY;
                    }

                    info.components.push(compInfo);
                }

                // Recurse children
                var children = node.children || [];
                for (var i = 0; i < children.length; i++) {
                    var childInfo = analyzeNode(children[i], depth + 1);
                    if (childInfo) info.children.push(childInfo);
                }

                return info;
            };

            var result = [];
            var rootChildren = root.children || [];
            for (var i = 0; i < rootChildren.length; i++) {
                var nodeInfo = analyzeNode(rootChildren[i], 0);
                if (nodeInfo) result.push(nodeInfo);
            }

            // Get canvas design resolution if available
            var designRes = null;
            var findCanvasComp = function (node) {
                var canvas = node.getComponent && node.getComponent(cc.Canvas);
                if (canvas) return canvas;
                var ch = node.children || [];
                for (var j = 0; j < ch.length; j++) {
                    var found = findCanvasComp(ch[j]);
                    if (found) return found;
                }
                return null;
            };
            var canvasComp = findCanvasComp(scene);
            if (canvasComp) {
                designRes = {
                    width: canvasComp.designResolution.width,
                    height: canvasComp.designResolution.height,
                    fitWidth: canvasComp.fitWidth,
                    fitHeight: canvasComp.fitHeight
                };
            }

            var responseObj = {
                success: true,
                data: {
                    designResolution: designRes,
                    nodes: result,
                    totalNodes: (function countNodes(arr) {
                        var count = 0;
                        for (var k = 0; k < arr.length; k++) {
                            count++;
                            if (arr[k].children) count += countNodes(arr[k].children);
                        }
                        return count;
                    })(result)
                }
            };
            // Wrap as ASCII-safe JSON string to prevent IPC encoding corruption
            var safeJson = JSON.stringify(responseObj).replace(/[\u0080-\uffff]/g, function (ch) {
                return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
            });
            if (event.reply) event.reply(null, '__SAFE_JSON__' + safeJson);
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    captureScreenshot: function (event, argStr) {
        try {
            var args = parseArg(argStr) || {};
            var canvas = cc.game.canvas;
            if (!canvas) {
                if (event.reply) event.reply(null, { success: false, error: 'No game canvas available' });
                return;
            }

            // Determine capture size: design resolution (scene) or root node size (prefab)
            var captureWidth = args.width;
            var captureHeight = args.height;
            var sizeSource = 'custom';

            if (!captureWidth || !captureHeight) {
                var scene = cc.director.getScene();
                if (scene) {
                    // Try Canvas component for design resolution
                    var findCanvas = function (node) {
                        if (node.getComponent && node.getComponent(cc.Canvas)) return node.getComponent(cc.Canvas);
                        var children = node.children || [];
                        for (var i = 0; i < children.length; i++) {
                            var found = findCanvas(children[i]);
                            if (found) return found;
                        }
                        return null;
                    };
                    var canvasComp = findCanvas(scene);

                    if (canvasComp && canvasComp.designResolution) {
                        captureWidth = captureWidth || canvasComp.designResolution.width;
                        captureHeight = captureHeight || canvasComp.designResolution.height;
                        sizeSource = 'designResolution';
                    } else {
                        // Prefab mode: use the root node size
                        var rootChildren = scene.children || [];
                        for (var r = 0; r < rootChildren.length; r++) {
                            var child = rootChildren[r];
                            if (child.width > 0 && child.height > 0) {
                                captureWidth = captureWidth || child.width;
                                captureHeight = captureHeight || child.height;
                                sizeSource = 'prefabRoot(' + child.name + ')';
                                break;
                            }
                        }
                    }
                }
                // Final fallback: canvas size
                captureWidth = captureWidth || canvas.width;
                captureHeight = captureHeight || canvas.height;
                if (sizeSource === 'custom') sizeSource = 'canvasFallback';
            }

            // Use RenderTexture + Camera (canvas.toDataURL returns blank without preserveDrawingBuffer)
            var cameras = cc.Camera.cameras || [];
            var camera = null;
            for (var i = 0; i < cameras.length; i++) {
                if (cameras[i].node && cameras[i].node.active) {
                    camera = cameras[i];
                    break;
                }
            }
            if (!camera) {
                if (event.reply) event.reply(null, { success: false, error: 'No active camera found and canvas.toDataURL returned blank' });
                return;
            }

            var rt = new cc.RenderTexture();
            rt.initWithSize(captureWidth, captureHeight, cc.gfx.RB_FMT_D24S8);

            var oldTarget = camera.targetTexture;
            camera.targetTexture = rt;
            camera.render();
            camera.targetTexture = oldTarget;

            var pixels = rt.readPixels();
            if (!pixels || pixels.length === 0) {
                rt.destroy();
                if (event.reply) event.reply(null, { success: false, error: 'RenderTexture readPixels returned empty data' });
                return;
            }

            // Flip Y (OpenGL convention: bottom-up → top-down)
            var rowBytes = captureWidth * 4;
            var halfHeight = Math.floor(captureHeight / 2);
            var tempRow = new Uint8Array(rowBytes);
            for (var y = 0; y < halfHeight; y++) {
                var topOffset = y * rowBytes;
                var bottomOffset = (captureHeight - 1 - y) * rowBytes;
                tempRow.set(pixels.subarray(topOffset, topOffset + rowBytes));
                pixels.set(pixels.subarray(bottomOffset, bottomOffset + rowBytes), topOffset);
                pixels.set(tempRow, bottomOffset);
            }

            // Convert to PNG via 2D canvas
            var canvas2d = document.createElement('canvas');
            canvas2d.width = captureWidth;
            canvas2d.height = captureHeight;
            var ctx = canvas2d.getContext('2d');
            var imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), captureWidth, captureHeight);
            ctx.putImageData(imageData, 0, 0);
            var rtDataUrl = canvas2d.toDataURL('image/png');

            rt.destroy();

            if (event.reply) event.reply(null, {
                success: true,
                data: { dataUrl: rtDataUrl, width: captureWidth, height: captureHeight, method: 'RenderTexture', sizeSource: sizeSource }
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    },

    findNodeByPath: function (event, path) {
        try {
            var scene = cc.director.getScene();
            if (!scene) {
                if (event.reply) event.reply(null, { success: false, error: 'No active scene' });
                return;
            }

            var parts = path.split('/');
            var current = null;

            // Find root node matching first part
            var sceneChildren = scene.children;
            for (var i = 0; i < sceneChildren.length; i++) {
                if (sceneChildren[i].name === parts[0]) {
                    current = sceneChildren[i];
                    break;
                }
            }

            if (!current) {
                if (event.reply) event.reply(null, { success: false, error: 'Root node not found: ' + parts[0] });
                return;
            }

            // Traverse remaining path segments
            for (var p = 1; p < parts.length; p++) {
                var found = null;
                var children = current.children;
                for (var j = 0; j < children.length; j++) {
                    if (children[j].name === parts[p]) {
                        found = children[j];
                        break;
                    }
                }
                if (!found) {
                    if (event.reply) event.reply(null, { success: false, error: 'Node not found at path segment: ' + parts[p] + ' (full path: ' + path + ')' });
                    return;
                }
                current = found;
            }

            if (event.reply) event.reply(null, {
                success: true,
                data: serializeNode(current, true)
            });
        } catch (err) {
            if (event.reply) event.reply(null, { success: false, error: err.message || String(err) });
        }
    }
};
