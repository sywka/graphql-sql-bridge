import SQLObject from "../SQLObject";
import SQLObjectKey from "../SQLObjectKey";
import { FilterTypes } from "../../Schema";
export default class FBObject<Key extends SQLObjectKey> extends SQLObject<Key> {
    _quote(str: string): string;
    protected _createSQLCondition(filterType: FilterTypes, key: Key, alias: string, value?: any): string;
}
