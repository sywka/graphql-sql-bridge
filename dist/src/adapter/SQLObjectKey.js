"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const SchemaObjectKey_1 = __importDefault(require("../objects/SchemaObjectKey"));
class SQLObjectKey extends SchemaObjectKey_1.default {
    constructor(id, originalName, description, nonNull, type, primary, objectRefID, keyRefID) {
        super(id, originalName, description, nonNull, type, objectRefID);
        this._primary = primary;
        this._keyRefID = keyRefID;
    }
    get primary() {
        return this._primary;
    }
    set primary(value) {
        this._primary = value;
    }
    get keyRefID() {
        return this._keyRefID;
    }
    set keyRefID(value) {
        this._keyRefID = value;
    }
    makeField(tableAlias, columnAlias, quoteFun) {
        return `${quoteFun(tableAlias)}.${quoteFun(this.originalName)} AS ${quoteFun(columnAlias)}`;
    }
}
exports.default = SQLObjectKey;
//# sourceMappingURL=SQLObjectKey.js.map