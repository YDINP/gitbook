'use strict';

var BaseTool = require('./base-tool');
var Fs = require('fs');
var Path = require('path');

function ProjectTools() {
    BaseTool.call(this);
}

ProjectTools.prototype = Object.create(BaseTool.prototype);
ProjectTools.prototype.constructor = ProjectTools;

ProjectTools.prototype.getTools = function () {
    return [
        {
            name: 'get_project_info',
            description: 'Get project information including name, path, engine version, and asset statistics',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'get_project_settings',
            description: 'Get project settings from project.json',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'refresh_assets',
            description: 'Refresh the asset database (reimport changed assets)',
            inputSchema: {
                type: 'object',
                properties: {
                    folder: {
                        type: 'string',
                        description: 'Specific folder URL to refresh (e.g. db://assets/textures). If not provided, refreshes entire project.'
                    }
                }
            }
        },
        {
            name: 'import_asset',
            description: 'Import an external file into the project assets',
            inputSchema: {
                type: 'object',
                properties: {
                    sourcePath: {
                        type: 'string',
                        description: 'Absolute path to the source file on disk'
                    },
                    targetFolder: {
                        type: 'string',
                        description: 'Target folder URL in assets (e.g. db://assets/textures)'
                    }
                },
                required: ['sourcePath', 'targetFolder']
            }
        },
        {
            name: 'get_asset_info',
            description: 'Get information about a specific asset by URL or UUID',
            inputSchema: {
                type: 'object',
                properties: {
                    assetUrl: {
                        type: 'string',
                        description: 'Asset URL (e.g. db://assets/textures/hero.png)'
                    },
                    assetUuid: {
                        type: 'string',
                        description: 'Asset UUID (alternative to assetUrl)'
                    }
                }
            }
        },
        {
            name: 'browse_assets',
            description: 'Browse asset folder structure. Returns subfolders and files in the given folder.',
            inputSchema: {
                type: 'object',
                properties: {
                    folder: {
                        type: 'string',
                        description: 'Folder URL to browse (e.g. db://assets, db://assets/scripts)',
                        default: 'db://assets'
                    },
                    type: {
                        type: 'string',
                        description: 'Filter by asset type (e.g. prefab, scene, javascript, texture, sprite-frame, audio-clip, folder). Leave empty for all.'
                    }
                }
            }
        },
        {
            name: 'reveal_in_assets',
            description: 'Reveal and highlight an asset or folder in the editor Assets panel. Expands parent folders automatically.',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Asset/folder UUID to reveal'
                    }
                },
                required: ['uuid']
            }
        },
        {
            name: 'delete_asset',
            description: 'Delete an asset by URL',
            inputSchema: {
                type: 'object',
                properties: {
                    assetUrl: {
                        type: 'string',
                        description: 'Asset URL to delete (e.g. db://assets/textures/old.png)'
                    }
                },
                required: ['assetUrl']
            }
        },
        {
            name: 'move_asset',
            description: 'Move or rename an asset',
            inputSchema: {
                type: 'object',
                properties: {
                    srcUrl: {
                        type: 'string',
                        description: 'Source asset URL'
                    },
                    destUrl: {
                        type: 'string',
                        description: 'Destination asset URL'
                    }
                },
                required: ['srcUrl', 'destUrl']
            }
        },
        {
            name: 'create_folder',
            description: 'Create a new folder in assets',
            inputSchema: {
                type: 'object',
                properties: {
                    folderUrl: {
                        type: 'string',
                        description: 'Folder URL to create (e.g. db://assets/newFolder)'
                    }
                },
                required: ['folderUrl']
            }
        },
        {
            name: 'copy_asset',
            description: 'Copy an asset to a new location',
            inputSchema: {
                type: 'object',
                properties: {
                    srcUrl: {
                        type: 'string',
                        description: 'Source asset URL'
                    },
                    destUrl: {
                        type: 'string',
                        description: 'Destination asset URL'
                    }
                },
                required: ['srcUrl', 'destUrl']
            }
        },
        {
            name: 'get_asset_meta',
            description: 'Get asset meta information',
            inputSchema: {
                type: 'object',
                properties: {
                    assetUrl: {
                        type: 'string',
                        description: 'Asset URL (e.g. db://assets/textures/hero.png)'
                    }
                },
                required: ['assetUrl']
            }
        },
        {
            name: 'create_script',
            description: 'Create a new script file with cc.Class template',
            inputSchema: {
                type: 'object',
                properties: {
                    scriptUrl: {
                        type: 'string',
                        description: 'Script URL (e.g. db://assets/scripts/NewScript.js)'
                    },
                    className: {
                        type: 'string',
                        description: 'Optional class name for the component'
                    }
                },
                required: ['scriptUrl']
            }
        },
        {
            name: 'read_script',
            description: 'Read script file content',
            inputSchema: {
                type: 'object',
                properties: {
                    scriptUrl: {
                        type: 'string',
                        description: 'Script URL (e.g. db://assets/scripts/MyScript.js)'
                    }
                },
                required: ['scriptUrl']
            }
        },
        {
            name: 'update_script',
            description: 'Update script file content',
            inputSchema: {
                type: 'object',
                properties: {
                    scriptUrl: {
                        type: 'string',
                        description: 'Script URL (e.g. db://assets/scripts/MyScript.js)'
                    },
                    content: {
                        type: 'string',
                        description: 'New content to write to the script'
                    }
                },
                required: ['scriptUrl', 'content']
            }
        }
    ];
};

ProjectTools.prototype.execute = function (toolName, args) {
    switch (toolName) {
        case 'get_project_info':
            return this.getProjectInfo();
        case 'get_project_settings':
            return this.getProjectSettings();
        case 'refresh_assets':
            return this.refreshAssets(args.folder);
        case 'reveal_in_assets':
            return this.revealInAssets(args.uuid);
        case 'import_asset':
            return this.importAsset(args.sourcePath, args.targetFolder);
        case 'get_asset_info':
            return this.getAssetInfo(args.assetUrl, args.assetUuid);
        case 'browse_assets':
            return this.browseAssets(args.folder || 'db://assets', args.type);
        case 'delete_asset':
            return this.deleteAsset(args.assetUrl);
        case 'move_asset':
            return this.moveAsset(args.srcUrl, args.destUrl);
        case 'create_folder':
            return this.createFolder(args.folderUrl);
        case 'copy_asset':
            return this.copyAsset(args.srcUrl, args.destUrl);
        case 'get_asset_meta':
            return this.getAssetMeta(args.assetUrl);
        case 'create_script':
            return this.createScript(args.scriptUrl, args.className);
        case 'read_script':
            return this.readScript(args.scriptUrl);
        case 'update_script':
            return this.updateScript(args.scriptUrl, args.content);
        default:
            return Promise.reject(new Error('Unknown project tool: ' + toolName));
    }
};

ProjectTools.prototype.getProjectInfo = function () {
    var self = this;
    try {
        var projectPath = Editor.Project.path || Editor.projectPath;
        var projectName = Path.basename(projectPath);
        var info = {
            name: projectName,
            path: projectPath,
            engine: 'Cocos Creator 2.x'
        };

        // Try to read project.json for more details
        var projectJsonPath = Path.join(projectPath, 'project.json');
        if (Fs.existsSync(projectJsonPath)) {
            try {
                var projectJson = JSON.parse(Fs.readFileSync(projectJsonPath, 'utf-8'));
                info.engineVersion = projectJson.engine_version || projectJson.version || 'unknown';
                info.id = projectJson.id;
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Try to read package.json
        var packageJsonPath = Path.join(projectPath, 'package.json');
        if (Fs.existsSync(packageJsonPath)) {
            try {
                var packageJson = JSON.parse(Fs.readFileSync(packageJsonPath, 'utf-8'));
                info.packageVersion = packageJson.version;
                info.packageName = packageJson.name;
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Count assets
        return new Promise(function (resolve) {
            Editor.assetdb.queryAssets('db://assets/**/*', null, function (err, results) {
                if (!err && results) {
                    info.totalAssets = results.length;

                    // Count by type
                    var typeCounts = {};
                    results.forEach(function (asset) {
                        var type = asset.type || 'unknown';
                        typeCounts[type] = (typeCounts[type] || 0) + 1;
                    });
                    info.assetsByType = typeCounts;
                }
                resolve(self.success(info));
            });
        });
    } catch (err) {
        return Promise.resolve(self.error('Failed to get project info: ' + (err.message || err)));
    }
};

ProjectTools.prototype.getProjectSettings = function () {
    var self = this;
    try {
        var projectPath = Editor.Project.path || Editor.projectPath;
        var settingsPath = Path.join(projectPath, 'settings', 'project.json');
        var result = {};

        if (Fs.existsSync(settingsPath)) {
            result.projectSettings = JSON.parse(Fs.readFileSync(settingsPath, 'utf-8'));
        }

        // Also try builder.json
        var builderPath = Path.join(projectPath, 'settings', 'builder.json');
        if (Fs.existsSync(builderPath)) {
            result.builderSettings = JSON.parse(Fs.readFileSync(builderPath, 'utf-8'));
        }

        return Promise.resolve(self.success(result));
    } catch (err) {
        return Promise.resolve(self.error('Failed to get project settings: ' + (err.message || err)));
    }
};

ProjectTools.prototype.refreshAssets = function (folder) {
    var self = this;
    return new Promise(function (resolve) {
        var url = folder || 'db://assets';
        Editor.assetdb.refresh(url, function (err) {
            if (err) {
                resolve(self.error('Failed to refresh assets: ' + err));
            } else {
                resolve(self.success({ folder: url }, 'Assets refreshed: ' + url));
            }
        });
    });
};

ProjectTools.prototype.importAsset = function (sourcePath, targetFolder) {
    var self = this;
    return new Promise(function (resolve) {
        if (!Fs.existsSync(sourcePath)) {
            resolve(self.error('Source file not found: ' + sourcePath));
            return;
        }

        Editor.assetdb.import([sourcePath], targetFolder, function (err, results) {
            if (err) {
                resolve(self.error('Failed to import asset: ' + err));
            } else {
                var imported = (results || []).map(function (r) {
                    return {
                        uuid: r.uuid,
                        url: r.url,
                        path: r.path,
                        type: r.type
                    };
                });
                resolve(self.success({
                    imported: imported,
                    count: imported.length
                }, 'Asset imported successfully'));
            }
        });
    });
};

ProjectTools.prototype.getAssetInfo = function (assetUrl, assetUuid) {
    var self = this;
    return new Promise(function (resolve) {
        if (assetUuid) {
            // Query by UUID
            Editor.assetdb.queryInfoByUuid(assetUuid, function (err, info) {
                if (err || !info) {
                    resolve(self.error('Asset not found with UUID: ' + assetUuid));
                    return;
                }
                // Also get the URL
                Editor.assetdb.queryUrlByUuid(assetUuid, function (err2, url) {
                    resolve(self.success({
                        uuid: assetUuid,
                        url: url || 'unknown',
                        path: info.path,
                        type: info.type,
                        isSubAsset: info.isSubAsset || false
                    }));
                });
            });
        } else if (assetUrl) {
            // Query by URL
            Editor.assetdb.queryUuidByUrl(assetUrl, function (err, uuid) {
                if (err || !uuid) {
                    resolve(self.error('Asset not found at: ' + assetUrl));
                    return;
                }
                Editor.assetdb.queryInfoByUuid(uuid, function (err2, info) {
                    resolve(self.success({
                        uuid: uuid,
                        url: assetUrl,
                        path: info ? info.path : 'unknown',
                        type: info ? info.type : 'unknown',
                        isSubAsset: info ? (info.isSubAsset || false) : false
                    }));
                });
            });
        } else {
            resolve(self.error('Either assetUrl or assetUuid is required'));
        }
    });
};

ProjectTools.prototype.revealInAssets = function (uuid) {
    var self = this;
    Editor.Ipc.sendToAll('assets:hint', uuid);
    Editor.Selection.select('asset', uuid);
    return Promise.resolve(self.success({ uuid: uuid }, 'Asset revealed in Assets panel'));
};

ProjectTools.prototype.browseAssets = function (folder, type) {
    var self = this;
    return new Promise(function (resolve) {
        var pattern = folder + '/*';
        var assetType = type || null;
        Editor.assetdb.queryAssets(pattern, assetType, function (err, results) {
            if (err) {
                resolve(self.error('Failed to browse assets: ' + err));
                return;
            }
            var folders = [];
            var files = [];
            (results || []).forEach(function (asset) {
                var item = {
                    url: asset.url,
                    uuid: asset.uuid,
                    type: asset.type
                };
                if (asset.type === 'folder') {
                    folders.push(item);
                } else {
                    files.push(item);
                }
            });
            resolve(self.success({
                folder: folder,
                subfolders: folders,
                files: files,
                totalFolders: folders.length,
                totalFiles: files.length
            }));
        });
    });
};

ProjectTools.prototype.deleteAsset = function (assetUrl) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.assetdb.delete([assetUrl], function (err) {
            if (err) {
                resolve(self.error('Failed to delete asset: ' + err));
            } else {
                resolve(self.success({ assetUrl: assetUrl }, 'Asset deleted: ' + assetUrl));
            }
        });
    });
};

ProjectTools.prototype.moveAsset = function (srcUrl, destUrl) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.assetdb.move(srcUrl, destUrl, function (err) {
            if (err) {
                resolve(self.error('Failed to move asset: ' + err));
            } else {
                resolve(self.success({ srcUrl: srcUrl, destUrl: destUrl }, 'Asset moved: ' + srcUrl + ' -> ' + destUrl));
            }
        });
    });
};

ProjectTools.prototype.createFolder = function (folderUrl) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.assetdb.create(folderUrl, null, function (err) {
            if (err) {
                resolve(self.error('Failed to create folder: ' + err));
            } else {
                resolve(self.success({ folderUrl: folderUrl }, 'Folder created: ' + folderUrl));
            }
        });
    });
};

ProjectTools.prototype.copyAsset = function (srcUrl, destUrl) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.assetdb.queryPathByUrl(srcUrl, function (err, srcPath) {
            if (err || !srcPath) {
                resolve(self.error('Source asset not found: ' + srcUrl));
                return;
            }
            var data;
            try {
                data = Fs.readFileSync(srcPath);
            } catch (e) {
                resolve(self.error('Failed to read source asset: ' + (e.message || e)));
                return;
            }
            Editor.assetdb.create(destUrl, data, function (err2) {
                if (err2) {
                    resolve(self.error('Failed to copy asset: ' + err2));
                } else {
                    resolve(self.success({ srcUrl: srcUrl, destUrl: destUrl }, 'Asset copied: ' + srcUrl + ' -> ' + destUrl));
                }
            });
        });
    });
};

ProjectTools.prototype.getAssetMeta = function (assetUrl) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.assetdb.queryMetaInfoByUrl(assetUrl, function (err, meta) {
            if (err || !meta) {
                resolve(self.error('Failed to get asset meta: ' + (err || 'not found')));
                return;
            }
            var metaObj = meta;
            if (typeof meta === 'string') {
                try { metaObj = JSON.parse(meta); } catch (e) { metaObj = meta; }
            }
            resolve(self.success({ assetUrl: assetUrl, meta: metaObj }));
        });
    });
};

ProjectTools.prototype.createScript = function (scriptUrl, className) {
    var self = this;
    return new Promise(function (resolve) {
        var name = className || Path.basename(scriptUrl, '.js');
        var scriptContent = 'cc.Class({\n' +
            '    extends: cc.Component,\n' +
            '\n' +
            '    properties: {},\n' +
            '\n' +
            '    onLoad () {},\n' +
            '\n' +
            '    start () {},\n' +
            '});\n';
        Editor.assetdb.create(scriptUrl, scriptContent, function (err) {
            if (err) {
                resolve(self.error('Failed to create script: ' + err));
            } else {
                resolve(self.success({ scriptUrl: scriptUrl, className: name }, 'Script created: ' + scriptUrl));
            }
        });
    });
};

ProjectTools.prototype.readScript = function (scriptUrl) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.assetdb.queryPathByUrl(scriptUrl, function (err, filePath) {
            if (err || !filePath) {
                resolve(self.error('Script not found: ' + scriptUrl));
                return;
            }
            var content;
            try {
                content = Fs.readFileSync(filePath, 'utf-8');
            } catch (e) {
                resolve(self.error('Failed to read script: ' + (e.message || e)));
                return;
            }
            resolve(self.success({ scriptUrl: scriptUrl, path: filePath, content: content }));
        });
    });
};

ProjectTools.prototype.updateScript = function (scriptUrl, content) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.assetdb.saveExists(scriptUrl, content, function (err) {
            if (err) {
                resolve(self.error('Failed to update script: ' + err));
            } else {
                resolve(self.success({ scriptUrl: scriptUrl }, 'Script updated: ' + scriptUrl));
            }
        });
    });
};

module.exports = ProjectTools;
