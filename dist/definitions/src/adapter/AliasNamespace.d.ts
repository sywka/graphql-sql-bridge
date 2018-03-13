export declare enum Type {
    TABLE = 0,
    COLUMN = 1,
}
export default class AliasNamespace {
    private readonly _minify;
    private _mininym;
    private _usedTableAliases;
    private _columnAssignments;
    constructor(minify?: boolean);
    generate(type: Type, name: string): any;
}
