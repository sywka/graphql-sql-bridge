"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const generatorics_1 = __importDefault(require("generatorics"));
var Type;
(function (Type) {
    Type[Type["TABLE"] = 0] = "TABLE";
    Type[Type["COLUMN"] = 1] = "COLUMN";
})(Type = exports.Type || (exports.Type = {}));
class AliasNamespace {
    constructor(minify) {
        this._usedTableAliases = new Set();
        this._columnAssignments = {};
        this._minify = minify;
        this._mininym = generatorics_1.default.baseNAll("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$");
    }
    generate(type, name) {
        if (this._minify) {
            if (type === Type.TABLE) {
                return this._mininym.next().value.join("");
            }
            if (!this._columnAssignments[name]) {
                this._columnAssignments[name] = this._mininym.next().value.join("");
            }
            return this._columnAssignments[name];
        }
        if (type === Type.COLUMN) {
            return name;
        }
        name = name
            .replace(/\s+/g, "")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .slice(0, 10);
        while (this._usedTableAliases.has(name)) {
            name += "$";
        }
        this._usedTableAliases.add(name);
        return name;
    }
}
exports.default = AliasNamespace;
//# sourceMappingURL=AliasNamespace.js.map