"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const SQLObject_1 = __importDefault(require("../SQLObject"));
const FBDatabase_1 = __importDefault(require("./FBDatabase"));
const Schema_1 = require("../../Schema");
class FBObject extends SQLObject_1.default {
    _quote(str) {
        return `${str}`;
    }
    _createSQLCondition(filterType, key, alias, value) {
        let tableField = `${this._quote(alias)}.${this._quote(key.originalName)}`;
        if (key.type === Schema_1.SchemaFieldTypes.DATE) {
            tableField = `CAST(${tableField} AS TIMESTAMP)`;
        }
        if (value) {
            value = FBDatabase_1.default.escape(value);
        }
        switch (filterType) {
            case Schema_1.FilterTypes.IS_EMPTY:
                return `${tableField} = ''`;
            case Schema_1.FilterTypes.EQUALS:
                return `${tableField} = ${value}`;
            case Schema_1.FilterTypes.CONTAINS:
                return `${tableField} CONTAINING ${value}`;
            case Schema_1.FilterTypes.BEGINS:
                return `${tableField} STARTING WITH ${value}`;
            case Schema_1.FilterTypes.ENDS:
                return `REVERSE(${tableField}) STARTING WITH ${value}`;
            case Schema_1.FilterTypes.GREATER:
                return `${tableField} > ${value}`;
            case Schema_1.FilterTypes.LESS:
                return `${tableField} < ${value}`;
            default:
                return "";
        }
    }
}
exports.default = FBObject;
//# sourceMappingURL=FBObject.js.map