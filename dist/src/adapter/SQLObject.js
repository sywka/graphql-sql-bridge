"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const SchemaObject_1 = __importDefault(require("../objects/SchemaObject"));
const Schema_1 = require("../Schema");
class SQLObject extends SchemaObject_1.default {
    static _joinConditions(array, separator) {
        if (!array.length)
            return "";
        if (array.length > 1)
            return `(${array.join(separator)})`;
        return array.join(separator);
    }
    findPrimaryKeys() {
        return this.keys.filter(key => key.primary);
    }
    makeQuery(fields, args, alias) {
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
    makeFields(fields, alias) {
        const selectFields = fields
            .filter(field => !field.query)
            .map(field => `  ${field.key.makeField(alias, field.alias, this._quote)}`);
        const joinedSelectFields = fields
            .filter(field => field.query)
            .reduce((keys, { query }) => keys.concat(query.object.makeFields(query.fields, query.alias)), []);
        return selectFields.concat(joinedSelectFields);
    }
    makeFrom(fields, alias) {
        return `${this.originalName} ${this._quote(alias)}`;
    }
    makeJoin(fields, alias) {
        const joins = fields
            .filter(field => field.query)
            .map(({ query, key }) => {
            const keyRef = query.object._findKeyRef(key);
            return `LEFT JOIN ${query.object.originalName} AS ${this._quote(query.alias)} ` +
                `ON ${this._quote(query.alias)}.${this._quote(keyRef.originalName)} ` +
                `= ${this._quote(alias)}.${this._quote(key.originalName)}`;
        });
        const nestedJoins = fields.filter(field => field.query)
            .reduce((joins, { query }) => joins.concat(query.object.makeJoin(query.fields, query.alias)), []);
        return joins.concat(nestedJoins);
    }
    makeWhere(fields, args, alias) {
        let where = this._createSQLWhere(alias, args.where);
        const nestedWhere = fields
            .filter(field => field.query)
            .map(({ query }) => query.object.makeWhere(query.fields, query.args, query.alias))
            .join(" AND ");
        if (nestedWhere)
            where += ` AND ${nestedWhere}`;
        return where;
    }
    makeOrder(fields, args, alias) {
        if (!args.order)
            return "";
        const order = args.order.map(item => (Object.keys(item).map(i => {
            const key = this.keys.find(key => key.name === item[i]);
            const sortType = Object.keys(Schema_1.SortType).find(type => Schema_1.SortType[type] === i);
            return `${this._quote(alias)}.${this._quote(key.originalName)} ${sortType}`;
        })));
        const nestedOrder = fields
            .filter(field => field.query)
            .map(({ query }) => query.object.makeOrder(query.fields, query.args, query.alias))
            .filter(order => order);
        return order.concat(nestedOrder).join(", ");
    }
    _createSQLWhere(alias, where) {
        if (!where)
            return "";
        let groupsConditions = Object.keys(where).reduce((groupsConditions, filterName) => {
            switch (filterName) {
                case Schema_1.IntegratedFilterTypes.NOT:
                case Schema_1.IntegratedFilterTypes.OR:
                case Schema_1.IntegratedFilterTypes.AND:
                case Schema_1.IntegratedFilterTypes.IS_NULL:
                    return groupsConditions;
            }
            const filter = where[filterName];
            let conditions = [];
            if (Array.isArray(filter)) {
                filter.forEach((item) => {
                    const condition = this._createSQLCondition(filterName, this.keys.find(key => key.name === item), alias);
                    if (condition)
                        conditions.push(condition);
                });
            }
            else if (typeof filter === "string") {
                const condition = this._createSQLCondition(filterName, this.keys.find(key => key.name === filter), alias);
                if (condition)
                    conditions.push(condition);
            }
            else if (typeof filter === "object") {
                conditions = Object.keys(filter).reduce((conditions, fieldName) => {
                    const value = filter[fieldName];
                    const condition = this._createSQLCondition(filterName, this.keys.find(key => key.name === fieldName), alias, value);
                    if (condition)
                        conditions.push(condition);
                    return conditions;
                }, conditions);
            }
            if (conditions.length)
                groupsConditions.push(SQLObject._joinConditions(conditions, " AND "));
            return groupsConditions;
        }, []);
        if (where[Schema_1.IntegratedFilterTypes.IS_NULL]) {
            groupsConditions.push(`${this._quote(alias)}.${this._quote(where[Schema_1.IntegratedFilterTypes.IS_NULL])} IS NULL`);
        }
        if (where[Schema_1.IntegratedFilterTypes.NOT]) {
            const not = where[Schema_1.IntegratedFilterTypes.NOT].reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(alias, item));
                return conditions;
            }, []);
            if (not.length)
                groupsConditions.push(`NOT ${SQLObject._joinConditions(not, " AND ")}`);
        }
        if (where[Schema_1.IntegratedFilterTypes.OR]) {
            const or = where[Schema_1.IntegratedFilterTypes.OR].reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(alias, item));
                return conditions;
            }, []);
            if (or.length)
                groupsConditions.push(SQLObject._joinConditions(or, " OR "));
        }
        if (where[Schema_1.IntegratedFilterTypes.AND]) {
            const and = where[Schema_1.IntegratedFilterTypes.AND].reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(alias, item));
                return conditions;
            }, []);
            if (and.length)
                groupsConditions.push(SQLObject._joinConditions(and, " AND "));
        }
        return SQLObject._joinConditions(groupsConditions, " AND ");
    }
    _findKeyRef(key) {
        if (key.keyRefID === undefined || key.keyRefID === null)
            return null;
        return this.keys.find((keyRef) => keyRef.id === key.keyRefID);
    }
}
exports.default = SQLObject;
//# sourceMappingURL=SQLObject.js.map