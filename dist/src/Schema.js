"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const graphql_date_1 = __importDefault(require("graphql-date"));
const graphql_url_1 = require("graphql-url");
const graphql_relay_1 = require("graphql-relay");
const Progress_1 = __importDefault(require("./Progress"));
class Schema {
    constructor(options) {
        this._options = options;
    }
    get options() {
        return this._options;
    }
    get schema() {
        return this._schema;
    }
    static _convertPrimitiveFieldType(field) {
        if (field.primary)
            return graphql_1.GraphQLID;
        switch (field.type) {
            case SchemaFieldTypes.BLOB:
                return graphql_url_1.GraphQLUrl;
            case SchemaFieldTypes.INT:
                return graphql_1.GraphQLInt;
            case SchemaFieldTypes.FLOAT:
                return graphql_1.GraphQLFloat;
            case SchemaFieldTypes.DATE:
                return graphql_date_1.default;
            case SchemaFieldTypes.BOOLEAN:
                return graphql_1.GraphQLBoolean;
            case SchemaFieldTypes.STRING:
            default:
                return graphql_1.GraphQLString;
        }
    }
    static _escapeName(bases, name) {
        let replaceValue = "__";
        while (true) {
            const escapedName = name.replace(/\$/g, replaceValue);
            if (escapedName === name)
                return escapedName;
            if (!bases.find((base) => base.name === escapedName)) {
                return escapedName;
            }
            replaceValue += "_";
        }
    }
    static _findPrimaryFieldName(table) {
        const field = table.fields.find((field) => field.primary);
        if (field)
            return field.name;
        return "";
    }
    static _findOriginalField(table, escapedFieldName) {
        return table.fields.find((field) => Schema._escapeName(table.fields, field.name) === escapedFieldName);
    }
    static _createObjectOrderBy(order) {
        if (!order)
            return null;
        return order.reduce((object, order) => {
            const tmp = Object.keys(order).reduce((object, key) => {
                object[order[key]] = key;
                return object;
            }, {});
            return Object.assign({}, object, tmp);
        }, {});
    }
    static _joinConditions(array, separator) {
        if (!array.length)
            return "";
        if (array.length > 1)
            return `(${array.join(separator)})`;
        return array.join(separator);
    }
    async createSchema(hiddenProgress) {
        const total = 100;
        const progress = new Progress_1.default(total + 10, hiddenProgress);
        const context = {
            tables: [],
            types: [],
            inputTypes: [],
            connections: [],
            progress: {
                tableTick: (table) => {
                    progress.tick(`Creating GraphQL type: ${table.name}`, total / context.tables.length);
                }
            }
        };
        try {
            console.log("Creating GraphQL schema...");
            progress.tick("Reading database _schema...");
            context.tables = await this._options.adapter.getTables();
            progress.tick("Creating GraphQL _schema...", 8);
            this._schema = new graphql_1.GraphQLSchema({
                query: this._createQueryType(context)
            });
            progress.tick("Done.");
            console.log("GraphQL schema created.");
            return this._schema;
        }
        catch (error) {
            progress.terminate(error.message);
            throw error;
        }
    }
    _createSQLWhere(table, tableAlias, where, context) {
        if (!where)
            return "";
        let groupsConditions = Object.keys(where).reduce((groupsConditions, filterName) => {
            switch (filterName) {
                case "not":
                case "or":
                case "and":
                case "isNull":
                    return groupsConditions;
            }
            const filter = where[filterName];
            let conditions = [];
            if (Array.isArray(filter)) {
                filter.forEach((item) => {
                    const condition = this._options.adapter.createSQLCondition(filterName, tableAlias, Schema._findOriginalField(table, item));
                    if (condition)
                        conditions.push(condition);
                });
            }
            else if (typeof filter === "string") {
                const condition = this._options.adapter.createSQLCondition(filterName, tableAlias, Schema._findOriginalField(table, filter));
                if (condition)
                    conditions.push(condition);
            }
            else if (typeof filter === "object") {
                conditions = Object.keys(filter).reduce((conditions, fieldName) => {
                    const value = filter[fieldName];
                    const condition = this._options.adapter.createSQLCondition(filterName, tableAlias, Schema._findOriginalField(table, fieldName), value);
                    if (condition)
                        conditions.push(condition);
                    return conditions;
                }, conditions);
            }
            if (conditions.length)
                groupsConditions.push(Schema._joinConditions(conditions, " AND "));
            return groupsConditions;
        }, []);
        if (where.isNull) {
            groupsConditions.push(`${tableAlias}.${this._options.adapter.quote(where.isNull)} IS NULL`);
        }
        if (where.not) {
            const not = where.not.reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(table, tableAlias, item, context));
                return conditions;
            }, []);
            if (not.length)
                groupsConditions.push(`NOT ${Schema._joinConditions(not, " AND ")}`);
        }
        if (where.or) {
            const or = where.or.reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(table, tableAlias, item, context));
                return conditions;
            }, []);
            if (or.length)
                groupsConditions.push(Schema._joinConditions(or, " OR "));
        }
        if (where.and) {
            const and = where.and.reduce((conditions, item) => {
                conditions.push(this._createSQLWhere(table, tableAlias, item, context));
                return conditions;
            }, []);
            if (and.length)
                groupsConditions.push(Schema._joinConditions(and, " AND "));
        }
        return Schema._joinConditions(groupsConditions, " AND ");
    }
    _createQueryType(context) {
        const queryType = new graphql_1.GraphQLObjectType({
            name: "Tables",
            fields: () => this._createQueryTypeFields(context)
        });
        if (!Object.keys(queryType.getFields()).length)
            return null;
        return queryType;
    }
    _createQueryTypeFields(context) {
        return context.tables.reduce((fields, table) => {
            const fieldType = this._createType(context, table);
            if (fieldType) {
                fields[Schema._escapeName(context.tables, table.name)] = {
                    type: this._createConnectionType(context, fieldType),
                    description: table.description,
                    args: Object.assign({}, graphql_relay_1.connectionArgs, { where: { type: this._createFilterInputType(context, table) }, order: { type: new graphql_1.GraphQLList(this._createSortingInputType(context, table)) } }),
                    where: (tableAlias, args, context) => (this._createSQLWhere(table, tableAlias, args.where, context)),
                    orderBy: (args) => Schema._createObjectOrderBy(args.order),
                    resolve: this._options.adapter.resolve.bind(this._options.adapter)
                };
            }
            return fields;
        }, {});
    }
    _createSortingInputType(context, table) {
        const duplicate = context.inputTypes.find(type => (type.name === `SORTING_${Schema._escapeName(context.tables, table.name)}`));
        if (duplicate)
            return duplicate;
        const sortingFieldsEnumType = new graphql_1.GraphQLEnumType({
            name: `SORTING_FIELDS_${Schema._escapeName(context.tables, table.name)}`,
            values: table.fields.reduce((values, field) => {
                values[Schema._escapeName(table.fields, field.name)] = {
                    value: field.name,
                    description: field.description
                };
                return values;
            }, {})
        });
        const inputType = new graphql_1.GraphQLInputObjectType({
            name: `SORTING_${Schema._escapeName(context.tables, table.name)}`,
            fields: () => ({
                asc: { type: sortingFieldsEnumType },
                desc: { type: sortingFieldsEnumType }
            })
        });
        context.inputTypes.push(inputType);
        return inputType;
    }
    _createFilterInputType(context, table) {
        const duplicate = context.inputTypes.find(type => (type.name === `FILTER_${Schema._escapeName(context.tables, table.name)}`));
        if (duplicate)
            return duplicate;
        const inputType = new graphql_1.GraphQLInputObjectType({
            name: `FILTER_${Schema._escapeName(context.tables, table.name)}`,
            fields: () => this._createFilterInputTypeFields(context, table, inputType)
        });
        context.inputTypes.push(inputType);
        return inputType;
    }
    _createFilterInputTypeFields(context, table, inputType) {
        const equalsType = new graphql_1.GraphQLInputObjectType({
            name: `EQUALS_${Schema._escapeName(context.tables, table.name)}`,
            fields: table.fields.reduce((fields, field) => {
                switch (field.type) {
                    case SchemaFieldTypes.BLOB:
                        break;
                    default:
                        fields[Schema._escapeName(table.fields, field.name)] = {
                            type: Schema._convertPrimitiveFieldType(field),
                            description: field.description
                        };
                }
                return fields;
            }, {})
        });
        const containsType = new graphql_1.GraphQLInputObjectType({
            name: `CONTAINS_${Schema._escapeName(context.tables, table.name)}`,
            fields: table.fields.reduce((fields, field) => {
                switch (field.type) {
                    case SchemaFieldTypes.STRING:
                        fields[Schema._escapeName(table.fields, field.name)] = {
                            type: Schema._convertPrimitiveFieldType(field),
                            description: field.description
                        };
                        break;
                }
                return fields;
            }, {})
        });
        const nullableFieldsEnumType = new graphql_1.GraphQLEnumType({
            name: `IS_NULL_FIELDS_${Schema._escapeName(context.tables, table.name)}`,
            values: table.fields.reduce((values, field) => {
                if (!field.nonNull) {
                    values[Schema._escapeName(table.fields, field.name)] = {
                        value: field.name,
                        description: field.description
                    };
                }
                return values;
            }, {})
        });
        const emptyFieldsEnumType = new graphql_1.GraphQLEnumType({
            name: `IS_EMPTY_FIELDS_${Schema._escapeName(context.tables, table.name)}`,
            values: table.fields.reduce((values, field) => {
                switch (field.type) {
                    case SchemaFieldTypes.BLOB:
                    case SchemaFieldTypes.STRING:
                        values[Schema._escapeName(table.fields, field.name)] = {
                            value: field.name,
                            description: field.description
                        };
                }
                return values;
            }, {})
        });
        const beginsOrEndsType = new graphql_1.GraphQLInputObjectType({
            name: `BEGINS_OR_ENDS_${Schema._escapeName(context.tables, table.name)}`,
            fields: table.fields.reduce((fields, field) => {
                switch (field.type) {
                    case SchemaFieldTypes.STRING:
                        fields[Schema._escapeName(table.fields, field.name)] = {
                            type: Schema._convertPrimitiveFieldType(field),
                            description: field.description
                        };
                        break;
                }
                return fields;
            }, {})
        });
        const greaterOrLessType = new graphql_1.GraphQLInputObjectType({
            name: `GREATER_OR_LESS_${Schema._escapeName(context.tables, table.name)}`,
            fields: table.fields.reduce((fields, field) => {
                switch (field.type) {
                    case SchemaFieldTypes.DATE:
                    case SchemaFieldTypes.INT:
                    case SchemaFieldTypes.FLOAT:
                        fields[Schema._escapeName(table.fields, field.name)] = {
                            type: Schema._convertPrimitiveFieldType(field),
                            description: field.description
                        };
                        break;
                }
                return fields;
            }, {})
        });
        return Object.assign({}, Object.keys(equalsType.getFields()).length ? {
            [FilterTypes.EQUALS]: { type: equalsType }
        } : {}, Object.keys(containsType.getFields()).length ? {
            [FilterTypes.CONTAINS]: { type: containsType }
        } : {}, Object.keys(beginsOrEndsType.getFields()).length ? {
            [FilterTypes.BEGINS]: { type: beginsOrEndsType },
            [FilterTypes.ENDS]: { type: beginsOrEndsType }
        } : {}, Object.keys(greaterOrLessType.getFields()).length ? {
            [FilterTypes.GREATER]: { type: greaterOrLessType },
            [FilterTypes.LESS]: { type: greaterOrLessType }
        } : {}, nullableFieldsEnumType.getValues().length ? {
            isNull: { type: nullableFieldsEnumType }
        } : {}, emptyFieldsEnumType.getValues().length ? {
            isEmpty: { type: emptyFieldsEnumType }
        } : {}, { or: { type: new graphql_1.GraphQLList(inputType) }, and: { type: new graphql_1.GraphQLList(inputType) }, not: { type: new graphql_1.GraphQLList(inputType) } });
    }
    _createConnectionType(context, type) {
        const name = Schema._escapeName(context.tables, type.name);
        let connection = context.connections.find((connection) => (connection.connectionType.name === name + "Connection"));
        if (connection)
            return connection.connectionType;
        connection = graphql_relay_1.connectionDefinitions({
            name,
            nodeType: type,
            connectionFields: {
                total: { type: graphql_1.GraphQLInt }
            }
        });
        context.connections.push(connection);
        return connection.connectionType;
    }
    _createType(context, table) {
        const duplicate = context.types.find(type => (type.name === Schema._escapeName(context.tables, table.name)));
        if (duplicate)
            return duplicate;
        context.progress.tableTick(table);
        const type = new graphql_1.GraphQLObjectType({
            name: Schema._escapeName(context.tables, table.name),
            sqlTable: table.name,
            uniqueKey: Schema._findPrimaryFieldName(table),
            description: table.description,
            fields: () => this._createTypeFields(context, table)
        });
        context.types.push(type);
        if (!Object.keys(type.getFields()).length)
            return null;
        return type;
    }
    _createTypeFields(context, table) {
        const fields = this._createTypePrimitiveFields(table.fields);
        const linkFields = this._createTypeLinkFields(context, table, table.fields);
        return Object.assign({}, fields, linkFields);
    }
    _createTypeLinkFields(context, table, fields) {
        return fields.reduce((resultFields, field) => {
            if (field.tableNameRef) {
                const tableRef = context.tables.find((table) => (table.name === Schema._escapeName(context.tables, field.tableNameRef)));
                if (tableRef) {
                    const fieldName = Schema._escapeName(fields, `link_${field.name}`);
                    const fieldType = this._createType(context, tableRef);
                    const connectFieldType = this._createConnectionType(context, fieldType);
                    if (fieldType) {
                        resultFields[fieldName] = {
                            type: field.nonNull ? new graphql_1.GraphQLNonNull(connectFieldType) : connectFieldType,
                            description: field.description,
                            args: Object.assign({}, graphql_relay_1.connectionArgs, { where: { type: this._createFilterInputType(context, tableRef) }, order: { type: new graphql_1.GraphQLList(this._createSortingInputType(context, tableRef)) } }),
                            resolve: this._options.adapter.resolve.bind(this._options.adapter),
                            sqlColumn: field.name,
                            sqlJoin: (parentTable, joinTable) => (`${parentTable}.${this._options.adapter.quote(field.name)}` +
                                ` = ${joinTable}.${this._options.adapter.quote(field.fieldNameRef)}`),
                            where: (tableAlias, args, context) => (this._createSQLWhere(tableRef, tableAlias, args.where, context)),
                            orderBy: (args) => Schema._createObjectOrderBy(args.order)
                        };
                    }
                }
            }
            return resultFields;
        }, {});
    }
    _createTypePrimitiveFields(fields) {
        return fields.reduce((resultFields, field) => {
            const fieldName = Schema._escapeName(fields, field.name);
            const fieldType = Schema._convertPrimitiveFieldType(field);
            resultFields[fieldName] = {
                type: field.nonNull ? new graphql_1.GraphQLNonNull(fieldType) : fieldType,
                description: field.description,
                resolve: this._options.adapter.resolve.bind(this._options.adapter),
                sqlColumn: field.name
            };
            return resultFields;
        }, {});
    }
}
exports.default = Schema;
var SchemaFieldTypes;
(function (SchemaFieldTypes) {
    SchemaFieldTypes[SchemaFieldTypes["BOOLEAN"] = 0] = "BOOLEAN";
    SchemaFieldTypes[SchemaFieldTypes["STRING"] = 1] = "STRING";
    SchemaFieldTypes[SchemaFieldTypes["INT"] = 2] = "INT";
    SchemaFieldTypes[SchemaFieldTypes["FLOAT"] = 3] = "FLOAT";
    SchemaFieldTypes[SchemaFieldTypes["DATE"] = 4] = "DATE";
    SchemaFieldTypes[SchemaFieldTypes["BLOB"] = 5] = "BLOB";
})(SchemaFieldTypes = exports.SchemaFieldTypes || (exports.SchemaFieldTypes = {}));
var FilterTypes;
(function (FilterTypes) {
    FilterTypes["EQUALS"] = "equals";
    FilterTypes["IS_EMPTY"] = "isEmpty";
    FilterTypes["CONTAINS"] = "contains";
    FilterTypes["BEGINS"] = "begins";
    FilterTypes["ENDS"] = "ends";
    FilterTypes["GREATER"] = "greater";
    FilterTypes["LESS"] = "less";
})(FilterTypes = exports.FilterTypes || (exports.FilterTypes = {}));
//# sourceMappingURL=Schema.js.map