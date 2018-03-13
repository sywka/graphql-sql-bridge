import SQLObject from "../SQLObject";
import SQLObjectKey from "../SQLObjectKey";
import FBDatabase from "./FBDatabase";
import {FilterTypes, SchemaFieldTypes} from "../../Schema";

export default class FBObject<Key extends SQLObjectKey> extends SQLObject<Key> {

    public _quote(str: string): string {
        return `"${str}"`;
    }

    protected _createSQLCondition(filterType: FilterTypes, key: Key, alias: string, value?: any) {
        let tableField = `${this._quote(alias)}.${this._quote(key.originalName)}`;
        if (key.type === SchemaFieldTypes.DATE) {
            tableField = `CAST(${tableField} AS TIMESTAMP)`;
        }
        if (value) {
            value = FBDatabase.escape(value);
        }
        switch (filterType) {
            case FilterTypes.IS_EMPTY:
                return `${tableField} = ''`;
            case FilterTypes.EQUALS:
                return `${tableField} = ${value}`;

            case FilterTypes.CONTAINS:
                return `${tableField} CONTAINING ${value}`;
            case FilterTypes.BEGINS:
                return `${tableField} STARTING WITH ${value}`;
            case FilterTypes.ENDS:
                return `REVERSE(${tableField}) STARTING WITH ${value}`;

            case FilterTypes.GREATER:
                return `${tableField} > ${value}`;
            case FilterTypes.LESS:
                return `${tableField} < ${value}`;
            default:
                return "";
        }
    }
}