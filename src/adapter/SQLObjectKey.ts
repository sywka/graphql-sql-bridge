import SchemaObjectKey from "../objects/SchemaObjectKey";
import {ID, SchemaFieldTypes} from "../Schema";

export default class SQLObjectKey extends SchemaObjectKey {

    constructor(id: ID, originalName: string, description: string, nonNull: boolean, type: SchemaFieldTypes, primary: boolean, objectRefID: ID, keyRefID: ID) {
        super(id, originalName, description, nonNull, type, objectRefID);

        this._primary = primary;
        this._keyRefID = keyRefID;
    }

    private _primary: boolean;

    get primary(): boolean {
        return this._primary;
    }

    set primary(value: boolean) {
        this._primary = value;
    }

    private _keyRefID: ID;

    get keyRefID(): ID {
        return this._keyRefID;
    }

    set keyRefID(value: ID) {
        this._keyRefID = value;
    }

    public makeField(tableAlias: string, columnAlias: string, quoteFun: (str: string) => string): string {
        return `${quoteFun(tableAlias)}.${quoteFun(this.originalName)} AS ${quoteFun(columnAlias)}`;
    }
}