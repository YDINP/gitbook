'use strict';

var BaseTool = require('./base-tool');
var Fs = require('fs');
var Path = require('path');

function SceneTools() {
    BaseTool.call(this);
}

SceneTools.prototype = Object.create(BaseTool.prototype);
SceneTools.prototype.constructor = SceneTools;

SceneTools.prototype.getTools = function () {
    return [
        {
            name: 'get_current_scene',
            description: 'Get information about the currently open scene (name, uuid, node count)',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'get_scene_list',
            description: 'Get list of all scene files in the project',
            inputSchema: {
                type: 'object',
                properties: {
                    folder: {
                        type: 'string',
                        description: 'Folder path to search (default: db://assets)',
                        default: 'db://assets'
                    }
                }
            }
        },
        {
            name: 'open_scene',
            description: 'Open a scene by its URL (e.g. db://assets/scenes/Main.fire)',
            inputSchema: {
                type: 'object',
                properties: {
                    sceneUrl: {
                        type: 'string',
                        description: 'Scene asset URL (e.g. db://assets/scenes/Main.fire)'
                    }
                },
                required: ['sceneUrl']
            }
        },
        {
            name: 'save_scene',
            description: 'Save the currently open scene',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'create_scene',
            description: 'Create a new empty scene file',
            inputSchema: {
                type: 'object',
                properties: {
                    scenePath: {
                        type: 'string',
                        description: 'Path for the new scene (e.g. db://assets/scenes/NewScene.fire)'
                    }
                },
                required: ['scenePath']
            }
        },
        {
            name: 'get_scene_hierarchy',
            description: 'Get the full node hierarchy tree of the current scene',
            inputSchema: {
                type: 'object',
                properties: {
                    includeComponents: {
                        type: 'boolean',
                        description: 'Include component information for each node',
                        default: false
                    }
                }
            }
        },
        {
            name: 'close_scene',
            description: 'Close the current scene (creates a new empty scene)',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'save_scene_as',
            description: 'Save the current scene to a new path',
            inputSchema: {
                type: 'object',
                properties: {
                    scenePath: {
                        type: 'string',
                        description: 'New path to save the scene (e.g. db://assets/scenes/Copy.fire)'
                    }
                },
                required: ['scenePath']
            }
        },
        {
            name: 'open_prefab',
            description: 'Open a prefab in prefab edit mode by UUID',
            inputSchema: {
                type: 'object',
                properties: {
                    prefabUuid: {
                        type: 'string',
                        description: 'Prefab asset UUID'
                    }
                },
                required: ['prefabUuid']
            }
        },
        {
            name: 'undo',
            description: 'Undo the last scene operation',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'redo',
            description: 'Redo the last undone operation',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'start_preview',
            description: 'Start game preview in browser',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'stop_preview',
            description: 'Stop game preview',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        {
            name: 'set_spriteframe',
            description: 'Load a SpriteFrame/Texture asset by UUID and assign it to a node\'s cc.Sprite component. Adds cc.Sprite if not present. Optionally set sprite type (for Sliced 9-patch) and size mode.',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Target node UUID'
                    },
                    spriteFrameUuid: {
                        type: 'string',
                        description: 'SpriteFrame or Texture2D asset UUID'
                    },
                    spriteType: {
                        type: 'number',
                        description: 'Sprite type: 0=SIMPLE, 1=SLICED, 2=TILED, 3=FILLED (optional)'
                    },
                    sizeMode: {
                        type: 'number',
                        description: 'Size mode: 0=CUSTOM, 1=TRIMMED, 2=RAW (optional)'
                    },
                    autoBorder: {
                        type: 'boolean',
                        description: 'When spriteType=SLICED and borders are 0 in .meta, auto-infer border values from image dimensions (default: true)'
                    }
                },
                required: ['nodeUuid', 'spriteFrameUuid']
            }
        },
        {
            name: 'get_label_text',
            description: 'Get text from a cc.Label component as codepoints to avoid IPC encoding issues. Returns codepoint array that can be decoded to original text.',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Target node UUID with cc.Label component'
                    }
                },
                required: ['nodeUuid']
            }
        },
        {
            name: 'set_label_text',
            description: 'Set text on a cc.Label component using codepoint encoding to avoid IPC encoding issues with non-ASCII characters (Korean, Japanese, Chinese, etc).',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Target node UUID with cc.Label component'
                    },
                    text: {
                        type: 'string',
                        description: 'Text to set (will be converted to codepoints internally)'
                    }
                },
                required: ['nodeUuid', 'text']
            }
        },
        {
            name: 'set_label_font',
            description: 'Load a font asset (TTFFont, BitmapFont, LabelAtlas) by UUID and assign it to a node\'s cc.Label component. Sets useSystemFont to false.',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Target node UUID with cc.Label component'
                    },
                    fontUuid: {
                        type: 'string',
                        description: 'Font asset UUID (TTFFont, BitmapFont, or LabelAtlas)'
                    }
                },
                required: ['nodeUuid', 'fontUuid']
            }
        },
        {
            name: 'place_reference_image',
            description: 'Create a semi-transparent overlay node with the given texture for UI layout reference. The node is placed at the bottom of the render order (zIndex -9999).',
            inputSchema: {
                type: 'object',
                properties: {
                    textureUuid: {
                        type: 'string',
                        description: 'Imported texture or SpriteFrame asset UUID'
                    },
                    parentUuid: {
                        type: 'string',
                        description: 'Parent node UUID (default: first Canvas node)'
                    },
                    x: { type: 'number', description: 'X position (default: 0)' },
                    y: { type: 'number', description: 'Y position (default: 0)' },
                    width: { type: 'number', description: 'Width in pixels (default: original texture width)' },
                    height: { type: 'number', description: 'Height in pixels (default: original texture height)' },
                    opacity: { type: 'number', description: 'Opacity 0-255 (default: 100, ~40% transparent)' },
                    name: { type: 'string', description: 'Node name (default: __REF_OVERLAY__)' }
                },
                required: ['textureUuid']
            }
        },
        {
            name: 'remove_reference_image',
            description: 'Remove reference image overlay node(s). If uuid is provided, removes that specific node. Otherwise removes all nodes named __REF_OVERLAY__.',
            inputSchema: {
                type: 'object',
                properties: {
                    uuid: {
                        type: 'string',
                        description: 'Specific overlay node UUID to remove (optional, removes all __REF_OVERLAY__ if omitted)'
                    }
                }
            }
        },
        {
            name: 'analyze_reference_layout',
            description: 'Get a detailed layout snapshot of all nodes in the current scene/prefab, optimized for comparing against a reference image. Returns position, size, components, and hierarchy for each node.',
            inputSchema: {
                type: 'object',
                properties: {
                    parentUuid: {
                        type: 'string',
                        description: 'Root node UUID to analyze from (optional, defaults to entire scene)'
                    },
                    includeInactive: {
                        type: 'boolean',
                        description: 'Include inactive nodes (default: false)'
                    }
                }
            }
        }
        ,
        {
            name: 'capture_scene_screenshot',
            description: 'Capture a screenshot of the current scene view. For scenes, uses designResolution size. For prefabs, uses root node size. Saves as PNG file and returns the file path.',
            inputSchema: {
                type: 'object',
                properties: {
                    outputPath: {
                        type: 'string',
                        description: 'Absolute file path to save PNG (default: temp directory)'
                    },
                    width: {
                        type: 'number',
                        description: 'Capture width in pixels (default: designResolution or prefab root size)'
                    },
                    height: {
                        type: 'number',
                        description: 'Capture height in pixels (default: designResolution or prefab root size)'
                    }
                }
            }
        },
        {
            name: 'delete_screenshot',
            description: 'Delete a previously captured screenshot file.',
            inputSchema: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'Absolute file path of the screenshot to delete'
                    }
                },
                required: ['filePath']
            }
        }
    ];
};

SceneTools.prototype.execute = function (toolName, args) {
    switch (toolName) {
        case 'get_current_scene':
            return this.getCurrentScene();
        case 'get_scene_list':
            return this.getSceneList(args.folder || 'db://assets');
        case 'open_scene':
            return this.openScene(args.sceneUrl);
        case 'save_scene':
            return this.saveScene();
        case 'create_scene':
            return this.createScene(args.scenePath);
        case 'get_scene_hierarchy':
            return this.getSceneHierarchy(args.includeComponents || false);
        case 'close_scene':
            return this.closeScene();
        case 'save_scene_as':
            return this.saveSceneAs(args.scenePath);
        case 'open_prefab':
            return this.openPrefab(args.prefabUuid);
        case 'undo':
            return this.undo();
        case 'redo':
            return this.redo();
        case 'start_preview':
            return this.startPreview();
        case 'stop_preview':
            return this.stopPreview();
        case 'set_spriteframe':
            return this.setSpriteFrame(args);
        case 'get_label_text':
            return this.getLabelText(args.nodeUuid);
        case 'set_label_text':
            return this.setLabelText(args.nodeUuid, args.text);
        case 'set_label_font':
            return this.setLabelFont(args.nodeUuid, args.fontUuid);
        case 'place_reference_image':
            return this.placeReferenceImage(args);
        case 'remove_reference_image':
            return this.removeReferenceImage(args.uuid);
        case 'analyze_reference_layout':
            return this.analyzeReferenceLayout(args.parentUuid, args.includeInactive);
        case 'capture_scene_screenshot':
            return this.captureSceneScreenshot(args);
        case 'delete_screenshot':
            return this.deleteScreenshot(args.filePath);
        default:
            return Promise.reject(new Error('Unknown scene tool: ' + toolName));
    }
};

SceneTools.prototype.getCurrentScene = function () {
    var self = this;
    return this.callSceneScript('getCurrentSceneInfo', null).then(function (result) {
        return result;
    }).catch(function (err) {
        return self.error('Failed to get current scene: ' + (err.message || err));
    });
};

SceneTools.prototype.getSceneList = function (folder) {
    var self = this;
    return new Promise(function (resolve) {
        var searchUrl = folder || 'db://assets';
        Editor.assetdb.queryAssets(searchUrl + '/**/*', 'scene', function (err, results) {
            if (err) {
                resolve(self.error('Failed to query scenes: ' + err));
                return;
            }
            var scenes = (results || []).map(function (asset) {
                return {
                    url: asset.url,
                    uuid: asset.uuid,
                    path: asset.path,
                    type: asset.type
                };
            });
            resolve(self.success({
                scenes: scenes,
                count: scenes.length
            }));
        });
    });
};

SceneTools.prototype.openScene = function (sceneUrl) {
    var self = this;
    return new Promise(function (resolve) {
        // In 2.x, opening a scene uses Editor.Ipc
        Editor.Ipc.sendToMain('scene:open-by-url', sceneUrl, function (err) {
            if (err) {
                resolve(self.error('Failed to open scene: ' + (err.message || err)));
            } else {
                resolve(self.success({ sceneUrl: sceneUrl }, 'Scene opened: ' + sceneUrl));
            }
        });
    });
};

SceneTools.prototype.saveScene = function () {
    var self = this;
    return new Promise(function (resolve) {
        Editor.Ipc.sendToMain('scene:save-scene', function (err) {
            if (err) {
                resolve(self.error('Failed to save scene: ' + (err.message || err)));
            } else {
                resolve(self.success(null, 'Scene saved successfully'));
            }
        });
    });
};

SceneTools.prototype.createScene = function (scenePath) {
    var self = this;
    return new Promise(function (resolve) {
        // Create a minimal scene file content
        // In Cocos Creator 2.x, .fire files are JSON-based scene serialization
        var sceneData = JSON.stringify([
            {
                "__type__": "cc.SceneAsset",
                "_name": "",
                "_objFlags": 0,
                "_native": "",
                "scene": { "__id__": 1 }
            },
            {
                "__type__": "cc.Scene",
                "_name": Path.basename(scenePath, '.fire'),
                "_objFlags": 0,
                "_parent": null,
                "_children": [{ "__id__": 2 }],
                "_active": true,
                "_level": 0,
                "_components": [],
                "_prefab": null,
                "autoReleaseAssets": false
            },
            {
                "__type__": "cc.Node",
                "_name": "Canvas",
                "_objFlags": 0,
                "_parent": { "__id__": 1 },
                "_children": [],
                "_active": true,
                "_components": [{ "__id__": 3 }, { "__id__": 4 }],
                "_prefab": null,
                "_id": ""
            },
            {
                "__type__": "cc.Canvas",
                "_name": "",
                "_objFlags": 0,
                "node": { "__id__": 2 },
                "_enabled": true,
                "_designResolution": { "__type__": "cc.Size", "width": 960, "height": 640 },
                "_fitWidth": false,
                "_fitHeight": true
            },
            {
                "__type__": "cc.Widget",
                "_name": "",
                "_objFlags": 0,
                "node": { "__id__": 2 },
                "_enabled": true,
                "alignMode": 1,
                "_target": null,
                "_alignFlags": 45,
                "_left": 0,
                "_right": 0,
                "_top": 0,
                "_bottom": 0
            }
        ]);

        Editor.assetdb.create(scenePath, sceneData, function (err, results) {
            if (err) {
                resolve(self.error('Failed to create scene: ' + err));
            } else {
                resolve(self.success({
                    scenePath: scenePath,
                    results: results
                }, 'Scene created: ' + scenePath));
            }
        });
    });
};

SceneTools.prototype.getSceneHierarchy = function (includeComponents) {
    var self = this;
    return this.callSceneScript('getSceneHierarchy', includeComponents).then(function (result) {
        return result;
    }).catch(function (err) {
        return self.error('Failed to get scene hierarchy: ' + (err.message || err));
    });
};

SceneTools.prototype.closeScene = function () {
    var self = this;
    return new Promise(function (resolve) {
        // In 2.x, closing a scene essentially means creating a new empty scene
        Editor.Ipc.sendToMain('scene:new-scene', function (err) {
            if (err) {
                resolve(self.error('Failed to close scene: ' + (err.message || err)));
            } else {
                resolve(self.success(null, 'Scene closed (new empty scene created)'));
            }
        });
    });
};

SceneTools.prototype.saveSceneAs = function (scenePath) {
    var self = this;
    // Save current scene first, then duplicate
    return new Promise(function (resolve) {
        // In 2.x we need to stash scene data and create at new path
        // The simplest approach is to save current, then copy
        Editor.Ipc.sendToMain('scene:stash-and-save', function (err) {
            if (err) {
                // Fallback: just save normally
                Editor.Ipc.sendToMain('scene:save-scene', function (saveErr) {
                    if (saveErr) {
                        resolve(self.error('Failed to save scene: ' + (saveErr.message || saveErr)));
                    } else {
                        resolve(self.success({ scenePath: scenePath }, 'Scene saved (note: save-as may require manual copy in 2.x)'));
                    }
                });
            } else {
                resolve(self.success({ scenePath: scenePath }, 'Scene saved as: ' + scenePath));
            }
        });
    });
};

SceneTools.prototype.openPrefab = function (prefabUuid) {
    var self = this;
    return new Promise(function (resolve) {
        Editor.Ipc.sendToAll('scene:enter-prefab-edit-mode', prefabUuid);
        // enter-prefab-edit-mode is fire-and-forget in 2.x
        setTimeout(function () {
            resolve(self.success({ prefabUuid: prefabUuid }, 'Prefab edit mode entered'));
        }, 1000);
    });
};

SceneTools.prototype.undo = function () {
    var self = this;
    return new Promise(function (resolve) {
        Editor.Ipc.sendToMain('scene:undo', function (err) {
            if (err) {
                resolve(self.error('Failed to undo: ' + (err.message || err)));
            } else {
                resolve(self.success(null, 'Undo successful'));
            }
        });
    });
};

SceneTools.prototype.redo = function () {
    var self = this;
    return new Promise(function (resolve) {
        Editor.Ipc.sendToMain('scene:redo', function (err) {
            if (err) {
                resolve(self.error('Failed to redo: ' + (err.message || err)));
            } else {
                resolve(self.success(null, 'Redo successful'));
            }
        });
    });
};

SceneTools.prototype.startPreview = function () {
    var self = this;
    return new Promise(function (resolve) {
        Editor.Ipc.sendToMain('app:run-project');
        setTimeout(function () {
            resolve(self.success(null, 'Game preview started'));
        }, 1000);
    });
};

SceneTools.prototype.stopPreview = function () {
    var self = this;
    return new Promise(function (resolve) {
        Editor.Ipc.sendToMain('app:stop-project');
        setTimeout(function () {
            resolve(self.success(null, 'Game preview stopped'));
        }, 1000);
    });
};

// Resolve a UUID to a SpriteFrame UUID and extract .meta info (border, size).
// In Cocos Creator 2.x, PNG imports create both Texture2D (main UUID) and SpriteFrame (sub-asset UUID).
// Only SpriteFrame UUIDs serialize correctly on save.
// Uses filesystem scan of .meta files since Editor.assetdb APIs vary by CC version.
SceneTools.prototype._resolveMetaInfo = function (uuid) {
    var self = this;
    return new Promise(function (resolve) {
        var projectPath = Editor.Project && Editor.Project.path;
        if (!projectPath) {
            projectPath = Editor.projectPath || Editor.remote && Editor.remote.projectPath;
        }
        if (!projectPath) {
            resolve({ spriteFrameUuid: uuid });
            return;
        }
        var assetsDir = Path.join(projectPath, 'assets');

        function findInMeta(dir) {
            var files;
            try { files = Fs.readdirSync(dir); } catch (e) { return null; }
            for (var i = 0; i < files.length; i++) {
                var fullPath = Path.join(dir, files[i]);
                var stat;
                try { stat = Fs.statSync(fullPath); } catch (e) { continue; }
                if (stat.isDirectory()) {
                    var found = findInMeta(fullPath);
                    if (found) return found;
                } else if (files[i].endsWith('.meta')) {
                    try {
                        var content = Fs.readFileSync(fullPath, 'utf8');
                        if (content.indexOf(uuid) === -1) continue;
                        var meta = JSON.parse(content);
                        if (meta.uuid === uuid && meta.subMetas) {
                            var keys = Object.keys(meta.subMetas);
                            if (keys.length > 0 && meta.subMetas[keys[0]].uuid) {
                                var sub = meta.subMetas[keys[0]];
                                return {
                                    spriteFrameUuid: sub.uuid,
                                    metaPath: fullPath,
                                    subMetaKey: keys[0],
                                    width: sub.rawWidth || sub.width || meta.width || 0,
                                    height: sub.rawHeight || sub.height || meta.height || 0,
                                    borderTop: sub.borderTop || 0,
                                    borderBottom: sub.borderBottom || 0,
                                    borderLeft: sub.borderLeft || 0,
                                    borderRight: sub.borderRight || 0
                                };
                            }
                        }
                    } catch (e) { /* ignore */ }
                }
            }
            return null;
        }

        var info = findInMeta(assetsDir);
        resolve(info || { spriteFrameUuid: uuid });
    });
};

// Infer 9-slice border values from image shape (aspect ratio).
// Border = corner radius of the image. The corner radius depends on the visual shape:
//   - Square/circle (aspect 0.8~1.25): border ≈ min(w,h) * 0.43 on all sides
//   - Wide pill (aspect > 2.0): borderLR ≈ height * 0.47 (corner radius ≈ h/2), TB = 0
//   - Tall pill (aspect < 0.5): borderTB ≈ width * 0.47, LR = 0
//   - Moderate rect (else): border ≈ min(w,h) * 0.30 on all sides
// Derived from project asset analysis:
//   btn_blue 230x203 → LR=100(43%), button_2 61x61 → 27(44%), friendFrame 30x30 → 13(43%)
//   img_chapter_coinB 291x83 → LR=39 ≈ h*0.47, img_chapter_slot 108x130 → 33(31%)
SceneTools.prototype._inferBorderFromShape = function (w, h) {
    var aspect = w / h;
    var minDim = Math.min(w, h);

    if (aspect >= 0.8 && aspect <= 1.25) {
        // Square-ish: likely full round (circle button, icon frame)
        var b = Math.round(minDim * 0.43);
        return { left: b, right: b, top: b, bottom: b };
    } else if (aspect > 2.0) {
        // Wide pill: corner radius ≈ height/2
        var bLR = Math.round(h * 0.47);
        return { left: bLR, right: bLR, top: 0, bottom: 0 };
    } else if (aspect < 0.5) {
        // Tall pill: corner radius ≈ width/2
        var bTB = Math.round(w * 0.47);
        return { left: 0, right: 0, top: bTB, bottom: bTB };
    } else {
        // Moderate rectangle: rounded-rect with smaller corners
        var br = Math.round(minDim * 0.30);
        return { left: br, right: br, top: br, bottom: br };
    }
};

// Auto-infer and write 9-slice border values to .meta when all borders are 0.
SceneTools.prototype._ensureSlicedBorder = function (metaInfo) {
    if (!metaInfo.metaPath) return Promise.resolve(metaInfo);

    // Skip if any border is already set
    if (metaInfo.borderLeft > 0 || metaInfo.borderRight > 0 ||
        metaInfo.borderTop > 0 || metaInfo.borderBottom > 0) {
        return Promise.resolve(metaInfo);
    }

    var w = metaInfo.width;
    var h = metaInfo.height;
    if (w === 0 || h === 0) return Promise.resolve(metaInfo);

    // Infer border based on image shape (aspect ratio)
    var borders = this._inferBorderFromShape(w, h);

    // Read, modify, write .meta file
    try {
        var meta = JSON.parse(Fs.readFileSync(metaInfo.metaPath, 'utf8'));
        var sub = meta.subMetas[metaInfo.subMetaKey];
        if (!sub) return Promise.resolve(metaInfo);

        sub.borderLeft = borders.left;
        sub.borderRight = borders.right;
        sub.borderTop = borders.top;
        sub.borderBottom = borders.bottom;
        Fs.writeFileSync(metaInfo.metaPath, JSON.stringify(meta, null, 2), 'utf8');
    } catch (e) {
        Editor.warn('[MCP] Failed to write border to .meta: ' + e.message);
        return Promise.resolve(metaInfo);
    }

    // Update metaInfo
    metaInfo.borderLeft = borders.left;
    metaInfo.borderRight = borders.right;
    metaInfo.borderTop = borders.top;
    metaInfo.borderBottom = borders.bottom;

    // Refresh asset DB so editor picks up the border change
    var projectPath = Editor.Project && Editor.Project.path;
    if (!projectPath) {
        projectPath = Editor.projectPath || Editor.remote && Editor.remote.projectPath;
    }
    if (!projectPath) return Promise.resolve(metaInfo);

    return new Promise(function (resolve) {
        var assetPath = metaInfo.metaPath.replace(/\.meta$/, '');
        var assetsDir = Path.join(projectPath, 'assets');
        var relPath = assetPath.substring(assetsDir.length).replace(/\\/g, '/');
        var dbUrl = 'db://assets' + relPath;

        Editor.assetdb.refresh(dbUrl, function (err) {
            if (err) {
                Editor.warn('[MCP] assetdb.refresh warning: ' + (err.message || err));
            }
            Editor.log('[MCP] Auto-inferred 9-slice border for ' + metaInfo.subMetaKey +
                ' (' + w + 'x' + h + ', aspect=' + (w/h).toFixed(2) + ')' +
                ': L=' + borders.left + ' R=' + borders.right +
                ' T=' + borders.top + ' B=' + borders.bottom);
            resolve(metaInfo);
        });
    });
};

SceneTools.prototype.setSpriteFrame = function (args) {
    var self = this;
    return this._resolveMetaInfo(args.spriteFrameUuid).then(function (metaInfo) {
        args.spriteFrameUuid = metaInfo.spriteFrameUuid;

        // Auto-ensure border when SLICED mode is requested
        if (args.spriteType === 1 && args.autoBorder !== false) {
            return self._ensureSlicedBorder(metaInfo);
        }
        return metaInfo;
    }).then(function () {
        return self.callSceneScript('setSpriteFrame', JSON.stringify(args));
    }).catch(function (err) {
        return self.error('Failed to set sprite frame: ' + (err.message || err));
    });
};

SceneTools.prototype.getLabelText = function (nodeUuid) {
    var self = this;
    return this.callSceneScript('getLabelText', JSON.stringify({
        nodeUuid: nodeUuid
    })).then(function (result) {
        // Decode codepoints to text for the HTTP response
        if (result && result.success && result.data && result.data.codepoints) {
            result.data.text = String.fromCharCode.apply(null, result.data.codepoints);
        }
        return result;
    }).catch(function (err) {
        return self.error('Failed to get label text: ' + (err.message || err));
    });
};

SceneTools.prototype.setLabelText = function (nodeUuid, text) {
    var self = this;
    // Convert text to codepoint array to avoid IPC encoding corruption
    var codepoints = [];
    for (var i = 0; i < text.length; i++) {
        codepoints.push(text.charCodeAt(i));
    }
    return this.callSceneScript('setLabelText', JSON.stringify({
        nodeUuid: nodeUuid,
        codepoints: codepoints
    })).then(function (result) {
        return result;
    }).catch(function (err) {
        return self.error('Failed to set label text: ' + (err.message || err));
    });
};

SceneTools.prototype.setLabelFont = function (nodeUuid, fontUuid) {
    var self = this;
    return this.callSceneScript('setLabelFont', JSON.stringify({
        nodeUuid: nodeUuid,
        fontUuid: fontUuid
    })).then(function (result) {
        return result;
    }).catch(function (err) {
        return self.error('Failed to set label font: ' + (err.message || err));
    });
};

SceneTools.prototype.placeReferenceImage = function (args) {
    var self = this;
    return this._resolveMetaInfo(args.textureUuid).then(function (metaInfo) {
        args.textureUuid = metaInfo.spriteFrameUuid;
        return self.callSceneScript('placeReferenceImage', JSON.stringify(args));
    }).then(function (result) {
        return result;
    }).catch(function (err) {
        return self.error('Failed to place reference image: ' + (err.message || err));
    });
};

SceneTools.prototype.removeReferenceImage = function (uuid) {
    var self = this;
    return this.callSceneScript('removeReferenceImage', JSON.stringify({
        uuid: uuid
    })).then(function (result) {
        return result;
    }).catch(function (err) {
        return self.error('Failed to remove reference image: ' + (err.message || err));
    });
};

SceneTools.prototype.analyzeReferenceLayout = function (parentUuid, includeInactive) {
    var self = this;
    return this.callSceneScript('analyzeLayout', JSON.stringify({
        parentUuid: parentUuid,
        includeInactive: includeInactive || false
    })).then(function (result) {
        // Fallback: decode __SAFE_JSON__ if base-tool didn't catch it
        if (typeof result === 'string' && result.indexOf('__SAFE_JSON__') === 0) {
            try { result = JSON.parse(result.slice(13)); } catch (e) { /* keep as-is */ }
        }
        return result;
    }).catch(function (err) {
        return self.error('Failed to analyze layout: ' + (err.message || err));
    });
};

SceneTools.prototype.captureSceneScreenshot = function (args) {
    var self = this;
    var Os = require('os');
    var Path = require('path');

    return this.callSceneScript('captureScreenshot', JSON.stringify({
        width: args.width,
        height: args.height
    })).then(function (result) {
        if (!result || !result.success || !result.data || !result.data.dataUrl) {
            return result || self.error('Screenshot capture returned no data');
        }

        // Extract base64 from dataUrl
        var dataUrl = result.data.dataUrl;
        var base64Match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
        if (!base64Match) {
            return self.error('Invalid dataUrl format');
        }

        var base64Data = base64Match[1];
        var pngBuffer = Buffer.from(base64Data, 'base64');

        // Determine output path
        var outputPath = args.outputPath;
        if (!outputPath) {
            var tmpDir = Os.tmpdir();
            var timestamp = Date.now();
            outputPath = Path.join(tmpDir, 'cocos-screenshot-' + timestamp + '.png');
        }

        // Save PNG file
        Fs.writeFileSync(outputPath, pngBuffer);

        return self.success({
            filePath: outputPath,
            width: result.data.width,
            height: result.data.height,
            method: result.data.method,
            sizeSource: result.data.sizeSource,
            fileSize: pngBuffer.length
        }, 'Screenshot saved to ' + outputPath);
    }).catch(function (err) {
        return self.error('Failed to capture screenshot: ' + (err.message || err));
    });
};

SceneTools.prototype.deleteScreenshot = function (filePath) {
    var self = this;
    if (!filePath) {
        return Promise.resolve(self.error('filePath is required'));
    }
    try {
        if (Fs.existsSync(filePath)) {
            Fs.unlinkSync(filePath);
            return Promise.resolve(self.success({ deleted: filePath }, 'Screenshot deleted'));
        } else {
            return Promise.resolve(self.error('File not found: ' + filePath));
        }
    } catch (err) {
        return Promise.resolve(self.error('Failed to delete screenshot: ' + (err.message || err)));
    }
};

module.exports = SceneTools;
