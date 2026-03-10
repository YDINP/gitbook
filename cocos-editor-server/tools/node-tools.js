'use strict';

var BaseTool = require('./base-tool');

function NodeTools() {
    BaseTool.call(this);
}

NodeTools.prototype = Object.create(BaseTool.prototype);
NodeTools.prototype.constructor = NodeTools;

NodeTools.prototype.getTools = function () {
    return [
        {
            name: 'create_node',
            description: 'Create a new empty node in the scene. Provide parentPath (preferred) or parentUuid to specify parent.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Node name'
                    },
                    parentUuid: {
                        type: 'string',
                        description: 'Parent node UUID. If not provided, node is created at scene root.'
                    },
                    parentPath: {
                        type: 'string',
                        description: 'Parent node path (e.g. "Canvas/Popup/SettingPopup"). More reliable than UUID.'
                    }
                },
                required: ['name']
            }
        },
        {
            name: 'get_node_info',
            description: 'Get detailed information about a node by UUID (position, rotation, scale, components, children)',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID'
                    }
                },
                required: ['uuid']
            }
        },
        {
            name: 'find_node_by_name',
            description: 'Find the first node matching the given name',
            inputSchema: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Node name to find'
                    }
                },
                required: ['name']
            }
        },
        {
            name: 'find_nodes',
            description: 'Find all nodes matching a name pattern (partial or exact match)',
            inputSchema: {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'Name pattern to search for'
                    },
                    exactMatch: {
                        type: 'boolean',
                        description: 'If true, match exact name; if false, partial/contains match',
                        default: false
                    }
                },
                required: ['pattern']
            }
        },
        {
            name: 'get_all_nodes',
            description: 'Get all nodes in the current scene with uuid, name, path, and active status',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'set_node_property',
            description: 'Set a property on a node (name, active, x, y, rotation, scaleX, scaleY, anchorX, anchorY, width, height, opacity, color, skewX, skewY, zIndex)',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID'
                    },
                    property: {
                        type: 'string',
                        description: 'Property name (e.g. name, active, x, y, rotation, scaleX, scaleY, opacity, color, width, height, anchorX, anchorY, skewX, skewY, zIndex)'
                    },
                    value: {
                        description: 'Property value to set'
                    }
                },
                required: ['uuid', 'property', 'value']
            }
        },
        {
            name: 'set_node_transform',
            description: 'Set multiple transform properties at once (position, rotation, scale). In 2.x: position is {x, y}, rotation is a single angle, scale is {scaleX, scaleY}.',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID'
                    },
                    position: {
                        type: 'object',
                        properties: {
                            x: { type: 'number' },
                            y: { type: 'number' }
                        },
                        description: 'Node position {x, y}'
                    },
                    rotation: {
                        type: 'number',
                        description: 'Node rotation angle in degrees (2D)'
                    },
                    scale: {
                        type: 'object',
                        properties: {
                            scaleX: { type: 'number' },
                            scaleY: { type: 'number' }
                        },
                        description: 'Node scale {scaleX, scaleY}'
                    }
                },
                required: ['uuid']
            }
        },
        {
            name: 'delete_node',
            description: 'Delete a node from the scene by UUID',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID to delete'
                    }
                },
                required: ['uuid']
            }
        },
        {
            name: 'move_node',
            description: 'Move/reparent a node to a new parent',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Node UUID to move'
                    },
                    newParentUuid: {
                        type: 'string',
                        description: 'New parent node UUID'
                    },
                    siblingIndex: {
                        type: 'number',
                        description: 'Sibling index in new parent (-1 means append at end)',
                        default: -1
                    }
                },
                required: ['nodeUuid', 'newParentUuid']
            }
        },
        {
            name: 'duplicate_node',
            description: 'Duplicate a node (with all children and components)',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID to duplicate'
                    }
                },
                required: ['uuid']
            }
        },
        {
            name: 'select_node',
            description: 'Select a node in the editor, highlighting it in the hierarchy panel',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID to select'
                    }
                },
                required: ['uuid']
            }
        },
        {
            name: 'get_selected_nodes',
            description: 'Get the UUIDs of currently selected nodes in the editor',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'focus_node',
            description: 'Focus and zoom the scene view camera on a node',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID to focus on'
                    }
                },
                required: ['uuid']
            }
        },
        {
            name: 'reorder_node',
            description: 'Change the sibling index of a node (reorder among siblings)',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Node UUID to reorder'
                    },
                    siblingIndex: {
                        type: 'number',
                        description: 'New sibling index within the parent'
                    }
                },
                required: ['uuid', 'siblingIndex']
            }
        },
        {
            name: 'find_node_by_path',
            description: 'Find a node by its hierarchy path (e.g. "Canvas/UI/Button")',
            inputSchema: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Hierarchy path of the node'
                    }
                },
                required: ['path']
            }
        }
    ];
};

NodeTools.prototype.execute = function (toolName, args) {
    switch (toolName) {
        case 'create_node':
            return this.createNode(args.name, args.parentUuid, args.parentPath);
        case 'get_node_info':
            return this.getNodeInfo(args.uuid);
        case 'find_node_by_name':
            return this.findNodeByName(args.name);
        case 'find_nodes':
            return this.findNodes(args.pattern, args.exactMatch || false);
        case 'get_all_nodes':
            return this.getAllNodes();
        case 'set_node_property':
            return this.setNodeProperty(args.uuid, args.property, args.value);
        case 'set_node_transform':
            return this.setNodeTransform(args);
        case 'delete_node':
            return this.deleteNode(args.uuid);
        case 'move_node':
            return this.moveNode(args.nodeUuid, args.newParentUuid, args.siblingIndex);
        case 'duplicate_node':
            return this.duplicateNode(args.uuid);
        case 'select_node':
            return this.selectNode(args.uuid);
        case 'get_selected_nodes':
            return this.getSelectedNodes();
        case 'focus_node':
            return this.focusNode(args.uuid);
        case 'reorder_node':
            return this.reorderNode(args.uuid, args.siblingIndex);
        case 'find_node_by_path':
            return this.findNodeByPath(args.path);
        default:
            return Promise.reject(new Error('Unknown node tool: ' + toolName));
    }
};

NodeTools.prototype.createNode = function (name, parentUuid, parentPath) {
    var self = this;
    return this.callSceneScript('createNode', JSON.stringify({ name: name, parentUuid: parentUuid, parentPath: parentPath }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to create node: ' + (err.message || err));
        });
};

NodeTools.prototype.getNodeInfo = function (uuid) {
    var self = this;
    return this.callSceneScript('getNodeInfo', uuid)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to get node info: ' + (err.message || err));
        });
};

NodeTools.prototype.findNodeByName = function (name) {
    var self = this;
    return this.callSceneScript('findNodeByName', name)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to find node: ' + (err.message || err));
        });
};

NodeTools.prototype.findNodes = function (pattern, exactMatch) {
    var self = this;
    return this.callSceneScript('findNodes', JSON.stringify({ pattern: pattern, exactMatch: exactMatch }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to find nodes: ' + (err.message || err));
        });
};

NodeTools.prototype.getAllNodes = function () {
    var self = this;
    return this.callSceneScript('getAllNodes', null)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to get all nodes: ' + (err.message || err));
        });
};

NodeTools.prototype.setNodeProperty = function (uuid, property, value) {
    var self = this;
    return this.callSceneScript('setNodeProperty', JSON.stringify({ uuid: uuid, property: property, value: value }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to set property: ' + (err.message || err));
        });
};

NodeTools.prototype.setNodeTransform = function (args) {
    var self = this;
    return this.callSceneScript('setNodeTransform', JSON.stringify(args))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to set transform: ' + (err.message || err));
        });
};

NodeTools.prototype.deleteNode = function (uuid) {
    var self = this;
    return this.callSceneScript('deleteNode', uuid)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to delete node: ' + (err.message || err));
        });
};

NodeTools.prototype.moveNode = function (nodeUuid, newParentUuid, siblingIndex) {
    var self = this;
    var arg = JSON.stringify({
        nodeUuid: nodeUuid,
        newParentUuid: newParentUuid,
        siblingIndex: siblingIndex !== undefined ? siblingIndex : -1
    });
    return this.callSceneScript('moveNode', arg)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to move node: ' + (err.message || err));
        });
};

NodeTools.prototype.duplicateNode = function (uuid) {
    var self = this;
    return this.callSceneScript('duplicateNode', uuid)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to duplicate node: ' + (err.message || err));
        });
};

NodeTools.prototype.selectNode = function (uuid) {
    var self = this;
    Editor.Selection.select('node', uuid);
    return Promise.resolve(self.success({ uuid: uuid }, 'Node selected in editor'));
};

NodeTools.prototype.getSelectedNodes = function () {
    var self = this;
    var selected = Editor.Selection.curSelection('node');
    return Promise.resolve(self.success({ uuids: selected, count: selected.length }));
};

NodeTools.prototype.focusNode = function (uuid) {
    var self = this;
    Editor.Selection.select('node', uuid);
    Editor.Ipc.sendToAll('scene:focus-on-node', uuid);
    return Promise.resolve(self.success({ uuid: uuid }, 'Scene view focused on node'));
};

NodeTools.prototype.reorderNode = function (uuid, siblingIndex) {
    var self = this;
    return this.callSceneScript('reorderNode', JSON.stringify({ uuid: uuid, siblingIndex: siblingIndex }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to reorder node: ' + (err.message || err));
        });
};

NodeTools.prototype.findNodeByPath = function (path) {
    var self = this;
    return this.callSceneScript('findNodeByPath', path)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to find node by path: ' + (err.message || err));
        });
};

module.exports = NodeTools;
