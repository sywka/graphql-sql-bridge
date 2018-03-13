import SchemaObject from "../objects/SchemaObject";
import { Args, FilterTypes } from "../Schema";
import { IQuery } from "./Analyzer";
import SQLObjectKey from "./SQLObjectKey";
import AliasNamespace from "./AliasNamespace";
export declare type Query = {
    sql: string;
    definitions: any;
};
export interface IQueryFieldAliases<Object extends SQLObject<SQLObjectKey>, Key extends SQLObjectKey> {
    key: Key;
    alias: string;
    selectionValue?: string;
    query?: IQueryAliases<Object, Key>;
}
export interface IQueryAliases<Object extends SQLObject<SQLObjectKey>, Key extends SQLObjectKey> {
    args: Args;
    object: Object;
    alias: string;
    fields: IQueryFieldAliases<Object, Key>[];
}
export default abstract class SQLObject<Key extends SQLObjectKey> extends SchemaObject<Key> {
    static createQuery<Key extends SQLObjectKey>(query: IQuery<SQLObject<Key>, Key>, namespace: AliasNamespace): Query;
    protected static _joinConditions(array: any[], separator: string): string;
    findPrimaryKeys(): Key[];
    makeDefinitions(query: IQueryAliases<SQLObject<Key>, Key>): any[];
    prepareQuery(query: IQuery<SQLObject<Key>, Key>, namespace: AliasNamespace): IQueryAliases<SQLObject<Key>, Key>;
    makeSQL(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], args: Args, alias: string): string;
    makeFields(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], alias: string): string[];
    makeFrom(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], alias: string): string;
    makeJoin(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], alias: string): string[];
    makeWhere(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], args: Args, alias: string): string;
    makeOrder(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], args: Args, alias: string): string;
    protected abstract _quote(str: string): string;
    protected abstract _createSQLCondition(filterType: FilterTypes, key: Key, alias: string, value?: any): any;
    protected _createDefinitions(query: IQueryAliases<SQLObject<Key>, Key>): any[];
    protected _createQueryAliases(query: IQuery<SQLObject<Key>, Key>, namespace: AliasNamespace): IQueryAliases<SQLObject<Key>, Key>;
    protected _createSQLWhere(alias: string, where: any): string;
    protected _findKeyRef(key: SQLObjectKey): SQLObjectKey | null;
}
