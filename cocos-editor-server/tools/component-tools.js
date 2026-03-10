'use strict';

var BaseTool = require('./base-tool');

function ComponentTools() {
    BaseTool.call(this);
}

ComponentTools.prototype = Object.create(BaseTool.prototype);
ComponentTools.prototype.constructor = ComponentTools;

ComponentTools.prototype.getTools = function () {
    return [
        {
            name: 'add_component',
            description: 'Add a component to a node. Common 2.x types: cc.Sprite, cc.Label, cc.Button, cc.Widget, cc.Layout, cc.ScrollView, cc.EditBox, cc.RichText, cc.Mask, cc.Animation, cc.AudioSource, cc.ParticleSystem, cc.TiledMap, cc.VideoPlayer, cc.WebView, cc.BlockInputEvents, cc.MotionStreak',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Target node UUID'
                    },
                    componentType: {
                        type: 'string',
                        description: 'Component type name (e.g. cc.Sprite, cc.Label, cc.Button)'
                    }
                },
                required: ['nodeUuid', 'componentType']
            }
        },
        {
            name: 'remove_component',
            description: 'Remove a component from a node by type',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Node UUID'
                    },
                    componentType: {
                        type: 'string',
                        description: 'Component type to remove (e.g. cc.Sprite)'
                    }
                },
                required: ['nodeUuid', 'componentType']
            }
        },
        {
            name: 'get_components',
            description: 'Get list of all components on a node with their types and enabled status',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Node UUID'
                    }
                },
                required: ['nodeUuid']
            }
        },
        {
            name: 'get_component_info',
            description: 'Get detailed information about a specific component on a node, including all serializable properties',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Node UUID'
                    },
                    componentType: {
                        type: 'string',
                        description: 'Component type (e.g. cc.Sprite, cc.Label)'
                    }
                },
                required: ['nodeUuid', 'componentType']
            }
        },
        {
            name: 'set_component_property',
            description: 'Set a property on a component. Examples: set string on cc.Label, set type on cc.Sprite, set fontSize on cc.Label, set enabled on any component. For cc.Label: string, fontSize, fontFamily, lineHeight, horizontalAlign, verticalAlign, overflow. For cc.Sprite: type, sizeMode, fillType, fillCenter, fillStart, fillRange, trim. For cc.Button: interactable, transition, normalColor, pressedColor, hoverColor, disabledColor.',
            inputSchema: {
                type: 'object',
                properties: {
                    nodeUuid: {
                        type: 'string',
                        description: 'Node UUID'
                    },
                    componentType: {
                        type: 'string',
                        description: 'Component type (e.g. cc.Sprite, cc.Label)'
                    },
                    property: {
                        type: 'string',
                        description: 'Property name to set'
                    },
                    value: {
                        description: 'Property value'
                    }
                },
                required: ['nodeUuid', 'componentType', 'property', 'value']
            }
        }
    ];
};

ComponentTools.prototype.execute = function (toolName, args) {
    switch (toolName) {
        case 'add_component':
            return this.addComponent(args.nodeUuid, args.componentType);
        case 'remove_component':
            return this.removeComponent(args.nodeUuid, args.componentType);
        case 'get_components':
            return this.getComponents(args.nodeUuid);
        case 'get_component_info':
            return this.getComponentInfo(args.nodeUuid, args.componentType);
        case 'set_component_property':
            return this.setComponentProperty(args.nodeUuid, args.componentType, args.property, args.value);
        default:
            return Promise.reject(new Error('Unknown component tool: ' + toolName));
    }
};

ComponentTools.prototype.addComponent = function (nodeUuid, componentType) {
    var self = this;
    return this.callSceneScript('addComponent', JSON.stringify({ nodeUuid: nodeUuid, componentType: componentType }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to add component: ' + (err.message || err));
        });
};

ComponentTools.prototype.removeComponent = function (nodeUuid, componentType) {
    var self = this;
    return this.callSceneScript('removeComponent', JSON.stringify({ nodeUuid: nodeUuid, componentType: componentType }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to remove component: ' + (err.message || err));
        });
};

ComponentTools.prototype.getComponents = function (nodeUuid) {
    var self = this;
    return this.callSceneScript('getComponents', nodeUuid)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to get components: ' + (err.message || err));
        });
};

ComponentTools.prototype.getComponentInfo = function (nodeUuid, componentType) {
    var self = this;
    return this.callSceneScript('getComponentInfo', JSON.stringify({ nodeUuid: nodeUuid, componentType: componentType }))
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to get component info: ' + (err.message || err));
        });
};

ComponentTools.prototype.setComponentProperty = function (nodeUuid, componentType, property, value) {
    var self = this;
    var arg = JSON.stringify({
        nodeUuid: nodeUuid,
        componentType: componentType,
        property: property,
        value: value
    });
    return this.callSceneScript('setComponentProperty', arg)
        .then(function (result) { return result; })
        .catch(function (err) {
            return self.error('Failed to set component property: ' + (err.message || err));
        });
};

module.exports = ComponentTools;
