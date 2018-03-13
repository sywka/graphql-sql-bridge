"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SchemaObjectKey {
    constructor(id, originalName, description, nonNull, type, objectRefID) {
        this._id = id;
        this._originalName = originalName;
        this._description = description;
        this._nonNull = nonNull;
        this._type = type;
        this._objectRefID = objectRefID;
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
    get nonNull() {
        return this._nonNull;
    }
    set nonNull(value) {
        this._nonNull = value;
    }
    get type() {
        return this._type;
    }
    set type(value) {
        this._type = value;
    }
    get objectRefID() {
        return this._objectRefID;
    }
    set objectRefID(value) {
        this._objectRefID = value;
    }
}
exports.default = SchemaObjectKey;
//# sourceMappingURL=SchemaObjectKey.js.map