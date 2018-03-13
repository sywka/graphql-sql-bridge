import SchemaObject from "../objects/SchemaObject";
import {Args, FilterTypes, IntegratedFilterTypes, SortType} from "../Schema";
import {IQuery} from "./Analyzer";
import SQLObjectKey from "./SQLObjectKey";
import AliasNamespace, {Type} from "./AliasNamespace";

export type Query = { sql: string, definitions: any };

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

    public static createQuery<Key extends SQLObjectKey>(query: IQuery<SQLObject<Key>, Key>, namespace: AliasNamespace): Query {
        const queryAliases = query.object.prepareQuery(query, namespace);
        return {
            sql: queryAliases.object.makeSQL(queryAliases.fields, queryAliases.args, queryAliases.alias),
            definitions: queryAliases.object.makeDefinitions(queryAliases)
        };
    }

    protected static _joinConditions(array: any[], separator: string): string {
        if (!array.length) return "";
        if (array.length > 1) return `(${array.join(separator)})`;
        return array.join(separator);
    }

    public findPrimaryKeys(): Key[] {
        return this.keys.filter(key => key.primary);
    }

    public makeDefinitions(query: IQueryAliases<SQLObject<Key>, Key>): any[] {
        return this._createDefinitions(query);
    }

    public prepareQuery(query: IQuery<SQLObject<Key>, Key>, namespace: AliasNamespace): IQueryAliases<SQLObject<Key>, Key> {
        return this._createQueryAliases(query, namespace);
    }

    public makeSQL(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], args: Args, alias: string): string {
        let sql = "";

        sql += `SELECT\n${this.makeFields(fields, alias).join(",\n")}`;
        sql += `\nFROM ${this.makeFrom(fields, alias)}`;

        const join = this.makeJoin(fields, alias).join("\n");
        if (join) {
            sql += `\n${join}`;
        }

        const where = this.makeWhere(fields, args, alias);
        if (where) {
            sql += `\nWHERE ${where}`;
        }

        const order = this.makeOrder(fields, args, alias);
        if (order) {
            sql += `\nORDER BY ${order}`;
        }

        return sql;
    }

    public makeFields(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], alias: string): string[] {
        const selectFields = fields
            .filter(field => !field.query)
            .map(field => `  ${field.key.makeField(alias, field.alias, this._quote)}`);

        const joinedSelectFields = fields
            .filter(field => field.query)
            .reduce((keys, {query}) => keys.concat(query.object.makeFields(query.fields, query.alias)), []);

        return selectFields.concat(joinedSelectFields);
    }

    public makeFrom(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], alias: string): string {
        return `${this.originalName} ${this._quote(alias)}`;
    }

    public makeJoin(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], alias: string): string[] {
        const joins = fields
            .filter(field => field.query)
            .map(({query, key}) => {
                const keyRef = query.object._findKeyRef(key);
                return `LEFT JOIN ${query.object.makeFrom(query.fields, query.alias)} ` +
                    `ON ${this._quote(query.alias)}.${this._quote(keyRef.originalName)} ` +
                    `= ${this._quote(alias)}.${this._quote(key.originalName)}`;
            });

        const nestedJoins = fields.filter(field => field.query)
            .reduce((joins, {query}) => joins.concat(query.object.makeJoin(query.fields, query.alias)), []);

        return joins.concat(nestedJoins);
    }

    public makeWhere(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], args: Args, alias: string): string {
        let where = this._createSQLWhere(alias, args.where);

        const nestedWhere = fields
            .filter(field => field.query)
            .map(({query}) => query.object.makeWhere(query.fields, query.args, query.alias))
            .filter(where => where)
            .join(" AND ");

        if (where && nestedWhere) where += ` AND ${nestedWhere}`;
        else if (!where && nestedWhere) where += nestedWhere;
        
        return where;
    }

    public makeOrder(fields: IQueryFieldAliases<SQLObject<Key>, Key>[], args: Args, alias: string): string {
        if (!args.order) return "";

        const order = args.order.map(item => (
                Object.keys(item).map(i => {
                    const key = this.keys.find(key => key.name === item[i]);
                    const sortType = Object.keys(SortType).find(type => SortType[type] === i);

                    return `${this._quote(alias)}.${this._quote(key.originalName)} ${sortType}`;
                })
            )
        );

        const nestedOrder = fields
            .filter(field => field.query)
            .map(({query}) => query.object.makeOrder(query.fields, query.args, query.alias))
            .filter(order => order);

        return order.concat(nestedOrder).join(", ");
    }

    protected abstract _quote(str: string): string;

    protected abstract _createSQLCondition(filterType: FilterTypes, key: Key, alias: string, value?: any);

    protected _createDefinitions(query: IQueryAliases<SQLObject<Key>, Key>): any[] {
        return [].concat(query.fields.reduce((definitions, field) => {
            let definition;
            if (field.query) {
                definition = this._createDefinitions(field.query);
            } else {
                definition = {column: field.alias};
            }
            definitions[field.selectionValue ? field.selectionValue : field.key.name] = definition;
            return definitions;
        }, {}));
    }

    protected _createQueryAliases(query: IQuery<SQLObject<Key>, Key>, namespace: AliasNamespace): IQueryAliases<SQLObject<Key>, Key> {
        const queryAliases = <IQueryAliases<SQLObject<Key>, Key>>query;
        queryAliases.alias = namespace.generate(Type.TABLE, query.object.name);
        queryAliases.fields.forEach(field => {
            field.alias = namespace.generate(Type.COLUMN,
                field.selectionValue ? field.selectionValue : field.key.name);
            field.alias = queryAliases.alias + "_" + field.alias;
            if (field.query) this._createQueryAliases(field.query, namespace);
        });
        return queryAliases;
    }

    protected _createSQLWhere(alias: string, where): string {
        if (!where) return "";

        let groupsConditions =
            Object.keys(where).reduce((groupsConditions, filterName: FilterTypes | IntegratedFilterTypes) => {
                switch (filterName) {
                    case IntegratedFilterTypes.NOT:
                    case IntegratedFilterTypes.OR:
                    case IntegratedFilterTypes.AND:
                    case IntegratedFilterTypes.IS_NULL:
                        return groupsConditions;
                }

                const filter: any = where[filterName];
                let conditions = [];
                if (Array.isArray(filter)) {
                    filter.forEach((item) => {
                        const condition = this._createSQLCondition(
                            filterName,
                            this.keys.find(key => key.name === item),
                            alias
                        );
                        if (condition) conditions.push(condition);
                    });

                } else if (typeof filter === "string") {
                    const condition = this._createSQLCondition(
                        filterName,
                        this.keys.find(key => key.name === filter),
                        alias
                    );
                    if (condition) conditions.push(condition);

                } else if (typeof filter === "object") {
                    conditions = Object.keys(filter).reduce((conditions, fieldName) => {
                        const value: any = filter[fieldName];
                        const condition = this._createSQLCondition(
                            filterName,
                            this.keys.find(key => key.name === fieldName),
                            alias,
                            value
                        );
                        if (condition) conditions.push(condition);
                        return conditions;
                    }, conditions);
                }

                if (conditions.length) groupsConditions.push(SQLObject._joinConditions(conditions, " AND "));
                return groupsConditions;
            }, []);

        if (where[IntegratedFilterTypes.IS_NULL]) {
            groupsConditions.push(`${this._quote(alias)}.${this._quote(where[IntegratedFilterTypes.IS_NULL])} IS NULL`);
        }
        if (where[IntegratedFilterTypes.NOT]) {
            const not = where[IntegratedFilterTypes.NOT].reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(alias, item));
                return conditions;
            }, []);
            if (not.length) groupsConditions.push(`NOT ${SQLObject._joinConditions(not, " AND ")}`);
        }
        if (where[IntegratedFilterTypes.OR]) {
            const or = where[IntegratedFilterTypes.OR].reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(alias, item));
                return conditions;
            }, []);
            if (or.length) groupsConditions.push(SQLObject._joinConditions(or, " OR "));
        }
        if (where[IntegratedFilterTypes.AND]) {
            const and = where[IntegratedFilterTypes.AND].reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(alias, item));
                return conditions;
            }, []);
            if (and.length) groupsConditions.push(SQLObject._joinConditions(and, " AND "));
        }
        return SQLObject._joinConditions(groupsConditions, " AND ");
    }

    protected _findKeyRef(key: SQLObjectKey): SQLObjectKey | null {
        if (key.keyRefID === undefined || key.keyRefID === null) return null;
        return this.keys.find((keyRef) => keyRef.id === key.keyRefID);
    }
}