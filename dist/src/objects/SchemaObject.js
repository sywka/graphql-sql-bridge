"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SchemaObject {
    constructor(id, originalName, description, keys) {
        this._id = id;
        this._originalName = originalName;
        this._description = description;
        this._keys = keys;
    }
    get id() {
        return this._id;
    }
    set id(value) {
        this._id = value;
    }
    get originalName() {
        return this._originalName;
    }
    set originalName(value) {
        this._originalName = value;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value;
    }
    get description() {
        return this._description;
    }
    set description(value) {
        this._description = value;
    }
    get keys() {
        return this._keys;
    }
    set keys(value) {
        this._keys = value;
    }
}
exports.default = SchemaObject;
//# sourceMappingURL=SchemaObject.js.map