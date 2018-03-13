import G from "generatorics";

export enum Type {
    TABLE, COLUMN
}

export default class AliasNamespace {

    private readonly _minify: boolean;

    private _mininym: any;
    private _usedTableAliases = new Set();
    private _columnAssignments = {};

    constructor(minify?: boolean) {
        this._minify = minify;

        this._mininym = G.baseNAll("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#$");
    }

    public generate(type: Type, name: string) {
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