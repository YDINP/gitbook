'use strict';

var BaseTool = require('./base-tool');

function PrefabTools() {
    BaseTool.call(this);
}

PrefabTools.prototype = Object.create(BaseTool.prototype);
PrefabTools.prototype.constructor = PrefabTools;

PrefabTools.prototype.getTools = function () {
    return [
        {
            name: 'get_prefab_list',
            description: 'Get list of all prefab files in the project',
            inputSchema: {
                type: 'object',
                properties: {
                    folder: {
                        type: 'string',
                        description: 'Folder to search (default: db://assets)',
                        default: 'db://assets'
                    }
                }
            }
        },
        {
            name: 'load_prefab',
            description: 'Load and inspect a prefab file, returning its node hierarchy',
            inputSchema: {
                type: 'object',
                properties: {
                    prefabPath: {
                        type: 'string',
                        description: 'Prefab asset URL (e.g. db://assets/prefabs/Enemy.prefab)'
                    }
                },
                required: ['prefabPath']
            }
        },
        {
            name: 'instantiate_prefab',
            description: 'Instantiate a prefab into the current scene at a given parent node',
            inputSchema: {
                type: 'object',
                properties: {
                    prefabUuid: {
                        type: 'string',
                        description: 'Prefab asset UUID (use get_prefab_list to find it)'
                    },
                    parentUuid: {
                        type: 'string',
                        description: 'Parent node UUID in the scene (optional, defaults to scene root)'
                    },
                    position: {
                        type: 'object',
                        properties: {
                            x: { type: 'number' },
                            y: { type: 'number' }
                        },
                        description: 'Initial position {x, y}'
                    }
                },
                required: ['prefabUuid']
            }
        },
        {
            name: 'create_prefab',
            description: 'Create a new prefab file from an existing node in the scene',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Source node UUID to create prefab from'
                    },
                    savePath: {
                        type: 'string',
                        description: 'Where to save the prefab (e.g. db://assets/prefabs/MyPrefab.prefab)'
                    }
                },
                required: ['nodeUuid', 'savePath']
            }
        }
    ];
};

PrefabTools.prototype.execute = function (toolName, args) {
    switch (toolName) {
        case 'get_prefab_list':
            return this.getPrefabList(args.folder || 'db://assets');
        case 'load_prefab':
            return this.loadPrefab(args.prefabPath);
        case 'instantiate_prefab':
            return this.instantiatePrefab(args.prefabUuid, args.parentUuid, args.position);
        case 'create_prefab':
            return this.createPrefab(args.nodeUuid, args.savePath);
        default:
            return Promise.reject(new Error('Unknown prefab tool: ' + toolName));
    }
};

PrefabTools.prototype.getPrefabList = function (folder) {
    var self = this;
    return new Promise(function (resolve) {
        var searchUrl = folder || 'db://assets';
        Editor.assetdb.queryAssets(searchUrl + '/**/*', 'prefab', function (err, results) {
            if (err) {
                resolve(self.error('Failed to query prefabs: ' + err));
                return;
            }
            var prefabs = (results || []).map(function (asset) {
                return {
                    url: asset.url,
                    uuid: asset.uuid,
                    path: asset.path,
                    type: asset.type
                };
            });
            resolve(self.success({
                prefabs: prefabs,
                count: prefabs.length
            }));
        });
    });
};

PrefabTools.prototype.loadPrefab = function (prefabPath) {
    var self = this;
    return new Promise(function (resolve) {
        // Get uuid from path first
        Editor.assetdb.queryUuidByUrl(prefabPath, function (err, uuid) {
            if (err || !uuid) {
                resolve(self.error('Prefab not found at: ' + prefabPath));
                return;
            }
            // Query asset info
            Editor.assetdb.queryInfoByUuid(uuid, function (err2, info) {
                if (err2) {
                    resolve(self.error('Failed to query prefab info: ' + err2));
                    return;
                }
                resolve(self.success({
                    uuid: uuid,
                    url: prefabPath,
                    info: info
                }, 'Prefab loaded: ' + prefabPath));
            });
        });
    });
};

PrefabTools.prototype.instantiatePrefab = function (prefabUuid, parentUuid, position) {
    var self = this;
    var arg = JSON.stringify({
        prefabUuid: prefabUuid,
        parentUuid: parentUuid,
        position: position
    });
    return this.callSceneScript('instantiatePrefab', arg)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to instantiate prefab: ' + (err.message || err));
        });
};

PrefabTools.prototype.createPrefab = function (nodeUuid, savePath) {
    var self = this;
    return this.callSceneScript('createPrefabFromNode', JSON.stringify({ nodeUuid: nodeUuid, savePath: savePath }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to create prefab: ' + (err.message || err));
        });
};

module.exports = PrefabTools;
