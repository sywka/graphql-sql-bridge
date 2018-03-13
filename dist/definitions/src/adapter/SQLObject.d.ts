import SchemaObject from "../objects/SchemaObject";
import { Args, FilterTypes } from "../Schema";
import { IQueryField } from "./Analyzer";
import SQLObjectKey from "./SQLObjectKey";
export default abstract class SQLObject<T extends SQLObjectKey> extends SchemaObject<T> {
    protected static _joinConditions(array: any[], separator: string): string;
    findPrimaryKeys(): T[];
    makeQuery(fields: IQueryField<SQLObject<T>, T>[], args: Args, alias: string): string;
    protected abstract _quote(str: string): string;
    protected abstract _createSQLCondition(filterType: FilterTypes, key: T, alias: string, value?: any): any;
    protected makeFields(fields: IQueryField<SQLObject<T>, T>[], alias: string): string[];
    protected makeFrom(fields: IQueryField<SQLObject<T>, T>[], alias: string): string;
    protected makeJoin(fields: IQueryField<SQLObject<T>, T>[], alias: string): string[];
    protected makeWhere(fields: IQueryField<SQLObject<T>, T>[], args: Args, alias: string): string;
    protected makeOrder(fields: IQueryField<SQLObject<T>, T>[], args: Args, alias: string): string;
    protected _createSQLWhere(alias: string, where: any): string;
    protected _findKeyRef(key: SQLObjectKey): SQLObjectKey | null;
}
