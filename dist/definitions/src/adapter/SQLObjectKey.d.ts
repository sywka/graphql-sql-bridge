import SchemaObjectKey from "../objects/SchemaObjectKey";
import { ID, SchemaFieldTypes } from "../Schema";
export default class SQLObjectKey extends SchemaObjectKey {
    constructor(id: ID, originalName: string, description: string, nonNull: boolean, type: SchemaFieldTypes, primary: boolean, objectRefID: ID, keyRefID: ID);
    private _primary;
    primary: boolean;
    private _keyRefID;
    keyRefID: ID;
    makeField(tableAlias: string, columnAlias: string, quoteFun: (str: string) => string): string;
}
